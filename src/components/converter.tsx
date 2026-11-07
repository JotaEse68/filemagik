'use client';
import {useRef,useState,useEffect} from 'react';
import {ArrowRight,Check,Download,FileUp,LockKeyhole,RotateCcw,LoaderCircle} from 'lucide-react';
import {convertFiles} from '@/lib/convert';
import {getTool,type ToolSlug,type Locale} from '@/config/site';
import PdfPreview from '@/components/pdf-preview';
import type {Dictionary} from '@/lib/i18n';
export default function Converter({slug,d,locale='en'}:{slug:ToolSlug;d:Dictionary;locale?:Locale}){
 const tool=getTool(slug)!;const input=useRef<HTMLInputElement>(null);const [files,setFiles]=useState<File[]>([]);
 const [drag,setDrag]=useState(false),[busy,setBusy]=useState(false);
 const [result,setResult]=useState<{name:string;url:string}|null>(null);
 const [error,setError]=useState(''),[quality,setQuality]=useState(88);
 const [prefix,setPrefix]=useState('FileMagik'),[width,setWidth]=useState(1200);
 const [signature,setSignature]=useState('');
 const [ocrLang,setOcrLang]=useState<'eng'|'spa'|'por'|'fra'>('eng');
 const [pages,setPages]=useState('1-2'),[groupSize,setGroupSize]=useState(2),[watermark,setWatermark]=useState('CONFIDENTIAL'),[opacity,setOpacity]=useState(25);
 const labels={"en":["Pages (e.g. 1,3,5-8)","Pages per file","Watermark text","Opacity","Visible signature","Lossy conversion: pages become images. Text, links and forms will no longer be searchable.","OCR language"],"es":["Páginas (ej. 1,3,5-8)","Páginas por archivo","Texto de marca","Opacidad","Firma visible","Compresión con pérdida: las páginas pasan a ser imágenes. Texto, enlaces y formularios dejan de ser buscables.","Idioma del OCR"],"pt":["Páginas (ex. 1,3,5-8)","Páginas por arquivo","Texto da marca","Opacidade","Assinatura visível","Compressão com perda: páginas viram imagens; textos, links e formulários deixam de ser pesquisáveis.","Idioma do OCR"],"fr":["Pages (ex. 1,3,5-8)","Pages par fichier","Texte du filigrane","Opacité","Signature visible","Compression avec perte : les pages deviennent des images et le texte, les liens et les formulaires ne seront plus recherchables.","Langue de l’OCR"]}[locale];
 useEffect(()=>()=>{if(result)URL.revokeObjectURL(result.url)},[result]);
 const choose=(incoming:File[])=>{if(busy)return;if(incoming.some(f=>f.size>25*1024*1024)){setError(d.fileTooBig);return;}setResult(null);setError('');setFiles(slug==='merge-pdf'||slug==='images-to-pdf'||slug==='create-zip'||slug==='rename-batch'?incoming:incoming.slice(0,1))};
 const run=async()=>{if(!files.length)return;setBusy(true);setError('');try{
 const output=await convertFiles(slug,files,quality/100,{pages,groupSize,watermark,opacity:opacity/100,ocrLang,signature,prefix,width});setResult({name:output.name,url:URL.createObjectURL(output.blob)});
 }catch(e){setError(e instanceof Error?e.message:d.error)}finally{setBusy(false)}};
 const moveFile=(index:number,direction:number)=>setFiles(current=>{const target=index+direction;if(target<0||target>=current.length)return current;const next=[...current];[next[index],next[target]]=[next[target],next[index]];return next;});
 const reset=()=>{setResult(null);setFiles([]);setError('');if(input.current)input.current.value=''};
 return <section className="converter">
 <input ref={input} className="visually-hidden" type="file" multiple={slug==='merge-pdf'||slug==='images-to-pdf'||slug==='create-zip'||slug==='rename-batch'} accept={tool.accept} onChange={e=>choose(Array.from(e.target.files||[]))}/>
 <div className={`dropzone ${drag?'dragging':''}`} onDragOver={e=>{e.preventDefault();setDrag(true)}} onDragLeave={()=>setDrag(false)} onDrop={e=>{e.preventDefault();setDrag(false);choose(Array.from(e.dataTransfer.files))}}>
 <div className="upload-icon"><FileUp size={36} strokeWidth={1.6}/></div>
 <h2>{result?<><Check size={25}/>{result.name}</>:files.length?files.map(f=>f.name).join(', '):d.dropTitle}</h2>
 <p>{files.length?`${files.length} ${d.selected.toLowerCase()}`:d.dropSub}</p>
 {!files.length&&<button className="btn btn-primary" onClick={()=>input.current?.click()}>{d.browse}<ArrowRight size={17}/></button>}
 {files.length>1&&!result&&(slug==='merge-pdf'||slug==='images-to-pdf')&&<ol className="file-order-list">{files.map((file,index)=><li key={file.name+'-'+index}><span>{file.name}</span><div><button type="button" disabled={index===0||busy} onClick={()=>moveFile(index,-1)} aria-label={`Move ${file.name} up`}>↑</button><button type="button" disabled={index===files.length-1||busy} onClick={()=>moveFile(index,1)} aria-label={`Move ${file.name} down`}>↓</button></div></li>)}</ol>}
 {files.length>0&&!result&&['extract-pdf-pages','delete-pdf-pages','split-pdf-by-count','watermark-pdf','reorder-pdf-pages','sign-pdf-visual'].includes(slug)&&<div className="pdf-option-panel">
 {(slug==='extract-pdf-pages'||slug==='delete-pdf-pages'||slug==='reorder-pdf-pages')&&<label>{labels[0]}<input value={pages} onChange={e=>setPages(e.target.value)} placeholder="1,3,5-8"/></label>}
 {slug==='split-pdf-by-count'&&<label>{labels[1]}<input type="number" value={groupSize} min={1} max={500} onChange={e=>setGroupSize(Number(e.target.value))}/></label>}
 {slug==='watermark-pdf'&&<><label>{labels[2]}<input value={watermark} onChange={e=>setWatermark(e.target.value.slice(0,80))}/></label><label>{labels[3]}: {opacity}%<input type="range" min="5" max="90" value={opacity} onChange={e=>setOpacity(+e.target.value)}/></label></>}
 </div>}
 {files.length>0&&!result&&['reorder-pdf-pages','extract-pdf-pages','delete-pdf-pages'].includes(slug)&&<PdfPreview file={files[0]} locale={locale} mode={slug as 'reorder-pdf-pages'|'extract-pdf-pages'|'delete-pdf-pages'} onChange={setPages}/>}
 {files.length>0&&!result&&slug==='sign-pdf-visual'&&<label className="quality">{labels[4]}<input value={signature} onChange={e=>setSignature(e.target.value)} maxLength={90} placeholder="Name / Nombre"/></label>}
 {files.length>0&&!result&&slug==='compress-pdf-raster'&&<p style={{color:'#edc58f',fontSize:12}}>{labels[5]}</p>}
 {files.length>0&&!result&&['ocr-pdf','ocr-image'].includes(slug)&&<div className="pdf-option-panel"><label>{labels[6]}<select value={ocrLang} onChange={e=>setOcrLang(e.target.value as 'eng'|'spa'|'por'|'fra')}><option value="eng">English</option><option value="spa">Español</option><option value="por">Português</option><option value="fra">Français</option></select></label></div>}
 {files.length>0&&!result&&slug==='rename-batch'&&<div className="pdf-option-panel"><label>File prefix / Prefijo<input value={prefix} onChange={e=>setPrefix(e.target.value)} maxLength={60}/></label></div>}
 {files.length>0&&!result&&slug==='resize-image'&&<div className="pdf-option-panel"><label>Output width / Ancho en píxeles<input type="number" min={64} max={4000} value={width} onChange={e=>setWidth(Number(e.target.value))}/></label></div>}
 {files.length>0&&!result&&<div className="actions">{(tool.kind==='image'||slug==='images-to-pdf'||slug==='compress-pdf-raster')&&<label className="quality">{d.imageQuality}: {quality}% <input type="range" min="50" max="100" value={quality} onChange={e=>setQuality(Number(e.target.value))}/></label>}<button className="btn btn-primary" disabled={busy} onClick={run}>{busy?<LoaderCircle className="spin" size={18}/>:<ArrowRight size={18}/>} {busy?d.processing:d.convert}</button><button className="btn btn-ghost" onClick={reset}>{d.reset}</button></div>}
 {result&&<div className="actions"><a className="btn btn-primary" href={result.url} download={result.name}><Download size={18}/>{d.download}</a><button className="btn btn-ghost" onClick={reset}><RotateCcw size={17}/>{d.reset}</button></div>}
 {error&&<p role="alert" className="error">{error}</p>}
 </div><div className="privacy-note"><LockKeyhole size={16}/>{d.localNote}</div></section>;
}