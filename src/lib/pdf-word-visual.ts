import type {OutputFile} from './convert';

/**
 * High-visual-fidelity PDF to DOCX: preserves the appearance of images, charts and
 * tables by rendering each PDF page into a Word page image. The resulting pages
 * are NOT editable text. For editable paragraphs use pdf-to-word-text instead.
 */
export async function pdfToWordVisual(file:File):Promise<OutputFile>{
 const pdfjs=await import('pdfjs-dist');
 const docx=await import('docx');
 pdfjs.GlobalWorkerOptions.workerSrc=new URL('pdfjs-dist/build/pdf.worker.min.mjs',import.meta.url).toString();
 const pdf=await pdfjs.getDocument({data:new Uint8Array(await file.arrayBuffer())}).promise;
 try{
  if(pdf.numPages<1||pdf.numPages>30)throw new Error('Visual Word export supports up to 30 pages');
  const sections: Array<NonNullable<ConstructorParameters<typeof docx.Document>[0]['sections']>[number]> = [];
  for(let number=1;number<=pdf.numPages;number++){
   const page=await pdf.getPage(number);
   const view=page.getViewport({scale:1.5});
   if(view.width*view.height>18_000_000)throw new Error('Page too large to embed in Word');
   const canvas=document.createElement('canvas');canvas.width=Math.ceil(view.width);canvas.height=Math.ceil(view.height);
   try{
    const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Canvas unavailable');
    ctx.fillStyle='#ffffff';ctx.fillRect(0,0,canvas.width,canvas.height);
    await page.render({canvas,canvasContext:ctx,viewport:view}).promise;
    const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('Unable to render PDF page')),'image/png'));
    const data=new Uint8Array(await blob.arrayBuffer());
    // Fit into a standard A4 Word page with safe margins.
    const factor=Math.min(480/view.width,690/view.height);
    sections.push({properties:{page:{size:{width:11906,height:16838},margin:{top:450,bottom:450,left:450,right:450}}},children:[
     new docx.Paragraph({spacing:{before:0,after:0,line:240},children:[new docx.ImageRun({data,type:'png',transformation:{width:Math.round(view.width*factor),height:Math.round(view.height*factor)},altText:{title:'PDF page '+number,description:'Visual reproduction of the PDF page',name:'PDF page '+number}})]})
    ]});
   }finally{canvas.width=0;canvas.height=0;page.cleanup();}
  }
  const wordDoc=new docx.Document({sections});
  return {name:file.name.replace(/\.pdf$/i,'')+'-visual.docx',blob:await docx.Packer.toBlob(wordDoc)};
 }finally{await pdf.cleanup();}
}
