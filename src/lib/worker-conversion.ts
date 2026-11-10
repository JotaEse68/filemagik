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
 'server-audio-to-flac':'.flac',
 'server-audio-to-ogg':'.ogg',
 'server-trim-audio':'.mp3',
 'server-trim-video':'.mp4',
 'server-video-frame':'.png',
 'server-gif-frames-zip':'.zip',
 'server-mixed-batch':'.zip',
};
export function isWorkerSlug(slug:string):boolean{
 return Object.prototype.hasOwnProperty.call(outputExtensions,slug);
}
export async function runWorkerConversion(
 slug:string,files:File[],token:string,signal?:AbortSignal,
 options:{start?:number;end?:number;preset?:'web-friendly'|'extract'}={},
):Promise<OutputFile>{
 if(!isWorkerSlug(slug))throw new Error('Unsupported server conversion');
 if(!token)throw new Error('Human verification is required');
 const batch=slug==='server-mixed-batch';
 if(!files.length)throw new Error('Select at least one file');
 const form=new FormData();
 for(const file of files)form.append(batch?'files':'file',file,file.name);
 form.set('turnstile',token);
 const params=new URLSearchParams({operation:slug});
 if(options.start!==undefined)params.set('start',String(options.start));
 if(options.end!==undefined)params.set('end',String(options.end));
 if(batch)params.set('preset',options.preset||'web-friendly');
 const response=await fetch('/api/worker-engine?'+params,{
  method:'POST',body:form,cache:'no-store',signal,
 });
 if(!response.ok){
  const details=await response.json().catch(()=>({error:'Conversion engine unavailable'}));
  throw new Error(typeof details.error==='string'?details.error:'Conversion engine unavailable');
 }
 const mime=response.headers.get('content-type')||'application/octet-stream';
 const blob=await response.blob();
 if(blob.size<8||blob.size>12*1024*1024)throw new Error('Invalid server output size');
 return {name:(batch?'filemagik-batch':files[0].name.replace(/\.[^.]+$/,'')+'-filemagik')+outputExtensions[slug],
  blob:new Blob([blob],{type:mime})};
}
