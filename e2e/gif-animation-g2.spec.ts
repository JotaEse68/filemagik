import {test,expect} from '@playwright/test';
import JSZip from 'jszip';
import {readFile} from 'node:fs/promises';
const GIF='R0lGODlhAgACAIEAAP8AAAAAAAAAAAAAACH/C05FVFNDQVBFMi4wAwEAAAAh+QQADAAAACwAAAAAAgACAAAIBgABCAQQEAAh+QQBGAABACwAAAAAAgACAIEAAP8AAAAAAAAAAAAIBgABCAQQEAA7';
test('Animated GIF exports two real PNG frames and timing instead of dropping animation',async({page})=>{
 await page.goto('/es/gif-frames-to-zip');
 const supported=await page.evaluate(()=>typeof (globalThis as {ImageDecoder?:unknown}).ImageDecoder==='function');
 await page.locator('input[type=file]').setInputFiles({name:'animated.gif',mimeType:'image/gif',buffer:Buffer.from(GIF,'base64')});
 await page.getByRole('button',{name:/convertir ahora/i}).click();
 if(!supported){
  await expect(page.locator('p.error[role="alert"]')).toContainText('not supported');
  await expect(page.locator('a[download]')).toHaveCount(0);return;
 }
 const link=page.locator('a[download]');
 await expect(link).toHaveAttribute('download','animated-frames.zip');
 const pending=page.waitForEvent('download');await link.click();
 const zip=await JSZip.loadAsync(await readFile(await (await pending).path()));
 expect(Object.keys(zip.files).sort()).toEqual(['frame-001.png','frame-002.png','timing.json']);
 for(const frame of ['frame-001.png','frame-002.png']){
  const bytes=await zip.file(frame)!.async('uint8array');
  expect([...bytes.slice(0,8)]).toEqual([137,80,78,71,13,10,26,10]);
 }
 const metadata=JSON.parse(await zip.file('timing.json')!.async('string')) as {frames:Array<{durationMs:number}>};
 expect(metadata.frames).toHaveLength(2);
 expect(metadata.frames[0].durationMs).toBeGreaterThan(0);
});
