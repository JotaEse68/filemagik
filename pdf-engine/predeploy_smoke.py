"""Railway predeploy gate: prove the API can reach the actual private Gotenberg
service and obtain a valid Office/PDF conversion before releasing the worker.
Runs locally inside the new container; no user documents or credentials logged.
"""
import io
import os
import asyncio
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
    print("PASS: private Gotenberg health, DOCX->PDF and PDF optimization")
if __name__=="__main__":
    asyncio.run(verify())
