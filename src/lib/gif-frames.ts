import type {OutputFile} from './convert';
type FrameResult={image:{displayWidth:number;displayHeight:number;duration?:number;close:()=>void}};
type Decoder={tracks:{ready:Promise<void>;selectedTrack?:{frameCount:number}};decode:(opts:{frameIndex:number})=>Promise<FrameResult>;close:()=>void};
type DecoderConstructor=new(opts:{data:Uint8Array;type:string})=>Decoder;
/** Preserves every GIF frame as PNG plus playback timing metadata, no lossy first-frame claim. */
export async function gifFramesToZip(file:File,options:{signal?:AbortSignal;onProgress?:(done:number,total:number)=>void}={}):Promise<OutputFile>{
 if(file.size<13||file.size>30*1024*1024)throw new Error('GIF must be smaller than 30 MB');
 const header=new Uint8Array(await file.slice(0,13).arrayBuffer());
 const signature=String.fromCharCode(...header.slice(0,6));
 if(!['GIF89a','GIF87a'].includes(signature))throw new Error('Not a valid GIF');
 const Decoder=(globalThis as typeof globalThis & {ImageDecoder?:DecoderConstructor}).ImageDecoder;
 if(!Decoder)throw new Error('Animated GIF decoding is not supported by this browser');
 const decoder=new Decoder({data:new Uint8Array(await file.arrayBuffer()),type:'image/gif'});
 try{
  await decoder.tracks.ready;
  const count=decoder.tracks.selectedTrack?.frameCount||0;
  if(count<1||count>120)throw new Error('GIF frame count exceeds the 120 frame limit');
  const {default:JSZip}=await import('jszip');
  const zip=new JSZip(),timing:{frame:string;durationMs:number}[]=[];
  let totalPixels=0;
  for(let i=0;i<count;i++){
   if(options.signal?.aborted)throw new DOMException('GIF frame export cancelled','AbortError');
   const {image}=await decoder.decode({frameIndex:i});
   try{
    if(!image.displayWidth||!image.displayHeight||image.displayWidth*image.displayHeight>16_000_000)
     throw new Error('GIF frame dimensions exceed the 16 megapixel limit');
    totalPixels+=image.displayWidth*image.displayHeight;
    if(totalPixels>80_000_000)throw new Error('GIF frame batch exceeds 80 megapixels');
    const canvas=document.createElement('canvas');
    canvas.width=image.displayWidth;canvas.height=image.displayHeight;
    const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Canvas is unavailable');
    ctx.drawImage(image as unknown as CanvasImageSource,0,0);
    const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('Cannot encode GIF frame')),'image/png'));
    const filename='frame-'+String(i+1).padStart(3,'0')+'.png';
    zip.file(filename,await blob.arrayBuffer());
    timing.push({frame:filename,durationMs:Math.max(10,Math.round((image.duration||100000)/1000))});
    canvas.width=0;canvas.height=0;
    options.onProgress?.(i+1,count);
   }finally{image.close();}
  }
  zip.file('timing.json',JSON.stringify({format:'FileMagik GIF frames',loop:'original playback loop not represented',frames:timing},null,2));
  if(options.signal?.aborted)throw new DOMException('GIF frame export cancelled','AbortError');
  return {name:file.name.replace(/\.gif$/i,'')+'-frames.zip',
   blob:await zip.generateAsync({type:'blob',compression:'STORE'})};
 }finally{decoder.close();}
}
