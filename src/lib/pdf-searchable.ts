import type {OutputFile} from './convert';
import type {OcrLanguage} from './ocr';

type Box={x0:number;y0:number;x1:number;y1:number};
type Word={text:string;bbox:Box};
type OcrLine={words:Word[]};
type OcrParagraph={lines:OcrLine[]};
type OcrBlock={paragraphs:OcrParagraph[]};
function wordsFromBlocks(blocks:unknown):Word[]{
 if(!Array.isArray(blocks))return [];
 const words:Word[]=[];
 for(const block of blocks as OcrBlock[])for(const paragraph of block.paragraphs||[])for(const line of paragraph.lines||[])for(const word of line.words||[]){
  if(word?.bbox&&typeof word.text==='string'&&word.text.trim())words.push(word);
 }
 return words;
}
export async function pdfToSearchable(file:File,language:OcrLanguage):Promise<OutputFile>{
 const pdfjs=await import('pdfjs-dist');
 const {PDFDocument,StandardFonts}=await import('pdf-lib');
 const {createWorker}=await import('tesseract.js');
 pdfjs.GlobalWorkerOptions.workerSrc=new URL('pdfjs-dist/build/pdf.worker.min.mjs',import.meta.url).toString();
 const original=await file.arrayBuffer();
 const source=await pdfjs.getDocument({data:new Uint8Array(original.slice(0))}).promise;
 const output=await PDFDocument.load(original);
 if(source.numPages>15)throw new Error('Searchable OCR is limited to 15 PDF pages');
 if(source.numPages!==output.getPageCount())throw new Error('PDF page mismatch');
 const worker=await createWorker(language);
 const font=await output.embedFont(StandardFonts.Helvetica);
 let textCount=0;
 try{
  for(let index=1;index<=source.numPages;index++){
   const page=await source.getPage(index);
   try{
    // PDF.js correctly transforms display pixel coordinates back to PDF user space,
    // even when the source page has /Rotate or a non-zero CropBox origin.
    const rotation=(page.rotate%360+360)%360;
    const target=output.getPage(index-1);
    const view=page.getViewport({scale:1.8});
    if(view.width*view.height>18_000_000)throw new Error('Page dimensions exceed OCR memory limit');
    const canvas=document.createElement('canvas');canvas.width=Math.ceil(view.width);canvas.height=Math.ceil(view.height);
    try{
     const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Canvas unavailable');
     await page.render({canvas,canvasContext:ctx,viewport:view}).promise;
     const {data}=await worker.recognize(canvas,{}, {blocks:true});
     const words=wordsFromBlocks(data.blocks);
     const {degrees}=await import('pdf-lib');
     for(const word of words){
      const {x0,x1,y0,y1}=word.bbox;
      if(![x0,x1,y0,y1].every(Number.isFinite)||x1<=x0||y1<=y0)continue;
      // Helvetica's WinAnsi encoding does not support all scripts.
      const printable=word.text.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^\x20-\x7E]/g,'').trim();
      if(!printable)continue;
      // Transform the OCR rectangle (viewport pixels) to the original PDF coordinate system.
      const [ax,ay]=view.convertToPdfPoint(x0,y1);
      const [bx,by]=view.convertToPdfPoint(x1,y0);
      const height=Math.hypot(bx-ax,by-ay);
      const size=Math.min(28,Math.max(4,(y1-y0)/view.scale*.85));
      const x=Math.min(ax,bx),y=Math.min(ay,by);
      const width=Math.max(8,Math.hypot(x1-x0,y1-y0)/view.scale+10);
      if(!Number.isFinite(x)||!Number.isFinite(y)||!Number.isFinite(height))continue;
      try{target.drawText(printable,{x,y,size,font,rotate:degrees((360-rotation)%360),opacity:0,maxWidth:width});textCount++;}catch{/* Skip unsupported fragments without corrupting the original page. */}
     }
    }finally{canvas.width=0;canvas.height=0;}
   }finally{page.cleanup();}
  }
  if(textCount===0)throw new Error('OCR found no usable text. The PDF was not changed.');
  const bytes=await output.save({useObjectStreams:true});
  return {name:file.name.replace(/\.pdf$/i,'')+'-searchable.pdf',blob:new Blob([new Uint8Array(bytes)],{type:'application/pdf'})};
 }finally{await source.cleanup();await worker.terminate();}
}
