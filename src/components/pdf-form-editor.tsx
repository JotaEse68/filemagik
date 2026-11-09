'use client';
import {useEffect,useState} from 'react';
import {PDFDocument,PDFTextField,PDFCheckBox,PDFDropdown,PDFOptionList,PDFRadioGroup} from 'pdf-lib';

type Field={name:string;kind:'text'|'checkbox'|'choice'|'list';options:string[];value:string|boolean|string[]};
export default function PdfFormEditor({file,onChange}:{file:File;onChange:(json:string)=>void}){
 const [fields,setFields]=useState<Field[]>([]);
 const [values,setValues]=useState<Record<string,string|boolean|string[]>>({});
 const [error,setError]=useState('');
 const [loading,setLoading]=useState(true);
 useEffect(()=>{
  let active=true;
  async function read(){
   setLoading(true);setError('');setFields([]);setValues({});
   try{
    const pdf=await PDFDocument.load(await file.arrayBuffer());
    const form=pdf.getForm();if(form.hasXFA())throw new Error('Los formularios XFA no son compatibles');
    const found:Field[]=form.getFields().map((f):Field|null=>{
     if(f instanceof PDFTextField)return {name:f.getName(),kind:'text',options:[],value:f.getText()??''};
     if(f instanceof PDFCheckBox)return {name:f.getName(),kind:'checkbox',options:[],value:f.isChecked()};
     if(f instanceof PDFDropdown)return {name:f.getName(),kind:'choice',options:f.getOptions(),value:f.getSelected()[0]??''};
     if(f instanceof PDFRadioGroup)return {name:f.getName(),kind:'choice',options:f.getOptions(),value:f.getSelected()??''};
     if(f instanceof PDFOptionList)return {name:f.getName(),kind:'list',options:f.getOptions(),value:f.getSelected()};
     return null;
    }).filter((f):f is Field=>f!==null);
    if(found.length>150)throw new Error('Máximo 150 campos editables');
    if(!found.length)throw new Error('Este PDF no tiene campos AcroForm editables');
    const initial=Object.fromEntries(found.map(f=>[f.name,f.value]));
    if(active){setFields(found);setValues(initial);onChange(JSON.stringify(initial));}
   }catch(e){if(active)setError(e instanceof Error?e.message:'No se pudieron leer los campos');}
   finally{if(active)setLoading(false);}
  }
  void read();return()=>{active=false;};
 },[file,onChange]);
 function update(name:string,value:string|boolean|string[]){const next={...values,[name]:value};setValues(next);onChange(JSON.stringify(next));}
 return <div className="fm-pdf-form-editor">
  <h3>Rellenar campos del PDF</h3>
  {loading&&<p role="status">Leyendo campos…</p>}
  {error&&<p role="alert">{error}</p>}
  {!loading&&!error&&<div className="fm-pdf-form-grid">{fields.map(field=><label key={field.name}>
   <span>{field.name}</span>
   {field.kind==='checkbox'?<input type="checkbox" checked={values[field.name]===true} onChange={e=>update(field.name,e.target.checked)}/>:
   field.kind==='text'?<input type="text" maxLength={10000} value={String(values[field.name]??'')} onChange={e=>update(field.name,e.target.value)}/>:
   field.kind==='choice'?<select value={String(values[field.name]??'')} onChange={e=>update(field.name,e.target.value)}><option value="">Seleccionar…</option>{field.options.map(option=><option key={option} value={option}>{option}</option>)}</select>:
   <select multiple value={Array.isArray(values[field.name])?values[field.name] as string[]:[]} onChange={e=>update(field.name,Array.from(e.target.selectedOptions).map(o=>o.value))}>{field.options.map(option=><option key={option} value={option}>{option}</option>)}</select>}
  </label>)}</div>}
  <small>Se completa localmente en tu navegador. Los formularios XFA y firmas digitales no son compatibles.</small>
 </div>;
}
