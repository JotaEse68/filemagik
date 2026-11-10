import type {OutputFile} from './convert';

const outputExtensions:Record<string,string>={
 'server-heic-to-png':'.png',
 'server-gif-to-webp':'.webp',
 'server-video-extract-mp3':'.mp3',
 'server-audio-to-wav':'.wav',
 'server-audio-to-mp3':'.mp3',
 'server-video-to-gif':'.gif',
 'server-video-to-mp4':'.mp4',
 'server-gif-to-mp4':'.mp4',
 'server-extract-7z':'.zip',
 'server-extract-rar':'.zip',
};
export function isWorkerSlug(slug:string):boolean{
 return Object.prototype.hasOwnProperty.call(outputExtensions,slug);
}
export async function runWorkerConversion(
 slug:string,file:File,token:string,signal?:AbortSignal,
):Promise<OutputFile>{
 if(!isWorkerSlug(slug))throw new Error('Unsupported server conversion');
 if(!token)throw new Error('Human verification is required');
 const form=new FormData();
 form.set('file',file,file.name);form.set('turnstile',token);
 const response=await fetch('/api/worker-engine?operation='+encodeURIComponent(slug),{
  method:'POST',body:form,cache:'no-store',signal,
 });
 if(!response.ok){
  const details=await response.json().catch(()=>({error:'Conversion engine unavailable'}));
  throw new Error(typeof details.error==='string'?details.error:'Conversion engine unavailable');
 }
 const mime=response.headers.get('content-type')||'application/octet-stream';
 const blob=await response.blob();
 if(blob.size<8||blob.size>12*1024*1024)throw new Error('Invalid server output size');
 return {name:file.name.replace(/\.[^.]+$/,'')+'-filemagik'+outputExtensions[slug],
  blob:new Blob([blob],{type:mime})};
}
