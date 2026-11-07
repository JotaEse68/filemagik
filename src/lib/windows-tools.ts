import type {OutputFile} from './convert';
const MB=1024*1024;
function clean(s:string){return s.normalize('NFKD').replace(/[^a-zA-Z0-9_-]/g,'-').replace(/-+/g,'-').slice(0,60)||'archivo';}
export async function inspectFile(file:File):Promise<OutputFile>{
 const digest=await crypto.subtle.digest('SHA-256',await file.arrayBuffer());
 const hash=[...new Uint8Array(digest)].map(x=>x.toString(16).padStart(2,'0')).join('');
 const info={file:file.name,bytes:file.size,sizeMB:+(file.size/MB).toFixed(3),type:file.type||'unknown',extension:file.name.split('.').pop()?.toLowerCase()||'',lastModified:new Date(file.lastModified).toISOString(),sha256:hash,location:'processed locally'};
 return {name:clean(file.name)+'-info.json',blob:new Blob([JSON.stringify(info,null,2)],{type:'application/json'})};
}
export async function renameBatch(files:File[],prefix='FileMagik'):Promise<OutputFile>{
 if(files.length<1||files.length>100)throw new Error('Select 1–100 files');
 const {default:JSZip}=await import('jszip'),zip=new JSZip();
 const tag=clean(prefix);
 for(let i=0;i<files.length;i++){
  const file=files[i],extension=file.name.match(/\.[^.]+$/)?.[0]?.toLowerCase().replace(/[^a-z0-9.]/g,'')||'';
  zip.file(`${tag}-${String(i+1).padStart(3,'0')}${extension}`,await file.arrayBuffer());
 }
 return {name:'renamed-files.zip',blob:await zip.generateAsync({type:'blob',compression:'DEFLATE'})};
}
export async function resizeImage(file:File,width:number):Promise<OutputFile>{
 if(!Number.isSafeInteger(width)||width<64||width>4000)throw new Error('Width must be between 64 and 4000 px');
 const bitmap=await createImageBitmap(file);
 try{
  const ratio=width/bitmap.width,height=Math.round(bitmap.height*ratio);
  if(width*height>18000000)throw new Error('Output image dimensions are too large');
  const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
  const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Canvas unavailable');
  ctx.imageSmoothingQuality='high';ctx.drawImage(bitmap,0,0,width,height);
  const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(v=>v?resolve(v):reject(new Error('Unable to export resized image')),'image/png'));
  return {name:file.name.replace(/\.[^.]+$/,'')+'-'+width+'px.png',blob};
 }finally{bitmap.close();}
}
