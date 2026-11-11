'use client';
import {useRef,useState,useEffect} from 'react';
import {ArrowRight,Check,Download,FileUp,RotateCcw,LoaderCircle,Info,CheckCircle2} from 'lucide-react';
import {getConversionBenefit} from '@/lib/conversion-benefits';
import {convertFiles} from '@/lib/convert';
import {isWorkerSlug,runWorkerConversion} from '@/lib/worker-conversion';
import {validateFiles,sizeLimitLabel} from '@/lib/file-limits';
import {getTool,type ToolSlug,type Locale} from '@/config/site';
import PdfPreview from '@/components/pdf-preview';
import PdfFormEditor from '@/components/pdf-form-editor';
import ProfessionalPdfOption,{isProfessionalSlug,professionalOperations,runProfessionalConversion} from '@/components/professional-pdf-option';
import type {Dictionary} from '@/lib/i18n';
export default function Converter({slug,d,locale='en'}:{slug:ToolSlug;d:Dictionary;locale?:Locale}){
 const abortController=useRef<AbortController|null>(null);
 const serverOnlyWorker=isWorkerSlug(slug);
 const tool=getTool(slug)!;const serverOnlyOffice=slug==='ods-to-pdf'||slug==='odp-to-pdf'||slug==='ocr-pdf-professional'||slug==='replace-pdf-image-native'||slug==='replace-pdf-text-native'||slug==='unlock-pdf-professional';const input=useRef<HTMLInputElement>(null);const [files,setFiles]=useState<File[]>([]);
 const [drag,setDrag]=useState(false),[busy,setBusy]=useState(false);
 const [result,setResult]=useState<{name:string;url:string}|null>(null);
 const [downloadStarted,setDownloadStarted]=useState(false);
 const [error,setError]=useState(''),[quality,setQuality]=useState(88);
 const [prefix,setPrefix]=useState('FileMagik'),[width,setWidth]=useState(1200);
 const [cropPercent,setCropPercent]=useState(0),[rotation,setRotation]=useState<0|90|180|270>(0),[format,setFormat]=useState<'png'|'jpeg'|'webp'>('webp');
 const [signature,setSignature]=useState('');
 const [pdfPassword,setPdfPassword]=useState('');
 const [ocrProgress,setOcrProgress]=useState('');
 const [engineReady,setEngineReady]=useState(false),[professional,setProfessional]=useState(false);
 const [siteKey,setSiteKey]=useState(''),[challengeToken,setChallengeToken]=useState('');
 const [workerReady,setWorkerReady]=useState(false),[workerSiteKey,setWorkerSiteKey]=useState('');
 const [workerToken,setWorkerToken]=useState(''),[workerVersion,setWorkerVersion]=useState(0);
 const [challengeRequired,setChallengeRequired]=useState(false);
 const [challengeVersion,setChallengeVersion]=useState(0);
 const [compressionMode,setCompressionMode]=useState<'lossless'|'balanced'|'maximum'>('lossless');
 useEffect(()=>{if(!isProfessionalSlug(slug))return;let alive=true;
  void fetch('/api/pdf-engine?operation='+encodeURIComponent(professionalOperations[slug]),{cache:'no-store'}).then(r=>r.json()).then((value:{available?:boolean;siteKey?:string|null;challengeRequired?:boolean})=>{
   if(!alive)return;const ready=value.available===true;
   setChallengeRequired(ready&&value.challengeRequired===true);
   setEngineReady(ready);setProfessional(ready);setSiteKey(ready?value.siteKey||'':'');
  }).catch(()=>{if(alive){setEngineReady(false);setProfessional(false);}});
  return()=>{alive=false;};
 },[slug]);
 useEffect(()=>{if(!serverOnlyWorker)return;let active=true;
  void fetch('/api/worker-engine?operation='+encodeURIComponent(slug),{cache:'no-store'})
   .then(r=>r.json()).then((v:{available?:boolean;siteKey?:string|null})=>{
    if(active){setWorkerReady(v.available===true);setWorkerSiteKey(v.available?v.siteKey||'':'');}
   }).catch(()=>{if(active){setWorkerReady(false);setWorkerSiteKey('');}});
  return()=>{active=false;};
 },[slug,serverOnlyWorker]);
 useEffect(()=>{if(slug!=='server-mixed-batch')return;let active=true;
  void import('@/lib/batch-recovery').then(m=>m.loadBatch()).then(d=>{if(active)setBatchRecovery(!!d)}).catch(()=>{});
  return()=>{active=false;};
 },[slug]);
 const [formValues,setFormValues]=useState('{}');
 const [subtitleOffsetMs,setSubtitleOffsetMs]=useState(0),[annotationText,setAnnotationText]=useState('');
 const [annotationPages,setAnnotationPages]=useState(''),[annotationPlacement,setAnnotationPlacement]=useState<'top-left'|'bottom-left'|'top-right'>('bottom-left');
 const [audioStartSeconds,setAudioStartSeconds]=useState(0),[audioEndSeconds,setAudioEndSeconds]=useState<number|undefined>();
 const [batchPreset,setBatchPreset]=useState<'web-friendly'|'extract'>('web-friendly');
 const [batchRecovery,setBatchRecovery]=useState(false);
 const [replacementFile,setReplacementFile]=useState<File|null>(null),[pdfImagePage,setPdfImagePage]=useState(1),[pdfImageIndex,setPdfImageIndex]=useState(1);
 const [pdfNativeOriginal,setPdfNativeOriginal]=useState(''),[pdfNativeReplacement,setPdfNativeReplacement]=useState('');
 const [firstFrame,setFirstFrame]=useState(1),[lastFrame,setLastFrame]=useState<number|undefined>(),[gifSpeed,setGifSpeed]=useState(1);
 const [ocrLang,setOcrLang]=useState<'eng'|'spa'|'por'|'fra'>('eng');
 const [pages,setPages]=useState('1-2'),[groupSize,setGroupSize]=useState(2),[watermark,setWatermark]=useState('CONFIDENTIAL'),[opacity,setOpacity]=useState(25);
 const labels={"en":["Pages (e.g. 1,3,5-8)","Pages per file","Watermark text","Opacity","Visible signature","Lossy conversion: pages become images. Text, links and forms will no longer be searchable.","OCR language"],"es":["Páginas (ej. 1,3,5-8)","Páginas por archivo","Texto de marca","Opacidad","Firma visible","Compresión con pérdida: las páginas pasan a ser imágenes. Texto, enlaces y formularios dejan de ser buscables.","Idioma del OCR"],"pt":["Páginas (ex. 1,3,5-8)","Páginas por arquivo","Texto da marca","Opacidade","Assinatura visível","Compressão com perda: páginas viram imagens; textos, links e formulários deixam de ser pesquisáveis.","Idioma do OCR"],"fr":["Pages (ex. 1,3,5-8)","Pages par fichier","Texte du filigrane","Opacité","Signature visible","Compression avec perte : les pages deviennent des images et le texte, les liens et les formulaires ne seront plus recherchables.","Langue de l’OCR"]}[locale];
 useEffect(()=>()=>{if(result)URL.revokeObjectURL(result.url)},[result]);
 const choose=(incoming:File[])=>{if(busy)return;try{validateFiles(slug,incoming);setResult(null);setDownloadStarted(false);setError('');setFiles(incoming)}catch(e){setFiles([]);setResult(null);setDownloadStarted(false);if(input.current)input.current.value='';setError(e instanceof Error?e.message:d.error);}};
 const run=async()=>{if(!files.length)return;
 if(['server-join-audio','server-join-video'].includes(slug)&&files.length<2){setError('Selecciona al menos dos archivos para unir.');return;}
 if(['server-trim-audio','server-trim-video'].includes(slug)&&(audioEndSeconds===undefined||audioEndSeconds<=audioStartSeconds)){setError('El final del recorte debe ser mayor que el inicio.');return;}abortController.current=new AbortController();setBusy(true);setDownloadStarted(false);setError('');setOcrProgress('');try{
 if(serverOnlyOffice&&!engineReady)throw new Error(slug==='ods-to-pdf'||slug==='odp-to-pdf'?'Professional Office engine unavailable':'Professional PDF engine unavailable');
 if(slug==='replace-pdf-image-native'&&!replacementFile)throw new Error('Selecciona una imagen de sustitución.');
 if(slug==='unlock-pdf-professional'&&!pdfPassword)throw new Error('Introduce la contraseña válida del documento PDF.');
 if(slug==='replace-pdf-text-native'&&(!pdfNativeOriginal||!pdfNativeReplacement))throw new Error('Introduce el texto original y su sustitución.');
 if(serverOnlyWorker&&!workerReady)throw new Error('Private conversion engine not available; no insecure fallback');
 if(serverOnlyWorker&&!workerToken)throw new Error('Completa la verificación para convertir');
 if(professional&&engineReady&&challengeRequired&&!challengeToken)throw new Error('Completa la verificación para usar el motor profesional');
 if(slug==='server-mixed-batch'){
  try{const m=await import('@/lib/batch-recovery');await m.saveBatch(files,batchPreset);setBatchRecovery(true);}catch{/* Conversion still works without local retention */}
 }
 const output=serverOnlyWorker?await runWorkerConversion(slug,files,workerToken,abortController.current.signal,{start: ['server-trim-audio','server-trim-video','server-video-frame'].includes(slug)?audioStartSeconds:undefined,end: ['server-trim-audio','server-trim-video'].includes(slug)?audioEndSeconds:undefined,preset:batchPreset,firstFrame:slug==='server-gif-edit'?firstFrame:undefined,lastFrame:slug==='server-gif-edit'?lastFrame:undefined,speed:slug==='server-gif-edit'?gifSpeed:undefined}):
 professional&&engineReady&&isProfessionalSlug(slug)?await runProfessionalConversion(slug,files[0],challengeToken,slug==='compress-pdf-raster'?compressionMode:'lossless',{replacement:replacementFile||undefined,page:pdfImagePage,imageIndex:pdfImageIndex,sourceText:pdfNativeOriginal,newText:pdfNativeReplacement,password:pdfPassword}):
 await convertFiles(slug,files,quality/100,{pages,groupSize,watermark,opacity:opacity/100,ocrLang,signature,formValues,prefix,width,cropPercent,rotation,format,subtitleOffsetMs,annotationText,annotationPages,annotationPlacement,audioStartSeconds,audioEndSeconds,pdfPassword,signal:abortController.current.signal,onProgress:(done,total)=>setOcrProgress(`${done}/${total}`)});if(!output.blob.size)throw new Error('El archivo generado está vacío. Prueba otro archivo.');
 if(slug==='server-mixed-batch'){
  try{const m=await import('@/lib/batch-recovery');await m.saveBatchResult(output.blob,output.name);}catch{/* File is still available for immediate download */}
 }
 setResult({name:output.name,url:URL.createObjectURL(output.blob)});
 }catch(e){setError(e instanceof Error?(e.name==='AbortError'?'Conversión cancelada':e.message):d.error)}finally{abortController.current=null;setBusy(false);if(serverOnlyWorker){setWorkerToken('');setWorkerVersion(v=>v+1);}if(professional){setChallengeToken('');setChallengeVersion(v=>v+1);}}};
 const restoreBatch=async()=>{
  try{const m=await import('@/lib/batch-recovery');const draft=await m.loadBatch();
   if(!draft){setBatchRecovery(false);setError('No hay ningún lote guardado en este navegador.');return;}
   validateFiles(slug,draft.files);setFiles(draft.files);setBatchPreset(draft.preset);
   setDownloadStarted(false);setError('');
   if(draft.result&&draft.resultName){setResult({name:draft.resultName,url:URL.createObjectURL(draft.result)});}
   else{setResult(null);setError('Archivos restaurados. Completa una nueva verificación para reintentar. Un procesamiento anterior puede haber consumido cuota.');}
  }catch(e){setError(e instanceof Error?e.message:'No se pudo recuperar el lote');}
 };
 const forgetBatch=async()=>{try{const m=await import('@/lib/batch-recovery');await m.clearBatch();setBatchRecovery(false);}
  catch(e){setError(e instanceof Error?e.message:'No se pudo borrar el lote local');}};
 const moveFile=(index:number,direction:number)=>setFiles(current=>{const target=index+direction;if(target<0||target>=current.length)return current;const next=[...current];[next[index],next[target]]=[next[target],next[index]];return next;});
 const reset=()=>{setResult(null);setDownloadStarted(false);setFiles([]);setError('');if(input.current)input.current.value=''};
 const messages=({
  es:{why:'¿Por qué hacer esta conversión?',finished:'¡Conversión completada!',ready:'El archivo está listo. Descárgalo cuando quieras.',file:'Archivo generado',downloadStarted:'Descarga solicitada. Consulta las descargas de tu navegador.',start:'Descargar archivo'},
  en:{why:'Why make this conversion?',finished:'Conversion complete!',ready:'Your file is ready. Download it whenever you like.',file:'Generated file',downloadStarted:'Download requested. Check your browser downloads.',start:'Download file'},
  pt:{why:'Por que fazer esta conversão?',finished:'Conversão concluída!',ready:'O ficheiro está pronto para descarregar.',file:'Ficheiro gerado',downloadStarted:'Transferência iniciada. Verifique as transferências do navegador.',start:'Descarregar ficheiro'},
  fr:{why:'Pourquoi faire cette conversion ?',finished:'Conversion terminée !',ready:'Votre fichier est prêt à être téléchargé.',file:'Fichier généré',downloadStarted:'Téléchargement demandé. Vérifiez les téléchargements du navigateur.',start:'Télécharger le fichier'}
 } as const)[locale];
 const status=busy?(ocrProgress?`${d.processing} · ${ocrProgress}`:d.processing):result?result.name+" · "+d.download:files.length?String(files.length)+" "+d.selected:"";
 return <section className="converter" aria-busy={busy}>
 <aside className="conversion-benefit" aria-label={messages.why}>
  <Info size={19} aria-hidden="true"/>
  <div><h3>{messages.why}</h3><p>{getConversionBenefit(slug,locale)}</p></div>
 </aside>
 <input ref={input} className="visually-hidden" type="file" aria-label={d.browse} multiple={slug==='merge-pdf'||slug==='images-to-pdf'||slug==='create-zip'||slug==='create-tar'||slug==='rename-batch'||slug==='batch-images-to-webp'||slug==='server-mixed-batch'||slug==='server-join-audio'||slug==='server-join-video'} accept={tool.accept} onChange={e=>choose(Array.from(e.target.files||[]))}/>
 {slug==='server-mixed-batch'&&batchRecovery&&<div className="pdf-option-panel" role="group" aria-label="Recuperación local de lotes">
  <p>{({es:'Este navegador conserva durante 24 horas una copia local de los archivos y, si se completó, el ZIP. Reintentar un lote interrumpido puede volver a consumir cuota.',en:'This browser keeps files and any completed ZIP locally for 24 hours. Retrying interrupted processing may consume quota again.',pt:'O navegador conserva ficheiros e ZIP concluído por 24 horas. Repetir pode consumir quota novamente.',fr:'Le navigateur garde les fichiers et le ZIP terminé pendant 24 heures. Un nouvel essai peut consommer du quota.'} as const)[locale]}</p>
  <button type="button" className="btn btn-ghost" disabled={busy} onClick={()=>void restoreBatch()}>{({es:'Recuperar último lote',en:'Restore last batch',pt:'Recuperar último lote',fr:'Récupérer le dernier lot'} as const)[locale]}</button>
  <button type="button" className="btn btn-ghost" disabled={busy} onClick={()=>void forgetBatch()}>{({es:'Borrar copia local',en:'Delete local copy',pt:'Apagar cópia local',fr:'Effacer la copie locale'} as const)[locale]}</button>
 </div>}
 <div className={`dropzone ${drag?'dragging':''}`} role="group" aria-label={d.dropTitle} onDragOver={e=>{e.preventDefault();setDrag(true)}} onDragLeave={()=>setDrag(false)} onDrop={e=>{e.preventDefault();setDrag(false);choose(Array.from(e.dataTransfer.files))}}>
 <div className="upload-icon"><FileUp size={36} strokeWidth={1.6}/></div>
 <h2>{result?<><Check size={25}/>{result.name}</>:files.length?files.map(f=>f.name).join(', '):d.dropTitle}</h2>
 <p>{files.length?`${files.length} ${d.selected.toLowerCase()}`:d.dropSub}</p>{!result&&<small className="upload-limit">{sizeLimitLabel(slug)}</small>}
 {!files.length&&<button type="button" className="btn btn-primary" onClick={()=>input.current?.click()}>{d.browse}<ArrowRight size={17}/></button>}
 {files.length>1&&!result&&(slug==='merge-pdf'||slug==='images-to-pdf'||slug==='server-join-audio'||slug==='server-join-video')&&<ol className="file-order-list">{files.map((file,index)=><li key={file.name+'-'+index}><span>{file.name}</span><div><button type="button" disabled={index===0||busy} onClick={()=>moveFile(index,-1)} aria-label={`Move ${file.name} up`}>↑</button><button type="button" disabled={index===files.length-1||busy} onClick={()=>moveFile(index,1)} aria-label={`Move ${file.name} down`}>↓</button></div></li>)}</ol>}
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
 {files.length>0&&!result&&slug==='unlock-pdf-professional'&&<div className="pdf-option-panel">
  <label>{({es:'Contraseña actual del PDF',en:'Current PDF password',pt:'Senha atual do PDF',fr:'Mot de passe actuel du PDF'} as const)[locale]}
  <input type="password" required minLength={1} maxLength={256} autoComplete="off" value={pdfPassword} onChange={e=>setPdfPassword(e.target.value)}/></label>
  <p>{({es:'Solo para archivos que estás autorizado a desbloquear. La contraseña se envía mediante conexión segura al motor privado y no se guarda. No modifica firmas digitales ni conserva una firma que dejaría de ser válida.',en:'Only unlock PDFs you are authorized to access. The password is sent securely to the private engine, never stored. Digitally signed PDFs are refused.',pt:'Use apenas em PDF autorizados. A senha é transmitida com segurança ao motor privado e não fica guardada. PDFs assinados são recusados.',fr:'Seulement pour les PDF autorisés. Le mot de passe est envoyé au moteur privé et non conservé. PDF signés refusés.'} as const)[locale]}</p>
 </div>}
 {files.length>0&&!result&&slug==='replace-pdf-text-native'&&<div className="pdf-option-panel">
 <label>{({es:'Página (desde 1)',en:'Page (from 1)',pt:'Página',fr:'Page'} as const)[locale]}<input type="number" min={1} max={100} value={pdfImagePage} onChange={e=>setPdfImagePage(Number(e.target.value))}/></label>
 <label>{({es:'Texto original exacto',en:'Exact original text',pt:'Texto original exato',fr:'Texte original exact'} as const)[locale]}<input maxLength={120} value={pdfNativeOriginal} onChange={e=>setPdfNativeOriginal(e.target.value)}/></label>
 <label>{({es:'Texto nuevo (hasta 120 caracteres)',en:'New text (up to 120 characters)',pt:'Novo texto (até 120 caracteres)',fr:'Nouveau texte (120 caractères max.)'} as const)[locale]}<input maxLength={120} value={pdfNativeReplacement} onChange={e=>setPdfNativeReplacement(e.target.value)}/></label>
 <p>{({es:'Modifica directamente un objeto de texto PDF simple sin rasterizar. Fuentes estándar WinAnsi o TrueType incrustadas compatibles, coincidencia única y texto que no sea más ancho que el original. En fuentes incrustadas, los caracteres deben existir en su mapa Unicode. Permite acentos y diferente número de caracteres. Los PDF complejos se rechazan, sin modificar el original.',en:'Directly changes one simple native PDF text object. Standard WinAnsi or supported embedded TrueType fonts, a unique match and no increase in rendered width are required. Embedded Unicode glyphs must already exist in the font. Accents and variable character counts are supported when they fit.',pt:'Edita um único objeto WinAnsi ou TrueType incorporado compatível, com glifos Unicode já presentes e largura não superior ao original. Acentos e comprimentos diferentes são permitidos quando cabem.',fr:'Modifie un objet texte PDF natif simple. police WinAnsi ou TrueType intégrée compatible, correspondance unique, glyphes Unicode présents et largeur non supérieure à l’original. Accents et longueurs variables admis s’ils tiennent.'} as const)[locale]}</p>
 </div>}
 {files.length>0&&!result&&slug==='replace-pdf-image-native'&&<div className="pdf-option-panel">
 <label>{({es:'Imagen nueva (JPG/PNG/WebP, máximo 3 MB)',en:'Replacement image (JPG/PNG/WebP, up to 3 MB)',pt:'Imagem de substituição (máx. 3 MB)',fr:'Image de remplacement (3 Mo max.)'} as const)[locale]}
 <input type="file" accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp" onChange={e=>{const img=e.target.files?.[0]||null;setReplacementFile(img);}}/></label>
 <label>{({es:'Página del PDF (desde 1)',en:'PDF page (from 1)',pt:'Página PDF',fr:'Page PDF'} as const)[locale]}<input type="number" min={1} max={100} value={pdfImagePage} onChange={e=>setPdfImagePage(Number(e.target.value))}/></label>
 <label>{({es:'Número de imagen incrustada en esa página (desde 1)',en:'Embedded image number on that page (from 1)',pt:'Número da imagem incorporada',fr:'Numéro de l’image intégrée'} as const)[locale]}<input type="number" min={1} max={100} value={pdfImageIndex} onChange={e=>setPdfImageIndex(Number(e.target.value))}/></label>
 <p>{({es:'Sustituye un objeto de imagen original, no una capa superpuesta. No admite firmas ni formularios; el número corresponde al orden interno de imágenes y puede diferir del visual.',en:'Replaces an original embedded image object, not an overlay. Signed/form PDFs are excluded; image indices refer to the internal PDF order.',pt:'Substitui a imagem original, não uma sobreposição. Sem suporte para PDFs assinados ou formulários.',fr:'Remplace un véritable objet image. Les PDF signés et formulaires ne sont pas pris en charge.'} as const)[locale]}</p>
 </div>}
 {files.length>0&&!result&&slug==='ocr-pdf-professional'&&<p className="pdf-conversion-note">OCR de servidor en español e inglés. Reconstruye páginas escaneadas como imágenes con texto buscable; no conserva objetos editables, firmas ni formularios. Máximo 12 páginas.</p>}
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
 {files.length>0&&!result&&['server-trim-audio','server-trim-video','server-video-frame'].includes(slug)&&<div className="pdf-option-panel">
 <label>{({es:'Inicio (segundos)',en:'Start time (seconds)',pt:'Início (segundos)',fr:'Début (secondes)'} as const)[locale]}
 <input type="number" min={0} max={120} step={0.1} value={audioStartSeconds} onChange={e=>setAudioStartSeconds(Number(e.target.value))}/></label>
 {slug!=='server-video-frame'&&<label>{({es:'Fin del tramo (segundos)',en:'End time (seconds)',pt:'Fim (segundos)',fr:'Fin (secondes)'} as const)[locale]}
 <input type="number" min={0.1} max={120} step={0.1} value={audioEndSeconds??''} onChange={e=>setAudioEndSeconds(e.target.value===''?undefined:Number(e.target.value))} required/></label>}
 <p>{({es:'El intervalo debe estar dentro de la duración original. Máximo 120 segundos.',en:'The range must fit within the source duration. Maximum 120 seconds.',pt:'O trecho deve caber na duração original. Máximo 120 segundos.',fr:'La plage doit rester dans la durée d’origine. Maximum 120 secondes.'} as const)[locale]}</p>
 </div>}
 {files.length>0&&!result&&slug==='server-mixed-batch'&&<div className="pdf-option-panel">
 <label>{({es:'Preset del lote',en:'Batch preset',pt:'Preset do lote',fr:'Préréglage du lot'} as const)[locale]}
 <select value={batchPreset} onChange={e=>setBatchPreset(e.target.value as 'web-friendly'|'extract')}>
 <option value="web-friendly">{({es:'Optimizado para compartir',en:'Web-friendly',pt:'Otimizado para partilhar',fr:'Optimisé pour le partage'} as const)[locale]}</option>
 <option value="extract">{({es:'Extraer fotogramas y audio',en:'Extract frames and audio',pt:'Extrair quadros e áudio',fr:'Extraire images et audio'} as const)[locale]}</option></select></label>
 <p>{({es:'Hasta 6 archivos y 12 MB en total. El ZIP incluye manifest.json con el estado de cada archivo. No conserva los trabajos tras cerrar el navegador.',en:'Up to 6 files / 12 MB. ZIP includes a per-file status manifest. Jobs do not persist after closing the browser.',pt:'Até 6 arquivos / 12 MB. ZIP inclui estado por arquivo; não retoma após fechar o navegador.',fr:'6 fichiers / 12 Mo au maximum. ZIP avec état par fichier ; aucune reprise après fermeture.'} as const)[locale]}</p>
 </div>}
 {files.length>0&&!result&&['server-join-audio','server-join-video'].includes(slug)&&<p className="pdf-conversion-note">{({es:'Ordena los fragmentos con las flechas. Se unirán en el mismo orden. Se conservan las pistas de sonido; todos los vídeos deben incluir audio. Máximo 4 archivos y 120 segundos en total.',en:'Use the arrows to order clips. The join keeps soundtracks; all videos must contain audio. Up to 4 files and 120 seconds combined.',pt:'Ordene os clips com as setas. O som é conservado; todos os vídeos devem ter áudio. Até 4 ficheiros e 120 segundos.',fr:'Ordonnez les séquences avec les flèches. Les pistes audio sont conservées ; toutes les vidéos doivent avoir du son. 4 fichiers et 120 secondes maximum.'} as const)[locale]}</p>}
 {files.length>0&&!result&&slug==='server-gif-edit'&&<div className="pdf-option-panel">
 <label>{({es:'Primer fotograma (desde 1)',en:'First frame (from 1)',pt:'Primeiro quadro',fr:'Première image'} as const)[locale]}<input type="number" min={1} max={60} value={firstFrame} onChange={e=>setFirstFrame(Number(e.target.value))}/></label>
 <label>{({es:'Último fotograma (vacío = final)',en:'Last frame (blank = last)',pt:'Último quadro (vazio = fim)',fr:'Dernière image (vide = fin)'} as const)[locale]}<input type="number" min={1} max={60} value={lastFrame??''} onChange={e=>setLastFrame(e.target.value===''?undefined:Number(e.target.value))}/></label>
 <label>{({es:'Velocidad de reproducción',en:'Playback speed',pt:'Velocidade de reprodução',fr:'Vitesse de lecture'} as const)[locale]}<select value={gifSpeed} onChange={e=>setGifSpeed(Number(e.target.value))}><option value={0.5}>0,5×</option><option value={1}>1×</option><option value={1.5}>1,5×</option><option value={2}>2×</option></select></label>
 <p>{({es:'Conserva los fotogramas seleccionados y ajusta su duración al exportar WebP animado. Límite de 60 fotogramas.',en:'Exports selected frames with adjusted timings to animated WebP. Maximum 60 frames.',pt:'Exporta os quadros selecionados com duração ajustada para WebP animado, até 60.',fr:'Exportez les images sélectionnées avec durées ajustées en WebP animé, 60 maximum.'} as const)[locale]}</p>
 </div>}
 {files.length>0&&!result&&serverOnlyWorker&&<div className="fm-pro-engine-panel"><strong>Motor profesional privado</strong>
  {!workerReady?<p role="status">Servicio privado no habilitado. No se subirá ningún archivo.</p>:
   <><p>Máximo 3 MB. Se envía temporalmente al servidor para convertirlo. Se aplican cuotas y verificación.</p>
    <ProfessionalPdfOption key={workerVersion} siteKey={workerSiteKey} ready={workerReady} action="filemagik_worker" onToken={setWorkerToken} onReset={()=>setWorkerToken('')}/></>}
 </div>}
 {files.length>0&&!result&&serverOnlyOffice&&!engineReady&&<p role="status">Esta conversión necesita el motor Office profesional; no hay conversión local compatible.</p>}
 {files.length>0&&!result&&<div className="actions">{(tool.kind==='image'||slug==='images-to-pdf'||slug==='compress-pdf-raster')&&<label className="quality">{d.imageQuality}: {quality}% <input type="range" min="50" max="100" value={quality} onChange={e=>setQuality(Number(e.target.value))}/></label>}<button type="button" className="btn btn-primary" disabled={busy} onClick={run}>{busy?<LoaderCircle className="spin" size={18}/>:<ArrowRight size={18}/>} {busy?d.processing:d.convert}</button><button type="button" className="btn btn-ghost" disabled={busy} onClick={reset}>{d.reset}</button>{busy&&(slug==='batch-images-to-webp'||serverOnlyWorker)&&<button type="button" className="btn btn-ghost" onClick={()=>abortController.current?.abort()}>{({es:'Detener espera',en:'Stop waiting',pt:'Parar de esperar',fr:'Arrêter l’attente'} as const)[locale]}</button>}</div>}
 {busy&&serverOnlyWorker&&<p className="pdf-conversion-note">{({es:'Detener la espera no garantiza cancelar el procesamiento iniciado en el servidor.',en:'Stopping the wait does not guarantee that processing already started on the server will stop.',pt:'Parar de esperar não garante cancelar o processamento já iniciado no servidor.',fr:'Arrêter l’attente ne garantit pas l’annulation du traitement déjà commencé sur le serveur.'} as const)[locale]}</p>}
 {result&&<div className="conversion-complete" role="status" aria-live="polite" data-testid="conversion-success">
   <div className="conversion-complete-heading"><CheckCircle2 size={25} aria-hidden="true"/><div><h3>{messages.finished}</h3><p>{messages.ready}</p></div></div>
   <p className="conversion-complete-file"><strong>{messages.file}:</strong> <span>{result.name}</span></p>
   {downloadStarted&&<p className="conversion-download-notice" data-testid="download-notice"><Check size={17} aria-hidden="true"/>{messages.downloadStarted}</p>}
  </div>}
 {result&&<div className="actions"><a className="btn btn-primary" href={result.url} download={result.name} onClick={()=>setDownloadStarted(true)}><Download size={18}/>{messages.start}</a><button type="button" className="btn btn-ghost" disabled={busy} onClick={reset}><RotateCcw size={17}/>{d.reset}</button></div>}
 <p className="visually-hidden" role="status" aria-live="polite" aria-atomic="true">{status}</p>
 {error&&<p role="alert" className="error">{error}</p>}
 </div></section>;
}