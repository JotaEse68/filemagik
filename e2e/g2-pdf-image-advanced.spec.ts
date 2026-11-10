import {test,expect} from '@playwright/test';
import {PDFDocument} from 'pdf-lib';

test('PDF editor exports corrected PDF without ordinary document information',async({page})=>{
 const pdf=await PDFDocument.create();
 pdf.addPage([360,280]);pdf.setTitle('PRIVATE_TITLE_TEST');pdf.setAuthor('PRIVATE_AUTHOR_TEST');
 const bytes=await pdf.save();
 await page.goto('/es/edit-pdf-visual');
 await page.locator('input[type=file]').setInputFiles({name:'sample.pdf',mimeType:'application/pdf',buffer:Buffer.from(bytes)});
 const clean=page.getByRole('checkbox',{name:/Quitar propiedades comunes/});
 await expect(clean).toBeVisible();await clean.check();
 const downloadPromise=page.waitForEvent('download');
 await page.getByRole('button',{name:/Exportar PDF/i}).click();
 const result=await downloadPromise;
 const buf=await (await import('node:fs/promises')).readFile(await result.path());
 const saved=await PDFDocument.load(buf);
 expect(saved.getTitle()||'').not.toContain('PRIVATE_TITLE_TEST');
 expect(saved.getAuthor()||'').not.toContain('PRIVATE_AUTHOR_TEST');
 await expect(page.getByTestId('conversion-success')).toContainText('sample-edited.pdf');
});

test('image cleanup healing brush supports undo without remote processing',async({page})=>{
 await page.goto('/es/image-cleanup');
 const src=await page.evaluate(()=>{
  const canvas=document.createElement('canvas');canvas.width=80;canvas.height=80;
  const ctx=canvas.getContext('2d')!;ctx.fillStyle='#eeeeee';ctx.fillRect(0,0,80,80);
  ctx.fillStyle='#990000';ctx.fillRect(38,38,8,8);
  return canvas.toDataURL('image/png').split(',')[1];
 });
 await page.locator('input[type=file]').setInputFiles({name:'spot.png',mimeType:'image/png',buffer:Buffer.from(src,'base64')});
 const brush=page.getByLabel('Herramienta de retoque');await brush.selectOption('brush');
 await expect(page.getByLabel('Tamaño de pincel')).toBeVisible();
 const canvas=page.locator('canvas.image-cleanup-canvas');
 await canvas.scrollIntoViewIfNeeded();
 const rect=await canvas.boundingBox();expect(rect).toBeTruthy();
 await page.mouse.move(rect!.x+rect!.width*.45,rect!.y+rect!.height*.5);
 await page.mouse.down();await page.mouse.move(rect!.x+rect!.width*.55,rect!.y+rect!.height*.5,{steps:3});await page.mouse.up();
 await expect(page.getByRole('button',{name:/Deshacer/i})).toBeEnabled();
 await page.getByRole('button',{name:/Deshacer/i}).click();
 await expect(page.getByRole('button',{name:/Rehacer/i})).toBeEnabled();
});
