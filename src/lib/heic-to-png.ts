import type {OutputFile} from './convert';

const MAX=40*1024*1024,MAX_PIXELS=24_000_000;
const BRANDS=new Set(['heic','heix','hevc','hevx','heim','heis','hevm','hevs','mif1']);
/** Decode HEIC/HEIF with browser codec when available; never silently relabel bytes. */
export async function heicToPng(file:File):Promise<OutputFile>{
 if(file.size<24||file.size>MAX)throw new Error('HEIC input must be smaller than 40 MB');
 const bytes=new Uint8Array(await file.slice(0,64).arrayBuffer());
 const view=new DataView(bytes.buffer);
 const declared=view.getUint32(0,false);
 if(declared<16||declared>file.size||String.fromCharCode(...bytes.subarray(4,8))!=='ftyp')
  throw new Error('Not a valid HEIC/HEIF container');
 const limit=Math.min(declared,bytes.byteLength),brands:string[]=[];
 for(let i=8;i+4<=limit;i+=4){if(i===12)continue;brands.push(String.fromCharCode(...bytes.subarray(i,i+4)));}
 if(!brands.some(b=>BRANDS.has(b))||!brands.some(b=>b.startsWith('hei')||b.startsWith('hev')||b==='heic'||b==='heix'))
  throw new Error('Unsupported HEIC/HEIF codec brand');
 let bitmap:ImageBitmap;
 try{bitmap=await createImageBitmap(file);}
 catch{throw new Error('This browser cannot decode HEIC/HEIF natively; use a supported browser or convert on a compatible device');}
 try{
  if(!bitmap.width||!bitmap.height||bitmap.width*bitmap.height>MAX_PIXELS)
   throw new Error('HEIC image exceeds the safe 24 Mpx limit');
  const canvas=document.createElement('canvas');canvas.width=bitmap.width;canvas.height=bitmap.height;
  const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Canvas unavailable');
  ctx.drawImage(bitmap,0,0);
  const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('HEIC PNG encoding failed')),'image/png'));
  if(blob.type!=='image/png')throw new Error('PNG encoding unavailable');
  return {name:file.name.replace(/\.(heic|heif)$/i,'')+'.png',blob};
 }finally{bitmap.close();}
}
