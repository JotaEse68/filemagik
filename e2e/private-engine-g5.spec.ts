import {test,expect} from '@playwright/test';
test('New high-cost media/archive/image APIs fail closed without release gates',async({request})=>{
 for(const engine of ['image','media','archive']){
  const status=await request.get('/api/engine/'+engine);
  expect(status.status()).toBe(200);
  expect((await status.json()).available).toBe(false);
 }
 for(const [engine,operation] of [['image','heic-to-png'],['media','video-to-mp4'],['archive','extract-rar']]){
  const denied=await request.post('/api/engine/'+engine+'?operation='+operation,{
   multipart:{file:{name:'sample.bin',mimeType:'application/octet-stream',buffer:Buffer.from('x')}}
  });
  expect(denied.status()).toBe(503);
 }
 const bogus=await request.post('/api/engine/media?operation=arbitrary',{multipart:{
  file:{name:'sample.bin',mimeType:'application/octet-stream',buffer:Buffer.from('x')}
 }});
 expect(bogus.status()).toBe(400);
});
