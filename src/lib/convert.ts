import {csvToJson,jsonToCsv} from './csv';
import type {ToolSlug} from '@/config/site';
export type OutputFile={name:string;blob:Blob};
export async function convertFiles(slug:ToolSlug,files:File[],quality=.88):Promise<OutputFile>{
 if(!files.length)throw new Error('Select a file');
 if(files.some(f=>f.size>25*1024*1024))throw new Error('File exceeds 25 MB');
 const name=files[0].name.replace(/\.[^.]+$/,'');
 if(slug==='csv-to-json'||slug==='json-to-csv'){
  const text=await files[0].text();const result=slug==='csv-to-json'?csvToJson(text):jsonToCsv(text);
  const ext=slug==='csv-to-json'?'json':'csv';
  return {name:`${name}.${ext}`,blob:new Blob([result],{type:ext==='json'?'application/json':'text/csv;charset=utf-8'})};
 }
 if(slug==='word-to-text'){
  const mammoth=await import('mammoth');
  const result=await mammoth.extractRawText({arrayBuffer:await files[0].arrayBuffer()});
  return {name:`${name}.txt`,blob:new Blob([result.value],{type:'text/plain;charset=utf-8'})};
 }
 if(slug==='rotate-pdf'){
 const {PDFDocument,degrees}=await import('pdf-lib');const pdf=await PDFDocument.load(await files[0].arrayBuffer());
 for(const page of pdf.getPages())page.setRotation(degrees((page.getRotation().angle+90)%360));
 return {name:`${name}-rotated.pdf`,blob:new Blob([new Uint8Array(await pdf.save())],{type:'application/pdf'})};
 }
 if(slug==='images-to-pdf'){
 if(files.length>30)throw new Error('Maximum 30 images per document');
 const {PDFDocument}=await import('pdf-lib');const pdf=await PDFDocument.create();
 for(const file of files){
 const bitmap=await createImageBitmap(file);
 try{
 if(bitmap.width*bitmap.height>45000000)throw new Error('Image dimensions exceed limit');
 const canvas=document.createElement('canvas');canvas.width=bitmap.width;canvas.height=bitmap.height;
 const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Canvas unavailable');
 ctx.fillStyle='#ffffff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(bitmap,0,0);
 const jpeg=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('Cannot encode image')),'image/jpeg',quality));
 const embedded=await pdf.embedJpg(await jpeg.arrayBuffer());const scale=Math.min(1,595/embedded.width,842/embedded.height);
 const width=embedded.width*scale,height=embedded.height*scale;const page=pdf.addPage([Math.max(300,width),Math.max(300,height)]);
 page.drawImage(embedded,{x:(page.getWidth()-width)/2,y:(page.getHeight()-height)/2,width,height});
 }finally{bitmap.close();}
 }
 return {name:'images.pdf',blob:new Blob([new Uint8Array(await pdf.save())],{type:'application/pdf'})};
 }
 if(slug==='merge-pdf'){
  if(files.length<2)throw new Error('Select at least two PDF files');
  const {PDFDocument}=await import('pdf-lib');const combined=await PDFDocument.create();
  for(const f of files){const source=await PDFDocument.load(await f.arrayBuffer());const pages=await combined.copyPages(source,source.getPageIndices());pages.forEach(p=>combined.addPage(p));}
  return {name:'merged.pdf',blob:new Blob([new Uint8Array(await combined.save())],{type:'application/pdf'})};
 }
 if(slug==='split-pdf'){
  const {PDFDocument}=await import('pdf-lib');const source=await PDFDocument.load(await files[0].arrayBuffer());
  const zipModule=await import('jszip');const zip=new zipModule.default();
  if(source.getPageCount()>100)throw new Error('Maximum 100 pages');
  for(let i=0;i<source.getPageCount();i++){const part=await PDFDocument.create();const [page]=await part.copyPages(source,[i]);part.addPage(page);zip.file(`${name}-page-${i+1}.pdf`,await part.save());}
  return {name:`${name}-pages.zip`,blob:await zip.generateAsync({type:'blob'})};
 }
 const formats:Record<string,{mime:string;ext:string}>={
 'jpg-to-webp':{mime:'image/webp',ext:'webp'},'jpg-to-png':{mime:'image/png',ext:'png'},'webp-to-jpg':{mime:'image/jpeg',ext:'jpg'},'png-to-jpg':{mime:'image/jpeg',ext:'jpg'},
 'png-to-webp':{mime:'image/webp',ext:'webp'},'webp-to-png':{mime:'image/png',ext:'png'}};
 const option=formats[slug];if(!option)throw new Error('Unsupported conversion');
 const image=await createImageBitmap(files[0]);
 try{
  const canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;
  if(image.width*image.height>45000000)throw new Error('Image dimensions exceed limit');
  const context=canvas.getContext('2d');if(!context)throw new Error('Canvas unavailable');
  if(option.mime==='image/jpeg'){context.fillStyle='#ffffff';context.fillRect(0,0,canvas.width,canvas.height);}
  context.drawImage(image,0,0);
  const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('Cannot encode image')),option.mime,quality));
  return {name:`${name}.${option.ext}`,blob};
 }finally{image.close();}
}