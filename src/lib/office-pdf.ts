import type {OutputFile} from './convert';
import {PDFDocument,StandardFonts,rgb} from 'pdf-lib';
type PdfPage=ReturnType<PDFDocument['addPage']>;
const W=595,H=842,M=42;
function printable(input:unknown){return String(input??'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^\x20-\x7E]/g,'?');}
function wrap(text:string,maxChars:number){const words=printable(text).split(/\s+/);const lines:string[]=[];let line='';for(const word of words){if(!word)continue;if((line+' '+word).length>maxChars&&line){lines.push(line);line=word;}else line+=(line?' ':'')+word;}if(line)lines.push(line);return lines.length?lines:[''];}

export async function wordToLayoutPdf(file:File):Promise<OutputFile>{
 const mammoth=await import('mammoth');
 const result=await mammoth.convertToHtml({arrayBuffer:await file.arrayBuffer()},{convertImage:mammoth.images.imgElement(async image=>({src:'data:'+image.contentType+';base64,'+await image.read('base64')}))});
 const html=new DOMParser().parseFromString(result.value,'text/html');
 const pdf=await PDFDocument.create(),regular=await pdf.embedFont(StandardFonts.Helvetica),bold=await pdf.embedFont(StandardFonts.HelveticaBold);
 let page=pdf.addPage([W,H]),y=H-M;
 const next=(need:number)=>{if(y-need<M){page=pdf.addPage([W,H]);y=H-M;}};
 function para(text:string,size=11,isBold=false,indent=0){const lines=wrap(text,Math.max(25,Math.floor((W-2*M-indent)/(size*.53))));next(lines.length*(size+5)+10);for(const line of lines){page.drawText(line,{x:M+indent,y,size,font:isBold?bold:regular,color:rgb(.14,.18,.27)});y-=size+5;}y-=8;}
 async function image(el:Element){
  const src=el.getAttribute('src')||'';const found=/^data:image\/(png|jpeg|jpg);base64,(.+)$/i.exec(src);if(!found)return;
  const bytes=Uint8Array.from(atob(found[2]),c=>c.charCodeAt(0));
  const embedded=found[1].toLowerCase()==='png'?await pdf.embedPng(bytes):await pdf.embedJpg(bytes);
  const scale=Math.min(1,(W-2*M)/embedded.width,360/embedded.height);
  const w=Math.max(1,embedded.width*scale),h=Math.max(1,embedded.height*scale);
  next(h+15);page.drawImage(embedded,{x:M,y:y-h,width:w,height:h});y-=h+14;
 }
 function table(el:Element){
  const rows=Array.from(el.querySelectorAll('tr')).slice(0,300);
  const maxCols=Math.min(8,Math.max(1,...rows.map(r=>r.querySelectorAll('th,td').length)));
  const colWidth=(W-2*M)/maxCols;
  for(const row of rows){
   const cells=Array.from(row.querySelectorAll('th,td')).slice(0,maxCols);
   const blocks=cells.map(c=>wrap(c.textContent||'',Math.max(7,Math.floor((colWidth-12)/5.5))));
   const height=Math.max(24,...blocks.map(b=>b.length*12+8));next(height+2);
   cells.forEach((cell,i)=>{const x=M+i*colWidth;page.drawRectangle({x,y:y-height,width:colWidth,height,borderColor:rgb(.67,.73,.83),borderWidth:.5});blocks[i].forEach((line,k)=>page.drawText(line,{x:x+5,y:y-13-k*12,size:9,font:cell.tagName==='TH'?bold:regular}));});
   y-=height;
  }
  y-=14;
 }
 async function walk(node:Element){
  for(const el of Array.from(node.children)){
   const tag=el.tagName;
   if(tag==='TABLE')table(el);
   else if(tag==='IMG')await image(el);
   else if(['P','H1','H2','H3','H4','LI','BLOCKQUOTE'].includes(tag)){
    const size=tag==='H1'?21:tag==='H2'?17:tag==='H3'?14:11;
    para((tag==='LI'?'• ':'')+(el.textContent||''),size,tag.startsWith('H'),tag==='LI'?10:0);
    for(const img of Array.from(el.querySelectorAll('img')))await image(img);
   }else await walk(el);
  }
 }
 await walk(html.body);
 return {name:file.name.replace(/\.docx$/i,'')+'-layout.pdf',blob:new Blob([new Uint8Array(await pdf.save())],{type:'application/pdf'})};
}

export async function excelToLayoutPdf(file:File):Promise<OutputFile>{
 const ExcelJS=(await import('exceljs')).default;const workbook=new ExcelJS.Workbook();
 await workbook.xlsx.load(await file.arrayBuffer());
 const pdf=await PDFDocument.create(),font=await pdf.embedFont(StandardFonts.Helvetica),bold=await pdf.embedFont(StandardFonts.HelveticaBold);
 let count=0;
 for(const sheet of workbook.worksheets.slice(0,15)){
  const columns=Math.min(10,Math.max(1,sheet.columnCount)),colWidth=(W-2*M)/columns;
  let page:PdfPage=pdf.addPage([W,H]),y=H-M;
  page.drawText(printable(sheet.name).slice(0,65),{x:M,y,size:15,font:bold});y-=29;
  const maxRows=Math.min(1000,sheet.rowCount);
  for(let n=1;n<=maxRows;n++){
   const row=sheet.getRow(n);
   const cells=Array.from({length:columns},(_,i)=>row.getCell(i+1));
   const strings=cells.map(cell=>{
    const value=cell.value;
    if(value&&typeof value==='object'&&'result' in value)return printable(value.result);
    if(value&&typeof value==='object'&&'richText' in value)return printable(value.richText.map(part=>part.text).join(''));
    if(value instanceof Date)return value.toISOString().slice(0,10);
    return printable(value);
   });
   const lines=strings.map(s=>wrap(s,Math.max(5,Math.floor((colWidth-9)/5.3))).slice(0,8));
   const rowHeight=Math.max(22,...lines.map(x=>x.length*12+8));
   if(y-rowHeight<M){page=pdf.addPage([W,H]);y=H-M;count++;}
   cells.forEach((cell,i)=>{
    const x=M+i*colWidth;
    page.drawRectangle({x,y:y-rowHeight,width:colWidth,height:rowHeight,borderColor:rgb(.74,.79,.87),borderWidth:.5});
    lines[i].forEach((text,k)=>page.drawText(text,{x:x+4,y:y-12-k*12,font:cell.font?.bold?bold:font,size:9}));
   });
   y-=rowHeight;
  }
 }
 if(!pdf.getPageCount())throw new Error('No worksheet pages to export');
 return {name:file.name.replace(/\.xlsx$/i,'')+'-layout.pdf',blob:new Blob([new Uint8Array(await pdf.save())],{type:'application/pdf'})};
}
