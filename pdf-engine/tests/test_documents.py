import io
import pytest
from pypdf import PdfReader
from openpyxl import load_workbook
from docx import Document
from reportlab.pdfgen import canvas
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
