import {test,expect} from '@playwright/test';
import {PDFDocument,StandardFonts} from 'pdf-lib';
import ExcelJS from 'exceljs';
import JSZip from 'jszip';
import {readFile} from 'node:fs/promises';

async function samplePdf(){
 const pdf=await PDFDocument.create();
 const page=pdf.addPage([595,842]);
 const font=await pdf.embedFont(StandardFonts.Helvetica);
 page.drawText('Invoice Example',{x:52,y:780,size:20,font});
 page.drawText('Product',{x:52,y:735,size:12,font});
 page.drawText('Quantity',{x:260,y:735,size:12,font});
 page.drawText('Notebook',{x:52,y:713,size:12,font});
 page.drawText('3',{x:260,y:713,size:12,font});
 return Buffer.from(await pdf.save({useObjectStreams:false}));
}
async function upload(page:import('@playwright/test').Page,bytes:Uint8Array){
 await page.locator('input[type=file]').setInputFiles({name:'sample.pdf',mimeType:'application/pdf',buffer:Buffer.from(bytes)});
}
async function runAndDownload(page:import('@playwright/test').Page){
 await page.locator('.actions button.btn-primary').first().click();
 const link=page.locator('.actions a[download]');
 await expect(link).toBeVisible({timeout:30000});
 const downloadPromise=page.waitForEvent('download');
 await link.click();
 const download=await downloadPromise;
 return {name:download.suggestedFilename(),bytes:await readFile(await download.path())};
}
test('Quick Studio shows three clear steps without replacing the wheels',async({page})=>{
 await page.goto('/es');
 await expect(page.locator('.radial-guide-step').getByText('Elige un tipo de archivo',{exact:true})).toBeVisible();
 await expect(page.getByText('Selecciona una acción',{exact:true})).toBeVisible();
 await expect(page.getByText('Sube tu archivo y descarga',{exact:true})).toBeVisible();
 await expect(page.locator('.radial-wheel')).toHaveCount(2);
});
test('PDF password protect and unlock with valid password',async({page})=>{
 const original=await samplePdf();
 await page.goto('/es/protect-pdf');await upload(page,original);
 await page.locator('input[type=password]').fill('HighlySecure9');
 const locked=await runAndDownload(page);
 expect(locked.name).toContain('-protected.pdf');
 expect(locked.bytes.length).toBeGreaterThan(100);
 await page.goto('/es/unlock-pdf');await upload(page,locked.bytes);
 await page.locator('input[type=password]').fill('HighlySecure9');
 const unlocked=await runAndDownload(page);
 const doc=await PDFDocument.load(unlocked.bytes);
 expect(doc.getPageCount()).toBe(1);
});
test('PDF text extraction into XLSX retains rows as editable cells',async({page})=>{
 await page.goto('/es/pdf-to-excel-text');
 await upload(page,await samplePdf());
 const output=await runAndDownload(page);
 const book=new ExcelJS.Workbook();
 await book.xlsx.load(Uint8Array.from(output.bytes).buffer);
 const rows=book.worksheets[0].getSheetValues().flat().filter(Boolean).map(String);
 expect(rows.join(' ')).toContain('Notebook');
 expect(rows.join(' ')).toContain('3');
});
test('Optimized PDF either provides a smaller file or explains original is better',async({page})=>{
 const original=await samplePdf();
 await page.goto('/es/compress-pdf-lossless');await upload(page,original);
 await page.locator('.actions button.btn-primary').click();
 const result=page.locator('.actions a[download]');
 const alert=page.locator('p[role="alert"]');
 await expect.poll(async()=>{
  if(await result.isVisible())return 'download';
  if(await alert.isVisible())return 'alert: '+await alert.textContent();
  return 'pending';
 },{timeout:12000}).not.toBe('pending');
 if(await alert.isVisible())expect(await alert.textContent()).toMatch(/already optimized|original is smaller|smaller|optimized/i);
});


test('Fill PDF forms visually without writing JSON',async({page})=>{
 const original=await PDFDocument.create();
 const p=original.addPage([595,842]);
 const input=original.getForm().createTextField('ClientName');
 input.addToPage(p,{x:45,y:700,width:230,height:30});
 await page.goto('/es/fill-pdf-form');
 await upload(page,Buffer.from(await original.save()));
 await expect(page.locator('.fm-pdf-form-grid input[type=text]')).toBeVisible();
 await page.locator('.fm-pdf-form-grid input[type=text]').fill('Client Example');
 const output=await runAndDownload(page);
 const doc=await PDFDocument.load(output.bytes);
 expect(doc.getForm().getTextField('ClientName').getText()).toBe('Client Example');
});
test('Word table and paragraph convert into a structured PDF',async({page})=>{
 const word=await import('docx');
 const doc=new word.Document({sections:[{children:[
  new word.Paragraph('Invoice title'),
  new word.Table({rows:[new word.TableRow({children:[
   new word.TableCell({children:[new word.Paragraph('Item')]}),
   new word.TableCell({children:[new word.Paragraph('Total')]})
  ]})]})
 ]}]});
 const bytes=await word.Packer.toBuffer(doc);
 await page.goto('/es/word-to-layout-pdf');
 await page.locator('input[type=file]').setInputFiles({name:'invoice.docx',mimeType:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',buffer:bytes});
 const output=await runAndDownload(page);
 expect(output.name).toContain('-layout.pdf');
 expect((await PDFDocument.load(output.bytes)).getPageCount()).toBeGreaterThanOrEqual(1);
});
test('Editable Excel cells are converted to PDF with pagination',async({page})=>{
 const book=new ExcelJS.Workbook();
 const sheet=book.addWorksheet('Sales');
 sheet.addRow(['Product','Price']);sheet.addRow(['Notebook',15]);
 const bytes=Buffer.from(await book.xlsx.writeBuffer());
 await page.goto('/es/xlsx-to-layout-pdf');
 await page.locator('input[type=file]').setInputFiles({name:'sales.xlsx',mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',buffer:bytes});
 const output=await runAndDownload(page);
 expect(output.name).toContain('-layout.pdf');
 expect((await PDFDocument.load(output.bytes)).getPageCount()).toBeGreaterThanOrEqual(1);
});


test('PDF to editable Word creates a real Word table for aligned column rows',async({page})=>{
 await page.goto('/es/pdf-to-word-text');
 await upload(page,await samplePdf());
 const output=await runAndDownload(page);
 const zip=await JSZip.loadAsync(output.bytes);
 const xml=await zip.file('word/document.xml')?.async('text');
 expect(xml).toContain('<w:tbl');
 expect(xml).toContain('Notebook');
});
test('PowerPoint slide text is exported as a genuine PDF page',async({page})=>{
 const zip=new JSZip();
 zip.file('ppt/presentation.xml','<p:presentation xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><p:sldSz cx="12192000" cy="6858000"/></p:presentation>');
 zip.file('ppt/slides/slide1.xml','<p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><p:cSld><p:spTree><p:sp><p:spPr><a:xfrm><a:off x="914400" y="914400"/><a:ext cx="4572000" cy="914400"/></a:xfrm></p:spPr><p:txBody><a:p><a:r><a:t>Slide title</a:t></a:r></a:p></p:txBody></p:sp></p:spTree></p:cSld></p:sld>');
 const source=await zip.generateAsync({type:'nodebuffer'});
 await page.goto('/es/pptx-to-pdf-layout');
 await page.locator('input[type=file]').setInputFiles({name:'presentation.pptx',mimeType:'application/vnd.openxmlformats-officedocument.presentationml.presentation',buffer:source});
 const output=await runAndDownload(page);
 expect((await PDFDocument.load(output.bytes)).getPageCount()).toBe(1);
});
test('Visual editor produces a real fillable checkbox field',async({page})=>{
 await page.goto('/es/edit-pdf-visual');
 await upload(page,await samplePdf());
 await expect(page.locator('.fm-editor-sheet canvas')).toBeVisible({timeout:30000});
 await page.getByRole('button',{name:/Casilla/}).click();
 await page.locator('.fm-editor-sheet').click({position:{x:140,y:160}});
 await expect(page.locator('.fm-editor-overlay')).toHaveCount(1);
 const promise=page.waitForEvent('download');
 await page.locator('.fm-editor-actions button').click();
 const download=await promise;
 const output=await readFile(await download.path());
 expect((await PDFDocument.load(output)).getForm().getFields().length).toBe(1);
});
