import {test,expect} from '@playwright/test';
import JSZip from 'jszip';
import {readFile} from 'node:fs/promises';
const PNG=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO/aX8cAAAAASUVORK5CYII=','base64');
test('Batch image conversion produces ZIP, displays progress and preserves every output',async({page})=>{
 await page.goto('/es/batch-images-to-webp');
 await page.locator('input[type=file]').setInputFiles([
  {name:'first.png',mimeType:'image/png',buffer:PNG},
  {name:'second.png',mimeType:'image/png',buffer:PNG},
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
 await page.locator('input[type=file]').setInputFiles([
  {name:'first.png',mimeType:'image/png',buffer:PNG},
  {name:'second.png',mimeType:'image/png',buffer:PNG},
 ]);
 await page.getByRole('button',{name:/convertir ahora/i}).click();
 const cancel=page.getByRole('button',{name:'Cancelar lote'});
 await expect(cancel).toBeVisible();
 await cancel.click();
 await expect(page.locator('p.error[role="alert"]')).toContainText('Conversión cancelada',{timeout:10000});
 await expect(page.locator('a[download]')).toHaveCount(0);
});
