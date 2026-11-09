import {test,expect} from '@playwright/test';
import {PDFDocument,StandardFonts} from 'pdf-lib';

async function documentFixture(){
 const pdf=await PDFDocument.create();
 const page=pdf.addPage([595,842]);
 const font=await pdf.embedFont(StandardFonts.Helvetica);
 page.drawText('Original editable text',{x:90,y:700,font,size:18});
 return Buffer.from(await pdf.save());
}

test('professional PDF status fails closed without explicit release flag',async({request})=>{
 const response=await request.get('/api/pdf-engine');
 expect(response.ok()).toBeTruthy();
 const body=await response.json();
 expect(body.available).toBe(false);
});

test('visual PDF editor can select original text and offer a tracked replacement',async({page})=>{
 await page.route('**/api/pdf-engine',route=>route.fulfill({
  status:200,contentType:'application/json',
  body:JSON.stringify({available:true,challengeRequired:false,siteKey:null}),
 }));
 await page.goto('/es/edit-pdf-visual');
 await page.locator('input[type=file]').setInputFiles({
  name:'original.pdf',mimeType:'application/pdf',buffer:await documentFixture(),
 });
 await expect(page.getByRole('button',{name:'Sustituir texto original'})).toBeEnabled({timeout:20000});
 await page.getByRole('button',{name:'Sustituir texto original'}).click();
 const original=page.getByRole('button',{name:/Sustituir texto: Original editable text/});
 await expect(original).toBeVisible({timeout:25000});
 await original.click();
 await expect(page.locator('.fm-editor-overlay')).toHaveCount(2);
 await page.locator('.fm-editor-selection input').first().fill('Updated text');
 await expect(page.locator('.fm-editor-overlay')).toContainText(['BORRAR','Updated text']);
 await page.getByRole('button',{name:'Deshacer'}).click();
 await page.getByRole('button',{name:'Rehacer'}).click();
 await expect(page.locator('.fm-editor-overlay')).toContainText(['BORRAR','Updated text']);
});

test('undo removes both original-text redaction and replacement, redo restores them',async({page})=>{
 await page.route('**/api/pdf-engine',route=>route.fulfill({
  status:200,contentType:'application/json',
  body:JSON.stringify({available:true,challengeRequired:false,siteKey:null}),
 }));
 await page.goto('/es/edit-pdf-visual');
 await page.locator('input[type=file]').setInputFiles({
  name:'undo.pdf',mimeType:'application/pdf',buffer:await documentFixture(),
 });
 await page.getByRole('button',{name:'Sustituir texto original'}).click();
 await page.getByRole('button',{name:/Sustituir texto: Original editable text/}).click();
 await expect(page.locator('.fm-editor-overlay')).toHaveCount(2);
 await page.getByRole('button',{name:'Deshacer'}).click();
 await expect(page.locator('.fm-editor-overlay')).toHaveCount(0);
 await expect(page.locator('.fm-pro-engine-panel')).toHaveCount(0);
 await page.getByRole('button',{name:'Rehacer'}).click();
 await expect(page.locator('.fm-editor-overlay')).toHaveCount(2);
 await expect(page.locator('.fm-pro-engine-panel')).toBeVisible();
});

test('rejected professional redaction does not download a visually faked PDF',async({page})=>{
 let requested=false;
 await page.route('**/api/pdf-engine**',async route=>{
  const request=route.request();
  if(request.method()==='POST'){
   requested=true;
   await route.fulfill({status:429,contentType:'application/json',
    body:JSON.stringify({error:'Professional processing quota exceeded. Try again later'})});
  }else await route.fulfill({status:200,contentType:'application/json',
   body:JSON.stringify({available:true,challengeRequired:false,siteKey:null})});
 });
 await page.goto('/es/edit-pdf-visual');
 await page.locator('input[type=file]').setInputFiles({
  name:'rejected.pdf',mimeType:'application/pdf',buffer:await documentFixture(),
 });
 await page.getByRole('button',{name:'Sustituir texto original'}).click();
 await page.getByRole('button',{name:/Sustituir texto: Original editable text/}).click();
 page.once('dialog',dialog=>dialog.accept());
 let downloaded=false;
 page.on('download',()=>{downloaded=true;});
 await page.getByRole('button',{name:'Exportar PDF'}).click();
 await expect(page.locator('.fm-pdf-visual p.error[role="alert"]')).toContainText('quota exceeded');
 expect(requested).toBe(true);
 expect(downloaded).toBe(false);
});
