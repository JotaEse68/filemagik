import test from 'node:test';
import assert from 'node:assert/strict';
import {runProductionSmoke} from '../scripts/fm06-production-smoke.mjs';

const base='https://filemagik.example';
const getRoutes=new Map([
 ['/es',{html:'<html lang="es"></html>'}],
 ['/es/png-to-webp',{html:'<html></html>'}],
 ['/es/ocr-pdf',{html:'<html></html>'}],
 ['/es/pdf-studio',{html:'<html></html>'}],
 ['/admin/login',{html:'<html></html>'}],
 ['/api/admin/advertising',{status:401,json:{error:'Acceso denegado'}}],
 ['/api/advertising',{json:{enabled:true,banners:[
  {slot:'toolHorizontal',provider:'own',enabled:true,src:'',href:'https://example.org/product',alt:'Producto'}
 ],rotation:{toolHorizontal:{seconds:30,banners:[
  {slot:'toolHorizontal',provider:'own',src:'',href:'https://example.org/product',alt:'Producto'}
 ]}}}}],
 ['/api/rewarded/status',{json:{available:false}}],
 ['/api/pdf-engine?operation=pdf-to-docx',{json:{available:true,challengeRequired:true,siteKey:'0x4AAAAA-test'}}],
 ['/api/worker-engine?operation=server-gif-to-webp',{json:{available:false,challengeRequired:false,siteKey:null}}],
 ['/readyz',{json:{ready:true}}],
]);
function simulated(changes={}){
 const records=new Map(getRoutes);
 for(const [key,value] of Object.entries(changes))records.set(key,value);
 const seen=[];
 const fakeFetch=async(url,options)=>{
  assert.equal(options.method,'GET');
  assert.equal(options.body,undefined);
  seen.push(new URL(url).pathname+new URL(url).search);
  const entry=records.get(new URL(url).pathname+new URL(url).search);
  if(!entry)return new Response('Not found',{status:404});
  const headers={'Content-Type':entry.html!==undefined?'text/html':'application/json'};
  return new Response(entry.html!==undefined?entry.html:JSON.stringify(entry.json),{
   status:entry.status??200,headers
  });
 };
 return {fakeFetch,seen};
}
test('FM-06 read-only release smoke checks public HTML, private admin and PDF gate',async()=>{
 const {fakeFetch,seen}=simulated();
 const result=await runProductionSmoke({site:base,railway:'https://railway.example',fetcher:fakeFetch});
 assert.equal(result.ok,true,JSON.stringify(result.checks));
 assert.equal(result.checks.length,11);
 assert.ok(seen.includes('/readyz'));
});
test('FM-06 does not mistake exposed admin data for a successful release',async()=>{
 const {fakeFetch}=simulated({'/api/admin/advertising':{json:{settings:{secret:'exposed'}}}});
 const result=await runProductionSmoke({site:base,fetcher:fakeFetch});
 assert.equal(result.ok,false);
 assert.equal(result.checks.find(c=>c.label.includes('Admin campaigns')).ok,false);
});
test('FM-06 blocks unsafe ad destinations and paid rewarded activation',async()=>{
 const {fakeFetch}=simulated({
  '/api/advertising':{json:{enabled:true,banners:[{slot:'home',provider:'own',src:'',href:'http://bad.test'}]}},
  '/api/rewarded/status':{json:{available:true}},
 });
 const result=await runProductionSmoke({site:base,fetcher:fakeFetch});
 assert.equal(result.ok,false);
 assert.equal(result.checks.filter(x=>!x.ok).length,2);
});
test('FM-06 does not pass a bare READY worker without Turnstile',async()=>{
 const {fakeFetch}=simulated({'/api/pdf-engine?operation=pdf-to-docx':{
  json:{available:true,challengeRequired:false,siteKey:null}
 }});
 const result=await runProductionSmoke({site:base,fetcher:fakeFetch});
 assert.equal(result.checks.find(c=>c.label.startsWith('Professional PDF')).ok,false);
});
test('FM-06 refuses insecure/public URLs before probing',async()=>{
 const {fakeFetch}=simulated();
 await assert.rejects(runProductionSmoke({site:'http://filemagik.example',fetcher:fakeFetch}),/HTTPS/);
 await assert.rejects(runProductionSmoke({site:'https://user:pass@filemagik.example/',fetcher:fakeFetch}),/HTTPS/);
});
