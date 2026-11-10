import {test,expect} from '@playwright/test';
import {PDFDocument} from 'pdf-lib';
import {readFile} from 'node:fs/promises';

test('ODS/ODP cannot pretend to run locally when professional Office is disabled',async({page})=>{
 await page.goto('/es/ods-to-pdf');
 await page.locator('input[type=file]').setInputFiles({
  name:'sheet.ods',mimeType:'application/vnd.oasis.opendocument.spreadsheet',buffer:Buffer.from('placeholder'),
 });
 await expect(page.getByText('Esta conversión necesita el motor Office profesional')).toBeVisible();
 await page.getByRole('button',{name:/convertir ahora/i}).click();
 await expect(page.locator('p.error[role="alert"]')).toContainText('Professional Office engine unavailable');
 await expect(page.locator('a[download]')).toHaveCount(0);
});
test('ODS/ODP uses the authenticated professional endpoint when enabled',async({page})=>{
 const pdf=await PDFDocument.create();pdf.addPage([100,100]);const bytes=Buffer.from(await pdf.save());
 for(const [slug,ext,type] of [
  ['ods-to-pdf','ods','application/vnd.oasis.opendocument.spreadsheet'],
  ['odp-to-pdf','odp','application/vnd.oasis.opendocument.presentation'],
 ]){
  let calls=0;
  await page.route('**/api/pdf-engine**',async route=>{
   if(route.request().method()==='POST'){
    calls++;
    expect(route.request().url()).toContain('operation=office-to-pdf');
    await route.fulfill({status:200,contentType:'application/pdf',body:bytes});
   }else await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({available:true,challengeRequired:false,siteKey:null})});
  });
  await page.goto('/es/'+slug);
  await page.locator('input[type=file]').setInputFiles({
   name:'office.'+ext,mimeType:type,buffer:Buffer.from('fake bytes for mocked API'),
  });
  await page.getByRole('button',{name:/convertir ahora/i}).click();
  const link=page.locator('a[download]');
  await expect(link).toHaveAttribute('download','office-professional.pdf');
  const download=page.waitForEvent('download');await link.click();
  expect((await readFile(await (await download).path())).subarray(0,5).toString()).toBe('%PDF-');
  expect(calls).toBe(1);
  await page.unrouteAll();
 }
});
test('HEIC header spoofing is rejected before browser decoding',async({page})=>{
 await page.goto('/es/heic-to-png');
 await page.locator('input[type=file]').setInputFiles({
  name:'fake.heic',mimeType:'image/heic',buffer:Buffer.from('This is not a valid HEIC media container'),
 });
 await page.getByRole('button',{name:/convertir ahora/i}).click();
 await expect(page.locator('p.error[role="alert"]')).toContainText('Not a valid HEIC');
 await expect(page.locator('a[download]')).toHaveCount(0);
});


test('new premium media and mixed batch stay disabled without public certification',async({page})=>{
 for(const slug of ['server-trim-audio','server-join-video','server-mixed-batch','server-gif-edit']){
  const requests:string[]=[];
  page.on('request',request=>{if(request.method()==='POST'&&request.url().includes('/api/worker-engine'))requests.push(request.url());});
  await page.goto('/es/'+slug);
  await expect(page.getByText('Servicio privado no habilitado. No se subirá ningún archivo.')).toHaveCount(0);
  const type=slug==='server-join-video'?'video/mp4':slug==='server-gif-edit'?'image/gif':'audio/wav';
  const filename=slug==='server-join-video'?'clip.mp4':slug==='server-gif-edit'?'test.gif':'clip.wav';
  await page.locator('input[type=file]').first().setInputFiles({name:filename,mimeType:type,buffer:Buffer.from('fake media bytes')});
  await expect(page.getByText('Servicio privado no habilitado. No se subirá ningún archivo.')).toBeVisible();
  await expect(page.getByRole('button',{name:/convertir ahora/i})).toBeVisible();
  expect(requests).toHaveLength(0);
 }
});

test('new native PDF operations remain fail-closed without their allowlist',async({page})=>{
 for(const slug of ['ocr-pdf-professional','replace-pdf-image-native','replace-pdf-text-native']){
  let calls=0;
  await page.route('**/api/pdf-engine**',route=>{
   if(route.request().method()==='POST')calls++;
   return route.fulfill({status:200,contentType:'application/json',
    body:JSON.stringify({available:false,challengeRequired:false,siteKey:null})});
  });
  await page.goto('/es/'+slug);
  await page.locator('input[type=file]').first().setInputFiles({name:'test.pdf',mimeType:'application/pdf',buffer:Buffer.from('%PDF-1.4\\n')});
  await page.getByRole('button',{name:/convertir ahora/i}).click();
  await expect(page.locator('p.error[role="alert"]')).toContainText('Professional PDF engine unavailable');
  expect(calls).toBe(0);
  await page.unrouteAll();
 }
});
