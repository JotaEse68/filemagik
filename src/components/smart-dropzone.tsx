'use client';
import {useEffect,useRef,useState} from 'react';
import {ArrowRight,Check,Download,FileUp,LockKeyhole,LoaderCircle,RotateCcw} from 'lucide-react';
import {getAvailableTools} from '@/lib/detect-tools';
import {convertFiles} from '@/lib/convert';
import {validateFiles} from '@/lib/file-limits';
import {getTool,type Locale,type ToolSlug} from '@/config/site';
import type {Dictionary} from '@/lib/i18n';

const translations={
 en:{select:'Choose an action',unsupported:'This file type is not supported yet.',hint:'JPG, PNG, WebP, PDF, DOCX, CSV, JSON'},
 es:{select:'Elige qué quieres hacer',unsupported:'Este formato todavía no es compatible.',hint:'JPG, PNG, WebP, PDF, DOCX, CSV, JSON'},
 pt:{select:'Escolha o que deseja fazer',unsupported:'Esse formato ainda não é compatível.',hint:'JPG, PNG, WebP, PDF, DOCX, CSV, JSON'},
 fr:{select:'Choisissez une action',unsupported:'Ce format n’est pas encore pris en charge.',hint:'JPG, PNG, WebP, PDF, DOCX, CSV, JSON'}
} as const;
export default function SmartDropzone({locale,d}:{locale:Locale;d:Dictionary}){
 const picker=useRef<HTMLInputElement>(null);
 const [files,setFiles]=useState<File[]>([]);
 const [dragging,setDragging]=useState(false);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');
 const [result,setResult]=useState<{name:string;url:string}|null>(null);
 const [quality,setQuality]=useState(88);
 const options=getAvailableTools(files);
 const t=translations[locale];
 useEffect(()=>()=>{if(result)URL.revokeObjectURL(result.url);},[result]);
 function choose(list:File[]){if(busy)return;const selection=list.slice(0,30);if(selection.some(f=>f.size>100*1024*1024)||selection.reduce((sum,f)=>sum+f.size,0)>200*1024*1024){setError('Maximum 100 MB per file and 200 MB total in automatic mode.');return;}setError('');setResult(null);setFiles(selection);}
 function reset(){setFiles([]);setResult(null);setError('');if(picker.current)picker.current.value='';}
 async function run(slug:ToolSlug){
  if(busy)return;
  setBusy(true);setError('');
  try{
   validateFiles(slug,files);const converted=await convertFiles(slug,files,quality/100);
   setResult({name:converted.name,url:URL.createObjectURL(converted.blob)});
  }catch(e){setError(e instanceof Error?e.message:d.error)}
  finally{setBusy(false)}
 }
 return <section className="converter">
  <input ref={picker} type="file" multiple className="visually-hidden" accept=".jpg,.jpeg,.png,.webp,.pdf,.docx,.csv,.json" onChange={e=>choose([...e.currentTarget.files??[]])}/>
  <div className={`dropzone smart-dropzone ${dragging?'dragging':''}`} onDragOver={e=>{e.preventDefault();setDragging(true)}} onDragLeave={()=>setDragging(false)} onDrop={e=>{e.preventDefault();setDragging(false);choose([...e.dataTransfer.files])}}>
   <div className="upload-icon"><FileUp size={34} strokeWidth={1.6}/></div>
   {files.length===0?<><h2>{d.dropTitle}</h2><p>{d.dropSub}</p><button className="btn btn-primary" onClick={()=>picker.current?.click()}>{d.browse}<ArrowRight size={18}/></button><small className="file-hint">{t.hint}</small></>:<>
    <h2>{files.length===1?files[0].name:`${files.length} ${d.selected.toLowerCase()}`}</h2>
    {!result&&<><p>{options.length?t.select:t.unsupported}</p>
     {options.length>0&&<div className="smart-actions">{options.map(slug=>{const tool=getTool(slug)!;return <button key={slug} disabled={busy} className="smart-action" onClick={()=>run(slug)}>{busy?<LoaderCircle className="spin" size={16}/>:<ArrowRight size={16}/>} {tool.from} → {tool.to}</button>})}</div>}
     {options.some(slug=>['jpg-to-webp','png-to-jpg','png-to-webp','webp-to-jpg','images-to-pdf'].includes(slug))&&<label className="quality">{d.imageQuality} {quality}%<input type="range" min={50} max={100} value={quality} onChange={e=>setQuality(+e.target.value)}/></label>}
    </>}
    {result&&<><div className="success-row"><Check size={18}/>{result.name}</div><a className="btn btn-primary" href={result.url} download={result.name}><Download size={18}/>{d.download}</a></>}
    <button className="btn btn-ghost" onClick={reset} disabled={busy}><RotateCcw size={15}/>{d.reset}</button>
   </>}
   {error&&<p className="error" role="alert">{error}</p>}
  </div>
  <p className="privacy-note"><LockKeyhole size={16}/>{d.localNote}</p>
 </section>
}