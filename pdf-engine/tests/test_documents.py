import io
import pytest
from pypdf import PdfReader
from openpyxl import load_workbook
from docx import Document
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader
from PIL import Image
from document import _excel_value
from document import pdf_to_docx,pdf_to_xlsx
from app import inspect_pdf,lossy_optimize

def sample_pdf():
    buf=io.BytesIO()
    paper=canvas.Canvas(buf,pagesize=(595,842))
    paper.setFont("Helvetica",14)
    paper.drawString(55,770,"Invoice")
    paper.setFont("Helvetica",11)
    paper.drawString(60,720,"Notebook")
    paper.drawString(260,720,"3")
    paper.rect(50,695,310,45)
    paper.line(230,695,230,740)
    paper.line(50,715,360,715)
    paper.drawString(60,699,"Product")
    paper.drawString(260,699,"Quantity")
    paper.showPage()
    paper.save()
    return buf.getvalue()

def test_docx_is_editable_with_real_table():
    data=pdf_to_docx(sample_pdf())
    document=Document(io.BytesIO(data))
    assert document.tables
    assert document.tables[0].rows
    assert any("Notebook" in cell.text for table in document.tables for row in table.rows for cell in row.cells)

def test_excel_produces_real_cells():
    data=pdf_to_xlsx(sample_pdf())
    book=load_workbook(io.BytesIO(data))
    values=[str(cell.value or "") for row in book.active for cell in row]
    assert any("Notebook" in value for value in values)

def test_output_pdf_is_real():
    data=sample_pdf()
    assert len(inspect_pdf(data).pages)==1

def test_encrypted_pdf_rejected():
    reader=PdfReader(io.BytesIO(sample_pdf()))
    from pypdf import PdfWriter
    writer=PdfWriter()
    writer.add_page(reader.pages[0])
    writer.encrypt("Test1234")
    result=io.BytesIO();writer.write(result)
    with pytest.raises(ValueError,match="Encrypted"):
        pdf_to_docx(result.getvalue())

@pytest.mark.parametrize("style",[
    "invoice","multi","landscape","numbers","wide","notes",
    "table","columns","image","footer","long"
])
def test_diverse_pdf_corpus_roundtrip_to_editable_office(style):
    buf=io.BytesIO()
    size=(842,595) if style=="landscape" else (595,842)
    paper=canvas.Canvas(buf,pagesize=size)
    paper.setFont("Helvetica",12)
    paper.drawString(48,size[1]-55,"FileMagik "+style+" example")
    if style in ("invoice","table","wide"):
        paper.rect(45,600,425,100)
        paper.line(260,600,260,700)
        paper.line(45,650,470,650)
        paper.drawString(75,670,"Product")
        paper.drawString(280,670,"Price")
        paper.drawString(75,620,"Notebook")
        paper.drawString(280,620,"12.45")
    elif style=="numbers":
        paper.drawString(55,690,"Price")
        paper.drawString(290,690,"129.50")
        paper.drawString(55,662,"Item")
        paper.drawString(290,662,"0037")
    elif style=="columns":
        for y in (680,660,640,620):
            paper.drawString(50,y,"Category")
            paper.drawString(290,y,"Description")
    elif style=="image":
        img=Image.new("RGB",(140,95),"orange")
        paper.drawImage(ImageReader(img),70,525,140,95)
        paper.drawString(50,700,"Image with editable caption")
    elif style=="long":
        for y in range(700,80,-22):
            paper.drawString(50,y,"Editable paragraph content")
    else:
        paper.drawString(55,685,"Additional selectable content")
    if style=="multi":
        paper.showPage()
        paper.drawString(60,700,"Second page with selectable text")
    if style=="footer":
        paper.drawString(50,40,"Confidential report footer")
    paper.save()
    data=buf.getvalue()
    doc=Document(io.BytesIO(pdf_to_docx(data)))
    wb=load_workbook(io.BytesIO(pdf_to_xlsx(data)))
    assert len(doc.paragraphs)+len(doc.tables)>0
    assert wb.sheetnames
    words=" ".join(p.text for p in doc.paragraphs)
    assert "FileMagik" in words
    if style=="multi":assert len(doc.sections)>=2
    if style=="image":assert len(doc.inline_shapes)>=1
    if style in ("invoice","table","wide"):assert doc.tables
    if style=="numbers":
        values=[cell.value for row in wb.active for cell in row]
        assert any(v==129.5 for v in values)

def test_numeric_extraction_keeps_identifiers_and_real_numbers():
    assert _excel_value("0037")=="0037"
    assert _excel_value("37")==37
    assert _excel_value("12.45")==12.45
    assert _excel_value("1.234,50")==1234.50
    assert _excel_value("1,234.50")==1234.50

def test_image_only_pdf_is_not_misrepresented_as_editable():
    buf=io.BytesIO()
    p=canvas.Canvas(buf)
    img=Image.new("RGB",(140,95),"orange")
    p.drawImage(ImageReader(img),50,500,140,95)
    p.save()
    with pytest.raises(ValueError,match="OCR"):
        pdf_to_docx(buf.getvalue())
    with pytest.raises(ValueError,match="OCR"):
        pdf_to_xlsx(buf.getvalue())
