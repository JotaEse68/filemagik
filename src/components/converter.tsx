'use client';
import {useRef,useState,useEffect} from 'react';
import {ArrowRight,Check,Download,FileUp,LockKeyhole,RotateCcw,LoaderCircle} from 'lucide-react';
import {convertFiles} from '@/lib/convert';
import {getTool,type ToolSlug} from '@/config/site';
import type {Dictionary} from '@/lib/i18n';
export default function Converter({slug,d}:{slug:ToolSlug;d:Dictionary}){
 const tool=getTool(slug)!;const input=useRef<HTMLInputElement>(null);const [files,setFiles]=useState<File[]>([]);
 const [drag,setDrag]=useState(false),[busy,setBusy]=useState(false);
 const [result,setResult]=useState<{name:string;url:string}|null>(null);
 const [error,setError]=useState(''),[quality,setQuality]=useState(88);
 useEffect(()=>()=>{if(result)URL.revokeObjectURL(result.url)},[result]);
 const choose=(incoming:File[])=>{if(busy)return;if(incoming.some(f=>f.size>25*1024*1024)){setError(d.fileTooBig);return;}setResult(null);setError('');setFiles(slug==='merge-pdf'||slug==='images-to-pdf'?incoming:incoming.slice(0,1))};
 const run=async()=>{if(!files.length)return;setBusy(true);setError('');try{
 const output=await convertFiles(slug,files,quality/100);setResult({name:output.name,url:URL.createObjectURL(output.blob)});
 }catch(e){setError(e instanceof Error?e.message:d.error)}finally{setBusy(false)}};
 const reset=()=>{setResult(null);setFiles([]);setError('');if(input.current)input.current.value=''};
 return <section className="converter">
 <input ref={input} className="visually-hidden" type="file" multiple={slug==='merge-pdf'||slug==='images-to-pdf'} accept={tool.accept} onChange={e=>choose(Array.from(e.target.files||[]))}/>
 <div className={`dropzone ${drag?'dragging':''}`} onDragOver={e=>{e.preventDefault();setDrag(true)}} onDragLeave={()=>setDrag(false)} onDrop={e=>{e.preventDefault();setDrag(false);choose(Array.from(e.dataTransfer.files))}}>
 <div className="upload-icon"><FileUp size={36} strokeWidth={1.6}/></div>
 <h2>{result?<><Check size={25}/>{result.name}</>:files.length?files.map(f=>f.name).join(', '):d.dropTitle}</h2>
 <p>{files.length?`${files.length} ${d.selected.toLowerCase()}`:d.dropSub}</p>
 {!files.length&&<button className="btn btn-primary" onClick={()=>input.current?.click()}>{d.browse}<ArrowRight size={17}/></button>}
 {files.length>0&&!result&&<div className="actions">{tool.kind==='image'&&<label className="quality">{d.imageQuality}: {quality}% <input type="range" min="50" max="100" value={quality} onChange={e=>setQuality(Number(e.target.value))}/></label>}<button className="btn btn-primary" disabled={busy} onClick={run}>{busy?<LoaderCircle className="spin" size={18}/>:<ArrowRight size={18}/>} {busy?d.processing:d.convert}</button><button className="btn btn-ghost" onClick={reset}>{d.reset}</button></div>}
 {result&&<div className="actions"><a className="btn btn-primary" href={result.url} download={result.name}><Download size={18}/>{d.download}</a><button className="btn btn-ghost" onClick={reset}><RotateCcw size={17}/>{d.reset}</button></div>}
 {error&&<p role="alert" className="error">{error}</p>}
 </div><div className="privacy-note"><LockKeyhole size={16}/>{d.localNote}</div></section>;
}