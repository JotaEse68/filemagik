import type {OutputFile} from './convert';
import {parsePageSelection,partitionPages,remainingPages,parsePageOrder} from './pdf-pages';
export type PdfAction='split-pdf-by-count'|'extract-pdf-pages'|'delete-pdf-pages'|'watermark-pdf'|'reorder-pdf-pages'|'sign-pdf-visual'|'crop-pdf'|'annotate-pdf-text';
export type PdfOptions={pages?:string;groupSize?:number;watermark?:string;opacity?:number;angle?:number;signature?:string;cropPercent?:number;annotationText?:string;annotationPages?:string;annotationPlacement?:'top-left'|'bottom-left'|'top-right'};
function pdfBlob(bytes:Uint8Array<ArrayBufferLike>):Blob{return new Blob([new Uint8Array(bytes)],{type:'application/pdf'});}
export async function pdfAction(action:PdfAction,source:File,options:PdfOptions={}):Promise<OutputFile>{
 const {PDFDocument,degrees,rgb,StandardFonts}=await import('pdf-lib');
 const pdf=await PDFDocument.load(await source.arrayBuffer());
 const total=pdf.getPageCount();if(total<1||total>500)throw new Error('PDF must contain between 1 and 500 pages');
 const base=source.name.replace(/\.pdf$/i,'');
 if(action==='crop-pdf'){
  const percent=options.cropPercent??5;
  if(!Number.isFinite(percent)||percent<0||percent>30)throw new Error('Crop must be between 0 and 30 percent');
  for(const page of pdf.getPages()){
   const {x,y,width,height}=page.getCropBox(),left=width*percent/100,bottom=height*percent/100;
   if(width-2*left<20||height-2*bottom<20)throw new Error('Page is too small for this crop');
   page.setCropBox(x+left,y+bottom,width-2*left,height-2*bottom);
  }
  return {name:base+'-cropped.pdf',blob:pdfBlob(await pdf.save())};
 }
 if(action==='annotate-pdf-text'){
  const text=(options.annotationText??'').trim();
  if(!text||text.length>120)throw new Error('Annotation must have 1–120 characters');
  const font=await pdf.embedFont(StandardFonts.Helvetica);
  const printable=text.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^\x20-\x7E]/g,'?');
  const pages=options.annotationPages?.trim()?parsePageSelection(options.annotationPages,total):Array.from({length:total},(_,i)=>i);
  const placement=options.annotationPlacement??'bottom-left';
  for(const index of pages){
   const page=pdf.getPage(index),box=page.getCropBox();
   const maxWidth=box.width-44;
   let size=12;while(size>6&&font.widthOfTextAtSize(printable,size)>maxWidth)size--;
   const textWidth=font.widthOfTextAtSize(printable,size);
   if(textWidth>maxWidth)throw new Error('Annotation too long for the page');
   const x=placement==='top-right'?box.x+box.width-textWidth-22:box.x+22;
   const y=placement==='bottom-left'?box.y+22:box.y+box.height-size-25;
   page.drawRectangle({x:x-5,y:y-7,width:textWidth+10,height:size+14,color:rgb(1,1,.8),opacity:.82});
   page.drawText(printable,{x,y,size,font,color:rgb(.1,.1,.2)});
  }
  return {name:base+'-annotated.pdf',blob:pdfBlob(await pdf.save())};
 }
 if(action==='sign-pdf-visual'){
  const text=(options.signature??'').trim();if(!text||text.length>90)throw new Error('Enter a signature name (1–90 characters)');
  const page=pdf.getPage(total-1),font=await pdf.embedFont(StandardFonts.Helvetica),size=14;
  const safe=text.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^\x20-\x7E]/g,'?');
  const label='Signed visually by: '+safe;
  page.drawText(label,{x:36,y:55,size,font,color:rgb(.12,.19,.37)});
  return {name:base+'-visually-signed.pdf',blob:pdfBlob(await pdf.save())};
 }
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
 if(action==='reorder-pdf-pages'){
  const order=parsePageOrder(options.pages??'',total);
  const out=await PDFDocument.create();const copied=await out.copyPages(pdf,order);copied.forEach(p=>out.addPage(p));
  return {name:base+'-reordered.pdf',blob:pdfBlob(await out.save())};
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