import {test,expect} from '@playwright/test';
import JSZip from 'jszip';
import {readFile} from 'node:fs/promises';

test('server archive UI forwards operation, file and human challenge token, then downloads real ZIP',async({page})=>{
 await page.addInitScript(()=>{
  (window as typeof window & {turnstile:unknown}).turnstile={
   render:(_element:HTMLElement,options:{callback:(token:string)=>void})=>{
    queueMicrotask(()=>options.callback('test-turnstile-visitor-token'));return 1;
   },reset:()=>{},remove:()=>{},
  };
 });
 let posts=0;
 const zip=new JSZip();zip.file('notes.txt','FileMagik connected worker');
 const zipped=Buffer.from(await zip.generateAsync({type:'uint8array'}));
 await page.route('**/api/worker-engine**',async route=>{
  const req=route.request(),url=new URL(req.url());
  expect(url.searchParams.get('operation')).toBe('server-extract-7z');
  if(req.method()==='GET')await route.fulfill({
   status:200,contentType:'application/json',
   body:JSON.stringify({available:true,challengeRequired:true,siteKey:'test-site-key'}),
  });
  else{
   posts++;
   expect(req.postData()||'').toContain('test-turnstile-visitor-token');
   expect(req.postData()||'').toContain('archive.7z');
   await route.fulfill({status:200,contentType:'application/zip',body:zipped});
  }
 });
 await page.goto('/es/server-extract-7z');
 await page.locator('input[type=file]').setInputFiles({
  name:'archive.7z',mimeType:'application/x-7z-compressed',buffer:Buffer.from('7z placeholder for mocked upstream'),
 });
 await expect(page.getByText('Máximo 3 MB. Se envía temporalmente al servidor')).toBeVisible();
 await page.getByRole('button',{name:/convertir ahora/i}).click();
 const link=page.locator('a[download]');
 await expect(link).toHaveAttribute('download','archive-filemagik.zip');
 const pending=page.waitForEvent('download');await link.click();
 const result=await JSZip.loadAsync(await readFile(await (await pending).path()));
 expect(await result.file('notes.txt')?.async('string')).toBe('FileMagik connected worker');
 expect(posts).toBe(1);
});
