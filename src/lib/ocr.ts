import type {OutputFile} from './convert';
export type OcrLanguage='eng'|'spa'|'por'|'fra';
export async function runOcr(file:File,kind:'ocr-image'|'ocr-pdf',language:OcrLanguage):Promise<OutputFile>{
 const {createWorker}=await import('tesseract.js');
 const worker=await createWorker(language);
 let pdf:import('pdfjs-dist').PDFDocumentProxy|null=null;
 try{
  const chunks:string[]=[];
  if(kind==='ocr-image'){
   const {data}=await worker.recognize(file);
   chunks.push(data.text);
  }else{
   const pdfjs=await import('pdfjs-dist');
   pdfjs.GlobalWorkerOptions.workerSrc=new URL('pdfjs-dist/build/pdf.worker.min.mjs',import.meta.url).toString();
   pdf=await pdfjs.getDocument({data:new Uint8Array(await file.arrayBuffer())}).promise;
   if(pdf.numPages>15)throw new Error('OCR is limited to 15 PDF pages per job');
   for(let i=1;i<=pdf.numPages;i++){
    const page=await pdf.getPage(i);const view=page.getViewport({scale:1.6});
    if(view.width*view.height>16_000_000)throw new Error('PDF page is too large for OCR');
    const canvas=document.createElement('canvas');
    canvas.width=Math.ceil(view.width);canvas.height=Math.ceil(view.height);
    const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Canvas unavailable');
    await page.render({canvas,canvasContext:ctx,viewport:view}).promise;
    const {data}=await worker.recognize(canvas);
    chunks.push(`--- Page ${i} ---\n${data.text.trim()}`);
    canvas.width=0;canvas.height=0;page.cleanup();
   }
  }
  const text=chunks.join('\n\n');
  return {name:file.name.replace(/\.[^.]+$/,'')+'-ocr.txt',blob:new Blob([text],{type:'text/plain;charset=utf-8'})};
 }finally{if(pdf)await pdf.cleanup();await worker.terminate();}
}