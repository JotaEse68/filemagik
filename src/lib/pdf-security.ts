import type {OutputFile} from './convert';
export async function securePdf(file:File,password:string,mode:'protect'|'unlock'):Promise<OutputFile>{
 if(!password||password.length>128)throw new Error('Enter a password (1–128 characters)');
 const {PDFDocument}=await import('@maxwbh/pdf-lib');
 const input=new Uint8Array(await file.arrayBuffer());
 const name=file.name.replace(/\.pdf$/i,'');
 try{
  if(mode==='protect'){
   if(password.length<8)throw new Error('Use a password of at least eight characters');
   const doc=await PDFDocument.load(input);
   if(doc.getPageCount()>500)throw new Error('Maximum 500 PDF pages');
   const bytes=await doc.save({encrypt:{userPassword:password,ownerPassword:password,permissions:{printing:true,copying:true,modifying:false}}});
   return {name:name+'-protected.pdf',blob:new Blob([new Uint8Array(bytes)],{type:'application/pdf'})};
  }
  const doc=await PDFDocument.load(input,{password});
  const bytes=await doc.save();
  return {name:name+'-unlocked.pdf',blob:new Blob([new Uint8Array(bytes)],{type:'application/pdf'})};
 }catch(error){
  if(error instanceof Error&&error.message.startsWith('Use a password'))throw error;
  throw new Error(mode==='unlock'?'Unable to unlock PDF: check the password and whether this encryption format is supported.':'Unable to protect PDF: check whether the document is already encrypted or damaged.');
 }
}
