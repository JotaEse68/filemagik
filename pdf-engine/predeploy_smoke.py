"""Railway predeploy gate: prove the API can reach the actual private Gotenberg
service and obtain a valid Office/PDF conversion before releasing the worker.
Runs locally inside the new container; no user documents or credentials logged.
"""
import io
import os
import asyncio
import tempfile
from fastapi.testclient import TestClient
import httpx
from docx import Document
from pypdf import PdfReader

URL=os.environ.get("GOTENBERG_URL","http://gotenberg.railway.internal:3000").rstrip("/")
async def verify():
    document=Document()
    document.add_heading("FileMagik integration check",level=1)
    document.add_paragraph("Professional PDF engine isolated Railway service")
    table=document.add_table(rows=2,cols=2)
    table.cell(0,0).text="Item"
    table.cell(0,1).text="Quantity"
    table.cell(1,0).text="Notebook"
    table.cell(1,1).text="3"
    buf=io.BytesIO()
    document.save(buf)
    async with httpx.AsyncClient(timeout=httpx.Timeout(25,connect=5)) as client:
        health=await client.get(URL+"/health")
        if health.status_code!=200:
            raise RuntimeError("Gotenberg private health endpoint not healthy")
        answer=await client.post(URL+"/forms/libreoffice/convert",
            files={"files":("predeploy.docx",buf.getvalue(),
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document")})
        if answer.status_code!=200 or not answer.content.startswith(b"%PDF-"):
            raise RuntimeError("Gotenberg Office conversion predeploy smoke failed")
        pdf=PdfReader(io.BytesIO(answer.content))
        if not pdf.pages or "FileMagik integration" not in (pdf.pages[0].extract_text() or ""):
            raise RuntimeError("Gotenberg produced a PDF with missing document content")
        optimized=await client.post(URL+"/forms/pdf/optimize",
            files={"files":("predeploy.pdf",answer.content,"application/pdf")})
        if optimized.status_code!=200 or not optimized.content.startswith(b"%PDF-"):
            raise RuntimeError("Gotenberg PDF optimization predeploy smoke failed")
        if "FileMagik integration" not in (PdfReader(io.BytesIO(optimized.content)).pages[0].extract_text() or ""):
            raise RuntimeError("Optimization lost searchable content")
    # Exercise the real FastAPI auth, quota and routing layers without exposing
    # the bearer externally or consuming production users' usage counters.
    from app import app
    original_path=os.environ.get("PDF_ENGINE_QUOTA_DB")
    original_unified=os.environ.get("FILEMAGIK_UNIFIED_WORKERS_ENABLED")
    with tempfile.TemporaryDirectory(prefix="filemagik-railway-qa-") as temp_dir:
        os.environ["PDF_ENGINE_QUOTA_DB"]=temp_dir+"/quota.sqlite3"
        # Predeploy has no production /data mount yet. Keep the legacy PDF smoke
        # independent of the unified capacity DB, then test workers with a
        # separate temporary DB later in this same predeploy verification.
        os.environ["FILEMAGIK_UNIFIED_WORKERS_ENABLED"]="false"
        try:
            headers={"Authorization":"Bearer "+os.environ["PDF_ENGINE_SECRET"],
                     "X-Filemagik-Visitor":"e"*64}
            client=TestClient(app)
            office=client.post("/v1/jobs?operation=office-to-pdf",headers=headers,
                files={"file":("predeploy.docx",buf.getvalue(),"application/vnd.openxmlformats-officedocument.wordprocessingml.document")})
            if office.status_code!=200 or not office.content.startswith(b"%PDF-"):
                raise RuntimeError("FastAPI Office->PDF authenticated route failed: "+str(office.status_code))
            optimized=client.post("/v1/jobs?operation=optimize-pdf",headers=headers,
                files={"file":("predeploy.pdf",office.content,"application/pdf")})
            if optimized.status_code!=200 or not optimized.content.startswith(b"%PDF-"):
                raise RuntimeError("FastAPI PDF optimize authenticated route failed: "+str(optimized.status_code))
            docx=client.post("/v1/jobs?operation=pdf-to-docx",headers=headers,
                files={"file":("predeploy.pdf",office.content,"application/pdf")})
            if docx.status_code!=200 or not docx.content.startswith(b"PK"):
                raise RuntimeError("FastAPI PDF->DOCX authenticated route failed: "+str(docx.status_code))
            excel=client.post("/v1/jobs?operation=pdf-to-xlsx",headers=headers,
                files={"file":("predeploy.pdf",office.content,"application/pdf")})
            if excel.status_code!=200 or not excel.content.startswith(b"PK"):
                raise RuntimeError("FastAPI PDF->XLSX authenticated route failed: "+str(excel.status_code))
            blocked=client.post("/v1/jobs?operation=pdf-to-docx",
                files={"file":("predeploy.pdf",office.content,"application/pdf")})
            if blocked.status_code!=401:
                raise RuntimeError("Missing bearer token was not denied")
            # A real protected redaction must remove original searchable text,
            # not merely paint an overlay over it. Use a separate test visitor
            # because the main smoke identity already consumes its hourly budget.
            redact_headers={**headers,"X-Filemagik-Visitor":"f"*64}
            from json import dumps
            redaction=client.post("/v1/jobs?operation=redact-pdf",headers=redact_headers,
                files={"file":("predeploy.pdf",office.content,"application/pdf")},
                data={"regions":dumps([{"page":1,"x":0.01,"y":0.01,"width":0.98,"height":0.98}])})
            if redaction.status_code!=200 or not redaction.content.startswith(b"%PDF-"):
                raise RuntimeError("Authenticated PDF redaction failed: "+str(redaction.status_code))
            before=PdfReader(io.BytesIO(office.content))
            after=PdfReader(io.BytesIO(redaction.content))
            if len(before.pages)!=len(after.pages):
                raise RuntimeError("Redaction changed document page count")
            original_text=" ".join(page.extract_text() or "" for page in before.pages)
            redacted_text=after.pages[0].extract_text() or ""
            if "FileMagik integration" not in original_text or "FileMagik integration" in redacted_text:
                raise RuntimeError("Redaction did not irreversibly remove searchable source text")
            # Validate actual OpenDocument files through the authenticated API,
            # not only a mocked browser network response. Separate visitors
            # avoid exhausting the hourly smoke budget.
            from odf_fixtures import ods_fixture,odp_fixture
            for extension,mime,payload,marker,identity in (
                (".ods","application/vnd.oasis.opendocument.spreadsheet",
                    ods_fixture(),"FileMagik ODS integration","c"*64),
                (".odp","application/vnd.oasis.opendocument.presentation",
                    odp_fixture(),"FileMagik ODP integration","d"*64)):
                result=client.post("/v1/jobs?operation=office-to-pdf",
                    headers={**headers,"X-Filemagik-Visitor":identity},
                    files={"file":("predeploy"+extension,payload,mime)})
                if result.status_code!=200 or not result.content.startswith(b"%PDF-"):
                    raise RuntimeError("Authenticated OpenDocument "+extension+
                        " to PDF conversion failed: "+str(result.status_code))
                readable=" ".join(page.extract_text() or "" for page in PdfReader(
                    io.BytesIO(result.content)).pages)
                if marker not in readable:
                    raise RuntimeError("OpenDocument "+extension+
                        " conversion lost editable source text")

            # Exercise all integrated engines in the PREDEPLOY PROCESS ONLY.
            # Quotas live in a temporary directory, not the production DB.
            import time
            import resource
            import wave
            import binascii
            from PIL import Image
            from worker_capacity import memory_headroom
            UU="begin 644 test_read_format_rar5_stored.rar\nM4F%R(1H'`0`SDK7E\"@$%!@`%`0&`@``X,`9C+`(#\"YT`!)T`I(,\"M$.@E8``\nM`0YH96QL;W=O<FQD+G1X=`H#$WX.JUM6Z0X::&5L;&\\@;&EB87)C:&EV92!T\n397-T('-U:71E(0H==U91`P4$````\n`\nend\n"
            preserved={key:os.environ.get(key) for key in (
                "FILEMAGIK_UNIFIED_WORKERS_ENABLED",
                "FILEMAGIK_UNIFIED_CAPACITY_DB",
                "FILEMAGIK_IMAGE_QUOTA_DB",
                "FILEMAGIK_MEDIA_QUOTA_DB",
                "FILEMAGIK_ARCHIVE_QUOTA_DB",
                "FILEMAGIK_MEDIA_HOURLY_VISITOR",
                "FILEMAGIK_IMAGE_HOURLY_VISITOR",
            )}
            os.environ.update({
                "FILEMAGIK_UNIFIED_WORKERS_ENABLED":"true",
                "FILEMAGIK_UNIFIED_CAPACITY_DB":temp_dir+"/global.sqlite3",
                "FILEMAGIK_IMAGE_QUOTA_DB":temp_dir+"/image.sqlite3",
                "FILEMAGIK_MEDIA_QUOTA_DB":temp_dir+"/media.sqlite3",
                "FILEMAGIK_ARCHIVE_QUOTA_DB":temp_dir+"/archive.sqlite3",
                "FILEMAGIK_MEDIA_HOURLY_VISITOR":"10",
                "FILEMAGIK_IMAGE_HOURLY_VISITOR":"10",
            })
            try:
                start=time.perf_counter()
                memory_headroom()
                heif=io.BytesIO()
                Image.new("RGB",(8,8),"red").save(heif,format="HEIF",quality=80)
                result=client.post("/workers/image/v1/convert?operation=heic-to-png",
                    headers=headers,files={"file":("sample.heif",heif.getvalue(),"image/heif")})
                if result.status_code!=200 or not result.content.startswith(b"\x89PNG"):
                    raise RuntimeError("Railway HEIF->PNG integration failed: "+str(result.status_code))
                frames=[Image.new("RGB",(8,8),"red"),Image.new("RGB",(8,8),"blue")]
                gif=io.BytesIO()
                frames[0].save(gif,format="GIF",save_all=True,append_images=frames[1:],
                               duration=[120,240],loop=0)
                result=client.post("/workers/image/v1/convert?operation=gif-to-animated-webp",
                    headers=headers,files={"file":("sample.gif",gif.getvalue(),"image/gif")})
                if result.status_code!=200 or result.content[:4]!=b"RIFF":
                    raise RuntimeError("Railway GIF->WebP integration failed: "+str(result.status_code))
                wav=io.BytesIO()
                with wave.open(wav,"wb") as audio:
                    audio.setnchannels(1);audio.setsampwidth(2);audio.setframerate(8000)
                    audio.writeframes(b"\x00\x00"*8000)
                result=client.post("/workers/media/v1/media?operation=audio-to-mp3",
                    headers=headers,files={"file":("sample.wav",wav.getvalue(),"audio/wav")})
                if result.status_code!=200 or not (result.content.startswith(b"ID3")
                                                    or result.content[:1]==b"\xff"):
                    raise RuntimeError("Railway FFmpeg WAV->MP3 failed: "+str(result.status_code))
                # G3/G4 certification: exercise the actual FFmpeg and Pillow
                # routes inside Railway before making this deployment live.
                edited_gif=client.post(
                    "/workers/image/v1/convert?operation=gif-edit-webp&start_frame=1&end_frame=2&speed=2",
                    headers=headers,files={"file":("sample.gif",gif.getvalue(),"image/gif")})
                if edited_gif.status_code!=200 or edited_gif.content[:4]!=b"RIFF":
                    raise RuntimeError("Railway GIF animation edit failed: "+str(edited_gif.status_code))
                with Image.open(io.BytesIO(edited_gif.content)) as animation:
                    if animation.n_frames!=2:
                        raise RuntimeError("Railway GIF edit lost animation frames")
                trimmed=client.post(
                    "/workers/media/v1/media?operation=trim-audio-mp3&start=0.1&end=0.5",
                    headers=headers,files={"file":("sample.wav",wav.getvalue(),"audio/wav")})
                if trimmed.status_code!=200 or not (
                    trimmed.content[:3]==b"ID3" or trimmed.content[:1]==b"\\xff"):
                    raise RuntimeError("Railway FFmpeg audio trimming failed: "+str(trimmed.status_code))
                joined=client.post(
                    "/workers/media/v1/join?operation=join-audio-mp3",
                    headers=headers,files=[
                        ("files",("first.wav",wav.getvalue(),"audio/wav")),
                        ("files",("second.wav",wav.getvalue(),"audio/wav"))])
                if joined.status_code!=200 or not (
                    joined.content[:3]==b"ID3" or joined.content[:1]==b"\\xff"):
                    raise RuntimeError("Railway FFmpeg audio joining failed: "+str(joined.status_code))
                rar_data=b"".join(binascii.a2b_uu(line.encode("ascii"))
                                  for line in UU.splitlines()[1:-1])
                result=client.post("/workers/archive/v1/extract",headers=headers,
                    files={"file":("sample.rar",rar_data,"application/x-rar-compressed")})
                if result.status_code!=200 or not result.content.startswith(b"PK"):
                    raise RuntimeError("Railway RAR5->ZIP integration failed: "+str(result.status_code))
                memory_headroom()
                peak_mib=resource.getrusage(resource.RUSAGE_SELF).ru_maxrss/1024
                duration=round(time.perf_counter()-start,2)
                if peak_mib>700 or duration>45:
                    raise RuntimeError("Railway integrated worker resource budget exceeded")
                print("PASS: private integrated HEIF/GIF/FFmpeg/RAR5, seconds=",duration,
                      "process_peak_mib=",round(peak_mib,1))
            finally:
                for key,value in preserved.items():
                    if value is None:os.environ.pop(key,None)
                    else:os.environ[key]=value
        finally:
            if original_path is None:os.environ.pop("PDF_ENGINE_QUOTA_DB",None)
            else:os.environ["PDF_ENGINE_QUOTA_DB"]=original_path
            if original_unified is None:os.environ.pop("FILEMAGIK_UNIFIED_WORKERS_ENABLED",None)
            else:os.environ["FILEMAGIK_UNIFIED_WORKERS_ENABLED"]=original_unified
    print("PASS: private Gotenberg, authenticated FastAPI Office/PDF, DOCX/XLSX, irreversible redaction, ODS/ODP Office fidelity and denial checks")
if __name__=="__main__":
    asyncio.run(verify())
