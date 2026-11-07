import type {OutputFile} from './convert';

export type PdfFormMode='list'|'fill'|'flatten';
export type PdfFormField={name:string;type:string;value:string};
const pdfBlob=(bytes:Uint8Array<ArrayBufferLike>)=>new Blob([new Uint8Array(bytes)],{type:'application/pdf'});
/** AcroForm support only; XFA forms and digital signatures must never be silently altered. */
export async function handlePdfForm(file:File,mode:PdfFormMode,valuesText='{}'):Promise<OutputFile>{
 const {PDFDocument,PDFTextField,PDFCheckBox,PDFDropdown,PDFOptionList,PDFRadioGroup}=await import('pdf-lib');
 const pdf=await PDFDocument.load(await file.arrayBuffer());
 const form=pdf.getForm();
 if(form.hasXFA())throw new Error('XFA forms are not supported by this browser editor');
 const fields=form.getFields();
 if(fields.length>300)throw new Error('Maximum 300 form fields');
 const basename=file.name.replace(/\.pdf$/i,'');
 if(mode==='list'){
  const result:PdfFormField[]=fields.map(field=>{
   const name=field.getName();
   if(field instanceof PDFTextField)return {name,type:'text',value:field.getText()??''};
   if(field instanceof PDFCheckBox)return {name,type:'checkbox',value:field.isChecked()?'true':'false'};
   if(field instanceof PDFDropdown)return {name,type:'dropdown',value:field.getSelected().join(', ')};
   if(field instanceof PDFOptionList)return {name,type:'list',value:field.getSelected().join(', ')};
   if(field instanceof PDFRadioGroup)return {name,type:'radio',value:field.getSelected()??''};
   return {name,type:'unsupported',value:''};
  });
  return {name:basename+'-fields.json',blob:new Blob([JSON.stringify({fields:result},null,2)],{type:'application/json'})};
 }
 if(!fields.length)throw new Error('This PDF has no interactive AcroForm fields');
 if(mode==='fill'){
  let values:unknown;
  try{values=JSON.parse(valuesText);}catch{throw new Error('Invalid JSON for form values');}
  if(!values||Array.isArray(values)||typeof values!=='object')throw new Error('Provide a JSON object of field names and values');
  const map=values as Record<string,unknown>;
  const names=new Set(fields.map(field=>field.getName()));
  for(const [key,value] of Object.entries(map)){
   if(!names.has(key))throw new Error('Unknown form field: '+key);
   const field=form.getField(key);
   if(field instanceof PDFTextField){if(typeof value!=='string'||value.length>10000)throw new Error('Text field must contain a string of 10000 characters or fewer');field.setText(value);}
   else if(field instanceof PDFCheckBox){if(typeof value!=='boolean')throw new Error('Checkbox requires true/false');if(value)field.check();else field.uncheck();}
   else if(field instanceof PDFDropdown){if(typeof value!=='string')throw new Error('Dropdown requires one option');field.select(value);}
   else if(field instanceof PDFOptionList){if(!Array.isArray(value)||!value.every(v=>typeof v==='string'))throw new Error('List requires a string array');field.select(value);}
   else if(field instanceof PDFRadioGroup){if(typeof value!=='string')throw new Error('Radio group requires an option');field.select(value);}
   else throw new Error('Unsupported form field type: '+key);
  }
 }else if(mode==='flatten'){
  // Flattening an existing digitally signed PDF invalidates or removes its signature.
  if(fields.some(field=>field.constructor.name==='PDFSignature'))throw new Error('Signed PDF forms cannot be flattened safely');
  form.flatten();
 }
 return {name:basename+(mode==='fill'?'-completed.pdf':'-flattened.pdf'),blob:pdfBlob(await pdf.save())};
}
