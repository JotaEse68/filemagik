"""Private bounded FFmpeg conversion API for FileMagik. Never a public upload endpoint."""
import hmac
import os
import shutil
import subprocess
import tempfile
import threading
from pathlib import Path
from quota import reserve
from fastapi import FastAPI, UploadFile, File, Header, Query, HTTPException
from fastapi.responses import Response

app=FastAPI(docs_url=None,redoc_url=None,openapi_url=None)
MAX_INPUT=25*1024*1024
MAX_OUTPUT=35*1024*1024
MAX_DURATION=120
_LIMIT=threading.BoundedSemaphore(1)
OPERATIONS={
 "audio-to-mp3":(".mp3","audio/mpeg",{"audio"}),
 "audio-to-wav":(".wav","audio/wav",{"audio"}),
 "video-to-mp4":(".mp4","video/mp4",{"video"}),
 "animated-gif-to-mp4":(".mp4","video/mp4",{"video"}),
 "extract-audio-mp3":(".mp3","audio/mpeg",{"video"}),
 "video-to-gif":(".gif","image/gif",{"video"}),
}
ALLOWED={".mp3",".mp4",".wav",".webm",".mov",".m4a",".ogg",".flac",".gif"}
def run_command(arguments,timeout=35):
 try:
  result=subprocess.run(arguments,stdout=subprocess.PIPE,stderr=subprocess.PIPE,
                       timeout=timeout,check=False,env={"PATH":os.environ.get("PATH","/usr/bin:/bin")})
 except subprocess.TimeoutExpired:raise HTTPException(408,"Media operation exceeded processing time limit")
 except OSError:raise HTTPException(503,"Media processor unavailable")
 if result.returncode:raise HTTPException(422,"Media file cannot be processed")
 return result.stdout

def inspect(path):
 output=run_command(["ffprobe","-v","error","-protocol_whitelist","file,pipe","-show_entries","format=duration",
                     "-of","default=noprint_wrappers=1:nokey=1",str(path)],timeout=8)
 try:seconds=float(output.decode().strip())
 except (ValueError,UnicodeError):raise HTTPException(422,"Media duration unavailable")
 if not (0<seconds<=MAX_DURATION):raise HTTPException(413,"Maximum 120 seconds per operation")
 return seconds

@app.get("/healthz")
def health():return {"status":"ok","engine":"filemagik-media"}

@app.post("/v1/media")
async def convert(operation:str=Query(...),file:UploadFile=File(...),authorization:str|None=Header(None),x_filemagik_visitor:str|None=Header(None)):
 secret=os.environ.get("FILEMAGIK_MEDIA_SECRET","")
 if len(secret)<32 or not authorization or not authorization.startswith("Bearer ") or not hmac.compare_digest(authorization[7:],secret):
  raise HTTPException(401,"Not authorized")
 if operation not in OPERATIONS:raise HTTPException(400,"Unsupported operation")
 extension=Path(file.filename or "").suffix.lower()
 if extension not in ALLOWED:raise HTTPException(415,"Unsupported media type")
 if not _LIMIT.acquire(blocking=False):raise HTTPException(429,"Media engine busy")
 try:
  with reserve(x_filemagik_visitor):
   data=await file.read(MAX_INPUT+1)
   if not data or len(data)>MAX_INPUT:raise HTTPException(413,"Maximum 25 MB per upload")
   out_ext,mime,_=OPERATIONS[operation]
   with tempfile.TemporaryDirectory(prefix="fm-media-") as temp:
    src=Path(temp)/("input"+extension);src.write_bytes(data)
    inspect(src)
    dest=Path(temp)/("output"+out_ext)
    common=["ffmpeg","-hide_banner","-nostdin","-loglevel","error","-y","-threads","1","-protocol_whitelist","file,pipe","-i",str(src),"-t",str(MAX_DURATION)]
    if operation in ("audio-to-mp3","extract-audio-mp3"):
     args=["-vn","-map","0:a:0","-codec:a","libmp3lame","-b:a","128k"]
    elif operation=="audio-to-wav":
     args=["-vn","-map","0:a:0","-codec:a","pcm_s16le","-ar","44100","-ac","2"]
    elif operation in ("video-to-mp4","animated-gif-to-mp4"):
     args=["-map","0:v:0","-map","0:a:0?","-vf","scale=w='min(1280,iw)':h=-2:flags=lanczos",
           "-codec:v","libx264","-pix_fmt","yuv420p","-preset","veryfast","-crf","27",
           "-codec:a","aac","-b:a","96k","-movflags","+faststart"]
    else:
     args=["-map","0:v:0","-vf","fps=10,scale=480:-1:flags=lanczos","-loop","0"]
    run_command([*common,*args,str(dest)],timeout=65)
    if not dest.exists() or dest.stat().st_size==0:raise HTTPException(422,"No usable output generated")
    if dest.stat().st_size>MAX_OUTPUT:raise HTTPException(413,"Output exceeds 35 MB")
    result=dest.read_bytes()
    return Response(result,media_type=mime,headers={"Cache-Control":"private, no-store",
      "X-Content-Type-Options":"nosniff","Content-Disposition":'attachment; filename="filemagik'+out_ext+'"'})
 finally:_LIMIT.release()
