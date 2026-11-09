import io
import os
from fastapi.testclient import TestClient
import pytest
from reportlab.pdfgen import canvas
from docx import Document
from app import app,_redaction_regions

client=TestClient(app)
VISITOR='a'*64

@pytest.fixture(autouse=True)
def quota_file(monkeypatch,tmp_path):
    monkeypatch.setenv('PDF_ENGINE_QUOTA_DB',str(tmp_path/'usage.sqlite3'))


def make_pdf():
    stream=io.BytesIO()
    p=canvas.Canvas(stream)
    p.drawString(60,700,"FileMagik validation")
    p.save()
    return stream.getvalue()

def test_redaction_regions_convert_normalized_coordinates():
    import json
    region=json.loads(_redaction_regions(make_pdf(),'[{"page":1,"x":0.1,"y":0.1,"width":0.2,"height":0.05}]'))[0]
    assert region["page"]==1
    assert region["width"]>20
    assert region["height"]>10

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
        headers={"Authorization":"Bearer "+secret,"X-Filemagik-Visitor":VISITOR},
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
        headers={"Authorization":"Bearer "+secret,"X-Filemagik-Visitor":VISITOR},
        files={"file":("broken.pdf",b"not a pdf","application/pdf")})
    assert result.status_code==422

def test_rejects_missing_quota_identity(monkeypatch):
    secret="t"*40
    monkeypatch.setenv("PDF_ENGINE_SECRET",secret)
    result=client.post("/v1/jobs?operation=pdf-to-docx",
        headers={"Authorization":"Bearer "+secret},
        files={"file":("report.pdf",make_pdf(),"application/pdf")})
    assert result.status_code==403

def test_persistent_visitor_budget(monkeypatch):
    secret="b"*40
    monkeypatch.setenv("PDF_ENGINE_SECRET",secret)
    monkeypatch.setenv("PDF_ENGINE_DAILY_VISITOR","2")
    headers={"Authorization":"Bearer "+secret,"X-Filemagik-Visitor":VISITOR}
    for i in range(2):
        result=client.post("/v1/jobs?operation=pdf-to-docx",headers=headers,
            files={"file":("report.pdf",make_pdf(),"application/pdf")})
        assert result.status_code==200,(i,result.text[:160])
    result=client.post("/v1/jobs?operation=pdf-to-docx",headers=headers,
        files={"file":("report.pdf",make_pdf(),"application/pdf")})
    assert result.status_code==429

def test_malformed_visitor_does_not_consume_resources(monkeypatch):
    secret="c"*40
    monkeypatch.setenv("PDF_ENGINE_SECRET",secret)
    result=client.post("/v1/jobs?operation=pdf-to-docx",
        headers={"Authorization":"Bearer "+secret,"X-Filemagik-Visitor":"example.com"},
        files={"file":("report.pdf",make_pdf(),"application/pdf")})
    assert result.status_code==403

def test_redaction_is_registered_but_bad_geometry_denied(monkeypatch):
    secret="d"*40
    monkeypatch.setenv("PDF_ENGINE_SECRET",secret)
    result=client.post("/v1/jobs?operation=redact-pdf",headers={
        "Authorization":"Bearer "+secret,"X-Filemagik-Visitor":VISITOR},
        files={"file":("report.pdf",make_pdf(),"application/pdf")},
        data={"regions":'[{"page":1234,"x":0.1,"y":0.1,"width":0.2,"height":0.1}]'})
    assert result.status_code==400

def test_missing_persistent_volume_fails_closed(monkeypatch,tmp_path):
    secret="e"*40
    monkeypatch.setenv("PDF_ENGINE_SECRET",secret)
    monkeypatch.setenv("PDF_ENGINE_QUOTA_DB",str(tmp_path/"absent"/"db.sqlite"))
    result=client.post("/v1/jobs?operation=pdf-to-docx",
        headers={"Authorization":"Bearer "+secret,"X-Filemagik-Visitor":VISITOR},
        files={"file":("report.pdf",make_pdf(),"application/pdf")})
    assert result.status_code==503

def test_lossless_preserves_interactive_form_bytes(monkeypatch):
    secret="q"*40
    monkeypatch.setenv("PDF_ENGINE_SECRET",secret)
    buffer=io.BytesIO()
    paper=canvas.Canvas(buffer)
    paper.drawString(50,700,"Name")
    paper.acroForm.textfield(name="Customer",x=120,y=686,width=180,height=22)
    paper.save()
    original=buffer.getvalue()
    result=client.post("/v1/jobs?operation=optimize-pdf&quality=lossless",
        headers={"Authorization":"Bearer "+secret,"X-Filemagik-Visitor":VISITOR},
        files={"file":("form.pdf",original,"application/pdf")})
    assert result.status_code==200
    assert result.content==original

def test_lossy_refuses_interactive_form(monkeypatch):
    secret="r"*40
    monkeypatch.setenv("PDF_ENGINE_SECRET",secret)
    buf=io.BytesIO()
    paper=canvas.Canvas(buf)
    paper.drawString(50,700,'Name')
    paper.acroForm.textfield(name="Customer",x=120,y=686,width=180,height=22)
    paper.save()
    result=client.post("/v1/jobs?operation=optimize-pdf&quality=balanced",
        headers={"Authorization":"Bearer "+secret,"X-Filemagik-Visitor":VISITOR},
        files={"file":("form.pdf",buf.getvalue(),"application/pdf")})
    assert result.status_code==422
