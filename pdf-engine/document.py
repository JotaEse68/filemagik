import io
import pdfplumber
from docx import Document
from docx.shared import Inches, Pt
from openpyxl import Workbook
from openpyxl.styles import Alignment
from pypdf import PdfReader
from PIL import Image

def _validate(data):
    reader=PdfReader(io.BytesIO(data),strict=False)
    if reader.is_encrypted: raise ValueError("Encrypted PDF requires password")
    if len(reader.pages)>80: raise ValueError("Maximum 80 pages")
    return reader

def _tables(page):
    out=[]
    for t in page.find_tables(table_settings={"vertical_strategy":"lines","horizontal_strategy":"lines"}):
        rows=t.extract()
        if rows: out.append((t.bbox,rows))
    if not out:
        try:
            for t in page.find_tables(table_settings={"vertical_strategy":"text","horizontal_strategy":"text",
                    "min_words_vertical":3,"min_words_horizontal":2,"intersection_tolerance":4}):
                rows=t.extract()
                if len(rows)>=3 and len(rows[0])>=2:
                    out.append((t.bbox,rows))
        except (TypeError,ValueError):
            pass
    return out

def _inline_images(reader,index):
    extracted=0
    for img in reader.pages[index].images:
        if extracted>=12:break
        try:
            bitmap=Image.open(io.BytesIO(img.data))
            if bitmap.width*bitmap.height>16000000:continue
            buff=io.BytesIO()
            bitmap.convert("RGB").save(buff,"PNG")
            buff.seek(0);extracted+=1
            yield buff
        except (OSError,ValueError):
            continue

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
    with pdfplumber.open(io.BytesIO(data)) as pdf:
        for index,page in enumerate(pdf.pages):
            if index: out.add_page_break()
            tables=_tables(page)
            items=[(bounds[1],"table",rows) for bounds,rows in tables]
            items += [(y,"text",text) for y,text in _lines(page,tables)]
            for _,kind,value in sorted(items,key=lambda x:x[0]):
                if kind=="text": out.add_paragraph(value)
                else:
                    rows=value;cols=min(24,max(len(row) for row in rows))
                    table=out.add_table(rows=len(rows),cols=cols);table.style="Table Grid"
                    for i,row in enumerate(rows):
                        for j,text in enumerate(row[:cols]): table.cell(i,j).text=text or ""
            for image in _inline_images(reader,index):
                try:out.add_picture(image,width=Inches(5.8))
                except (ValueError,OSError):continue
    buffer=io.BytesIO();out.save(buffer);return buffer.getvalue()

def pdf_to_xlsx(data):
    _validate(data)
    book=Workbook();book.remove(book.active)
    with pdfplumber.open(io.BytesIO(data)) as pdf:
        for index,page in enumerate(pdf.pages):
            sheet=book.create_sheet(f"Page {index+1}")
            tables=_tables(page);line=1
            if tables:
                for _,rows in tables:
                    for row in rows:
                        for col,value in enumerate(row[:80],1):sheet.cell(line,col,value or "")
                        line+=1
                    line+=2
            else:
                for row in _borderless_rows(page):
                    for col,text in enumerate(row,1):sheet.cell(line,col,text)
                    line+=1
            for row in sheet:
                for cell in row:cell.alignment=Alignment(wrap_text=True,vertical="top")
            for col in sheet.columns:sheet.column_dimensions[col[0].column_letter].width=24
    buffer=io.BytesIO();book.save(buffer);return buffer.getvalue()
