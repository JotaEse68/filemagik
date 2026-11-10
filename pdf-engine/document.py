import io
import re
import pdfplumber
from docx import Document
from docx.shared import Inches, Pt
from docx.enum.section import WD_SECTION
from openpyxl import Workbook
from openpyxl.styles import Alignment
from pypdf import PdfReader
from PIL import Image

def _validate(data):
    reader=PdfReader(io.BytesIO(data),strict=False)
    if reader.is_encrypted: raise ValueError("Encrypted PDF requires password")
    if len(reader.pages)>80: raise ValueError("Maximum 80 pages")
    return reader

def _expand_multiline_table_rows(rows):
    """Recover logical rows collapsed into multiline cells by a borderless
    horizontal grid. Expand ONLY when at least two occupied columns share
    an identical line count, protecting genuinely merged/paragraph cells.
    """
    expanded=[]
    for row in rows:
        occupied=[str(value).splitlines() for value in row if value is not None and str(value).strip()]
        if len(occupied)<2:
            expanded.append(row);continue
        counts={len(lines) for lines in occupied}
        if len(counts)!=1 or next(iter(counts))<2:
            expanded.append(row);continue
        count=next(iter(counts))
        per_cell=[str(value).splitlines() if value is not None and str(value).strip()
                  else [""]*count for value in row]
        expanded.extend([
            [lines[index].strip() for lines in per_cell]
            for index in range(count)
        ])
    return expanded

def _tables(page):
    out=[]
    for t in page.find_tables(table_settings={"vertical_strategy":"lines","horizontal_strategy":"lines"}):
        rows=t.extract()
        if rows: out.append((t.bbox,_expand_multiline_table_rows(rows)))
    if not out:
        try:
            for t in page.find_tables(table_settings={"vertical_strategy":"text","horizontal_strategy":"text",
                    "min_words_vertical":3,"min_words_horizontal":2,"intersection_tolerance":4}):
                rows=t.extract()
                if len(rows)>=3 and len(rows[0])>=2:
                    out.append((t.bbox,_expand_multiline_table_rows(rows)))
        except (TypeError,ValueError):
            pass
    return out

def _inline_images(reader,index,page):
    """Place compatible embedded images within their reading-order page bands.

    Exact XObject-to-coordinate association is only reliable when the extracted
    image count matches the geometric image placements. Otherwise append images
    at the end of that page; do not falsely claim their original positions.
    """
    locations=sorted(page.images,key=lambda img:img.get("top",page.height))
    sources=list(reader.pages[index].images)[:12]
    for i,img in enumerate(sources):
        try:
            bitmap=Image.open(io.BytesIO(img.data))
            if bitmap.width*bitmap.height>16000000:continue
            buff=io.BytesIO()
            bitmap.convert("RGB").save(buff,"PNG")
            buff.seek(0)
            known=len(locations)==len(sources)
            box=locations[i] if known else None
            top=float(box.get("top",page.height)) if box else float(page.height)
            width=min(6.7,max(.8,(float(box.get("x1",page.width))-float(box.get("x0",0)))/page.width*6.6)) if box else 5.8
            yield (top,buff,width)
        except (OSError,ValueError,TypeError):
            continue

def _excel_value(value):
    text=(value or "").strip()
    if not text:return ""
    compact=text.replace(" ","")
    if re.fullmatch(r"-?\d+",compact):
        # Postal codes, product identifiers and numbers with leading zeros are strings.
        if len(compact.lstrip("-"))>1 and compact.lstrip("-").startswith("0"):
            return text
        try:return int(compact)
        except ValueError:return text
    if re.fullmatch(r"-?\d+\.\d+",compact):
        try:return float(compact)
        except ValueError:return text
    if re.fullmatch(r"-?\d{1,3}(?:\.\d{3})+,\d{1,2}",compact):
        try:return float(compact.replace(".","").replace(",","."))
        except ValueError:return text
    if re.fullmatch(r"-?\d{1,3}(?:,\d{3})+\.\d{1,2}",compact):
        try:return float(compact.replace(",",""))
        except ValueError:return text
    return text

def _borderless_rows(page):
    words=page.extract_words(x_tolerance=2,y_tolerance=3)
    bands=[]
    for w in sorted(words,key=lambda w:(w["top"],w["x0"])):
        row=next((r for r in bands if abs(r[0]-w["top"])<=3),None)
        if row is None:bands.append([w["top"],[w]])
        else:row[1].append(w)
    # Determine anchors from repeatable positions across at least two rows.
    anchors=[]
    for _,row in bands:
        for w in row:
            nearest=next((a for a in anchors if abs(a[0]-w["x0"])<18),None)
            if nearest is None:anchors.append([w["x0"],1])
            else:nearest[1]+=1
    chosen=sorted((a[0] for a in anchors if a[1]>=2))[:24]
    if len(chosen)<2:
        return [[text] for _,text in _lines(page,[])]
    result=[]
    for _,row in bands:
        cells=[""]*len(chosen)
        for w in sorted(row,key=lambda w:w["x0"]):
            idx=min(range(len(chosen)),key=lambda i:abs(chosen[i]-w["x0"]))
            cells[idx]+=(" " if cells[idx] else "")+w["text"]
        result.append(cells)
    return result

def _lines(page,tables):
    bands=[]
    for w in page.extract_words(x_tolerance=2,y_tolerance=3):
        if any(a-2<=w["x0"]<=c+2 and b-2<=w["top"]<=d+2 for (a,b,c,d),_ in tables): continue
        found=next((r for r in bands if abs(r[0]-w["top"])<3),None)
        if found is None: bands.append([w["top"],[w]])
        else: found[1].append(w)
    return [(y," ".join(w["text"] for w in sorted(words,key=lambda x:x["x0"]))) for y,words in sorted(bands)]

def pdf_to_docx(data):
    reader=_validate(data)
    out=Document()
    total_text=0
    with pdfplumber.open(io.BytesIO(data)) as pdf:
        for index,page in enumerate(pdf.pages):
            section=out.sections[0] if index==0 else out.add_section(WD_SECTION.NEW_PAGE)
            section.top_margin=Inches(.55);section.bottom_margin=Inches(.55)
            section.left_margin=Inches(.65);section.right_margin=Inches(.65)
            section.page_width=Inches(min(17,max(5,page.width/72)))
            section.page_height=Inches(min(17,max(5,page.height/72)))
            tables=_tables(page)
            items=[(bounds[1],"table",rows) for bounds,rows in tables]
            items += [(y,"text",text) for y,text in _lines(page,tables)]
            items += [(top,"image",(image,width)) for top,image,width in _inline_images(reader,index,page)]
            for _,kind,value in sorted(items,key=lambda x:x[0]):
                if kind=="text":
                    total_text+=len(value.strip())
                    out.add_paragraph(value)
                elif kind=="image":
                    image,width=value
                    try:out.add_picture(image,width=Inches(width))
                    except (ValueError,OSError):continue
                else:
                    rows=value;total_text+=sum(len(v or "") for row in rows for v in row)
                    cols=min(24,max(len(row) for row in rows))
                    table=out.add_table(rows=len(rows),cols=cols);table.style="Table Grid"
                    for i,row in enumerate(rows):
                        for j,text in enumerate(row[:cols]): table.cell(i,j).text=text or ""
    if total_text==0:raise ValueError("Scanned PDF requires OCR before editable Word conversion")
    buffer=io.BytesIO();out.save(buffer);return buffer.getvalue()

def pdf_to_xlsx(data):
    _validate(data)
    book=Workbook();book.remove(book.active)
    extracted=0
    with pdfplumber.open(io.BytesIO(data)) as pdf:
        for index,page in enumerate(pdf.pages):
            sheet=book.create_sheet(f"Page {index+1}")
            tables=_tables(page);line=1
            if tables:
                for _,rows in tables:
                    for row in rows:
                        for col,value in enumerate(row[:80],1):
                            sheet.cell(line,col,_excel_value(value))
                            extracted+=1 if value and str(value).strip() else 0
                        line+=1
                    line+=2
            else:
                for row in _borderless_rows(page):
                    for col,text in enumerate(row,1):
                        sheet.cell(line,col,_excel_value(text))
                        extracted+=1 if text and str(text).strip() else 0
                    line+=1
            for row in sheet:
                for cell in row:cell.alignment=Alignment(wrap_text=True,vertical="top")
            for col in sheet.columns:sheet.column_dimensions[col[0].column_letter].width=24
    if extracted==0:raise ValueError("Scanned PDF requires OCR before editable Excel conversion")
    buffer=io.BytesIO();book.save(buffer);return buffer.getvalue()
