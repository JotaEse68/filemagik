"""Deterministic PDF fidelity and compression acceptance corpus.

These checks certify supported document features, not universal Word/Excel
layout fidelity. Complex kerning, embedded font substitution and unsupported
PDF object graphs are intentionally outside this corpus.
"""
import io

from docx import Document
from openpyxl import load_workbook
from PIL import Image
from pypdf import PdfReader
from reportlab.lib.utils import ImageReader
from reportlab.pdfgen import canvas
from document import pdf_to_docx,pdf_to_xlsx
from app import lossy_optimize

def _complex_sample()->bytes:
    out=io.BytesIO();pdf=canvas.Canvas(out,pagesize=(595,842))
    pdf.setTitle("FileMagik tables and images test")
    pdf.setFont("Helvetica-Bold",14)
    pdf.drawString(45,790,"FileMagik Document Fidelity")
    pdf.setFont("Helvetica",11)
    pdf.drawString(45,760,"Customer ID")
    pdf.drawString(205,760,"Description")
    pdf.drawString(405,760,"Price EUR")
    for n,(id_,name,value) in enumerate((
        ("00012","Notebook","1.250,50"),
        ("00013","Pencil","2,30"),
        ("00014","Case","17,90"),
    )):
        y=733-n*30
        pdf.drawString(45,y,id_);pdf.drawString(205,y,name);pdf.drawString(405,y,value)
    pdf.setLineWidth(.8)
    for x in (40,195,395,550):pdf.line(x,735-3*30,x,774)
    for y in (735-3*30,745-3*30,775):pdf.line(40,y,550,y)
    img=Image.new("RGB",(1200,800),(230,230,230))
    for x in range(100,1100):
        for y in range(200,600):img.putpixel((x,y),(x%255,y%255,100))
    pdf.drawImage(ImageReader(img),60,300,width=300,height=200)
    pdf.showPage()
    pdf.setFont("Helvetica",13);pdf.drawString(55,790,"Page two retained")
    pdf.save();return out.getvalue()

def test_pdf_word_preserves_multpage_text_table_and_embedded_image():
    original=_complex_sample()
    reader=PdfReader(io.BytesIO(original))
    assert len(reader.pages)==2
    result=Document(io.BytesIO(pdf_to_docx(original)))
    combined=" ".join(p.text for p in result.paragraphs)
    combined+=" "+" ".join(cell.text for t in result.tables for row in t.rows for cell in row.cells)
    assert "FileMagik Document Fidelity" in combined
    assert "Page two retained" in combined
    assert "Notebook" in combined
    assert "00012" in combined
    assert result.inline_shapes, "Embedded photo should survive PDF->Word"

def test_pdf_excel_keeps_page_separation_and_postal_style_identifiers():
    book=load_workbook(io.BytesIO(pdf_to_xlsx(_complex_sample())),data_only=True)
    assert book.sheetnames==["Page 1","Page 2"]
    values=[cell.value for row in book["Page 1"] for cell in row]
    assert "00012" in values, "Leading-zero identifiers must remain strings"
    assert any("Notebook" in str(v) for v in values)
    assert any("Page two retained" in str(c.value) for row in book["Page 2"] for c in row)

def test_pdf_compression_modes_keep_page_count_and_searchable_text():
    sample=_complex_sample()
    baseline=PdfReader(io.BytesIO(sample))
    original_text=[p.extract_text() for p in baseline.pages]
    for mode in ("balanced","maximum"):
        output=lossy_optimize(sample,mode)
        result=PdfReader(io.BytesIO(output))
        assert len(result.pages)==len(baseline.pages)
        assert [p.extract_text() for p in result.pages]==original_text
        assert len(output)<=len(sample), "Do not return larger compressed PDF"


def test_multiline_table_expansion_does_not_split_uneven_merged_cells():
    from document import _expand_multiline_table_rows
    recovered=_expand_multiline_table_rows([["ID\n00012\n00013","Name\nNotebook\nPen"]])
    assert recovered==[["ID","Name"],["00012","Notebook"],["00013","Pen"]]
    unequal=[["paragraph\nwith details","single heading"]]
    assert _expand_multiline_table_rows(unequal)==unequal
