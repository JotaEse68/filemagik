import type {OutputFile} from './convert';

const MAX_INPUT=40*1024*1024;
const MAX_PIXELS=24_000_000;

/** Uses the native browser AVIF decoder. Output is a single PNG still image. */
export async function avifToPng(file:File):Promise<OutputFile>{
 if(file.size<16||file.size>MAX_INPUT)throw new Error('AVIF input must be smaller than 40 MB');
 // ISO BMFF AVIF brand header; do not rely on user-supplied MIME/extension.
 const header=new Uint8Array(await file.slice(0,32).arrayBuffer());
 const brand=new TextDecoder('ascii').decode(header.subarray(4,12));
 if(brand.slice(0,4)!=='ftyp'||!['avif','avis'].includes(brand.slice(4,8)))
  throw new Error('Not a valid AVIF image header');
 let bitmap:ImageBitmap;
 try{bitmap=await createImageBitmap(file);}
 catch{throw new Error('This browser cannot decode this AVIF image');}
 try{
  if(!bitmap.width||!bitmap.height||bitmap.width*bitmap.height>MAX_PIXELS)
   throw new Error('AVIF image dimensions exceed the safe limit');
  const canvas=document.createElement('canvas');canvas.width=bitmap.width;canvas.height=bitmap.height;
  const context=canvas.getContext('2d');if(!context)throw new Error('Image canvas unavailable');
  context.drawImage(bitmap,0,0);
  const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(
   output=>output?resolve(output):reject(new Error('Could not encode PNG')),'image/png'));
  if(blob.type!=='image/png')throw new Error('PNG export is unsupported');
  canvas.width=0;canvas.height=0;
  return {name:file.name.replace(/\.avif$/i,'')+'.png',blob};
 }finally{bitmap.close();}
}
