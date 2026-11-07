'use client';
import {useRef,useState,useEffect} from 'react';
import {ArrowRight,Check,Download,FileUp,RotateCcw,LoaderCircle} from 'lucide-react';
import {convertFiles} from '@/lib/convert';
import {validateFiles,sizeLimitLabel} from '@/lib/file-limits';
import {getTool,type ToolSlug,type Locale} from '@/config/site';
import PdfPreview from '@/components/pdf-preview';
import type {Dictionary} from '@/lib/i18n';
export default function Converter({slug,d,locale='en'}:{slug:ToolSlug;d:Dictionary;locale?:Locale}){
 const tool=getTool(slug)!;const input=useRef<HTMLInputElement>(null);const [files,setFiles]=useState<File[]>([]);
 const [drag,setDrag]=useState(false),[busy,setBusy]=useState(false);
 const [result,setResult]=useState<{name:string;url:string}|null>(null);
 const [error,setError]=useState(''),[quality,setQuality]=useState(88);
 const [prefix,setPrefix]=useState('FileMagik'),[width,setWidth]=useState(1200);
 const [cropPercent,setCropPercent]=useState(0),[rotation,setRotation]=useState<0|90|180|270>(0),[format,setFormat]=useState<'png'|'jpeg'|'webp'>('webp');
 const [signature,setSignature]=useState('');
 const [formValues,setFormValues]=useState('{}');
 const [subtitleOffsetMs,setSubtitleOffsetMs]=useState(0),[annotationText,setAnnotationText]=useState('');
 const [audioStartSeconds,setAudioStartSeconds]=useState(0),[audioEndSeconds,setAudioEndSeconds]=useState<number|undefined>();
 const [ocrLang,setOcrLang]=useState<'eng'|'spa'|'por'|'fra'>('eng');
 const [pages,setPages]=useState('1-2'),[groupSize,setGroupSize]=useState(2),[watermark,setWatermark]=useState('CONFIDENTIAL'),[opacity,setOpacity]=useState(25);
 const labels={"en":["Pages (e.g. 1,3,5-8)","Pages per file","Watermark text","Opacity","Visible signature","Lossy conversion: pages become images. Text, links and forms will no longer be searchable.","OCR language"],"es":["Páginas (ej. 1,3,5-8)","Páginas por archivo","Texto de marca","Opacidad","Firma visible","Compresión con pérdida: las páginas pasan a ser imágenes. Texto, enlaces y formularios dejan de ser buscables.","Idioma del OCR"],"pt":["Páginas (ex. 1,3,5-8)","Páginas por arquivo","Texto da marca","Opacidade","Assinatura visível","Compressão com perda: páginas viram imagens; textos, links e formulários deixam de ser pesquisáveis.","Idioma do OCR"],"fr":["Pages (ex. 1,3,5-8)","Pages par fichier","Texte du filigrane","Opacité","Signature visible","Compression avec perte : les pages deviennent des images et le texte, les liens et les formulaires ne seront plus recherchables.","Langue de l’OCR"]}[locale];
 useEffect(()=>()=>{if(result)URL.revokeObjectURL(result.url)},[result]);
 const choose=(incoming:File[])=>{if(busy)return;try{validateFiles(slug,incoming);setResult(null);setError('');setFiles(incoming)}catch(e){setError(e instanceof Error?e.message:d.error);}};
 const run=async()=>{if(!files.length)return;setBusy(true);setError('');try{
 const output=await convertFiles(slug,files,quality/100,{pages,groupSize,watermark,opacity:opacity/100,ocrLang,signature,formValues,prefix,width,cropPercent,rotation,format,subtitleOffsetMs,annotationText,audioStartSeconds,audioEndSeconds});setResult({name:output.name,url:URL.createObjectURL(output.blob)});
 }catch(e){setError(e instanceof Error?e.message:d.error)}finally{setBusy(false)}};
 const moveFile=(index:number,direction:number)=>setFiles(current=>{const target=index+direction;if(target<0||target>=current.length)return current;const next=[...current];[next[index],next[target]]=[next[target],next[index]];return next;});
 const reset=()=>{setResult(null);setFiles([]);setError('');if(input.current)input.current.value=''};
 const status=busy?d.processing:result?result.name+" · "+d.download:files.length?String(files.length)+" "+d.selected:"";
 return <section className="converter" aria-busy={busy}>
 <input ref={input} className="visually-hidden" type="file" aria-label={d.browse} multiple={slug==='merge-pdf'||slug==='images-to-pdf'||slug==='create-zip'||slug==='rename-batch'||slug==='batch-images-to-webp'} accept={tool.accept} onChange={e=>choose(Array.from(e.target.files||[]))}/>
 <div className={`dropzone ${drag?'dragging':''}`} role="group" aria-label={d.dropTitle} onDragOver={e=>{e.preventDefault();setDrag(true)}} onDragLeave={()=>setDrag(false)} onDrop={e=>{e.preventDefault();setDrag(false);choose(Array.from(e.dataTransfer.files))}}>
 <div className="upload-icon"><FileUp size={36} strokeWidth={1.6}/></div>
 <h2>{result?<><Check size={25}/>{result.name}</>:files.length?files.map(f=>f.name).join(', '):d.dropTitle}</h2>
 <p>{files.length?`${files.length} ${d.selected.toLowerCase()}`:d.dropSub}</p><small className="upload-limit">{sizeLimitLabel(slug)}</small>
 {!files.length&&<button type="button" className="btn btn-primary" onClick={()=>input.current?.click()}>{d.browse}<ArrowRight size={17}/></button>}
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
 {files.length>0&&!result&&['inspect-pdf-form','fill-pdf-form','flatten-pdf-form'].includes(slug)&&<div className="pdf-option-panel">
 {slug==='fill-pdf-form'&&<label>{({es:'Valores del formulario (JSON: nombre del campo y valor)',en:'Form values (JSON: field name and value)',pt:'Valores do formulário (JSON: nome e valor)',fr:'Valeurs du formulaire (JSON : nom et valeur)'} as const)[locale]}<textarea rows={7} spellCheck={false} value={formValues} onChange={e=>setFormValues(e.target.value)} placeholder={'{"FullName":"Ana","AcceptTerms":true}'}/></label>}
 <p>{({es:'Compatible con formularios PDF AcroForm. No modifica firmas digitales válidas. Los formularios XFA no son compatibles.',en:'Supports PDF AcroForm fields. Valid digital signatures are not modified. XFA forms are unsupported.',pt:'Compatível com campos AcroForm. Assinaturas digitais válidas não são modificadas; XFA não é suportado.',fr:'Compatible AcroForm. Les signatures numériques valides ne sont pas modifiées. XFA non pris en charge.'} as const)[locale]}</p>
 </div>}
 {files.length>0&&!result&&slug==='audio-to-wav'&&<div className="pdf-option-panel">
 <label>{({es:'Inicio del recorte (segundos)',en:'Start (seconds)',pt:'Início (segundos)',fr:'Début (secondes)'} as const)[locale]}<input type="number" min={0} step={.1} value={audioStartSeconds} onChange={e=>setAudioStartSeconds(Number(e.target.value))}/></label>
 <label>{({es:'Final (segundos, vacío = todo)',en:'End (seconds, blank = full file)',pt:'Fim (segundos, vazio = tudo)',fr:'Fin (secondes, vide = fichier entier)'} as const)[locale]}<input type="number" min={0} step={.1} value={audioEndSeconds??''} onChange={e=>setAudioEndSeconds(e.target.value===''?undefined:Number(e.target.value))}/></label>
 <p>{({es:'Conversión local a WAV PCM. Límite de 10 minutos; compatibilidad con los códecs según tu navegador.',en:'Local conversion to PCM WAV. Maximum 10 minutes; codec support depends on your browser.',pt:'Conversão local para WAV PCM. Máximo 10 minutos; suporte a códecs depende do navegador.',fr:'Conversion locale vers WAV PCM. Maximum 10 minutes ; codecs selon le navigateur.'} as const)[locale]}</p>
 </div>}
 {files.length>0&&!result&&slug==='crop-pdf'&&<div className="pdf-option-panel"><label>{({es:'Recortar márgenes PDF (%)',en:'Crop PDF margins (%)',pt:'Cortar margens do PDF (%)',fr:'Rogner les marges PDF (%)'} as const)[locale]}<input type="number" min={0} max={30} value={cropPercent} onChange={e=>setCropPercent(Number(e.target.value))}/></label><p>{({es:'El recorte oculta los márgenes, no elimina permanentemente el contenido.',en:'Cropping hides margins but does not permanently erase content.',pt:'O recorte oculta as margens, não apaga o conteúdo definitivamente.',fr:'Le rognage masque les marges sans effacer définitivement leur contenu.'} as const)[locale]}</p></div>}
 {files.length>0&&!result&&slug==='annotate-pdf-text'&&<div className="pdf-option-panel"><label>{({es:'Texto de anotación',en:'Annotation text',pt:'Texto da anotação',fr:'Texte de l’annotation'} as const)[locale]}<input maxLength={120} value={annotationText} onChange={e=>setAnnotationText(e.target.value)}/></label><p>{({es:'Se añade texto visible al pie de todas las páginas.',en:'Visible text will be added at the bottom of each page.',pt:'O texto visível será adicionado ao rodapé de cada página.',fr:'Le texte visible sera ajouté au bas de chaque page.'} as const)[locale]}</p></div>}
 {files.length>0&&!result&&(slug==='srt-to-vtt'||slug==='vtt-to-srt')&&<div className="pdf-option-panel"><label>{({en:'Subtitle timing adjustment (milliseconds)',es:'Ajuste de tiempo de subtítulos (milisegundos)',pt:'Ajuste do tempo das legendas (milissegundos)',fr:'Décalage des sous-titres (millisecondes)'} as const)[locale]}<input type="number" min={-86400000} max={86400000} step={100} value={subtitleOffsetMs} onChange={e=>setSubtitleOffsetMs(Number(e.target.value))}/></label></div>}
 {files.length>0&&!result&&slug==='adjust-image'&&<div className="pdf-option-panel">
 <label>{({es:'Recortar bordes (%)',en:'Crop edges (%)',pt:'Recortar bordas (%)',fr:'Rogner les bords (%)'} as const)[locale]}<input type="number" min={0} max={40} value={cropPercent} onChange={e=>setCropPercent(Number(e.target.value))}/></label>
 <label>{({es:'Girar imagen',en:'Rotate image',pt:'Girar imagem',fr:'Pivoter l’image'} as const)[locale]}<select value={rotation} onChange={e=>setRotation(Number(e.target.value) as 0|90|180|270)}><option value={0}>0°</option><option value={90}>90°</option><option value={180}>180°</option><option value={270}>270°</option></select></label>
 <label>{({es:'Formato de salida',en:'Output format',pt:'Formato de saída',fr:'Format de sortie'} as const)[locale]}<select value={format} onChange={e=>setFormat(e.target.value as 'png'|'jpeg'|'webp')}><option value="webp">WebP</option><option value="png">PNG</option><option value="jpeg">JPG</option></select></label>
 <p className="image-export-hint">{({es:'La exportación elimina los metadatos habituales, incluido EXIF. El recorte se aplica por igual a los cuatro bordes.',en:'Export removes most metadata, including EXIF. Cropping applies to all four edges.',pt:'A exportação remove metadados, inclusive EXIF. O recorte afeta as quatro bordas.',fr:'L’export supprime les métadonnées, dont EXIF. Le rognage affecte les quatre bords.'} as const)[locale]}</p>
 </div>}
 {files.length>0&&!result&&<div className="actions">{(tool.kind==='image'||slug==='images-to-pdf'||slug==='compress-pdf-raster')&&<label className="quality">{d.imageQuality}: {quality}% <input type="range" min="50" max="100" value={quality} onChange={e=>setQuality(Number(e.target.value))}/></label>}<button type="button" className="btn btn-primary" disabled={busy} onClick={run}>{busy?<LoaderCircle className="spin" size={18}/>:<ArrowRight size={18}/>} {busy?d.processing:d.convert}</button><button type="button" className="btn btn-ghost" disabled={busy} onClick={reset}>{d.reset}</button></div>}
 {result&&<div className="actions"><a className="btn btn-primary" href={result.url} download={result.name}><Download size={18}/>{d.download}</a><button type="button" className="btn btn-ghost" disabled={busy} onClick={reset}><RotateCcw size={17}/>{d.reset}</button></div>}
 <p className="visually-hidden" role="status" aria-live="polite" aria-atomic="true">{status}</p>
 {error&&<p role="alert" className="error">{error}</p>}
 </div></section>;
}