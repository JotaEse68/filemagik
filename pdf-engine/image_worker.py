"""Isolated HEIC and animated GIF processing; private bearer and bounded decoding."""
import asyncio
import hmac
import io
import os
import json
import zipfile
import threading
from image_quota import reserve
from fastapi import FastAPI,File,Header,HTTPException,Query,UploadFile
from fastapi.responses import Response
from PIL import Image,ImageOps,ImageSequence,UnidentifiedImageError
from pillow_heif import register_heif_opener

register_heif_opener()
Image.MAX_IMAGE_PIXELS=12_000_000
app=FastAPI(docs_url=None,redoc_url=None,openapi_url=None)
MAX_BYTES=12*1024*1024
MAX_OUTPUT=12*1024*1024
_LIMIT=threading.BoundedSemaphore(1)
OPERATIONS={"heic-to-png":(".heic",".heif"),"gif-to-animated-webp":(".gif",),"gif-to-frames-zip":(".gif",)}

def convert_image(data:bytes,operation:str)->bytes:
 try:
  with Image.open(io.BytesIO(data)) as image:
   if operation=="heic-to-png":
    if image.width*image.height>12_000_000:raise HTTPException(413,"Maximum 24 megapixels")
    result=ImageOps.exif_transpose(image).convert("RGBA")
    output=io.BytesIO()
    result.save(output,format="PNG",optimize=False)
   else:
    frames=[];timings=[];pixels=0
    if getattr(image,"n_frames",1)>60:raise HTTPException(413,"Maximum 60 GIF frames")
    for frame in ImageSequence.Iterator(image):
     pixels+=frame.width*frame.height
     if frame.width*frame.height>8_000_000 or pixels>30_000_000:
      raise HTTPException(413,"GIF frame memory budget exceeded")
     frames.append(frame.convert("RGBA").copy())
     timings.append(max(20,int(frame.info.get("duration",image.info.get("duration",100)) or 100)))
    if not frames:raise HTTPException(422,"No GIF animation frames")
    output=io.BytesIO()
    if operation=="gif-to-frames-zip":
     with zipfile.ZipFile(output,"w",compression=zipfile.ZIP_DEFLATED,compresslevel=3) as archive:
      for index,frame in enumerate(frames):
       buffer=io.BytesIO()
       frame.save(buffer,format="PNG")
       archive.writestr(f"frame-{index+1:03d}.png",buffer.getvalue())
      archive.writestr("frames.json",json.dumps({"frames":len(frames),"durations_ms":timings,
       "loop":max(0,int(image.info.get("loop",0)))}))
    else:
     frames[0].save(output,format="WEBP",save_all=True,append_images=frames[1:],
       duration=timings,loop=max(0,int(image.info.get("loop",0))),lossless=False,quality=78,method=3)
   result_bytes=output.getvalue()
   if not result_bytes or len(result_bytes)>MAX_OUTPUT:raise HTTPException(413,"Output exceeds 35 MB")
   return result_bytes
 except HTTPException:raise
 except (UnidentifiedImageError,OSError,ValueError,OverflowError):
  raise HTTPException(422,"Image format is invalid or unsupported")

@app.get("/healthz")
def health():return {"status":"ok","engine":"filemagik-image"}

@app.post("/v1/convert")
async def convert(operation:str=Query(...),file:UploadFile=File(...),authorization:str|None=Header(None),x_filemagik_visitor:str|None=Header(None)):
 secret=os.environ.get("PDF_ENGINE_SECRET","")
 if len(secret)<32 or not authorization or not authorization.startswith("Bearer ") or not hmac.compare_digest(authorization[7:],secret):
  raise HTTPException(401,"Not authorized")
 if operation not in OPERATIONS:raise HTTPException(400,"Unsupported image operation")
 if not (file.filename or "").lower().endswith(OPERATIONS[operation]):
  raise HTTPException(415,"Unsupported image extension")
 if not _LIMIT.acquire(blocking=False):raise HTTPException(429,"Image engine busy")
 try:
  with reserve(x_filemagik_visitor):
   data=await file.read(MAX_BYTES+1)
   if not data or len(data)>MAX_BYTES:raise HTTPException(413,"Input exceeds 30 MB")
   content=await asyncio.to_thread(convert_image,data,operation)
   mime={"heic-to-png":"image/png","gif-to-animated-webp":"image/webp",
         "gif-to-frames-zip":"application/zip"}[operation]
   return Response(content,media_type=mime,headers={"Cache-Control":"private, no-store",
     "X-Content-Type-Options":"nosniff","Content-Disposition":"attachment"})
 finally:_LIMIT.release()
