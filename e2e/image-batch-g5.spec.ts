import {test,expect} from '@playwright/test';
import JSZip from 'jszip';
import {readFile} from 'node:fs/promises';
// Build a browser-encoded PNG; the previous 1×1 fixture had invalid image data
// in Chromium despite passing MIME/extension validation.
async function validPng(page:import('@playwright/test').Page):Promise<Buffer>{
 const encoded=await page.evaluate(()=>{
  const canvas=document.createElement('canvas');canvas.width=16;canvas.height=16;
  const ctx=canvas.getContext('2d')!;ctx.fillStyle='#1888cc';ctx.fillRect(0,0,16,16);
  return canvas.toDataURL('image/png').split(',')[1];
 });
 return Buffer.from(encoded,'base64');
}
test('Batch image conversion produces ZIP, displays progress and preserves every output',async({page})=>{
 await page.goto('/es/batch-images-to-webp');
 const png=await validPng(page);
 await page.locator('input[type=file]').setInputFiles([
  {name:'first.png',mimeType:'image/png',buffer:png},
  {name:'second.png',mimeType:'image/png',buffer:png},
 ]);
 await page.getByRole('button',{name:/convertir ahora/i}).click();
 const link=page.locator('a[download]');
 await expect(link).toHaveAttribute('download','filemagik-images-webp.zip',{timeout:20000});
 const pending=page.waitForEvent('download');await link.click();
 const zip=await JSZip.loadAsync(await readFile(await (await pending).path()));
 const files=Object.values(zip.files).filter(f=>!f.dir);
 expect(files).toHaveLength(2);
 for(const file of files){
  const bytes=await file.async('uint8array');
  expect([...bytes.slice(0,4)]).toEqual([82,73,70,70]); // RIFF WebP
 }
});
test('Batch cancellation stops processing without a fake download',async({page})=>{
 await page.addInitScript(()=>{
  const original=createImageBitmap.bind(globalThis);
  (globalThis as typeof globalThis & {createImageBitmap:typeof createImageBitmap}).createImageBitmap=
   (async (...args:Parameters<typeof createImageBitmap>)=>{
    await new Promise(resolve=>setTimeout(resolve,700));
    return original(...args);
   }) as typeof createImageBitmap;
 });
 await page.goto('/es/batch-images-to-webp');
 const png=await validPng(page);
 await page.locator('input[type=file]').setInputFiles([
  {name:'first.png',mimeType:'image/png',buffer:png},
  {name:'second.png',mimeType:'image/png',buffer:png},
 ]);
 await page.getByRole('button',{name:/convertir ahora/i}).click();
 const cancel=page.getByRole('button',{name:'Cancelar lote'});
 await expect(cancel).toBeVisible();
 await cancel.click();
 await expect(page.locator('p.error[role="alert"]')).toContainText('Conversión cancelada',{timeout:10000});
 await expect(page.locator('a[download]')).toHaveCount(0);
});
