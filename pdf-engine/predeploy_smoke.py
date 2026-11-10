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
        finally:
            if original_path is None:os.environ.pop("PDF_ENGINE_QUOTA_DB",None)
            else:os.environ["PDF_ENGINE_QUOTA_DB"]=original_path
    print("PASS: private Gotenberg, authenticated FastAPI Office/PDF, DOCX/XLSX, irreversible redaction, ODS/ODP Office fidelity and denial checks")
if __name__=="__main__":
    asyncio.run(verify())
