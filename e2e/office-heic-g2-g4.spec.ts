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
