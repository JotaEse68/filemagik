import type {OutputFile} from './convert';
function pdfWorker(){
 return new URL('pdfjs-dist/build/pdf.worker.min.mjs',import.meta.url).toString();
}
export async function pdfToPngZip(file:File):Promise<OutputFile>{
 const pdfjs=await import('pdfjs-dist');
 pdfjs.GlobalWorkerOptions.workerSrc=pdfWorker();
 const pdf=await pdfjs.getDocument({data:new Uint8Array(await file.arrayBuffer())}).promise;
 try{
  if(pdf.numPages>50)throw new Error('Maximum 50 pages for image export');
  const {default:JSZip}=await import('jszip');const zip=new JSZip();
  for(let i=1;i<=pdf.numPages;i++){
   const page=await pdf.getPage(i);
   const viewport=page.getViewport({scale:1.7});
   if(viewport.width*viewport.height>20_000_000)throw new Error('Page image is too large');
   const canvas=document.createElement('canvas');canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);
   const context=canvas.getContext('2d');if(!context)throw new Error('Canvas unavailable');
   await page.render({canvas,canvasContext:context,viewport}).promise;
   const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('Unable to export PNG')),'image/png'));
   zip.file(`page-${String(i).padStart(3,'0')}.png`,await blob.arrayBuffer());
   canvas.width=0;canvas.height=0;page.cleanup();
  }
  return {name:file.name.replace(/\.pdf$/i,'')+'-images.zip',blob:await zip.generateAsync({type:'blob'})};
 }finally{await pdf.cleanup();}
}
export async function pdfToWordText(file:File):Promise<OutputFile>{
 const pdfjs=await import('pdfjs-dist');
 const docx=await import('docx');
 const {makePositionedRows,detectColumns,mapToCells}=await import('./pdf-to-excel');
 pdfjs.GlobalWorkerOptions.workerSrc=pdfWorker();
 const pdf=await pdfjs.getDocument({data:new Uint8Array(await file.arrayBuffer())}).promise;
 try{
  if(pdf.numPages>120)throw new Error('Maximum 120 pages');
  const paragraphs:Array<InstanceType<typeof docx.Paragraph>|InstanceType<typeof docx.Table>>=[];
  for(let number=1;number<=pdf.numPages;number++){
   const page=await pdf.getPage(number);
   try{
    const text=await page.getTextContent();
    const fragments=text.items.filter((item):item is Extract<typeof item,{str:string}>=>'str' in item).filter(it=>it.str.trim()).map(it=>({x:it.transform[4],y:it.transform[5],width:it.width,height:it.height,text:it.str}));
    const rows=makePositionedRows(fragments),columns=detectColumns(rows);
    let index=0;
    while(index<rows.length){
     const row=rows[index];
     const values=mapToCells(row,columns);
     const filled=values.filter(Boolean).length;
     // Consecutive multi-column rows become an actual editable Word table.
     if(columns.length>=2&&filled>=2){
      const body:Array<string[]>=[];
      while(index<rows.length){
       const cells=mapToCells(rows[index],columns);
       if(cells.filter(Boolean).length<2)break;
       body.push(cells);index++;
      }
      if(body.length>=2){
       paragraphs.push(new docx.Table({
        width:{size:100,type:docx.WidthType.PERCENTAGE},
        rows:body.map(cells=>new docx.TableRow({children:cells.map(value=>new docx.TableCell({children:[new docx.Paragraph({text:value})],margins:{top:65,bottom:65,left:90,right:90}}))}))
       }));
      }else for(const cells of body)paragraphs.push(new docx.Paragraph(cells.filter(Boolean).join('    ')));
      continue;
     }
     const str=values.filter(Boolean).join('    ')||row.cells.map(f=>f.text).join(' ');
     if(str.trim()){
      const maxHeight=Math.max(...row.cells.map(f=>f.height||12));
      const heading=maxHeight>17;
      paragraphs.push(new docx.Paragraph({text:str.trim(),heading:heading?docx.HeadingLevel.HEADING_2:undefined,spacing:{before:heading?150:0,after:90}}));
     }
     index++;
    }
    if(number<pdf.numPages)paragraphs.push(new docx.Paragraph({children:[new docx.PageBreak()]}));
   }finally{page.cleanup();}
  }
  const doc=new docx.Document({sections:[{children:paragraphs.length?paragraphs:[new docx.Paragraph('')]}]});
  return {name:file.name.replace(/\\.pdf$/i,'')+'-editable.docx',blob:await docx.Packer.toBlob(doc)};
 }finally{await pdf.cleanup();}
}
export async function wordToBasicPdf(file:File):Promise<OutputFile>{
 const mammoth=await import('mammoth');
 const source=await mammoth.extractRawText({arrayBuffer:await file.arrayBuffer()});
 const pdfLib=await import('pdf-lib');
 const pdf=await pdfLib.PDFDocument.create();const font=await pdf.embedFont(pdfLib.StandardFonts.Helvetica);
 const lines=source.value.split(/\r?\n/);
 let page=pdf.addPage([595,842]),position=795;
 for(const line of lines){
  const normalized=line.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^\x20-\x7e]/g,'?');
  const chunks=normalized.match(/.{1,85}/g)||[''];
  for(const part of chunks){
   if(position<50){page=pdf.addPage([595,842]);position=795;}
   page.drawText(part,{x:45,y:position,font,size:10,color:pdfLib.rgb(.14,.18,.26)});position-=17;
  }
 }
 return {name:file.name.replace(/\.docx$/i,'')+'-basic.pdf',blob:new Blob([new Uint8Array(await pdf.save())],{type:'application/pdf'})};
}
export async function pdfToRasterCompact(file:File,quality=.65):Promise<OutputFile>{
 const pdfjs=await import('pdfjs-dist');
 pdfjs.GlobalWorkerOptions.workerSrc=pdfWorker();
 const source=await pdfjs.getDocument({data:new Uint8Array(await file.arrayBuffer())}).promise;
 try{
  if(source.numPages>30)throw new Error('Maximum 30 pages for raster compression');
  const {PDFDocument}=await import('pdf-lib');const result=await PDFDocument.create();
  for(let i=1;i<=source.numPages;i++){
   const page=await source.getPage(i),viewport=page.getViewport({scale:1.1});
   if(viewport.width*viewport.height>18_000_000)throw new Error('PDF page too large');
   const canvas=document.createElement('canvas');canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);
   const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Canvas unavailable');
   ctx.fillStyle='white';ctx.fillRect(0,0,canvas.width,canvas.height);
   await page.render({canvas,canvasContext:ctx,viewport}).promise;
   const image=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('Cannot encode page')),'image/jpeg',quality));
   const embedded=await result.embedJpg(await image.arrayBuffer());
   const size=page.getViewport({scale:1});const newPage=result.addPage([size.width,size.height]);
   newPage.drawImage(embedded,{x:0,y:0,width:size.width,height:size.height});
   canvas.width=0;canvas.height=0;page.cleanup();
  }
  const bytes=await result.save();
  if(bytes.length>=file.size)throw new Error('Raster version is not smaller; original PDF is better');
  return {name:file.name.replace(/\.pdf$/i,'')+'-raster-compact.pdf',blob:new Blob([new Uint8Array(bytes)],{type:'application/pdf'})};
 }finally{await source.cleanup();}
}
