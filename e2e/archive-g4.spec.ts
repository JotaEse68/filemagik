import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import JSZip from 'jszip';

async function convertAndDownload(page:import('@playwright/test').Page){
 await page.getByRole('button',{name:/convertir ahora/i}).click();
 const link=page.locator('a[download]');
 await expect(link).toBeVisible({timeout:20000});
 const pending=page.waitForEvent('download');await link.click();
 return readFile(await (await pending).path());
}
test('TAR tools create a valid archive and extract both files via the browser',async({page})=>{
 await page.goto('/es/create-tar');
 await page.locator('input[type=file]').setInputFiles([
  {name:'first.txt',mimeType:'text/plain',buffer:Buffer.from('First content')},
  {name:'second.txt',mimeType:'text/plain',buffer:Buffer.from('Second content')},
 ]);
 const tar=await convertAndDownload(page);
 expect(tar.subarray(257,262).toString('ascii')).toBe('ustar');
 await page.goto('/es/extract-tar');
 await page.locator('input[type=file]').setInputFiles({
  name:'bundle.tar',mimeType:'application/x-tar',buffer:tar,
 });
 const zipped=await convertAndDownload(page);
 const zip=await JSZip.loadAsync(zipped);
 const entries=Object.values(zip.files).filter(f=>!f.dir);
 expect(entries).toHaveLength(2);
 expect((await Promise.all(entries.map(f=>f.async('string')))).sort()).toEqual(['First content','Second content']);
});
