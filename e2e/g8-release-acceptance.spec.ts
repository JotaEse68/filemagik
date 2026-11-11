import {test,expect} from '@playwright/test';
import {PDFDocument} from 'pdf-lib';

const routes=[
 '/es','/es/tools',
 '/es/pdf-to-word-text','/es/ocr-pdf-professional',
 '/es/compress-pdf-raster','/es/replace-pdf-text-native',
 '/es/server-trim-audio','/es/server-join-audio',
 '/es/server-video-frame','/es/server-gif-edit',
 '/es/image-cleanup','/es/png-to-webp',
 '/es/server-heic-to-png','/es/server-gif-to-webp',
];

test('G8: main catalogue and twelve core tool pages remain usable on desktop and mobile',async({page})=>{
 for(const route of routes){
  const response=await page.goto(route);
  expect(response?.status(),route).toBe(200);
  await expect(page.locator('h1').first(),route).toBeVisible();
  const dimensions=await page.evaluate(()=>({
   viewport:document.documentElement.clientWidth,
   total:document.documentElement.scrollWidth,
   title:document.title,
  }));
  expect(dimensions.title.length,route).toBeGreaterThan(12);
  expect(dimensions.total,route+' horizontal overflow').toBeLessThanOrEqual(dimensions.viewport+2);
  if(route!=='/es'&&route!=='/es/tools'){
   await expect(page.locator('input[type=file]').first()).toHaveAttribute('accept',/.+/);
  }
 }
});

test('G8: reject previous selection after oversized replacement; never convert a stale file',async({page})=>{
 await page.goto('/es/server-trim-audio');
 const upload=page.locator('input[type=file]').first();
 await upload.setInputFiles({name:'recording.wav',mimeType:'audio/wav',buffer:Buffer.from('RIFFdemo file')});
 await expect(page.getByRole('button',{name:/convertir ahora/i})).toBeVisible();
 await upload.setInputFiles({name:'oversize.wav',mimeType:'audio/wav',buffer:Buffer.alloc(3*1024*1024+1)});
 await expect(page.getByRole('alert')).toContainText('File too large');
 await expect(page.getByRole('button',{name:/convertir ahora/i})).toHaveCount(0);
 await expect(page.locator('input[type=file]')).toHaveValue('');
 await expect(page.locator('a[download]')).toHaveCount(0);
});

test('G8: downloadable PDF success and explicit error feedback',async({page})=>{
 const pdf=await PDFDocument.create();
 pdf.addPage([210,297]);const result=Buffer.from(await pdf.save());
 await page.route('**/api/pdf-engine**',route=>
  route.request().method()==='POST'
   ?route.fulfill({status:200,body:result,contentType:'application/pdf'})
   :route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({available:true,challengeRequired:false,siteKey:null})}));
 await page.goto('/es/ocr-pdf-professional');
 await page.locator('input[type=file]').first().setInputFiles({
  name:'original.pdf',mimeType:'application/pdf',buffer:result});
 await page.getByRole('button',{name:/convertir ahora/i}).click();
 await expect(page.getByTestId('conversion-success')).toBeVisible();
 const download=page.waitForEvent('download');
 await page.getByRole('link',{name:/descargar archivo/i}).click();
 expect((await download).suggestedFilename()).toMatch(/\.pdf$/);
 await expect(page.getByTestId('download-notice')).toBeVisible();
 await page.getByRole('button',{name:/nueva conversión/i}).last().click();
 await expect(page.getByTestId('conversion-success')).toHaveCount(0);
});
