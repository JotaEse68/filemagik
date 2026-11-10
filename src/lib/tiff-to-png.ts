import type {OutputFile} from './convert';
const MAX=40*1024*1024,MAX_PIXELS=12_000_000;
type Tag={type:number;count:number;offset:number};
/** TIFF PackBits: bounded per-strip decoding, including signed -128 no-op. */
export function decodePackBits(compressed:Uint8Array,expected:number):Uint8Array{
 if(expected<0||expected>48_000_000)throw new Error('TIFF strip exceeds decompression limit');
 const decoded=new Uint8Array(expected);
 let input=0,output=0;
 while(input<compressed.length&&output<expected){
  const n=(compressed[input++]<<24)>>24;
  if(n>=0){
   const length=n+1;
   if(input+length>compressed.length||output+length>expected)throw new Error('Invalid PackBits literal run');
   decoded.set(compressed.subarray(input,input+length),output);
   input+=length;output+=length;
  }else if(n!==-128){
   const length=1-n;
   if(input>=compressed.length||output+length>expected)throw new Error('Invalid PackBits repeated run');
   decoded.fill(compressed[input++],output,output+length);output+=length;
  }
 }
 if(output!==expected||input!==compressed.length)throw new Error('Truncated or oversized TIFF PackBits strip');
 return decoded;
}
export function decodeBaselineTiff(bytes:Uint8Array):{width:number;height:number;rgba:Uint8ClampedArray}{
 if(bytes.length<16||bytes.length>MAX)throw new Error('TIFF size is invalid');
 const little=bytes[0]===73&&bytes[1]===73,big=bytes[0]===77&&bytes[1]===77;
 if(!little&&!big)throw new Error('Invalid TIFF endian signature');
 const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
 const u16=(i:number)=>{if(i<0||i+2>bytes.length)throw new Error('Truncated TIFF');return view.getUint16(i,little);};
 const u32=(i:number)=>{if(i<0||i+4>bytes.length)throw new Error('Truncated TIFF');return view.getUint32(i,little);};
 if(u16(2)!==42)throw new Error('Unsupported TIFF variant');
 const ifd=u32(4),count=u16(ifd);if(count>256||ifd+2+count*12+4>bytes.length)throw new Error('Invalid TIFF directory');
 if(u32(ifd+2+count*12)!==0)throw new Error('Multi-page TIFF requires a page-aware exporter');
 const tags=new Map<number,Tag>();
 for(let i=0;i<count;i++){
  const pos=ifd+2+i*12;
  const id=u16(pos),type=u16(pos+2),n=u32(pos+4);
  if(n>1000000)throw new Error('TIFF tag array exceeds limits');
  tags.set(id,{type,count:n,offset:pos+8});
 }
 const values=(id:number):number[]=>{
  const tag=tags.get(id);if(!tag)throw new Error('TIFF missing tag '+id);
  const size=tag.type===3?2:tag.type===4?4:0;
  if(!size||!tag.count||tag.count>100000)throw new Error('Unsupported TIFF tag encoding');
  const n=size*tag.count;const start=n<=4?tag.offset:u32(tag.offset);
  if(start+n>bytes.length)throw new Error('TIFF tag data is truncated');
  return Array.from({length:tag.count},(_,i)=>size===2?u16(start+i*2):u32(start+i*4));
 };
 const single=(id:number,fallback?:number)=>tags.has(id)?values(id)[0]:fallback;
 const width=single(256),height=single(257),compression=single(259,1),photo=single(262),samples=single(277,1),planar=single(284,1);
 if(!width||!height||width*height>MAX_PIXELS)throw new Error('TIFF dimensions exceed the 12 Mpx limit');
 if(![1,32773].includes(compression??-1)||planar!==1||![0,1,2].includes(photo??-1)||!(samples===1||samples===3||samples===4))
  throw new Error('Only baseline grayscale or RGB TIFF with no compression or PackBits is supported');
 if(((photo===0||photo===1)&&samples!==1)||(photo===2&&samples!==3&&samples!==4))
  throw new Error('Unsupported TIFF pixel layout');
 if(values(258).some(n=>n!==8))throw new Error('Only 8-bit TIFF is supported');
 const stripOffsets=values(273),stripSizes=values(279),rows=single(278,height);
 if(!rows||stripOffsets.length!==stripSizes.length||stripOffsets.length!==Math.ceil(height/rows)||stripOffsets.length>10000)
  throw new Error('TIFF strip layout is invalid');
 const stride=width*samples,rgba=new Uint8ClampedArray(width*height*4);
 for(let s=0;s<stripOffsets.length;s++){
  const offset=stripOffsets[s],rowStart=s*rows,actualRows=Math.min(rows,height-rowStart),needed=actualRows*stride;
  if((compression===1&&stripSizes[s]<needed)||offset+stripSizes[s]>bytes.length)throw new Error('TIFF pixel data is truncated');
  const strip=compression===32773?decodePackBits(bytes.subarray(offset,offset+stripSizes[s]),needed):bytes.subarray(offset,offset+needed);
  for(let y=0;y<actualRows;y++)for(let x=0;x<width;x++){
   const at=y*stride+x*samples,dest=((rowStart+y)*width+x)*4;
   if(photo===0||photo===1){const v=photo===0?255-strip[at]:strip[at];rgba[dest]=v;rgba[dest+1]=v;rgba[dest+2]=v;}
   else {rgba[dest]=strip[at];rgba[dest+1]=strip[at+1];rgba[dest+2]=strip[at+2];}
   rgba[dest+3]=samples===4?strip[at+3]:255;
  }
 }
 return {width,height,rgba};
}
export async function tiffToPng(file:File):Promise<OutputFile>{
 if(file.size===0||file.size>MAX)throw new Error('TIFF exceeds 40 MB');
 const image=decodeBaselineTiff(new Uint8Array(await file.arrayBuffer()));
 const canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;
 const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Canvas unavailable');
 ctx.putImageData(new ImageData(new Uint8ClampedArray(image.rgba),image.width,image.height),0,0);
 const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('Cannot export PNG')),'image/png'));
 if(blob.type!=='image/png')throw new Error('PNG export unavailable');
 return {name:file.name.replace(/\.tiff?$/i,'')+'.png',blob};
}
