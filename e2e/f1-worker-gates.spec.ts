import {test,expect} from '@playwright/test';

test('all private workers remain fail-closed while not enabled',async({request})=>{
 for(const operation of ['server-heic-to-png','server-gif-to-webp','server-audio-to-mp3',
  'server-video-to-mp4','server-extract-7z','server-extract-rar']){
  const status=await request.get('/api/worker-engine?operation='+operation);
  expect(status.ok()).toBeTruthy();
  const payload=await status.json();
  expect(payload.available).toBe(false);
  expect(payload.siteKey).toBeNull();
  const post=await request.post('/api/worker-engine?operation='+operation,{
   multipart:{file:{name:operation.includes('rar')?'sample.rar':'sample.mp4',
    mimeType:'application/octet-stream',buffer:Buffer.from('no payload')}},
  });
  expect(post.status()).toBe(503);
 }
});
test('private archive tool provides no unsafe local download',async({page})=>{
 await page.goto('/es/server-extract-7z');
 await page.locator('input[type=file]').setInputFiles({
  name:'example.7z',mimeType:'application/x-7z-compressed',buffer:Buffer.from('fake archive'),
 });
 await expect(page.getByText('Servicio privado no habilitado. No se subirá ningún archivo.')).toBeVisible();
 await page.getByRole('button',{name:/convertir ahora/i}).click();
 await expect(page.locator('p.error[role="alert"]')).toContainText('Private conversion engine not available');
 await expect(page.locator('a[download]')).toHaveCount(0);
});
