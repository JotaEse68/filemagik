import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';

function tiffRGB({compression=1}:{compression?:number}={}):Buffer{
 const width=2,height=1;const pixels=Buffer.from([255,0,0,0,255,0]);
 const tags:Array<[number,number,number,number]>=[
  [256,3,1,width],[257,3,1,height],[258,3,3,0],[259,3,1,compression],
  [262,3,1,2],[273,4,1,0],[277,3,1,3],[278,4,1,1],[279,4,1,pixels.length]
 ];
 const n=tags.length,ifd=8,bits=ifd+2+12*n+4,data=bits+6;
 const output=Buffer.alloc(data+pixels.length);output.write('II',0,'ascii');
 output.writeUInt16LE(42,2);output.writeUInt32LE(ifd,4);output.writeUInt16LE(n,ifd);
 for(const [i,tag] of tags.entries()){
  const pos=ifd+2+i*12;output.writeUInt16LE(tag[0],pos);output.writeUInt16LE(tag[1],pos+2);
  output.writeUInt32LE(tag[2],pos+4);
  output.writeUInt32LE(tag[0]===258?bits:tag[0]===273?data:tag[3],pos+8);
 }
 output.writeUInt16LE(8,bits);output.writeUInt16LE(8,bits+2);output.writeUInt16LE(8,bits+4);
 pixels.copy(output,data);return output;
}
test('baseline TIFF really converts RGB pixel data into downloaded PNG',async({page})=>{
 await page.goto('/es/tiff-to-png');
 await page.locator('input[type=file]').setInputFiles({
  name:'photo.tiff',mimeType:'image/tiff',buffer:tiffRGB(),
 });
 await page.getByRole('button',{name:/convertir ahora/i}).click();
 const link=page.locator('a[download]');
 await expect(link).toHaveAttribute('download','photo.png',{timeout:20000});
 const pending=page.waitForEvent('download');await link.click();
 const bytes=await readFile(await (await pending).path());
 expect([...bytes.subarray(0,8)]).toEqual([137,80,78,71,13,10,26,10]);
});
test('unsupported compressed TIFF fails closed instead of producing a fake PNG',async({page})=>{
 await page.goto('/es/tiff-to-png');
 await page.locator('input[type=file]').setInputFiles({
  name:'compressed.tif',mimeType:'image/tiff',buffer:tiffRGB({compression:5}),
 });
 await page.getByRole('button',{name:/convertir ahora/i}).click();
 await expect(page.locator('p[role="alert"]').first()).toContainText('Only baseline grayscale');
 await expect(page.locator('a[download]')).toHaveCount(0);
});

test('PackBits compressed TIFF converts to a real PNG and preserves pixels',async({page})=>{
 await page.goto('/es/tiff-to-png');
 const original=tiffRGB({compression:32773});
 // Replace the raw 6 RGB bytes with one PackBits literal run (control=5)
 const header=original.subarray(0,original.length-6);
 const packed=Buffer.concat([header,Buffer.from([5,255,0,0,0,255,0])]);
 const stripSizeTag=8+2+8*12;
 packed.writeUInt32LE(7,stripSizeTag+8);
 await page.locator('input[type=file]').setInputFiles({
  name:'packed.tiff',mimeType:'image/tiff',buffer:packed,
 });
 await page.getByRole('button',{name:/convertir ahora/i}).click();
 const link=page.locator('a[download]');
 await expect(link).toHaveAttribute('download','packed.png');
 const download=page.waitForEvent('download');await link.click();
 const data=await readFile(await (await download).path());
 expect([...data.subarray(0,8)]).toEqual([137,80,78,71,13,10,26,10]);
});
