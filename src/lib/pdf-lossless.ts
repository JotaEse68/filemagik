import type {OutputFile} from './convert';
export async function compactPdfWithoutRaster(file:File):Promise<OutputFile>{
 const {PDFDocument}=await import('pdf-lib');
 const original=new Uint8Array(await file.arrayBuffer());
 const document=await PDFDocument.load(original,{updateMetadata:false});
 if(document.getPageCount()<1||document.getPageCount()>500)throw new Error('PDF must contain 1–500 pages');
 const bytes=await document.save({useObjectStreams:true});
 if(bytes.byteLength>=original.byteLength)throw new Error('This PDF is already optimized. The original is smaller; no lossy conversion was performed.');
 return {name:file.name.replace(/\.pdf$/i,'')+'-optimized.pdf',blob:new Blob([new Uint8Array(bytes)],{type:'application/pdf'})};
}
