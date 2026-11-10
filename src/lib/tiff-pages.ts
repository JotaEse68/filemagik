import type {OutputFile} from './convert';
import {decodeBaselineTiff,tiffPageOffsets} from './tiff-to-png';

/** Every TIFF IFD is decoded separately, exported to real PNG and packaged in a ZIP. */
export async function tiffPagesToZip(file:File):Promise<OutputFile>{
 if(file.size===0||file.size>40*1024*1024)throw new Error('TIFF exceeds the 40 MB limit');
 const bytes=new Uint8Array(await file.arrayBuffer());
 const pages=tiffPageOffsets(bytes);
 const {default:JSZip}=await import('jszip');
 const zip=new JSZip();let pixels=0;
 for(let i=0;i<pages.length;i++){
  const image=decodeBaselineTiff(bytes,i);
  pixels+=image.width*image.height;
  if(pixels>36_000_000)throw new Error('TIFF pages exceed the 36 megapixel batch limit');
  const canvas=document.createElement('canvas');
  canvas.width=image.width;canvas.height=image.height;
  const context=canvas.getContext('2d');if(!context)throw new Error('Image canvas unavailable');
  context.putImageData(new ImageData(new Uint8ClampedArray(image.rgba),image.width,image.height),0,0);
  const png=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(
   blob=>blob?resolve(blob):reject(new Error('TIFF PNG page encoding failed')),'image/png'));
  if(png.type!=='image/png')throw new Error('PNG encoding is unsupported');
  zip.file('page-'+String(i+1).padStart(3,'0')+'.png',await png.arrayBuffer());
  canvas.width=0;canvas.height=0;
 }
 const blob=await zip.generateAsync({type:'blob',compression:'STORE'});
 return {name:file.name.replace(/\.tiff?$/i,'')+'-pages.zip',blob};
}
