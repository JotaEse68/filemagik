"""Private bounded mixed batch conversion. No public proxy route is enabled by default."""
import asyncio
import hashlib
import hmac
import io
import json
import os
import re
import zipfile
from pathlib import Path
from fastapi import FastAPI, File, Header, HTTPException, Query, UploadFile
from fastapi.responses import Response
from image_worker import convert_image
from media_worker import convert as media_convert

app=FastAPI(docs_url=None,redoc_url=None,openapi_url=None)
MAX_ITEMS=6
MAX_ITEM=4*1024*1024
MAX_TOTAL=12*1024*1024
MAX_ZIP=12*1024*1024
PRESETS={
    "web-friendly":{
        ".heic":("heic-to-png",".png","image"),
        ".heif":("heic-to-png",".png","image"),
        ".gif":("gif-to-animated-webp",".webp","image"),
        ".mp3":("audio-to-mp3",".mp3","media"),
        ".wav":("audio-to-mp3",".mp3","media"),
        ".flac":("audio-to-mp3",".mp3","media"),
        ".ogg":("audio-to-mp3",".mp3","media"),
        ".m4a":("audio-to-mp3",".mp3","media"),
        ".mov":("video-to-mp4",".mp4","media"),
        ".webm":("video-to-mp4",".mp4","media"),
        ".mp4":("video-to-mp4",".mp4","media")},
    "extract":{
        ".heic":("heic-to-png",".png","image"),
        ".heif":("heic-to-png",".png","image"),
        ".gif":("gif-to-frames-zip",".zip","image"),
        ".wav":("audio-to-wav",".wav","media"),
        ".mp3":("audio-to-wav",".wav","media"),
        ".flac":("audio-to-wav",".wav","media"),
        ".ogg":("audio-to-wav",".wav","media"),
        ".m4a":("audio-to-wav",".wav","media"),
        ".mp4":("extract-audio-mp3",".mp3","media"),
        ".mov":("extract-audio-mp3",".mp3","media"),
        ".webm":("extract-audio-mp3",".mp3","media")}}

def secure_name(value,index):
    name=Path((value or "").replace("\\","/")).name
    stem=re.sub(r"[^a-zA-Z0-9_-]+","-",Path(name).stem).strip("-")[:45] or "file"
    return f"{index+1:02d}-{stem}"

@app.post("/v1/convert")
async def batch_convert(files:list[UploadFile]=File(...),preset:str=Query("web-friendly"),
                        authorization:str|None=Header(None),
                        x_filemagik_visitor:str|None=Header(None)):
    secret=os.getenv("PDF_ENGINE_SECRET","")
    if len(secret)<32 or not authorization or not authorization.startswith("Bearer ") or not hmac.compare_digest(authorization[7:],secret):
        raise HTTPException(401,"Not authorized")
    if not re.fullmatch(r"[a-f0-9]{64}",x_filemagik_visitor or ""):
        raise HTTPException(403,"Visitor identity is required")
    if preset not in PRESETS:
        raise HTTPException(400,"Unsupported batch preset")
    if not 1<=len(files)<=MAX_ITEMS:
        raise HTTPException(413,"Maximum six files per batch")
    total=0
    manifest={"preset":preset,"files":[]}
    destination=io.BytesIO()
    with zipfile.ZipFile(destination,"w",compression=zipfile.ZIP_DEFLATED,compresslevel=3) as archive:
        for index,file in enumerate(files):
            source_name=(file.filename or "")[:150]
            extension=Path(source_name).suffix.lower()
            rule=PRESETS[preset].get(extension)
            if not rule:
                manifest["files"].append({"index":index,"name":source_name,"status":"unsupported"})
                continue
            data=await file.read(MAX_ITEM+1)
            total+=len(data)
            if total>MAX_TOTAL:
                raise HTTPException(413,"Maximum 12 MB cumulative upload")
            if not data or len(data)>MAX_ITEM:
                manifest["files"].append({"index":index,"name":source_name,"status":"too_large_or_empty"})
                continue
            operation,out_ext,engine=rule
            try:
                if engine=="image":
                    result=await asyncio.to_thread(convert_image,data,operation)
                else:
                    uploaded=UploadFile(filename="input"+extension,file=io.BytesIO(data))
                    response=await asyncio.to_thread(media_convert,operation,uploaded,None,None,
                                authorization,x_filemagik_visitor)
                    result=response.body
                if not result:
                    raise ValueError("Empty result")
                out_name=secure_name(source_name,index)+out_ext
                archive.writestr(out_name,result)
                if destination.tell()>MAX_ZIP:
                    raise HTTPException(413,"Batch output exceeds 12 MB")
                manifest["files"].append({"index":index,"name":source_name,"status":"ok",
                    "output":out_name,"bytes":len(result),"sha256":hashlib.sha256(result).hexdigest()})
            except HTTPException as error:
                if error.status_code in (401,403,429,503):
                    raise
                manifest["files"].append({"index":index,"name":source_name,"status":"error",
                    "code":error.status_code})
            except (ValueError,OSError):
                manifest["files"].append({"index":index,"name":source_name,"status":"error"})
        if not any(row["status"]=="ok" for row in manifest["files"]):
            raise HTTPException(422,"No compatible file was converted")
        archive.writestr("manifest.json",json.dumps(manifest,separators=(",",":"),ensure_ascii=False))
    if len(destination.getvalue())>MAX_ZIP:
        raise HTTPException(413,"Batch archive exceeds 12 MB")
    return Response(destination.getvalue(),media_type="application/zip",
        headers={"Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff",
                 "Content-Disposition":'attachment; filename="filemagik-batch.zip"'})
