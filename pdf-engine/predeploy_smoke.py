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
    with tempfile.TemporaryDirectory(prefix="filemagik-railway-qa-") as temp_dir:
        os.environ["PDF_ENGINE_QUOTA_DB"]=temp_dir+"/quota.sqlite3"
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

            # Run real examples of the newly consolidated engines in the
            # PREDEPLOY PROCESS ONLY, without exposing them to live traffic.
            # All quota files are temporary, not charged to real visitors.
            import time
            import resource
            import wave
            import binascii
            from PIL import Image
            from worker_capacity import memory_headroom
            UU="begin 644 test_read_format_rar5_stored.rar\nM4F%R(1H'`0`SDK7E\"@$%!@`%`0&`@``X,`9C+`(#\"YT`!)T`I(,\"M$.@E8``\nM`0YH96QL;W=O<FQD+G1X=`H#$WX.JUM6Z0X::&5L;&\\@;&EB87)C:&EV92!T\n397-T('-U:71E(0H==U91`P4"""Railway predeploy gate: prove the API can reach the actual private Gotenberg
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
    with tempfile.TemporaryDirectory(prefix="filemagik-railway-qa-") as temp_dir:
        os.environ["PDF_ENGINE_QUOTA_DB"]=temp_dir+"/quota.sqlite3"
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
```\n`\nend\n"
            preserved={key:os.environ.get(key) for key in (
                "FILEMAGIK_UNIFIED_WORKERS_ENABLED",
                "FILEMAGIK_UNIFIED_CAPACITY_DB",
                "FILEMAGIK_IMAGE_QUOTA_DB",
                "FILEMAGIK_MEDIA_QUOTA_DB",
                "FILEMAGIK_ARCHIVE_QUOTA_DB",
            )}
            os.environ.update({
                "FILEMAGIK_UNIFIED_WORKERS_ENABLED":"true",
                "FILEMAGIK_UNIFIED_CAPACITY_DB":temp_dir+"/global.sqlite3",
                "FILEMAGIK_IMAGE_QUOTA_DB":temp_dir+"/image.sqlite3",
                "FILEMAGIK_MEDIA_QUOTA_DB":temp_dir+"/media.sqlite3",
                "FILEMAGIK_ARCHIVE_QUOTA_DB":temp_dir+"/archive.sqlite3",
            })
            try:
                t0=time.perf_counter()
                memory_headroom()
                source=io.BytesIO()
                Image.new("RGB",(8,8),"red").save(source,format="HEIF",quality=80)
                image=client.post("/workers/image/v1/convert?operation=heic-to-png",
                    headers=headers,files={"file":("sample.heif",source.getvalue(),"image/heif")})
                if image.status_code!=200 or not image.content.startswith(b"\\x89PNG"):
                    raise RuntimeError("Integrated Railway HEIF->PNG failed: "+str(image.status_code))
                frames=[Image.new("RGB",(8,8),"red"),Image.new("RGB",(8,8),"blue")]
                source=io.BytesIO()
                frames[0].save(source,format="GIF",save_all=True,append_images=frames[1:],
                               duration=[120,240],loop=0)
                image=client.post("/workers/image/v1/convert?operation=gif-to-animated-webp",
                    headers=headers,files={"file":("sample.gif",source.getvalue(),"image/gif")})
                if image.status_code!=200 or image.content[:4]!=b"RIFF":
                    raise RuntimeError("Integrated Railway GIF->WebP failed: "+str(image.status_code))
                wav=io.BytesIO()
                with wave.open(wav,"wb") as audio:
                    audio.setnchannels(1);audio.setsampwidth(2);audio.setframerate(8000)
                    audio.writeframes(b"\\x00\\x00"*8000)
                converted=client.post("/workers/media/v1/media?operation=audio-to-mp3",
                    headers=headers,files={"file":("sample.wav",wav.getvalue(),"audio/wav")})
                if converted.status_code!=200 or not (
                    converted.content.startswith(b"ID3") or converted.content[:1]==b"\\xff"):
                    raise RuntimeError("Integrated Railway FFmpeg WAV->MP3 failed: "+str(converted.status_code))
                rar_bytes=b"".join(binascii.a2b_uu(line.encode("ascii"))
                                  for line in UU.splitlines()[1:-1])
                archive=client.post("/workers/archive/v1/extract",headers=headers,
                    files={"file":("sample.rar",rar_bytes,"application/x-rar-compressed")})
                if archive.status_code!=200 or not archive.content.startswith(b"PK"):
                    raise RuntimeError("Integrated Railway RAR5->ZIP failed: "+str(archive.status_code))
                memory_headroom()
                peak_mb=resource.getrusage(resource.RUSAGE_SELF).ru_maxrss/1024
                if peak_mb>700:
                    raise RuntimeError("Integrated engine exceeds 700 MB process memory limit")
                wall_seconds=round(time.perf_counter()-t0,2)
                if wall_seconds>45:
                    raise RuntimeError("Integrated engines exceeded 45 seconds smoke budget")
                print("PASS: integrated HEIF/GIF/FFmpeg/RAR5 predeploy smoke, "
                      "wall_seconds=",wall_seconds,"process_peak_mib=",round(peak_mb,1))
            finally:
                for key,previous in preserved.items():
                    if previous is None:os.environ.pop(key,None)
                    else:os.environ[key]=previous
        finally:
            if original_path is None:os.environ.pop("PDF_ENGINE_QUOTA_DB",None)
            else:os.environ["PDF_ENGINE_QUOTA_DB"]=original_path
    print("PASS: private Gotenberg, authenticated FastAPI Office/PDF, DOCX/XLSX, irreversible redaction, ODS/ODP Office fidelity and denial checks")
if __name__=="__main__":
    asyncio.run(verify())
