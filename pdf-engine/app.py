import os
import io
import hmac
import asyncio
import json
import math
from pathlib import Path
from fastapi import FastAPI, UploadFile, File, Form, Header, HTTPException, Query
from fastapi.responses import Response
from pypdf import PdfReader,PdfWriter
from PIL import Image
from pypdf.errors import PdfReadError
import httpx
from document import pdf_to_docx, pdf_to_xlsx
from quota import reserve
from worker_capacity import capacity
from image_worker import app as image_api
from media_worker import app as media_api
from archive_worker import app as archive_api


app=FastAPI(title="FileMagik PDF Engine",docs_url=None,redoc_url=None,openapi_url=None)
MAX=int(os.getenv("MAX_UPLOAD_MIB","12"))*1024*1024
GOTENBERG=os.getenv("GOTENBERG_URL","http://gotenberg.railway.internal:3000").rstrip("/")
MIMES={"pdf-to-docx":"application/vnd.openxmlformats-officedocument.wordprocessingml.document",
"pdf-to-xlsx":"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
"office-to-pdf":"application/pdf","optimize-pdf":"application/pdf","redact-pdf":"application/pdf"}
EXTENSIONS={"pdf-to-docx":".pdf","pdf-to-xlsx":".pdf",
"office-to-pdf":(".docx",".xlsx",".pptx",".odt",".ods",".odp"),
"optimize-pdf":".pdf","redact-pdf":".pdf"}

@app.middleware("http")
async def reject_oversized_body(request, call_next):
    if request.url.path=="/v1/jobs":
        declared=request.headers.get("content-length")
        if declared:
            try: size=int(declared)
            except ValueError:return Response("Invalid content length",status_code=400)
            if size>MAX+131072:return Response("Upload exceeds configured limit",status_code=413)
    return await call_next(request)

@app.middleware("http")
async def integrated_worker_gate(request, call_next):
    """Private workers stay disabled until explicit server-side activation.
    Capacity is shared across every engine and Uvicorn worker process.
    """
    enabled=os.getenv("FILEMAGIK_UNIFIED_WORKERS_ENABLED","false").lower()=="true"
    worker=request.url.path.startswith("/workers/")
    pdf_job=request.url.path=="/v1/jobs"
    if not worker and not (enabled and pdf_job):
        return await call_next(request)
    if worker and not enabled:
        return Response("Integrated conversion engines are disabled",status_code=503)
    try:
        with capacity():
            return await call_next(request)
    except HTTPException as exc:
        # Middleware exceptions bypass FastAPI's route exception handlers;
        # return an explicit safe HTTP response instead of an unhandled 500.
        return Response(str(exc.detail),status_code=exc.status_code,
                        headers={"Cache-Control":"no-store"})

@app.get("/healthz")
def health():
    return {"status":"ok","engine":"filemagik-pdf-engine"}

@app.get("/readyz")
async def ready():
    """Railway-to-Gotenberg private DNS, port and health verified live."""
    try:
        async with httpx.AsyncClient(timeout=httpx.Timeout(4,connect=2)) as client:
            response=await client.get(GOTENBERG+"/health")
        if response.status_code==200:return {"status":"ready","gotenberg":"reachable"}
    except httpx.RequestError:pass
    raise HTTPException(503,"Gotenberg private dependency unavailable")

async def call_gotenberg(path,data,name,fields=None):
    form={"files":(name,data,"application/octet-stream")}
    try:
        async with httpx.AsyncClient(timeout=httpx.Timeout(65,connect=5)) as client:
            answer=await client.post(GOTENBERG+path,files=form,data=fields or {})
    except httpx.RequestError:
        raise HTTPException(503,"Professional Office conversion service unavailable")
    if answer.status_code>=400:
        raise HTTPException(422,"Professional PDF processor rejected this document")
    if len(answer.content)>35*1024*1024:
        raise HTTPException(413,"Converted file exceeds the output limit")
    if not answer.content.startswith(b"%PDF-"):
        raise HTTPException(502,"Professional engine returned an invalid PDF")
    return answer.content

def inspect_pdf(data):
    try:
        reader=PdfReader(io.BytesIO(data),strict=False)
        if reader.is_encrypted:raise HTTPException(422,"Password-protected PDFs must be unlocked first")
        if len(reader.pages)>100:raise HTTPException(413,"Maximum 100 PDF pages")
        return reader
    except HTTPException:raise
    except Exception:raise HTTPException(422,"Invalid PDF file")

def lossy_optimize(data,quality):
    source=inspect_pdf(data)
    fields=source.get_fields() or {}
    if fields:raise HTTPException(422,"PDF form and signature fields require lossless optimization")
    # Rewriting image streams could affect linked or signed documents; fail closed.
    if any("/Annots" in page for page in source.pages):
        raise HTTPException(422,"PDF annotations or hyperlinks require lossless optimization")
    root=source.trailer.get("/Root")
    if root is not None:
        root=root.get_object()
        names=root.get("/Names")
        if names is not None and "/EmbeddedFiles" in names.get_object():
            raise HTTPException(422,"PDF attachments require lossless optimization")
    if b"/ByteRange" in data:
        raise HTTPException(422,"Digitally signed PDFs cannot be recompressed")
    writer=PdfWriter()
    writer.append(source)
    count=0
    for page in writer.pages:
        for img in page.images:
            if count>=100:break
            try:
                picture=img.image
                if picture.mode not in ("RGB","L") or picture.width*picture.height<50000:
                    continue  # Preserve alpha/CMYK images and small assets.
                picture=picture.convert("RGB")
                if quality=="maximum":
                    picture.thumbnail((max(100,int(picture.width*.65)),
                                       max(100,int(picture.height*.65))),Image.Resampling.LANCZOS)
                img.replace(picture,quality=72 if quality=="balanced" else 45)
                count+=1
            except (OSError,ValueError,TypeError):
                continue  # PDF structure remains intact for unsupported images.
    output=io.BytesIO()
    writer.write(output)
    data_out=output.getvalue()
    after=inspect_pdf(data_out)
    if len(after.pages)!=len(source.pages):
        raise HTTPException(422,"Compression changed the page count")
    for before,page in zip(source.pages,after.pages):
        if (before.extract_text() or "").strip()!=(page.extract_text() or "").strip():
            raise HTTPException(422,"Compression changed searchable PDF text")
    return data_out if len(data_out)<len(data) else data

def _redaction_regions(data,regions_json):
    if not regions_json or len(regions_json)>6000:raise HTTPException(400,"Redaction regions missing")
    try:regions=json.loads(regions_json)
    except (TypeError,ValueError):raise HTTPException(400,"Invalid redaction regions")
    if not isinstance(regions,list) or not 1<=len(regions)<=20:
        raise HTTPException(400,"Maximum 20 regions per operation")
    source=inspect_pdf(data)
    if b"/ByteRange" in data or source.get_fields() or any("/Annots" in page for page in source.pages):
        raise HTTPException(422,"Signed PDFs, forms and annotations cannot be redacted by this tool")
    rectangles=[]
    for region in regions:
        if not isinstance(region,dict):raise HTTPException(400,"Invalid redaction region")
        try:
            # A fractional or coerced page number must never redirect a destructive
            # redaction to a different page. JSON page indices are exact integers.
            raw_page=region["page"]
            if type(raw_page) is not int:raise ValueError("Invalid page index")
            page_index=raw_page-1
            x=float(region["x"]);y=float(region["y"])
            width=float(region["width"]);height=float(region["height"])
        except (KeyError,TypeError,ValueError):
            raise HTTPException(400,"Invalid redaction rectangle")
        if (not all(math.isfinite(n) for n in (x,y,width,height)) or page_index<0 or page_index>=len(source.pages) or min(x,y)<0 or width<.01 or height<.01 or x+width>1.001 or y+height>1.001):
            raise HTTPException(400,"Redaction rectangle out of bounds")
        page=source.pages[page_index]
        box=page.cropbox
        if int(page.get("/Rotate",0))%360!=0 or abs(float(box.left))>.01 or abs(float(box.bottom))>.01:
            raise HTTPException(422,"Redaction supports only unrotated pages with standard crop origin")
        w=float(box.width);h=float(box.height)
        rectangles.append({"page":page_index+1,"x":round(x*w,2),
                           "y":round((1-y-height)*h,2),
                           "width":round(width*w,2),"height":round(height*h,2)})
    return json.dumps(rectangles,separators=(",",":"))

@app.post("/v1/jobs")
async def convert(operation:str=Query(...),quality:str=Query("lossless"),file:UploadFile=File(...),regions:str|None=Form(None),
                  authorization:str|None=Header(None),x_filemagik_visitor:str|None=Header(None)):
    expected=os.getenv("PDF_ENGINE_SECRET","")
    if len(expected)<32 or not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(401,"Not authorized")
    if not hmac.compare_digest(authorization.removeprefix("Bearer "),expected):
        raise HTTPException(401,"Not authorized")
    if operation not in MIMES or quality not in ("lossless","balanced","maximum"):
        raise HTTPException(400,"Unsupported operation or quality")
    filename=Path(file.filename or "upload").name.lower()
    extensions=EXTENSIONS[operation]
    if isinstance(extensions,str):extensions=(extensions,)
    if not filename.endswith(extensions):raise HTTPException(415,"Unsupported file extension")
    data=await file.read(MAX+1)
    if not data or len(data)>MAX:raise HTTPException(413,"File too large")
    with reserve(x_filemagik_visitor or ""):
      try:
        if operation=="pdf-to-docx":result=await asyncio.to_thread(pdf_to_docx,data)
        elif operation=="pdf-to-xlsx":result=await asyncio.to_thread(pdf_to_xlsx,data)
        elif operation=="redact-pdf":
            rects=_redaction_regions(data,regions)
            result=await call_gotenberg("/forms/pdf/redact",data,filename,{"regions":rects})
        elif operation=="office-to-pdf":
            result=await call_gotenberg("/forms/libreoffice/convert",data,filename,
                                       {"stages":'[{"op":"optimize"}]'})
        else:
            if quality=="lossless":
                original=inspect_pdf(data)
                # Rewrite of any PDF byte stream invalidates digital signatures.
                # Interactive forms and annotations are also left untouched.
                if (b"/ByteRange" in data or original.get_fields()
                    or any("/Annots" in page for page in original.pages)):
                    result=data
                else:
                    result=await call_gotenberg("/forms/pdf/optimize",data,filename)
                    if len(result)>len(data):result=data
            else:result=await asyncio.to_thread(lossy_optimize,data,quality)
      except HTTPException:raise
      except (ValueError,KeyError,PdfReadError):
        raise HTTPException(422,"Document could not be reconstructed reliably")
      if not result:raise HTTPException(422,"Empty converted document")
      return Response(result,media_type=MIMES[operation],headers={"Cache-Control":"private, no-store",
        "X-Content-Type-Options":"nosniff","Content-Disposition":"attachment"})

# These are sub-applications of the *existing* FileMagik PDF API.
# Gotenberg continues as its only separate Railway dependency.
app.mount("/workers/image",image_api)
app.mount("/workers/media",media_api)
app.mount("/workers/archive",archive_api)
