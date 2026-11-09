import io
import os
from fastapi.testclient import TestClient
from reportlab.pdfgen import canvas
from docx import Document
from app import app

client=TestClient(app)

def make_pdf():
    stream=io.BytesIO()
    p=canvas.Canvas(stream)
    p.drawString(60,700,"FileMagik validation")
    p.save()
    return stream.getvalue()

def test_health_endpoint_is_public_only_for_status():
    result=client.get("/healthz")
    assert result.status_code==200
    assert result.json()["engine"]=="filemagik-pdf-engine"

def test_conversion_requires_strong_secret(monkeypatch):
    monkeypatch.setenv("PDF_ENGINE_SECRET","x"*40)
    result=client.post("/v1/jobs?operation=pdf-to-docx",
        files={"file":("report.pdf",make_pdf(),"application/pdf")})
    assert result.status_code==401

def test_authorized_pdf_to_docx_returns_real_editable_zip(monkeypatch):
    secret="y"*40
    monkeypatch.setenv("PDF_ENGINE_SECRET",secret)
    result=client.post("/v1/jobs?operation=pdf-to-docx",
        headers={"Authorization":"Bearer "+secret},
        files={"file":("report.pdf",make_pdf(),"application/pdf")})
    assert result.status_code==200,result.text[:400] if result.status_code!=200 else ""
    assert result.content.startswith(b"PK")
    doc=Document(io.BytesIO(result.content))
    assert any("FileMagik validation" in p.text for p in doc.paragraphs)

def test_authorized_request_rejects_bad_extension(monkeypatch):
    secret="z"*40
    monkeypatch.setenv("PDF_ENGINE_SECRET",secret)
    result=client.post("/v1/jobs?operation=pdf-to-docx",
        headers={"Authorization":"Bearer "+secret},
        files={"file":("payload.txt",b"hello","text/plain")})
    assert result.status_code==415

def test_malformed_pdf_is_rejected(monkeypatch):
    secret="k"*40
    monkeypatch.setenv("PDF_ENGINE_SECRET",secret)
    result=client.post("/v1/jobs?operation=pdf-to-xlsx",
        headers={"Authorization":"Bearer "+secret},
        files={"file":("broken.pdf",b"not a pdf","application/pdf")})
    assert result.status_code in (422,500)
