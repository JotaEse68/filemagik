"""Strict private FileMagik 7Z/RAR reader; never extracts archive paths to disk."""
import hmac
import io
import os
import threading
import tempfile
import zipfile
from pathlib import Path
import libarchive
from archive_quota import reserve
from fastapi import FastAPI,Header,UploadFile,File,HTTPException
from fastapi.responses import Response

MAX_ARCHIVE=12*1024*1024
MAX_EXPANDED=24*1024*1024
MAX_FILES=40
_LIMIT=threading.BoundedSemaphore(1)
app=FastAPI(docs_url=None,redoc_url=None,openapi_url=None)

@app.get("/healthz")
def health():return {"status":"ok","engine":"filemagik-archive"}

def safe_extract(data:bytes,filename:str)->bytes:
 if not filename.lower().endswith((".7z",".rar")):raise HTTPException(415,"Only 7Z and RAR are supported")
 if len(data)>MAX_ARCHIVE:raise HTTPException(413,"Archive exceeds 25 MB")
 try:
  with tempfile.TemporaryDirectory(prefix="fm-archive-") as tmp:
   input_path=Path(tmp)/("source.7z" if filename.lower().endswith(".7z") else "source.rar")
   input_path.write_bytes(data)
   out=io.BytesIO()
   with zipfile.ZipFile(out,"w",compression=zipfile.ZIP_DEFLATED,compresslevel=4,allowZip64=False) as zipout:
    total=0;count=0
    with libarchive.file_reader(str(input_path)) as reader:
     for entry in reader:
      if not entry.isfile:
       # No symlinks, hardlinks, devices, directories with special types
       if entry.isdir:continue
       raise HTTPException(422,"Archive contains unsupported link or special entry")
      count+=1
      if count>MAX_FILES:raise HTTPException(413,"Maximum 100 files")
      raw=entry.pathname.replace("\\","/")
      basename=raw.split("/")[-1]
      if not basename or any(ord(c)<32 for c in basename) or raw.startswith("/") or ".." in raw.split("/"):
       raise HTTPException(422,"Unsafe archive filename")
      declared=entry.size
      if declared is None or declared<0 or declared>MAX_EXPANDED-total:
       raise HTTPException(413,"Archive expanded size exceeds 100 MB")
      filebuf=io.BytesIO()
      for block in entry.get_blocks():
       filebuf.write(block);total+=len(block)
       if total>MAX_EXPANDED or filebuf.tell()>declared:
        raise HTTPException(413,"Archive expanded data exceeds limits")
      if filebuf.tell()!=declared:raise HTTPException(422,"Inconsistent archive file length")
      zipout.writestr(f"{count:03d}-"+basename[:100],filebuf.getvalue())
   return out.getvalue()
 except HTTPException:raise
 except (libarchive.exception.ArchiveError,ValueError,EOFError,RuntimeError):
  raise HTTPException(422,"Archive format unsupported, corrupted or encrypted")

@app.post("/v1/extract")
def extract(file:UploadFile=File(...),authorization:str|None=Header(None),x_filemagik_visitor:str|None=Header(None)):
 secret=os.environ.get("PDF_ENGINE_SECRET","")
 if len(secret)<32 or not authorization or not authorization.startswith("Bearer ") or not hmac.compare_digest(authorization[7:],secret):
  raise HTTPException(401,"Not authorized")
 if not _LIMIT.acquire(blocking=False):raise HTTPException(429,"Archive engine busy")
 try:
  with reserve(x_filemagik_visitor):
   data=file.file.read(MAX_ARCHIVE+1)
   if not data or len(data)>MAX_ARCHIVE:raise HTTPException(413,"Archive exceeds 25 MB")
   zipped=safe_extract(data,file.filename or "")
   if len(zipped)>12*1024*1024:raise HTTPException(413,"ZIP output exceeds size limit")
   return Response(zipped,media_type="application/zip",headers={
    "Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff",
    "Content-Disposition":'attachment; filename="filemagik-extracted.zip"'})
 finally:_LIMIT.release()
