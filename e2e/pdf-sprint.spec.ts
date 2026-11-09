import {test,expect} from '@playwright/test';
import {PDFDocument,StandardFonts} from 'pdf-lib';
import ExcelJS from 'exceljs';
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
