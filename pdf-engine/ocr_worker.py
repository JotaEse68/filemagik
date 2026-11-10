"""Bounded raster OCR for scanned PDFs.

This explicitly creates a NEW searchable, raster-backed PDF. It does not modify
original PDF objects, preserve signatures, or promise layout-editable DOCX.
"""
import io
import os
import subprocess
import tempfile
import time
from pathlib import Path
from fastapi import HTTPException
from PIL import Image
from pypdf import PdfReader, PdfWriter
import pypdfium2 as pdfium

MAX_PAGES=12
MAX_PIXELS=30_000_000
MAX_PAGE_PIXELS=7_000_000
MAX_OUTPUT=12*1024*1024
TIME_LIMIT=90

def raster_ocr_pdf(data:bytes)->bytes:
    try:
        original=PdfReader(io.BytesIO(data),strict=False)
        if original.is_encrypted:
            raise HTTPException(422,"Unlock the PDF before OCR")
        if not 1<=len(original.pages)<=MAX_PAGES:
            raise HTTPException(413,"OCR accepts 1 to 12 pages")
        if b"/ByteRange" in data or original.get_fields():
            raise HTTPException(422,"OCR will not rasterize signed PDFs or interactive forms")
        document=pdfium.PdfDocument(data)
        writer=PdfWriter()
        scanned_pages=0
        pixels=0
        started=time.monotonic()
        with tempfile.TemporaryDirectory(prefix="fm-ocr-") as dirname:
            root=Path(dirname)
            for index in range(len(document)):
                # Preserve existing PDF text, graphics, vectors, fonts and links
                # for pages that already provide a useful searchable text layer.
                # OCR only raster/scan pages, not the whole mixed PDF.
                searchable=(original.pages[index].extract_text() or '').strip()
                if searchable:
                    writer.add_page(original.pages[index])
                    continue
                scanned_pages+=1
                page=document[index]
                width,height=page.get_size()
                page_pixels=int(width*2)*int(height*2)
                pixels+=page_pixels
                if page_pixels>MAX_PAGE_PIXELS or pixels>MAX_PIXELS:
                    raise HTTPException(413,"OCR pixel budget exceeded")
                if time.monotonic()-started>TIME_LIMIT:
                    raise HTTPException(408,"OCR time limit reached")
                bitmap=page.render(scale=2).to_pil().convert("RGB")
                source=root/f"page-{index:03d}.png"
                bitmap.save(source,format="PNG")
                remaining=max(1,int(TIME_LIMIT-(time.monotonic()-started)))
                try:
                    result=subprocess.run(
                        ["tesseract",str(source),"stdout","-l","eng+spa",
                         "-c","user_defined_dpi=144","pdf"],
                        stdout=subprocess.PIPE,stderr=subprocess.PIPE,
                        timeout=min(remaining,30),check=False,
                        env={"PATH":os.environ.get("PATH","/usr/bin:/bin")})
                except subprocess.TimeoutExpired:
                    raise HTTPException(408,"OCR processor timed out")
                except OSError:
                    raise HTTPException(503,"OCR processor unavailable")
                if result.returncode or not result.stdout.startswith(b"%PDF-"):
                    raise HTTPException(422,"OCR failed to recognize document page")
                extracted=PdfReader(io.BytesIO(result.stdout),strict=False)
                if len(extracted.pages)!=1:
                    raise HTTPException(502,"OCR engine produced an invalid page")
                writer.add_page(extracted.pages[0])
        if not scanned_pages:
            return data  # No rasterization when every page is already searchable
        stream=io.BytesIO()
        writer.write(stream)
        output=stream.getvalue()
        if not output.startswith(b"%PDF-") or len(output)>MAX_OUTPUT:
            raise HTTPException(413,"OCR result exceeds output budget")
        return output
    except HTTPException:
        raise
    except (ValueError,TypeError,OSError):
        raise HTTPException(422,"OCR cannot process this PDF safely")
