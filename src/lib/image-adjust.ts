import type {OutputFile} from './convert';

export type ImageAdjustment={
 cropPercent?:number;
 rotation?:0|90|180|270;
 format?:'png'|'jpeg'|'webp';
};

/** Canvas export strips most source metadata, including EXIF. */
export async function adjustImage(file:File,options:ImageAdjustment,quality=.85):Promise<OutputFile>{
 if(!/^image\/(jpeg|png|webp)$/.test(file.type))throw new Error('Unsupported image format');
 const crop=options.cropPercent??0,turn=options.rotation??0,format=options.format??'webp';
 if(!Number.isInteger(crop)||crop<0||crop>40)throw new Error('Crop must be between 0 and 40%');
 if(![0,90,180,270].includes(turn))throw new Error('Unsupported rotation');
 if(!['png','jpeg','webp'].includes(format))throw new Error('Unsupported output format');
 const bitmap=await createImageBitmap(file);
 try{
  if(bitmap.width*bitmap.height>24_000_000)throw new Error('Image dimensions are too large');
  const left=Math.round(bitmap.width*crop/100),top=Math.round(bitmap.height*crop/100);
  const sourceWidth=bitmap.width-left*2,sourceHeight=bitmap.height-top*2;
  if(sourceWidth<2||sourceHeight<2)throw new Error('Crop area too small');
  const swapped=turn===90||turn===270;
  const canvas=document.createElement('canvas');
  canvas.width=swapped?sourceHeight:sourceWidth;canvas.height=swapped?sourceWidth:sourceHeight;
  const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Canvas unavailable');
  ctx.translate(canvas.width/2,canvas.height/2);ctx.rotate(turn*Math.PI/180);
  if(format==='jpeg'){ctx.fillStyle='white';ctx.fillRect(-sourceWidth/2,-sourceHeight/2,sourceWidth,sourceHeight);}
  ctx.drawImage(bitmap,left,top,sourceWidth,sourceHeight,-sourceWidth/2,-sourceHeight/2,sourceWidth,sourceHeight);
  const mime='image/'+format;
  const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('Image export failed')),mime,quality));
  if(blob.type!==mime)throw new Error('This browser cannot export '+format);
  const ext=format==='jpeg'?'jpg':format;
  return {name:file.name.replace(/\.[^.]+$/,'')+'-edited.'+ext,blob};
 }finally{bitmap.close();}
}
