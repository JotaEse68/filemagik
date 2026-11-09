import type {OutputFile} from './convert';
import {PDFDocument,StandardFonts,rgb} from 'pdf-lib';

function elements(node:Document|Element,tag:string){return Array.from(node.getElementsByTagName(tag));}
function first(node:Document|Element,tag:string){return elements(node,tag)[0]||null;}
function fit(text:string,maxChars:number){const parts=String(text).normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^\x20-\x7E]/g,'?').split(/\s+/);const lines:string[]=[];let line='';for(const part of parts){if(!part)continue;if(line&&line.length+1+part.length>maxChars){lines.push(line);line=part;}else line+=(line?' ':'')+part;}if(line)lines.push(line);return lines;}
function normalizePath(from:string,to:string){const segments=from.split('/').slice(0,-1);for(const part of to.split('/')){if(part==='..')segments.pop();else if(part&&part!=='.')segments.push(part);}return segments.join('/');}
function transform(node:Element){
 const xfrm=first(node,'a:xfrm')||first(node,'p:xfrm');
 const off=xfrm?first(xfrm,'a:off'):null,ext=xfrm?first(xfrm,'a:ext'):null;
 return {x:Number(off?.getAttribute('x')||0),y:Number(off?.getAttribute('y')||0),w:Number(ext?.getAttribute('cx')||0),h:Number(ext?.getAttribute('cy')||0)};
}
export async function pptxToLayoutPdf(file:File):Promise<OutputFile>{
 const {default:JSZip}=await import('jszip');
 const zip=await JSZip.loadAsync(await file.arrayBuffer());
 const presentation=zip.file('ppt/presentation.xml');
 if(!presentation)throw new Error('Not a valid PPTX file');
 const parser=new DOMParser();
 const pdoc=parser.parseFromString(await presentation.async('text'),'text/xml');
 const size=first(pdoc,'p:sldSz');
 const sx=Number(size?.getAttribute('cx')||12192000),sy=Number(size?.getAttribute('cy')||6858000);
 if(sx<=0||sy<=0)throw new Error('Invalid slide dimensions');
 const pages=Object.keys(zip.files).filter(p=>/^ppt\/slides\/slide\d+\.xml$/.test(p)).sort((a,b)=>Number(a.match(/slide(\d+)/)?.[1])-Number(b.match(/slide(\d+)/)?.[1]));
 if(!pages.length||pages.length>80)throw new Error('PPTX must contain 1–80 slides');
 const pdf=await PDFDocument.create(),font=await pdf.embedFont(StandardFonts.Helvetica),bold=await pdf.embedFont(StandardFonts.HelveticaBold);
 const PW=960,PH=Math.round(PW*sy/sx),scale=PW/sx;
 for(const path of pages){
  const xml=parser.parseFromString(await zip.file(path)!.async('text'),'text/xml');
  const page=pdf.addPage([PW,PH]);
  page.drawRectangle({x:0,y:0,width:PW,height:PH,color:rgb(1,1,1)});
  const relPath=path.replace('/slides/','/slides/_rels/')+'.rels';
  const relationships=new Map<string,string>();
  const relFile=zip.file(relPath);
  if(relFile){
   const relDoc=parser.parseFromString(await relFile.async('text'),'text/xml');
   for(const rel of elements(relDoc,'Relationship')){
    const id=rel.getAttribute('Id'),target=rel.getAttribute('Target');
    if(id&&target&&!/^https?:/i.test(target))relationships.set(id,normalizePath(path,target));
   }
  }
  // Text boxes stay selectable in the resulting PDF.
  for(const shape of elements(xml,'p:sp').slice(0,200)){
   const box=transform(shape);if(box.w<=0||box.h<=0)continue;
   const ps=elements(shape,'a:p');
   const lines=ps.flatMap(p=>{const value=elements(p,'a:t').map(t=>t.textContent||'').join('');return fit(value,Math.max(8,Math.floor(box.w*scale/9)));}).slice(0,35);
   const fontSize=Math.max(9,Math.min(23,box.h*scale/Math.max(1,lines.length+1)*.58));
   const x=box.x*scale+4,y=PH-box.y*scale-5;
   for(const [index,line] of lines.entries()){
    const baseline=y-fontSize*(index+1)*1.23;if(baseline<0)break;
    page.drawText(line.slice(0,160),{x,y:baseline,size:fontSize,font:index===0&&fontSize>16?bold:font,color:rgb(.15,.17,.23)});
   }
  }
  // Embedded JPG/PNG remain photographic images; charts, SmartArt and vector shapes are not reproduced.
  for(const pic of elements(xml,'p:pic').slice(0,60)){
   const embed=first(pic,'a:blip')?.getAttribute('r:embed');
   const filename=embed?relationships.get(embed):undefined;
   if(!filename)continue;
   const entry=zip.file(filename);
   if(!entry)continue;
   const box=transform(pic);if(box.w<=0||box.h<=0)continue;
   try{
    const bytes=await entry.async('uint8array');
    const image=/\.png$/i.test(filename)?await pdf.embedPng(bytes):/\.(jpe?g)$/i.test(filename)?await pdf.embedJpg(bytes):null;
    if(image)page.drawImage(image,{x:box.x*scale,y:PH-(box.y+box.h)*scale,width:box.w*scale,height:box.h*scale});
   }catch{/* Keep compatible text and images rather than aborting on an unsupported vector image. */}
  }
 }
 return {name:file.name.replace(/\.pptx$/i,'')+'-slides.pdf',blob:new Blob([new Uint8Array(await pdf.save())],{type:'application/pdf'})};
}
