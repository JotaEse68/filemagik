'use client';
import {useRef,useState,useEffect} from 'react';
import {ArrowRight,Check,Download,FileUp,RotateCcw,LoaderCircle} from 'lucide-react';
import {convertFiles} from '@/lib/convert';
import {validateFiles,sizeLimitLabel} from '@/lib/file-limits';
import {getTool,type ToolSlug,type Locale} from '@/config/site';
import PdfPreview from '@/components/pdf-preview';
import PdfFormEditor from '@/components/pdf-form-editor';
import ProfessionalPdfOption,{isProfessionalSlug,runProfessionalConversion} from '@/components/professional-pdf-option';
import type {Dictionary} from '@/lib/i18n';
export default function Converter({slug,d,locale='en'}:{slug:ToolSlug;d:Dictionary;locale?:Locale}){
 const abortController=useRef<AbortController|null>(null);
 const tool=getTool(slug)!;const serverOnlyOffice=slug==='ods-to-pdf'||slug==='odp-to-pdf';const input=useRef<HTMLInputElement>(null);const [files,setFiles]=useState<File[]>([]);
 const [drag,setDrag]=useState(false),[busy,setBusy]=useState(false);
 const [result,setResult]=useState<{name:string;url:string}|null>(null);
 const [error,setError]=useState(''),[quality,setQuality]=useState(88);
 const [prefix,setPrefix]=useState('FileMagik'),[width,setWidth]=useState(1200);
 const [cropPercent,setCropPercent]=useState(0),[rotation,setRotation]=useState<0|90|180|270>(0),[format,setFormat]=useState<'png'|'jpeg'|'webp'>('webp');
 const [signature,setSignature]=useState('');
 const [pdfPassword,setPdfPassword]=useState('');
 const [ocrProgress,setOcrProgress]=useState('');
 const [engineReady,setEngineReady]=useState(false),[professional,setProfessional]=useState(false);
 const [siteKey,setSiteKey]=useState(''),[challengeToken,setChallengeToken]=useState('');
 const [challengeRequired,setChallengeRequired]=useState(false);
 const [challengeVersion,setChallengeVersion]=useState(0);
 const [compressionMode,setCompressionMode]=useState<'lossless'|'balanced'|'maximum'>('lossless');
 useEffect(()=>{if(!isProfessionalSlug(slug))return;let alive=true;
  void fetch('/api/pdf-engine',{cache:'no-store'}).then(r=>r.json()).then((value:{available?:boolean;siteKey?:string|null;challengeRequired?:boolean})=>{
   if(!alive)return;const ready=value.available===true;
   setChallengeRequired(ready&&value.challengeRequired===true);
   setEngineReady(ready);setProfessional(ready);setSiteKey(ready?value.siteKey||'':'');
  }).catch(()=>{if(alive){setEngineReady(false);setProfessional(false);}});
  return()=>{alive=false;};
 },[slug]);
 const [formValues,setFormValues]=useState('{}');
 const [subtitleOffsetMs,setSubtitleOffsetMs]=useState(0),[annotationText,setAnnotationText]=useState('');
 const [annotationPages,setAnnotationPages]=useState(''),[annotationPlacement,setAnnotationPlacement]=useState<'top-left'|'bottom-left'|'top-right'>('bottom-left');
 const [audioStartSeconds,setAudioStartSeconds]=useState(0),[audioEndSeconds,setAudioEndSeconds]=useState<number|undefined>();
 const [ocrLang,setOcrLang]=useState<'eng'|'spa'|'por'|'fra'>('eng');
 const [pages,setPages]=useState('1-2'),[groupSize,setGroupSize]=useState(2),[watermark,setWatermark]=useState('CONFIDENTIAL'),[opacity,setOpacity]=useState(25);
 const labels={"en":["Pages (e.g. 1,3,5-8)","Pages per file","Watermark text","Opacity","Visible signature","Lossy conversion: pages become images. Text, links and forms will no longer be searchable.","OCR language"],"es":["Páginas (ej. 1,3,5-8)","Páginas por archivo","Texto de marca","Opacidad","Firma visible","Compresión con pérdida: las páginas pasan a ser imágenes. Texto, enlaces y formularios dejan de ser buscables.","Idioma del OCR"],"pt":["Páginas (ex. 1,3,5-8)","Páginas por arquivo","Texto da marca","Opacidade","Assinatura visível","Compressão com perda: páginas viram imagens; textos, links e formulários deixam de ser pesquisáveis.","Idioma do OCR"],"fr":["Pages (ex. 1,3,5-8)","Pages par fichier","Texte du filigrane","Opacité","Signature visible","Compression avec perte : les pages deviennent des images et le texte, les liens et les formulaires ne seront plus recherchables.","Langue de l’OCR"]}[locale];
 useEffect(()=>()=>{if(result)URL.revokeObjectURL(result.url)},[result]);
 const choose=(incoming:File[])=>{if(busy)return;try{validateFiles(slug,incoming);setResult(null);setError('');setFiles(incoming)}catch(e){setError(e instanceof Error?e.message:d.error);}};
 const run=async()=>{if(!files.length)return;abortController.current=new AbortController();setBusy(true);setError('');setOcrProgress('');try{
 if(serverOnlyOffice&&!engineReady)throw new Error('Professional Office engine unavailable; no local converter for ODS/ODP');
 if(professional&&engineReady&&challengeRequired&&!challengeToken)throw new Error('Completa la verificación para usar el motor profesional');
 const output=professional&&engineReady&&isProfessionalSlug(slug)?await runProfessionalConversion(slug,files[0],challengeToken,slug==='compress-pdf-raster'?compressionMode:'lossless'):
 await convertFiles(slug,files,quality/100,{pages,groupSize,watermark,opacity:opacity/100,ocrLang,signature,formValues,prefix,width,cropPercent,rotation,format,subtitleOffsetMs,annotationText,annotationPages,annotationPlacement,audioStartSeconds,audioEndSeconds,pdfPassword,signal:abortController.current.signal,onProgress:(done,total)=>setOcrProgress(`${done}/${total}`)});setResult({name:output.name,url:URL.createObjectURL(output.blob)});
 }catch(e){setError(e instanceof Error?(e.name==='AbortError'?'Conversión cancelada':e.message):d.error)}finally{abortController.current=null;setBusy(false);if(professional){setChallengeToken('');setChallengeVersion(v=>v+1);}}};
 const moveFile=(index:number,direction:number)=>setFiles(current=>{const target=index+direction;if(target<0||target>=current.length)return current;const next=[...current];[next[index],next[target]]=[next[target],next[index]];return next;});
 const reset=()=>{setResult(null);setFiles([]);setError('');if(input.current)input.current.value=''};
 const status=busy?(ocrProgress?`${d.processing} · ${ocrProgress}`:d.processing):result?result.name+" · "+d.download:files.length?String(files.length)+" "+d.selected:"";
 return <section className="converter" aria-busy={busy}>
 <input ref={input} className="visually-hidden" type="file" aria-label={d.browse} multiple={slug==='merge-pdf'||slug==='images-to-pdf'||slug==='create-zip'||slug==='create-tar'||slug==='rename-batch'||slug==='batch-images-to-webp'} accept={tool.accept} onChange={e=>choose(Array.from(e.target.files||[]))}/>
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
 {files.length>0&&!result&&['ocr-pdf','ocr-image','ocr-pdf-searchable'].includes(slug)&&<div className="pdf-option-panel"><label>{labels[6]}<select value={ocrLang} onChange={e=>setOcrLang(e.target.value as 'eng'|'spa'|'por'|'fra')}><option value="eng">English</option><option value="spa">Español</option><option value="por">Português</option><option value="fra">Français</option></select></label></div>}
 {files.length>0&&!result&&(slug==='protect-pdf'||slug==='unlock-pdf')&&<div className="pdf-option-panel"><label>{({es:'Contraseña del PDF',en:'PDF password',pt:'Senha do PDF',fr:'Mot de passe PDF'} as const)[locale]}<input type="password" required minLength={slug==='protect-pdf'?8:1} maxLength={128} autoComplete="new-password" value={pdfPassword} onChange={e=>setPdfPassword(e.target.value)}/></label><p>{({es:'Se procesa localmente en tu navegador. Para proteger usa al menos 8 caracteres; para desbloquear necesitas conocer la contraseña.',en:'Processed locally in your browser. Use at least 8 characters to protect; to unlock you must know the password.',pt:'Processado localmente. Use 8 caracteres para proteger; para desbloquear é necessário saber a senha.',fr:'Traitement local. Utilisez au moins 8 caractères pour protéger; le déverrouillage exige le mot de passe.'} as const)[locale]}</p></div>}
 {files.length>0&&!result&&slug==='ocr-pdf-searchable'&&<p className="pdf-conversion-note">{({es:'Reconoce texto en PDF escaneados y añade una capa seleccionable sin convertir las páginas en imágenes nuevas. Hasta 30 páginas, incluidas páginas giradas. Las páginas ya buscables no se vuelven a procesar. Descarga primero los modelos OCR necesarios.',en:'Recognizes scans and adds selectable text to the original PDF. Up to 30 pages including rotated pages. OCR language model downloads may be required.',pt:'Reconhece PDFs digitalizados e adiciona texto selecionável sem rasterizar o PDF. Até 30 páginas, incluindo páginas giradas.',fr:'Ajoute du texte sélectionnable au PDF numérisé sans rasteriser les pages. Jusqu’à 30 pages, même pivotées.'} as const)[locale]}</p>}
 {files.length>0&&!result&&slug==='compress-pdf-lossless'&&<p className="pdf-conversion-note">{({es:'Optimización sin rasterizar: conserva texto, enlaces y formularios cuando son compatibles. Si no reduce el tamaño, te indicaremos que conserves el original.',en:'Non-raster optimization preserves text, links and compatible forms; if not smaller, keep the original.',pt:'Otimização sem rasterização; mantém textos e links. Se não reduzir, preserve o original.',fr:'Optimisation sans rastérisation. Si le fichier est déjà optimal, conservez l’original.'} as const)[locale]}</p>}
 {files.length>0&&!result&&slug==='pdf-to-excel-text'&&<p className="pdf-conversion-note">{({es:'Extracción aproximada: organiza fragmentos de texto por filas según su posición. Las tablas complejas, imágenes y celdas fusionadas pueden requerir ajustes.',en:'Best-effort text extraction by rows. Complex tables, images and merged cells may need manual correction.',pt:'Extração aproximada de texto por linhas; tabelas complexas precisam de revisão.',fr:'Extraction approximative par lignes, sans garantie de fidélité pour les tableaux complexes.'} as const)[locale]}</p>}
 {files.length>0&&!result&&slug==='rename-batch'&&<div className="pdf-option-panel"><label>File prefix / Prefijo<input value={prefix} onChange={e=>setPrefix(e.target.value)} maxLength={60}/></label></div>}
 {files.length>0&&!result&&slug==='resize-image'&&<div className="pdf-option-panel"><label>Output width / Ancho en píxeles<input type="number" min={64} max={4000} value={width} onChange={e=>setWidth(Number(e.target.value))}/></label></div>}
 {files.length>0&&!result&&['inspect-pdf-form','fill-pdf-form','flatten-pdf-form'].includes(slug)&&<div className="pdf-option-panel">
 {slug==='fill-pdf-form'&&<PdfFormEditor file={files[0]} onChange={setFormValues}/>} 
 <p>{({es:'Compatible con formularios PDF AcroForm. No modifica firmas digitales válidas. Los formularios XFA no son compatibles.',en:'Supports PDF AcroForm fields. Valid digital signatures are not modified. XFA forms are unsupported.',pt:'Compatível com campos AcroForm. Assinaturas digitais válidas não são modificadas; XFA não é suportado.',fr:'Compatible AcroForm. Les signatures numériques valides ne sont pas modifiées. XFA non pris en charge.'} as const)[locale]}</p>
 </div>}
 {files.length>0&&!result&&slug==='audio-to-wav'&&<div className="pdf-option-panel">
 <label>{({es:'Inicio del recorte (segundos)',en:'Start (seconds)',pt:'Início (segundos)',fr:'Début (secondes)'} as const)[locale]}<input type="number" min={0} step={.1} value={audioStartSeconds} onChange={e=>setAudioStartSeconds(Number(e.target.value))}/></label>
 <label>{({es:'Final (segundos, vacío = todo)',en:'End (seconds, blank = full file)',pt:'Fim (segundos, vazio = tudo)',fr:'Fin (secondes, vide = fichier entier)'} as const)[locale]}<input type="number" min={0} step={.1} value={audioEndSeconds??''} onChange={e=>setAudioEndSeconds(e.target.value===''?undefined:Number(e.target.value))}/></label>
 <p>{({es:'Conversión local a WAV PCM. Límite de 10 minutos; compatibilidad con los códecs según tu navegador.',en:'Local conversion to PCM WAV. Maximum 10 minutes; codec support depends on your browser.',pt:'Conversão local para WAV PCM. Máximo 10 minutos; suporte a códecs depende do navegador.',fr:'Conversion locale vers WAV PCM. Maximum 10 minutes ; codecs selon le navigateur.'} as const)[locale]}</p>
 </div>}
 {files.length>0&&!result&&slug==='crop-pdf'&&<div className="pdf-option-panel"><label>{({es:'Recortar márgenes PDF (%)',en:'Crop PDF margins (%)',pt:'Cortar margens do PDF (%)',fr:'Rogner les marges PDF (%)'} as const)[locale]}<input type="number" min={0} max={30} value={cropPercent} onChange={e=>setCropPercent(Number(e.target.value))}/></label><p>{({es:'El recorte oculta los márgenes, no elimina permanentemente el contenido.',en:'Cropping hides margins but does not permanently erase content.',pt:'O recorte oculta as margens, não apaga o conteúdo definitivamente.',fr:'Le rognage masque les marges sans effacer définitivement leur contenu.'} as const)[locale]}</p></div>}
 {files.length>0&&!result&&slug==='annotate-pdf-text'&&<div className="pdf-option-panel">
 <label>{({es:'Texto de anotación',en:'Annotation text',pt:'Texto da anotação',fr:'Texte de l’annotation'} as const)[locale]}<input maxLength={120} value={annotationText} onChange={e=>setAnnotationText(e.target.value)}/></label>
 <label>{({es:'Páginas (vacío = todas)',en:'Pages (blank = all)',pt:'Páginas (vazio = todas)',fr:'Pages (vide = toutes)'} as const)[locale]}<input value={annotationPages} placeholder="1,3,5-8" onChange={e=>setAnnotationPages(e.target.value)}/></label>
 <label>{({es:'Ubicación de la nota',en:'Annotation placement',pt:'Posição da nota',fr:'Position de la note'} as const)[locale]}<select value={annotationPlacement} onChange={e=>setAnnotationPlacement(e.target.value as 'top-left'|'bottom-left'|'top-right')}><option value="bottom-left">{({es:'Abajo a la izquierda',en:'Bottom left',pt:'Inferior esquerda',fr:'En bas à gauche'} as const)[locale]}</option><option value="top-left">{({es:'Arriba a la izquierda',en:'Top left',pt:'Superior esquerda',fr:'En haut à gauche'} as const)[locale]}</option><option value="top-right">{({es:'Arriba a la derecha',en:'Top right',pt:'Superior direita',fr:'En haut à droite'} as const)[locale]}</option></select></label>
 <p>{({es:'La nota será visible en las páginas seleccionadas. No es una firma digital.',en:'The note appears only on selected pages. This is not a digital signature.',pt:'Nota visível nas páginas selecionadas. Não é assinatura digital.',fr:'Note visible sur les pages sélectionnées. Ce n’est pas une signature numérique.'} as const)[locale]}</p>
 </div>}
 {files.length>0&&!result&&(slug==='srt-to-vtt'||slug==='vtt-to-srt')&&<div className="pdf-option-panel"><label>{({en:'Subtitle timing adjustment (milliseconds)',es:'Ajuste de tiempo de subtítulos (milisegundos)',pt:'Ajuste do tempo das legendas (milissegundos)',fr:'Décalage des sous-titres (millisecondes)'} as const)[locale]}<input type="number" min={-86400000} max={86400000} step={100} value={subtitleOffsetMs} onChange={e=>setSubtitleOffsetMs(Number(e.target.value))}/></label></div>}
 {files.length>0&&!result&&slug==='adjust-image'&&<div className="pdf-option-panel">
 <label>{({es:'Recortar bordes (%)',en:'Crop edges (%)',pt:'Recortar bordas (%)',fr:'Rogner les bords (%)'} as const)[locale]}<input type="number" min={0} max={40} value={cropPercent} onChange={e=>setCropPercent(Number(e.target.value))}/></label>
 <label>{({es:'Girar imagen',en:'Rotate image',pt:'Girar imagem',fr:'Pivoter l’image'} as const)[locale]}<select value={rotation} onChange={e=>setRotation(Number(e.target.value) as 0|90|180|270)}><option value={0}>0°</option><option value={90}>90°</option><option value={180}>180°</option><option value={270}>270°</option></select></label>
 <label>{({es:'Formato de salida',en:'Output format',pt:'Formato de saída',fr:'Format de sortie'} as const)[locale]}<select value={format} onChange={e=>setFormat(e.target.value as 'png'|'jpeg'|'webp')}><option value="webp">WebP</option><option value="png">PNG</option><option value="jpeg">JPG</option></select></label>
 <p className="image-export-hint">{({es:'La exportación elimina los metadatos habituales, incluido EXIF. El recorte se aplica por igual a los cuatro bordes.',en:'Export removes most metadata, including EXIF. Cropping applies to all four edges.',pt:'A exportação remove metadados, inclusive EXIF. O recorte afeta as quatro bordas.',fr:'L’export supprime les métadonnées, dont EXIF. Le rognage affecte les quatre bords.'} as const)[locale]}</p>
 </div>}
 {files.length>0&&!result&&engineReady&&isProfessionalSlug(slug)&&<div className="fm-pro-engine-panel">
 <strong>Motor PDF profesional</strong>
 <label><input type="radio" name="filemagik-pdf-engine" checked={professional} onChange={()=>setProfessional(true)}/> Mayor fidelidad (procesamiento seguro en servidor)</label>
 {!serverOnlyOffice&&<label><input type="radio" name="filemagik-pdf-engine" checked={!professional} onChange={()=>setProfessional(false)}/> Procesamiento local (archivo permanece en el navegador)</label>}
 {professional&&<><p>El archivo se transmite temporalmente al servidor para procesarlo. Máximo 3 MB por operación. No se conserva después de generar el resultado.</p>
 {slug==='compress-pdf-raster'&&<label>Compresión <select value={compressionMode} onChange={e=>setCompressionMode(e.target.value as 'lossless'|'balanced'|'maximum')}><option value="lossless">Sin pérdida</option><option value="balanced">Equilibrada</option><option value="maximum">Máxima reducción</option></select></label>}
 {challengeRequired&&<ProfessionalPdfOption key={challengeVersion} siteKey={siteKey} ready={professional} onToken={setChallengeToken} onReset={()=>setChallengeToken('')}/>}</>}
 </div>}
 {files.length>0&&!result&&serverOnlyOffice&&!engineReady&&<p role="status">Esta conversión necesita el motor Office profesional; no hay conversión local compatible.</p>}
 {files.length>0&&!result&&<div className="actions">{(tool.kind==='image'||slug==='images-to-pdf'||slug==='compress-pdf-raster')&&<label className="quality">{d.imageQuality}: {quality}% <input type="range" min="50" max="100" value={quality} onChange={e=>setQuality(Number(e.target.value))}/></label>}<button type="button" className="btn btn-primary" disabled={busy} onClick={run}>{busy?<LoaderCircle className="spin" size={18}/>:<ArrowRight size={18}/>} {busy?d.processing:d.convert}</button><button type="button" className="btn btn-ghost" disabled={busy} onClick={reset}>{d.reset}</button>{busy&&slug==='batch-images-to-webp'&&<button type="button" className="btn btn-ghost" onClick={()=>abortController.current?.abort()}>{({es:'Cancelar lote',en:'Cancel batch',pt:'Cancelar lote',fr:'Annuler le lot'} as const)[locale]}</button>}</div>}
 {result&&<div className="actions"><a className="btn btn-primary" href={result.url} download={result.name}><Download size={18}/>{d.download}</a><button type="button" className="btn btn-ghost" disabled={busy} onClick={reset}><RotateCcw size={17}/>{d.reset}</button></div>}
 <p className="visually-hidden" role="status" aria-live="polite" aria-atomic="true">{status}</p>
 {error&&<p role="alert" className="error">{error}</p>}
 </div></section>;
}