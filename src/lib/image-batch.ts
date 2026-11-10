import type {OutputFile} from './convert';

/** Convert a bounded batch of JPG, PNG, and WebP images to WebP in the browser. */
export async function imagesToWebpZip(files:File[],quality=.84,options:{signal?:AbortSignal;onProgress?:(done:number,total:number)=>void}={}):Promise<OutputFile>{
 if(files.length<1||files.length>30)throw new Error('Select 1 to 30 images');
 const {default:JSZip}=await import('jszip');
 const zip=new JSZip();
 for(let i=0;i<files.length;i++){
  if(options.signal?.aborted)throw new DOMException('Batch cancelled','AbortError');
  const file=files[i];
  if(!/^image\/(jpeg|png|webp)$/.test(file.type))throw new Error('Unsupported image: '+file.name);
  const bitmap=await createImageBitmap(file);
  try{
   if(bitmap.width*bitmap.height>24_000_000)throw new Error('Image dimensions are too large');
   const canvas=document.createElement('canvas');canvas.width=bitmap.width;canvas.height=bitmap.height;
   const context=canvas.getContext('2d');if(!context)throw new Error('Canvas is unavailable');
   context.drawImage(bitmap,0,0);
   const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(value=>value?resolve(value):reject(new Error('Cannot encode WebP')),'image/webp',quality));
   if(blob.type!=='image/webp')throw new Error('WebP encoding is not supported in this browser');
   const basename=file.name.replace(/\.[^.]+$/,'').replace(/[^a-zA-Z0-9_-]/g,'_').slice(0,80)||'image';
   if(options.signal?.aborted)throw new DOMException('Batch cancelled','AbortError');
   zip.file(String(i+1).padStart(3,'0')+'-'+basename+'.webp',await blob.arrayBuffer());
   options.onProgress?.(i+1,files.length);
   canvas.width=0;canvas.height=0;
  }finally{bitmap.close();}
 }
 if(options.signal?.aborted)throw new DOMException('Batch cancelled','AbortError');
 return {name:'filemagik-images-webp.zip',blob:await zip.generateAsync({type:'blob',compression:'STORE',streamFiles:true})};
}
