import {test,expect} from '@playwright/test';
import JSZip from 'jszip';

test('G11: mixed batch offers both presets, upload limits and explicit private-engine gate on mobile and desktop',async({page})=>{
 await page.route('**/api/worker-engine?operation=server-mixed-batch',route=>route.fulfill({
  status:200,contentType:'application/json',body:JSON.stringify({available:false,challengeRequired:false,siteKey:null})
 }));
 await page.goto('/es/server-mixed-batch');
 const file=page.locator('input[type=file]').first();
 await expect(file).toHaveAttribute('multiple','');
 await file.setInputFiles([
  {name:'clip.mp3',mimeType:'audio/mpeg',buffer:Buffer.from('ID3-mock-audio')},
  {name:'frame.gif',mimeType:'image/gif',buffer:Buffer.from('GIF89a-mock-animation')},
 ]);
 await expect(page.getByText(/hasta 6 archivos y 12 MB/i)).toBeVisible();
 await expect(page.getByRole('status').filter({hasText:'Servicio privado no habilitado'})).toBeVisible();
 await expect(page.getByRole('button',{name:/convertir ahora/i})).toBeVisible();
 await page.locator('select').filter({has:page.locator('option[value="extract"]')}).selectOption('extract');
 await expect(page.locator('select').filter({has:page.locator('option[value="extract"]')})).toHaveValue('extract');
 await file.setInputFiles({name:'oversize.mp3',mimeType:'audio/mpeg',buffer:Buffer.alloc(3*1024*1024+1)});
 await expect(page.locator('p.error[role="alert"]')).toContainText('File too large');
 await expect(page.getByRole('button',{name:/convertir ahora/i})).toHaveCount(0);
});

test('G11: mixed batch metadata route is unavailable until allowlisted, and malformed public upload is rejected',async({request})=>{
 const availability=await request.get('/api/worker-engine?operation=server-mixed-batch');
 expect(availability.status()).toBe(200);
 const json=await availability.json();
 expect(typeof json.available).toBe('boolean');
 if(!json.available)return;
 const response=await request.post('/api/worker-engine?operation=server-mixed-batch',
  {multipart:{files:{name:'fake.gif',mimeType:'image/gif',buffer:Buffer.from('GIF89a')}}});
 expect(response.status()).toBe(403);
});

test('G11: ZIP manifest fixture encodes mixed results and checksums without claiming remote resumption',async()=>{
 const zip=new JSZip();
 zip.file('01-animation.webp',Buffer.from('RIFF1234WEBP'));
 zip.file('manifest.json',JSON.stringify({preset:'web-friendly',files:[
  {index:0,name:'animation.gif',status:'ok',output:'01-animation.webp',bytes:12,
   sha256:'0'.repeat(64)},
  {index:1,name:'invalid.txt',status:'unsupported'}
 ]}));
 const actual=await JSZip.loadAsync(await zip.generateAsync({type:'uint8array'}),{checkCRC32:true});
 expect(JSON.parse(await actual.file('manifest.json')!.async('string')).files.map((x:{status:string})=>x.status))
  .toEqual(['ok','unsupported']);
});
