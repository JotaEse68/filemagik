#!/usr/bin/env node
/**
 * FileMagik F1 production gate. Runs WITHOUT credentials.
 *
 * Usage:
 *  node scripts/f1-production-gates.mjs https://filemagik.vercel.app off
 *  node scripts/f1-production-gates.mjs https://filemagik.vercel.app on
 *
 * "on" confirms configuration and rejects unauthorized uploads, but real
 * conversions still require a human Turnstile token from an interactive browser.
 */
const url=process.argv[2],mode=process.argv[3]||'off';
if(!url||!/^https:\/\//.test(url)||!['on','off'].includes(mode)){
 console.error('Usage: node scripts/f1-production-gates.mjs https://<host> off|on');
 process.exit(2);
}
const operations=['server-heic-to-png','server-gif-to-webp','server-audio-to-mp3',
 'server-video-to-gif','server-video-to-mp4','server-gif-to-mp4',
 'server-extract-7z','server-extract-rar'];
let failed=false;
async function get(path){
 const response=await fetch(new URL(path,url),{redirect:'error',signal:AbortSignal.timeout(12000)});
 const type=response.headers.get('content-type')||'';
 if(!type.includes('application/json'))throw Error('Expected JSON for '+path);
 return {status:response.status,payload:await response.json(),cache:response.headers.get('cache-control')||''};
}
for(const op of operations){
 try{
  const path='/api/worker-engine?operation='+op;
  const {status,payload,cache}=await get(path);
  const ready=mode==='on';
  if(status!==200||payload.available!==ready||payload.challengeRequired!==ready||
      (ready?typeof payload.siteKey!=='string'||payload.siteKey.length<6:payload.siteKey!==null)||
      !cache.includes('no-store'))throw Error('Unexpected capability/verification status');
  console.log('PASS '+op+' ('+(ready?'verified private engine':'fail closed')+')');
 }catch(e){failed=true;console.error('FAIL '+op+': '+e.message);}
}
if(mode==='off'){
 const form=new FormData();
 form.set('file',new File([new Uint8Array([1,2,3])],'sample.gif'));
 try{
  const response=await fetch(new URL('/api/worker-engine?operation=server-gif-to-webp',url),
   {method:'POST',body:form,signal:AbortSignal.timeout(12000)});
  if(response.status!==503)throw Error('Expected HTTP 503, got '+response.status);
  console.log('PASS unauthorized conversion remains blocked (503)');
 }catch(e){failed=true;console.error('FAIL fail-closed POST: '+e.message);}
}
if(failed)process.exit(1);
console.log('PASS FileMagik F1 '+mode+' public configuration gates. No uploads or secrets used.');
