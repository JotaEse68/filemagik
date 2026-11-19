#!/usr/bin/env node
/**
 * FM-06 production smoke: read-only checks with no owner credentials,
 * file uploads, Turnstile bypasses, campaign writes, or new deployments.
 *
 * node scripts/fm06-production-smoke.mjs https://www.filemagik.com \
 *   https://filemagik-pdf-api-production.up.railway.app
 *
 * A PASS is necessary, not sufficient, for final certification: interactive
 * CAPTCHA, real file downloads, Blob writes and Railway stress remain manual.
 */
import {pathToFileURL} from 'node:url';

const validBase=(raw)=>{
 const u=new URL(raw);
 if(u.protocol!=='https:'||u.username||u.password||u.pathname!=='/'||u.search||u.hash)
  throw new Error('FM-06 requires an HTTPS origin, without credentials or path');
 return u.origin;
};
const safeUrl=(value)=>{
 try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password;}
 catch{return false;}
};

export async function runProductionSmoke({site,railway=null,fetcher=fetch}){
 const root=validBase(site),backend=railway?validBase(railway):null;
 const checks=[];
 async function check(label,action){
  try{await action();checks.push({label,ok:true});}
  catch(e){checks.push({label,ok:false,error:e instanceof Error?e.message:String(e)});}
 }
 async function get(base,path){
  const response=await fetcher(new URL(path,base).toString(),{
   method:'GET',cache:'no-store',redirect:'manual',signal:AbortSignal.timeout(12000)
  });
  return response;
 }
 async function json(base,path,status=200){
  const response=await get(base,path);
  if(response.status!==status)throw Error(path+': HTTP '+response.status+', esperado '+status);
  const type=response.headers.get('content-type')||'';
  if(!type.includes('application/json'))throw Error(path+': Content-Type inesperado');
  return response.json();
 }
 for(const route of ['/es','/es/png-to-webp','/es/ocr-pdf','/es/pdf-studio','/admin/login']){
  await check('HTML '+route,async()=>{
   const response=await get(root,route);
   if(response.status!==200)throw Error('HTTP '+response.status);
   if(!(response.headers.get('content-type')||'').includes('text/html'))throw Error('Respuesta no HTML');
  });
 }
 await check('Admin campaigns fail closed (401)',async()=>{
  await json(root,'/api/admin/advertising',401);
 });
 await check('Public campaigns schema and HTTPS destinations',async()=>{
  const config=await json(root,'/api/advertising');
  if(typeof config.enabled!=='boolean'||!Array.isArray(config.banners))throw Error('Esquema público inválido');
  if(config.banners.length>20)throw Error('Demasiados banners');
  for(const b of config.banners){
   if(!b||typeof b.slot!=='string'||!['own','partner','adsense'].includes(b.provider||'own'))
    throw Error('Banner público inválido');
   if(b.provider!=='adsense'&&(!(b.src||b.href)||(b.href&&!safeUrl(b.href))))
    throw Error('Anuncio propio sin creatividad ni URL HTTPS');
  }
  for(const [slot,item] of Object.entries(config.rotation||{})){
   if(typeof slot!=='string'||!item||typeof item!=='object'||!Array.isArray(item.banners)||
      !Number.isInteger(item.seconds)||item.seconds<15||item.seconds>600)
    throw Error('Rotación pública inválida');
  }
 });
 await check('Paid rewarded remains disabled',async()=>{
  const state=await json(root,'/api/rewarded/status');
  if(state.available!==false)throw Error('Rewarded disponible antes de FM-05');
 });
 await check('Professional PDF availability and Turnstile contract',async()=>{
  const state=await json(root,'/api/pdf-engine?operation=pdf-to-docx');
  if(state.available!==true||state.challengeRequired!==true||
     typeof state.siteKey!=='string'||state.siteKey.length<6)
   throw Error('PDF remoto no disponible o sin verificación humana');
 });
 await check('Worker capability contract',async()=>{
  const state=await json(root,'/api/worker-engine?operation=server-gif-to-webp');
  if(typeof state.available!=='boolean'||state.challengeRequired!==state.available||
     (state.available&&(typeof state.siteKey!=='string'||state.siteKey.length<6)))
   throw Error('Estado de motor privado inconsistente');
 });
 if(backend)await check('Railway PDF API /readyz',async()=>{
  const response=await get(backend,'/readyz');
  if(response.status!==200)throw Error('Railway API/Gotenberg no READY: HTTP '+response.status);
 });
 return {ok:checks.every(c=>c.ok),checks};
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const site=process.argv[2],railway=process.argv[3]||null;
 if(!site){console.error('Uso: node scripts/fm06-production-smoke.mjs <HTTPS_WEB> [HTTPS_RAILWAY]');process.exit(2);}
 try{
  const result=await runProductionSmoke({site,railway});
  for(const c of result.checks)console.log((c.ok?'PASS ':'FAIL ')+c.label+(c.error?' — '+c.error:''));
  console.log('IMPORTANTE: este smoke NO certifica CAPTCHA real, descargas, escrituras Blob ni carga en Railway.');
  if(!result.ok)process.exitCode=1;
 }catch(e){console.error(e instanceof Error?e.message:String(e));process.exitCode=1;}
}
