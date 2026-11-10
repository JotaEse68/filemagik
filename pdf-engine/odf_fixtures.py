"""Generate genuine OpenDocument spreadsheet/presentation files for integration QA."""
import io
from odf.opendocument import OpenDocumentSpreadsheet,OpenDocumentPresentation
from odf.table import Table,TableRow,TableCell
from odf.text import P
from odf.draw import Page,Frame,TextBox
from odf.style import MasterPage


def ods_fixture():
    doc=OpenDocumentSpreadsheet()
    sheet=Table(name="FileMagik data")
    row=TableRow()
    cell=TableCell(valuetype="string")
    cell.addElement(P(text="FileMagik ODS integration"))
    row.addElement(cell)
    sheet.addElement(row)
    doc.spreadsheet.addElement(sheet)
    data=io.BytesIO()
    doc.save(data)
    return data.getvalue()


def odp_fixture():
    doc=OpenDocumentPresentation()
    doc.masterstyles.addElement(MasterPage(name="Default"))
    slide=Page(name="FileMagik slide",masterpagename="Default")
    frame=Frame(x="1cm",y="1cm",width="23cm",height="3cm")
    box=TextBox()
    box.addElement(P(text="FileMagik ODP integration"))
    frame.addElement(box)
    slide.addElement(frame)
    doc.presentation.addElement(slide)
    data=io.BytesIO()
    doc.save(data)
    return data.getvalue()
