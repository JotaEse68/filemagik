#!/usr/bin/env node
// Production probe: real internet, never sends valid challenge tokens or user files.
const origin=process.argv[2]||'https://filemagik.vercel.app';
const wave=process.argv[3]||'wave2';
const all=['server-heic-to-png','server-gif-to-webp','server-audio-to-mp3',
 'server-video-to-gif','server-video-to-mp4','server-gif-to-mp4',
 'server-extract-7z','server-extract-rar'];
const expected=wave==='wave2'?[
 'server-gif-to-webp','server-heic-to-png','server-audio-to-mp3','server-extract-7z','server-extract-rar'
]:wave==='all'?all:wave==='gif'?['server-gif-to-webp']:[];
let failed=0;
for(const op of all){
 const ready=expected.includes(op);
 try{
  const target=new URL('/api/worker-engine?operation='+op,origin);
  const res=await fetch(target,{signal:AbortSignal.timeout(15000),cache:'no-store'});
  const body=await res.json();
  if(res.status!==200||body.available!==ready||body.challengeRequired!==ready||
   (ready?typeof body.siteKey!=='string'||body.siteKey.length<6:body.siteKey!==null)||
   !String(res.headers.get('cache-control')).includes('no-store'))throw Error('capability mismatch: '+res.status);
  const data=new FormData();
  const ext=op.includes('heic')?'heic':op.includes('audio')?'wav':op.includes('video')?'mp4':op.includes('gif')?'gif':op.includes('rar')?'rar':'7z';
  data.set('file',new File([new Uint8Array([1,2,3,4,5,6,7,8])],'sample.'+ext));
  const post=await fetch(target,{method:'POST',body:data,signal:AbortSignal.timeout(15000)});
  const required=ready?403:503;
  if(post.status!==required)throw Error('unexpected POST: '+post.status+' expected '+required);
  console.log('PASS '+op+' '+(ready?'Turnstile required, HTTP 403':'disabled, HTTP 503'));
 }catch(e){failed++;console.error('FAIL '+op+' '+e.message);}
}
if(failed)process.exit(1);
console.log('PASS: '+all.length+' production operations checked, wave='+wave);
