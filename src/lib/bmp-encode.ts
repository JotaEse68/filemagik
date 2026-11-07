import type {OutputFile} from './convert';

/** A simple 24-bit, uncompressed Windows BMP encoder. Alpha is flattened over white. */
export function encodeBGR24(width:number,height:number,rgba:Uint8ClampedArray):Blob{
 if(!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1||width*height>12_000_000)throw new Error('Image dimensions are too large for BMP');
 if(rgba.length!==width*height*4)throw new Error('Invalid pixel buffer size');
 const stride=Math.ceil(width*3/4)*4,bytes=54+stride*height;
 if(bytes>50*1024*1024)throw new Error('BMP result is too large');
 const buffer=new ArrayBuffer(bytes),view=new DataView(buffer),pixels=new Uint8Array(buffer);
 view.setUint16(0,0x4d42,true);view.setUint32(2,bytes,true);view.setUint32(10,54,true);
 view.setUint32(14,40,true);view.setInt32(18,width,true);view.setInt32(22,height,true);
 view.setUint16(26,1,true);view.setUint16(28,24,true);view.setUint32(34,stride*height,true);
 for(let y=0;y<height;y++){
  const out=54+(height-y-1)*stride;
  for(let x=0;x<width;x++){
   const from=(y*width+x)*4,a=rgba[from+3]/255;
   for(let channel=0;channel<3;channel++){
    pixels[out+x*3+channel]=Math.round(rgba[from+2-channel]*a+255*(1-a));
   }
  }
 }
 return new Blob([buffer],{type:'image/bmp'});
}
export async function convertImageToBmp(file:File):Promise<OutputFile>{
 if(!/^image\/(jpeg|png|webp)$/.test(file.type))throw new Error('Select JPG, PNG or WebP');
 const bitmap=await createImageBitmap(file);
 try{
  const canvas=document.createElement('canvas');
  canvas.width=bitmap.width;canvas.height=bitmap.height;
  const ctx=canvas.getContext('2d',{willReadFrequently:true});
  if(!ctx)throw new Error('Canvas unavailable');
  ctx.fillStyle='#fff';ctx.fillRect(0,0,bitmap.width,bitmap.height);ctx.drawImage(bitmap,0,0);
  return {name:file.name.replace(/\.[^.]+$/,'')+'.bmp',blob:encodeBGR24(bitmap.width,bitmap.height,ctx.getImageData(0,0,bitmap.width,bitmap.height).data)};
 }finally{bitmap.close();}
}
