import type {OutputFile} from './convert';

const LIMIT=24_000_000,MAX_BYTES=40*1024*1024;

/** Extracts only the first GIF frame, intentionally never claims animation preservation. */
export async function gifToPng(file:File):Promise<OutputFile>{
 if(file.size<13||file.size>MAX_BYTES)throw new Error('GIF must be smaller than 40 MB');
 const header=new Uint8Array(await file.slice(0,13).arrayBuffer());
 const signature=String.fromCharCode(...header.slice(0,6));
 if(!['GIF87a','GIF89a'].includes(signature))throw new Error('Invalid GIF header');
 const width=header[6]|header[7]<<8,height=header[8]|header[9]<<8;
 if(!width||!height||width*height>LIMIT)throw new Error('GIF dimensions exceed safe limits');
 let bitmap:ImageBitmap;
 try{bitmap=await createImageBitmap(file);}catch{throw new Error('GIF decoder is unavailable or image is invalid');}
 try{
  if(bitmap.width!==width||bitmap.height!==height)throw new Error('GIF decoded dimensions differ from header');
  const canvas=document.createElement('canvas');
  canvas.width=width;canvas.height=height;
  const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Canvas unavailable');
  ctx.drawImage(bitmap,0,0);
  const result=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('PNG encoding failed')),'image/png'));
  if(result.type!=='image/png')throw new Error('PNG output unsupported');
  return {name:file.name.replace(/\.gif$/i,'')+'-first-frame.png',blob:result};
 }finally{bitmap.close();}
}
