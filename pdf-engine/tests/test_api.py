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

@pytest.mark.parametrize("bad_page",[1.5,"1",True,0,-1])
def test_redaction_rejects_coerced_or_out_of_range_page_indices(bad_page):
    import json
    from fastapi import HTTPException
    with pytest.raises(HTTPException) as rejected:
        _redaction_regions(make_pdf(),json.dumps([
            {"page":bad_page,"x":0.1,"y":0.1,"width":0.2,"height":0.1}
        ]))
    assert rejected.value.status_code==400

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


def test_private_ocr_creates_searchable_pdf_from_raster(monkeypatch):
    import shutil
    from pypdf import PdfReader
    if not shutil.which("tesseract"):
        pytest.skip("Tesseract not installed")
    secret="o"*40
    monkeypatch.setenv("PDF_ENGINE_SECRET",secret)
    result=client.post("/v1/jobs?operation=ocr-pdf",
        headers={"Authorization":"Bearer "+secret,"X-Filemagik-Visitor":VISITOR},
        files={"file":("scanned.pdf",make_pdf(),"application/pdf")})
    assert result.status_code==200,result.text[:250] if result.status_code!=200 else ""
    result_pdf=PdfReader(io.BytesIO(result.content))
    assert len(result_pdf.pages)==1
    assert "FileMagik" in (result_pdf.pages[0].extract_text() or "")

def test_ocr_rejects_invalid_pdf_without_rasterizing(monkeypatch):
    secret="p"*40
    monkeypatch.setenv("PDF_ENGINE_SECRET",secret)
    result=client.post("/v1/jobs?operation=ocr-pdf",
        headers={"Authorization":"Bearer "+secret,"X-Filemagik-Visitor":VISITOR},
        files={"file":("broken.pdf",b"not a pdf","application/pdf")})
    assert result.status_code==422


def test_native_pdf_image_xobject_replacement_preserves_text(monkeypatch):
    from PIL import Image
    from reportlab.lib.utils import ImageReader
    from pypdf import PdfReader
    secret="n"*40
    monkeypatch.setenv("PDF_ENGINE_SECRET",secret)
    original=io.BytesIO()
    paper=canvas.Canvas(original)
    paper.drawString(60,700,"Original searchable text")
    red=Image.new("RGB",(32,32),(245,20,20))
    paper.drawImage(ImageReader(red),60,500,width=80,height=80)
    paper.save()
    blue=Image.new("RGB",(32,32),(10,60,245))
    replacement=io.BytesIO();blue.save(replacement,format="PNG")
    response=client.post("/v1/jobs?operation=replace-pdf-image",headers={
      "Authorization":"Bearer "+secret,"X-Filemagik-Visitor":VISITOR},
      files={"file":("input.pdf",original.getvalue(),"application/pdf"),
             "replacement":("replacement.png",replacement.getvalue(),"image/png")},
      data={"page":"1","image_index":"1"})
    assert response.status_code==200,response.text[:250] if response.status_code!=200 else ""
    document=PdfReader(io.BytesIO(response.content))
    assert "Original searchable text" in document.pages[0].extract_text()
    images=list(document.pages[0].images)
    assert images
    sample=images[0].image.convert("RGB").getpixel((16,16))
    assert sample[2]>sample[0]

def test_native_pdf_replacement_rejects_missing_image(monkeypatch):
    secret="m"*40
    monkeypatch.setenv("PDF_ENGINE_SECRET",secret)
    result=client.post("/v1/jobs?operation=replace-pdf-image",headers={
      "Authorization":"Bearer "+secret,"X-Filemagik-Visitor":VISITOR},
      files={"file":("input.pdf",make_pdf(),"application/pdf"),
             "replacement":("new.png",b"broken","image/png")},
      data={"page":"1","image_index":"1"})
    assert result.status_code in (400,422)


def test_native_text_object_replacement_is_searchable_and_not_rasterized(monkeypatch):
    from pypdf import PdfReader
    secret="s"*40
    monkeypatch.setenv("PDF_ENGINE_SECRET",secret)
    original=make_pdf()
    response=client.post("/v1/jobs?operation=replace-pdf-text",headers={
        "Authorization":"Bearer "+secret,"X-Filemagik-Visitor":VISITOR},
        files={"file":("text.pdf",original,"application/pdf")},
        data={"page":"1","source_text":"FileMagik validation","new_text":"FileMagik alteration"})
    assert response.status_code==200,response.text[:250] if response.status_code!=200 else ""
    source=PdfReader(io.BytesIO(original)).pages[0].extract_text()
    edited=PdfReader(io.BytesIO(response.content)).pages[0].extract_text()
    assert "FileMagik validation" in source
    assert "FileMagik alteration" in edited
    assert "FileMagik validation" not in edited

def test_native_text_object_edit_rejects_length_changes(monkeypatch):
    secret="u"*40
    monkeypatch.setenv("PDF_ENGINE_SECRET",secret)
    response=client.post("/v1/jobs?operation=replace-pdf-text",headers={
        "Authorization":"Bearer "+secret,"X-Filemagik-Visitor":VISITOR},
        files={"file":("text.pdf",make_pdf(),"application/pdf")},
        data={"page":"1","source_text":"FileMagik validation","new_text":"different"})
    assert response.status_code==400


def test_authorized_password_pdf_unlock_preserves_pages_and_searchable_text(monkeypatch):
    from pypdf import PdfReader,PdfWriter
    secret="w"*40
    monkeypatch.setenv("PDF_ENGINE_SECRET",secret)
    writer=PdfWriter()
    writer.append(PdfReader(io.BytesIO(make_pdf())))
    writer.encrypt(user_password="authorized-pass",owner_password="owner-pass",algorithm="AES-256")
    secured=io.BytesIO();writer.write(secured)
    before=PdfReader(io.BytesIO(secured.getvalue()))
    assert before.is_encrypted
    response=client.post("/v1/jobs?operation=unlock-pdf",headers={
      "Authorization":"Bearer "+secret,"X-Filemagik-Visitor":VISITOR},
      files={"file":("secured.pdf",secured.getvalue(),"application/pdf")},
      data={"pdf_password":"authorized-pass"})
    assert response.status_code==200,response.text[:200] if response.status_code!=200 else ""
    unlocked=PdfReader(io.BytesIO(response.content))
    assert not unlocked.is_encrypted
    assert len(unlocked.pages)==1
    assert "FileMagik validation" in unlocked.pages[0].extract_text()

def test_pdf_unlock_refuses_bad_or_missing_password_and_plain_pdf(monkeypatch):
    from pypdf import PdfReader,PdfWriter
    secret="v"*40
    monkeypatch.setenv("PDF_ENGINE_SECRET",secret)
    writer=PdfWriter();writer.append(PdfReader(io.BytesIO(make_pdf())))
    writer.encrypt("valid-password",algorithm="AES-256")
    secured=io.BytesIO();writer.write(secured)
    headers={"Authorization":"Bearer "+secret,"X-Filemagik-Visitor":VISITOR}
    for password,expected in (("wrong",422),("",400)):
        response=client.post("/v1/jobs?operation=unlock-pdf",headers=headers,
          files={"file":("encrypted.pdf",secured.getvalue(),"application/pdf")},
          data={"pdf_password":password})
        assert response.status_code==expected
    plain=client.post("/v1/jobs?operation=unlock-pdf",headers=headers,
      files={"file":("plain.pdf",make_pdf(),"application/pdf")},
      data={"pdf_password":"valid-password"})
    assert plain.status_code==422

def test_pdf_unlock_requires_private_authorization(monkeypatch):
    from pypdf import PdfReader,PdfWriter
    monkeypatch.setenv("PDF_ENGINE_SECRET","j"*40)
    writer=PdfWriter();writer.append(PdfReader(io.BytesIO(make_pdf())))
    writer.encrypt("known")
    stream=io.BytesIO();writer.write(stream)
    response=client.post("/v1/jobs?operation=unlock-pdf",
      files={"file":("secure.pdf",stream.getvalue(),"application/pdf")},
      data={"pdf_password":"known"})
    assert response.status_code==401


def test_smart_mixed_pdf_ocr_preserves_searchable_page_and_recognizes_scan(monkeypatch):
    import shutil
    from PIL import Image,ImageDraw,ImageFont
    from reportlab.lib.utils import ImageReader
    from pypdf import PdfReader
    if not shutil.which("tesseract"):
        pytest.skip("Tesseract not installed")
    secret="k"*40
    monkeypatch.setenv("PDF_ENGINE_SECRET",secret)
    output=io.BytesIO()
    paper=canvas.Canvas(output)
    paper.drawString(65,760,"Original digital searchable page")
    paper.showPage()
    image=Image.new("RGB",(900,250),"white")
    draw=ImageDraw.Draw(image)
    fontpath="/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
    font=ImageFont.truetype(fontpath,48) if os.path.exists(fontpath) else ImageFont.load_default()
    draw.text((45,75),"SCANNED CONTENT",fill="black",font=font)
    paper.drawImage(ImageReader(image),50,500,width=480,height=135)
    paper.save()
    before=PdfReader(io.BytesIO(output.getvalue()))
    assert len(before.pages)==2
    assert not (before.pages[1].extract_text() or "").strip()
    response=client.post("/v1/jobs?operation=ocr-pdf",headers={
     "Authorization":"Bearer "+secret,"X-Filemagik-Visitor":VISITOR},
     files={"file":("mixed.pdf",output.getvalue(),"application/pdf")})
    assert response.status_code==200,response.text[:200] if response.status_code!=200 else ""
    after=PdfReader(io.BytesIO(response.content))
    assert len(after.pages)==2
    assert "Original digital searchable page" in (after.pages[0].extract_text() or "")
    assert after.pages[0].get_contents().get_data()==before.pages[0].get_contents().get_data()
    assert "SCANNED" in (after.pages[1].extract_text() or "").upper()

def test_smart_ocr_returns_digital_only_pdf_byte_identical(monkeypatch):
    secret="d"*40
    monkeypatch.setenv("PDF_ENGINE_SECRET",secret)
    original=make_pdf()
    result=client.post("/v1/jobs?operation=ocr-pdf",headers={
      "Authorization":"Bearer "+secret,"X-Filemagik-Visitor":VISITOR},
      files={"file":("digital.pdf",original,"application/pdf")})
    assert result.status_code==200
    assert result.content==original
