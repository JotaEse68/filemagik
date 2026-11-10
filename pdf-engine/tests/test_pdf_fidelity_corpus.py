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


def test_pdf_image_compression_preserves_visible_text_band_at_rendered_pixel_level():
    import pypdfium2 as pdfium
    from PIL import ImageChops,ImageStat
    original=_complex_sample()
    for quality in ("balanced","maximum"):
        compressed=lossy_optimize(original,quality)
        left=pdfium.PdfDocument(original)
        right=pdfium.PdfDocument(compressed)
        assert len(left)==len(right)==2
        for page_number in range(2):
            base=left[page_number].render(scale=1.2).to_pil().convert("RGB")
            rendered=right[page_number].render(scale=1.2).to_pil().convert("RGB")
            assert rendered.size==base.size
            # The heading/table area is outside the embedded raster image; no
            # native text, vector, glyph or layout pixels should be changed.
            text_region=(25,25,base.width-25,int(base.height*.38))
            difference=ImageChops.difference(base.crop(text_region),rendered.crop(text_region))
            assert max(ImageStat.Stat(difference).mean)<1.5

def test_compression_rejects_annotations_without_destroying_link_content():
    from reportlab.pdfgen import canvas
    from fastapi import HTTPException
    output=io.BytesIO()
    pdf=canvas.Canvas(output)
    pdf.drawString(50,750,"External link and important readable text")
    pdf.linkURL("https://example.org",rect=(50,730,230,770),relative=0)
    pdf.save()
    for quality in ("balanced","maximum"):
        try:lossy_optimize(output.getvalue(),quality)
        except HTTPException as error:
            assert error.status_code==422
        else:
            raise AssertionError("Annotated PDF must not undergo lossy optimization")
