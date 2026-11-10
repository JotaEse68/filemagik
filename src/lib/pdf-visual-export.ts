import type {OutputFile} from './convert';

export type VisualAnnotation={id:string;page:number;kind:'text'|'highlight'|'rectangle'|'form-text'|'form-checkbox'|'redact';x:number;y:number;width:number;height:number;text:string;color:string;fontSize:number};
export async function exportVisualPdf(source:File,annotations:VisualAnnotation[],options:{removeDocumentInfo?:boolean}={}):Promise<OutputFile>{
 if(annotations.length>300)throw new Error('Maximum 300 annotations per document');
 const {PDFDocument,StandardFonts,rgb}=await import('pdf-lib');
 const pdf=await PDFDocument.load(await source.arrayBuffer());
 const font=await pdf.embedFont(StandardFonts.Helvetica);
 const form=annotations.some(a=>a.kind==='form-text'||a.kind==='form-checkbox')?pdf.getForm():null;
 for(const item of annotations){
  if(item.kind==='redact')throw new Error('Permanent redaction requires the verified professional PDF engine; an overlay is not secure');
  if(!Number.isInteger(item.page)||item.page<1||item.page>pdf.getPageCount())throw new Error('Invalid annotation page');
  const nums=[item.x,item.y,item.width,item.height,item.fontSize];
  if(nums.some(n=>!Number.isFinite(n)))throw new Error('Invalid annotation coordinates');
  const page=pdf.getPage(item.page-1);
  const {width,height,x:originX,y:originY}=page.getCropBox();
  const x=originX+Math.max(0,Math.min(1,item.x))*width;
  const y=originY+(1-Math.max(0,Math.min(1,item.y)))*height;
  const w=Math.max(1,Math.min(1,item.width)*width),h=Math.max(1,Math.min(1,item.height)*height);
  const hex=/^#[0-9a-f]{6}$/i.test(item.color)?item.color:'#ffce54';
  const color=rgb(parseInt(hex.slice(1,3),16)/255,parseInt(hex.slice(3,5),16)/255,parseInt(hex.slice(5,7),16)/255);
  if(item.kind==='form-text'||item.kind==='form-checkbox'){
   if(!form)throw new Error('Form not available');
   const safeName=(item.text.trim().replace(/[^a-zA-Z0-9_-]+/g,'_').slice(0,48)||'Field')+'_'+item.id.slice(0,8);
   if(item.kind==='form-text'){
    const field=form.createTextField(safeName);
    field.addToPage(page,{x,y:y-h,width:w,height:h,borderColor:color,borderWidth:1});
   }else{
    const field=form.createCheckBox(safeName);
    field.addToPage(page,{x,y:y-h,width:Math.min(w,h),height:Math.min(w,h),borderColor:color,borderWidth:1});
   }
  }
  else if(item.kind==='highlight')page.drawRectangle({x,y:y-h,width:w,height:h,color,opacity:.35});
  else if(item.kind==='rectangle')page.drawRectangle({x,y:y-h,width:w,height:h,borderColor:color,borderWidth:2});
  else{
   const plain=item.text.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^\x20-\x7E]/g,'?').trim();
   if(!plain)continue;
   if(plain.length>180)throw new Error('Text annotations are limited to 180 characters');
   const size=Math.min(36,Math.max(8,item.fontSize));
   if(font.widthOfTextAtSize(plain,size)>width-x+originX)throw new Error('Text is wider than the remaining page. Move or shorten it.');
   page.drawText(plain,{x,y:y-size,size,font,color});
  }
 }
 // Remove common PDF document-information properties on request.
 // This is NOT full forensic sanitization: embedded attachments, signatures,
 // annotations and other content must be reviewed independently.
 if(options.removeDocumentInfo){
  pdf.setTitle('');pdf.setAuthor('');pdf.setSubject('');
  pdf.setKeywords([]);pdf.setCreator('');pdf.setProducer('');
 }
 const bytes=await pdf.save();
 return {name:source.name.replace(/\.pdf$/i,'')+'-edited.pdf',blob:new Blob([new Uint8Array(bytes)],{type:'application/pdf'})};
}
