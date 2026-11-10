import {test,expect} from '@playwright/test';
import JSZip from 'jszip';
import {readFile} from 'node:fs/promises';

function multiPageTiff(loop=false):Buffer{
 const entries=8,dirSize=2+entries*12+4,first=8,second=first+dirSize,pixelStart=second+dirSize;
 const data=Buffer.alloc(pixelStart+4);
 data.write('II',0);data.writeUInt16LE(42,2);data.writeUInt32LE(first,4);
 const ids=[256,257,258,259,262,273,278,279];
 for(const [page,offset] of [first,second].entries()){
  data.writeUInt16LE(entries,offset);
  for(const [i,id] of ids.entries()){
   const pos=offset+2+i*12;
   const type=id===273?4:3;
   const value=id===256?2:id===257?1:id===258?8:id===259?1:id===262?1:id===273?pixelStart+2*page:id===278?1:2;
   data.writeUInt16LE(id,pos);
   data.writeUInt16LE(type,pos+2);
   data.writeUInt32LE(1,pos+4);
   if(type===3)data.writeUInt16LE(value,pos+8);else data.writeUInt32LE(value,pos+8);
  }
  data.writeUInt32LE(page===0?second:(loop?first:0),offset+2+entries*12);
 }
 data.set([25,50,175,225],pixelStart);
 return data;
}
test('Multi-page TIFF exports every page to valid separate PNG images inside ZIP',async({page})=>{
 await page.goto('/es/tiff-pages-to-zip');
 await page.locator('input[type=file]').setInputFiles({
  name:'scans.tiff',mimeType:'image/tiff',buffer:multiPageTiff(),
 });
 await page.getByRole('button',{name:/convertir ahora/i}).click();
 const link=page.locator('a[download]');
 await expect(link).toHaveAttribute('download','scans-pages.zip',{timeout:20000});
 const pending=page.waitForEvent('download');await link.click();
 const zipped=await JSZip.loadAsync(await readFile(await (await pending).path()));
 const names=Object.keys(zipped.files).sort();
 expect(names).toEqual(['page-001.png','page-002.png']);
 for(const name of names){
  const bytes=await zipped.file(name)!.async('uint8array');
  expect([...bytes.slice(0,8)]).toEqual([137,80,78,71,13,10,26,10]);
 }
});
test('TIFF cyclic page directory is rejected before any download',async({page})=>{
 await page.goto('/es/tiff-pages-to-zip');
 await page.locator('input[type=file]').setInputFiles({
  name:'corrupted.tiff',mimeType:'image/tiff',buffer:multiPageTiff(true),
 });
 await page.getByRole('button',{name:/convertir ahora/i}).click();
 await expect(page.locator('p.error[role="alert"]')).toContainText('Cyclic TIFF');
 await expect(page.locator('a[download]')).toHaveCount(0);
});
test('Single-page TIFF converter refuses multi-page input without silently losing pages',async({page})=>{
 await page.goto('/es/tiff-to-png');
 await page.locator('input[type=file]').setInputFiles({
  name:'scans.tiff',mimeType:'image/tiff',buffer:multiPageTiff(),
 });
 await page.getByRole('button',{name:/convertir ahora/i}).click();
 await expect(page.locator('p.error[role="alert"]')).toContainText('Multi-page TIFF requires');
 await expect(page.locator('a[download]')).toHaveCount(0);
});
