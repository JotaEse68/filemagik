import io
import pdfplumber
from docx import Document
from docx.shared import Inches, Pt
from openpyxl import Workbook
from openpyxl.styles import Alignment
from pypdf import PdfReader

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
    return out

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
                for _,text in _lines(page,[]):sheet.cell(line,1,text);line+=1
            for row in sheet:
                for cell in row:cell.alignment=Alignment(wrap_text=True,vertical="top")
            for col in sheet.columns:sheet.column_dimensions[col[0].column_letter].width=24
    buffer=io.BytesIO();book.save(buffer);return buffer.getvalue()
