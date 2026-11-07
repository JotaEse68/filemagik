import type {OutputFile} from './convert';
import {parsePageSelection,partitionPages,remainingPages} from './pdf-pages';
export type PdfAction='split-pdf-by-count'|'extract-pdf-pages'|'delete-pdf-pages'|'watermark-pdf';
export type PdfOptions={pages?:string;groupSize?:number;watermark?:string;opacity?:number;angle?:number};
function pdfBlob(bytes:Uint8Array<ArrayBufferLike>):Blob{return new Blob([new Uint8Array(bytes)],{type:'application/pdf'});}
export async function pdfAction(action:PdfAction,source:File,options:PdfOptions={}):Promise<OutputFile>{
 const {PDFDocument,degrees,rgb,StandardFonts}=await import('pdf-lib');
 const pdf=await PDFDocument.load(await source.arrayBuffer());
 const total=pdf.getPageCount();if(total<1||total>500)throw new Error('PDF must contain between 1 and 500 pages');
 const base=source.name.replace(/\.pdf$/i,'');
 if(action==='watermark-pdf'){
  const text=(options.watermark??'CONFIDENTIAL').trim();
  if(!text||text.length>80)throw new Error('Watermark must have 1–80 characters');
  const opacity=Math.min(.9,Math.max(.05,options.opacity??.23));
  const angle=Math.min(90,Math.max(-90,options.angle??-30));
  const font=await pdf.embedFont(StandardFonts.Helvetica);
  const pages=options.pages?parsePageSelection(options.pages,total):Array.from({length:total},(_,i)=>i);
  for(const index of pages){
   const page=pdf.getPage(index),size=Math.max(16,Math.min(62,page.getWidth()/Math.max(7,text.length*.67)));
   const width=font.widthOfTextAtSize(text,size);
   page.drawText(text,{x:(page.getWidth()-width)/2,y:page.getHeight()/2,size,font,rotate:degrees(angle),color:rgb(.36,.38,.48),opacity});
  }
  return {name:base+'-watermarked.pdf',blob:pdfBlob(await pdf.save())};
 }
 if(action==='extract-pdf-pages'||action==='delete-pdf-pages'){
  const pages=parsePageSelection(options.pages??'',total);
  const selected=action==='delete-pdf-pages'?remainingPages(total,pages):pages;
  if(!selected.length)throw new Error('The result must contain at least one page');
  const out=await PDFDocument.create();const copied=await out.copyPages(pdf,selected);
  copied.forEach(p=>out.addPage(p));
  return {name:base+(action==='extract-pdf-pages'?'-extracted.pdf':'-cleaned.pdf'),blob:pdfBlob(await out.save())};
 }
 const groups=partitionPages(total,options.groupSize??1);
 const {default:JSZip}=await import('jszip');const zip=new JSZip();
 for(let i=0;i<groups.length;i++){
  const part=await PDFDocument.create();const copied=await part.copyPages(pdf,groups[i]);copied.forEach(p=>part.addPage(p));
  zip.file(`${base}-pages-${groups[i][0]+1}-${groups[i][groups[i].length-1]+1}.pdf`,await part.save());
 }
 return {name:base+'-parts.zip',blob:await zip.generateAsync({type:'blob'})};
}