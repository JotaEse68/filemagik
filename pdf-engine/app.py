import os
import io
import hmac
import asyncio
import subprocess
import tempfile
from pathlib import Path
from fastapi import FastAPI, UploadFile, File, Header, HTTPException, Query
from fastapi.responses import Response
from pypdf import PdfReader
import httpx
from document import pdf_to_docx, pdf_to_xlsx

app=FastAPI(title="FileMagik PDF Engine",docs_url=None,redoc_url=None,openapi_url=None)
MAX=int(os.getenv("MAX_UPLOAD_MIB","12"))*1024*1024
GOTENBERG=os.getenv("GOTENBERG_URL","http://gotenberg.railway.internal:3000").rstrip("/")
MIMES={"pdf-to-docx":"application/vnd.openxmlformats-officedocument.wordprocessingml.document",
"pdf-to-xlsx":"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
"office-to-pdf":"application/pdf","optimize-pdf":"application/pdf"}
EXTENSIONS={"pdf-to-docx":".pdf","pdf-to-xlsx":".pdf",
"office-to-pdf":(".docx",".xlsx",".pptx",".odt",".ods",".odp"),
"optimize-pdf":".pdf"}

@app.get("/healthz")
def health():
    return {"status":"ok","engine":"filemagik-pdf-engine"}

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
    if any(getattr(field,"field_type","") == "/Sig" for field in fields.values()):
        raise HTTPException(422,"Signed PDFs cannot be recompressed without invalidating signatures")
    if fields:raise HTTPException(422,"PDF forms require lossless optimization")
    preset="/ebook" if quality=="balanced" else "/screen"
    with tempfile.TemporaryDirectory(prefix="filemagik_") as directory:
        inp=Path(directory)/"source.pdf";out=Path(directory)/"output.pdf"
        inp.write_bytes(data)
        args=["gs","-dSAFER","-dBATCH","-dNOPAUSE","-sDEVICE=pdfwrite",
              "-dCompatibilityLevel=1.6","-dDetectDuplicateImages=true",
              "-dSubsetFonts=true",f"-dPDFSETTINGS={preset}",
              f"-sOutputFile={out}",str(inp)]
        try:
            subprocess.run(args,timeout=45,check=True,stdout=subprocess.DEVNULL,
                           stderr=subprocess.DEVNULL,cwd=directory)
        except (subprocess.SubprocessError,OSError):
            raise HTTPException(422,"PDF image compression failed")
        data_out=out.read_bytes()
        if not data_out.startswith(b"%PDF-"):raise HTTPException(502,"Invalid compressed PDF")
        after=inspect_pdf(data_out)
        if len(after.pages)!=len(source.pages):
            raise HTTPException(422,"Compressed PDF lost pages; original preserved")
        before_len=sum(len(p.extract_text() or "") for p in source.pages)
        after_len=sum(len(p.extract_text() or "") for p in after.pages)
        if before_len>100 and after_len<before_len*.90:
            raise HTTPException(422,"Compression damaged searchable text; original preserved")
        return data_out if len(data_out)<len(data) else data

@app.post("/v1/jobs")
async def convert(operation:str=Query(...),quality:str=Query("lossless"),file:UploadFile=File(...),
                  authorization:str|None=Header(None)):
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
    try:
        if operation=="pdf-to-docx":result=await asyncio.to_thread(pdf_to_docx,data)
        elif operation=="pdf-to-xlsx":result=await asyncio.to_thread(pdf_to_xlsx,data)
        elif operation=="office-to-pdf":
            result=await call_gotenberg("/forms/libreoffice/convert",data,filename,
                                       {"stages":'[{"op":"optimize"}]'})
        else:
            if quality=="lossless":
                inspect_pdf(data)
                result=await call_gotenberg("/forms/pdf/optimize",data,filename)
                if len(result)>len(data):result=data
            else:result=await asyncio.to_thread(lossy_optimize,data,quality)
    except HTTPException:raise
    except (ValueError,KeyError):
        raise HTTPException(422,"Document could not be reconstructed reliably")
    if not result:raise HTTPException(422,"Empty converted document")
    return Response(result,media_type=MIMES[operation],headers={"Cache-Control":"private, no-store",
      "X-Content-Type-Options":"nosniff","Content-Disposition":"attachment"})
