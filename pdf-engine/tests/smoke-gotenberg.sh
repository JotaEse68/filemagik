#!/usr/bin/env bash
set -euo pipefail
docker run --rm -d --name filemagik-gotenberg-ci -p 3000:3000 gotenberg/gotenberg:9 >/dev/null
cleanup(){ docker rm -f filemagik-gotenberg-ci >/dev/null 2>&1 || true; }
trap cleanup EXIT
for i in $(seq 1 60); do
  if curl --silent --fail http://127.0.0.1:3000/health >/dev/null; then break; fi
  sleep 2
done
curl --silent --fail http://127.0.0.1:3000/health >/dev/null || { echo 'Gotenberg failed health'; exit 1; }
python - <<'PY'
from docx import Document
from reportlab.pdfgen import canvas
doc=Document();doc.add_heading('FileMagik integration',0)
doc.add_paragraph('Editable document with table')
table=doc.add_table(rows=2,cols=2);table.cell(0,0).text='Item';table.cell(0,1).text='Total'
table.cell(1,0).text='Notebook';table.cell(1,1).text='12'
doc.save('/tmp/filemagik-integration.docx')
p=canvas.Canvas('/tmp/filemagik-original.pdf');p.drawString(80,650,'Text must remain selectable');p.save()
PY
curl --fail --silent --show-error -X POST http://127.0.0.1:3000/forms/libreoffice/convert \
  -F files=@/tmp/filemagik-integration.docx -o /tmp/filemagik-integration.pdf
curl --fail --silent --show-error -X POST http://127.0.0.1:3000/forms/pdf/optimize \
  -F files=@/tmp/filemagik-original.pdf -o /tmp/filemagik-optimized.pdf
python - <<'PY'
from pypdf import PdfReader
for name in ('/tmp/filemagik-integration.pdf','/tmp/filemagik-optimized.pdf'):
    reader=PdfReader(name)
    assert len(reader.pages)>=1,name
assert 'FileMagik integration' in (PdfReader('/tmp/filemagik-integration.pdf').pages[0].extract_text() or '')
assert 'Text must remain selectable' in (PdfReader('/tmp/filemagik-optimized.pdf').pages[0].extract_text() or '')
print('Gotenberg 9 Office/PDF conversion and lossless optimization smoke tests passed')
PY
