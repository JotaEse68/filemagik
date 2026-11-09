'use client';
import {useEffect,useRef,useState} from 'react';
import {Download,Undo2,Redo2,Trash2,Type,Highlighter,Square,ChevronLeft,ChevronRight,FormInput,ListChecks,Eraser,Replace} from 'lucide-react';
import type {Locale} from '@/config/site';
import {exportVisualPdf,type VisualAnnotation} from '@/lib/pdf-visual-export';
import ProfessionalPdfOption from '@/components/professional-pdf-option';

type Tool='text'|'highlight'|'rectangle'|'form-text'|'form-checkbox'|'redact'|'replace';
type NativeText={id:string;text:string;x:number;y:number;width:number;height:number;page:number;rotated:boolean};
const words={
 es:{title:'Editor PDF visual',guide:'Sube un PDF, elige una herramienta y pulsa sobre la página. Arrastra los objetos para colocarlos. Deshacer y rehacer funcionan por operación.',upload:'Seleccionar PDF',text:'Texto',highlight:'Resaltar',rectangle:'Rectángulo',formText:'Campo de texto',formCheckbox:'Casilla',redact:'Borrar contenido real',replace:'Sustituir texto original',undo:'Deshacer',redo:'Rehacer',del:'Eliminar',save:'Exportar PDF',page:'Página',note:'Las anotaciones se superponen al PDF; no eliminan permanentemente texto ni equivalen a una firma digital. Las fuentes de texto se normalizan a caracteres compatibles.',placeholder:'Escribe la nota',error:'No se pudo procesar el PDF'},
 en:{title:'Visual PDF editor',guide:'Upload a PDF, choose a tool and click the page. Drag objects to move them. Undo and redo work per operation.',upload:'Choose PDF',text:'Text',highlight:'Highlight',rectangle:'Rectangle',formText:'Text field',formCheckbox:'Checkbox',redact:'Erase original content',replace:'Replace original text',undo:'Undo',redo:'Redo',del:'Delete',save:'Export PDF',page:'Page',note:'Annotations are overlays, not permanent redactions or digital signatures. Text is normalized for font compatibility.',placeholder:'Enter your note',error:'Could not process PDF'},
 pt:{title:'Editor visual de PDF',guide:'Escolha um PDF, selecione uma ferramenta, toque na página e arraste os objetos. Desfazer e refazer por operação.',upload:'Escolher PDF',text:'Texto',highlight:'Realçar',rectangle:'Retângulo',formText:'Campo de texto',formCheckbox:'Caixa',redact:'Remover conteúdo real',replace:'Substituir texto original',undo:'Desfazer',redo:'Refazer',del:'Excluir',save:'Exportar PDF',page:'Página',note:'As anotações não removem o texto original nem são assinaturas digitais.',placeholder:'Digite o texto',error:'Falha ao processar PDF'},
 fr:{title:'Éditeur PDF visuel',guide:'Choisissez un PDF et un outil, cliquez sur la page, puis faites glisser les objets. Annuler et rétablir par opération.',upload:'Choisir PDF',text:'Texte',highlight:'Surligner',rectangle:'Rectangle',formText:'Champ texte',formCheckbox:'Case à cocher',redact:'Effacer le contenu réel',replace:'Remplacer le texte original',undo:'Annuler',redo:'Rétablir',del:'Supprimer',save:'Exporter PDF',page:'Page',note:'Les annotations ne suppriment pas le contenu et ne sont pas des signatures numériques.',placeholder:'Votre texte',error:'Impossible de traiter le PDF'}
} as const;
export default function PdfVisualEditor({locale}:{locale:Locale}){
 const t=words[locale];
 const [file,setFile]=useState<File|null>(null),[page,setPage]=useState(1),[total,setTotal]=useState(0),[tool,setTool]=useState<Tool>('text'),[message,setMessage]=useState(''),[busy,setBusy]=useState(false),[zoom,setZoom]=useState(100);
 const [content,setContent]=useState('Example'),[color,setColor]=useState('#f7d154'),[selected,setSelected]=useState<string|null>(null);
 const [history,setHistory]=useState<VisualAnnotation[][]>([[]]),[cursor,setCursor]=useState(0),[draft,setDraft]=useState<VisualAnnotation[]|null>(null);
 const [nativeText,setNativeText]=useState<NativeText[]>([]);
 const [engineReady,setEngineReady]=useState(false),[siteKey,setSiteKey]=useState('');
 const [challengeRequired,setChallengeRequired]=useState(false);
 const [challengeToken,setChallengeToken]=useState(''),[challengeVersion,setChallengeVersion]=useState(0);
 useEffect(()=>{let active=true;
  void fetch('/api/pdf-engine',{cache:'no-store'}).then(r=>r.json()).then((v:{available?:boolean;siteKey?:string|null;challengeRequired?:boolean})=>{
   if(active&&v.available===true){setEngineReady(true);setSiteKey(v.siteKey||'');setChallengeRequired(v.challengeRequired===true);}
  }).catch(()=>{});
  return()=>{active=false;};
 },[]);
 const source=history[cursor]??[],items=draft??source;
 const selectedItem=items.find(item=>item.id===selected);
 const hasRedactions=source.some(a=>a.kind==='redact');
 function editSelected(changes:Partial<VisualAnnotation>){if(!selected)return;commit(source.map(item=>item.id===selected?{...item,...changes}:item));}
 function duplicateSelected(){if(!selectedItem)return;const clone={...selectedItem,id:crypto.randomUUID(),x:Math.min(.9,selectedItem.x+.04),y:Math.min(.9,selectedItem.y+.04)};commit([...source,clone]);setSelected(clone.id);}

 const canvas=useRef<HTMLCanvasElement>(null),pdfRef=useRef<import('pdfjs-dist').PDFDocumentProxy|null>(null);
 const drag=useRef<{id:string;startX:number;startY:number;originX:number;originY:number;original:VisualAnnotation[]}|null>(null);
 function commit(next:VisualAnnotation[]){setHistory(old=>[...old.slice(0,cursor+1),next]);setCursor(c=>c+1);setDraft(null);}
 useEffect(()=>{let canceled=false;
  async function open(){
   if(!file){setTotal(0);return;}
   setMessage('');setPage(1);setSelected(null);setHistory([[]]);setCursor(0);
   try{
    const pdfjs=await import('pdfjs-dist');
    pdfjs.GlobalWorkerOptions.workerSrc=new URL('pdfjs-dist/build/pdf.worker.min.mjs',import.meta.url).toString();
    const pdf=await pdfjs.getDocument({data:new Uint8Array(await file.arrayBuffer())}).promise;
    if(canceled){void pdf.cleanup();return;}
    if(pdf.numPages>150){void pdf.cleanup();throw new Error('Maximum 150 pages');}
    pdfRef.current=pdf;setTotal(pdf.numPages);
   }catch(e){if(!canceled)setMessage(e instanceof Error?e.message:t.error);}
  }
  void open();return()=>{canceled=true;const old=pdfRef.current;pdfRef.current=null;if(old)void old.cleanup();};
 },[file,t.error]);
 useEffect(()=>{let canceled=false;const pdf=pdfRef.current,element=canvas.current;if(!pdf||!element||total===0)return;
  async function render(){
   if(!pdf||!element)return;
   try{const p=await pdf.getPage(page);const viewport=p.getViewport({scale:1.35});if(canceled)return;
    const extracted=await p.getTextContent();
    const native:NativeText[]=extracted.items.filter((it):it is Extract<typeof it,{str:string}>=>'str' in it&&it.str.trim().length>0).slice(0,500).map((it,i)=>{
      const tx=pdfjs.Util.transform(viewport.transform,it.transform);
      const h=Math.max(5,Math.hypot(tx[2],tx[3]));
      return {id:`${page}-${i}`,text:it.str,page,x:Math.max(0,tx[4]/viewport.width),
       y:Math.max(0,(tx[5]-h)/viewport.height),width:Math.max(.008,Math.min(.95,it.width*viewport.scale/viewport.width)),
       height:Math.max(.008,Math.min(.12,h/viewport.height)),rotated:p.rotate%360!==0};
    });
    if(!canceled)setNativeText(native);
    element.width=Math.round(viewport.width);element.height=Math.round(viewport.height);
    const ctx=element.getContext('2d');if(!ctx)throw new Error('Canvas unavailable');
    await p.render({canvas:element,canvasContext:ctx,viewport}).promise;
    p.cleanup();
   }catch(e){if(!canceled)setMessage(e instanceof Error?e.message:t.error);}
  }
  void render();return()=>{canceled=true};
 },[file,page,total,t.error]);
 function position(event:React.PointerEvent<HTMLElement>){const rect=event.currentTarget.getBoundingClientRect();return {x:Math.max(0,Math.min(1,(event.clientX-rect.left)/rect.width)),y:Math.max(0,Math.min(1,(event.clientY-rect.top)/rect.height))};}
 function insert(event:React.MouseEvent<HTMLDivElement>){if(!file||!total||drag.current||tool==='replace')return;
  if((event.target as HTMLElement).closest('[data-pdf-overlay]'))return;
  const rect=event.currentTarget.getBoundingClientRect();
  const x=Math.max(0,Math.min(.9,(event.clientX-rect.left)/rect.width)),y=Math.max(0,Math.min(.9,(event.clientY-rect.top)/rect.height));
  const id=crypto.randomUUID();
  const item:VisualAnnotation={id,page,kind:tool,x,y,width:(tool==='text'||tool==='form-text')?.18:.22,height:(tool==='text'||tool==='form-text')?.045:.07,text:content,color,fontSize:14};
  if((tool==='text'||tool==='form-text')&&!content.trim()){setMessage(t.placeholder);return;}
  commit([...source,item]);setSelected(id);
 }
 function replaceNative(event:React.MouseEvent<HTMLButtonElement>,original:NativeText){
  event.preventDefault();event.stopPropagation();
  if(!engineReady){setMessage('El reemplazo requiere el motor profesional.');return;}
  if(original.rotated){setMessage('Esta página está girada; primero normaliza su rotación antes de sustituir el texto.');return;}
  const width=Math.min(.98-original.x,original.width+.012),height=Math.min(.95-original.y,original.height+.009);
  const redact:VisualAnnotation={id:crypto.randomUUID(),page:original.page,kind:'redact',
    x:Math.max(0,original.x-.004),y:Math.max(0,original.y-.004),width,height,
    text:'',color:'#ffffff',fontSize:11};
  const replacement:VisualAnnotation={id:crypto.randomUUID(),page:original.page,kind:'text',
    x:Math.max(0,original.x),y:Math.max(0,original.y),width:Math.max(.09,width),height,
    text:original.text,color:'#101827',fontSize:Math.max(8,Math.min(22,Math.round(height*800*.6)))};
  commit([...source,redact,replacement]);setSelected(replacement.id);
  setMessage('Edita el texto seleccionado; al exportar se eliminará el contenido anterior, no se tapará visualmente.');
 }
 function begin(event:React.PointerEvent<HTMLDivElement>,item:VisualAnnotation){
  event.stopPropagation();event.preventDefault();setSelected(item.id);
  const rect=event.currentTarget.parentElement?.getBoundingClientRect();if(!rect)return;
  drag.current={id:item.id,startX:event.clientX/rect.width,startY:event.clientY/rect.height,originX:item.x,originY:item.y,original:source};
  event.currentTarget.setPointerCapture(event.pointerId);
 }
 function move(event:React.PointerEvent<HTMLDivElement>){if(!drag.current)return;
  const rect=event.currentTarget.parentElement?.getBoundingClientRect();if(!rect)return;
  const d=drag.current;
  const dx=event.clientX/rect.width-d.startX,dy=event.clientY/rect.height-d.startY;
  setDraft(d.original.map(a=>a.id===d.id?{...a,x:Math.max(0,Math.min(.97,d.originX+dx)),y:Math.max(0,Math.min(.97,d.originY+dy))}:a));
 }
 function end(){if(!drag.current)return;drag.current=null;if(draft)commit(draft);}
 async function download(){if(!file||busy)return;
  if(hasRedactions&&!window.confirm('Esta acción borrará permanentemente el contenido seleccionado de la copia exportada. ¿Continuar?'))return;
  setBusy(true);setMessage('');
  try{
   let input=file;
   if(hasRedactions){
    if(!engineReady||challengeRequired&&!challengeToken)throw new Error('La eliminación permanente requiere un motor profesional disponible y, cuando está activada, verificación válida.');
    const regions=source.filter(a=>a.kind==='redact').map(a=>({page:a.page,x:a.x,y:a.y,width:a.width,height:a.height}));
    const data=new FormData();data.set('file',file);data.set('turnstile',challengeToken);data.set('regions',JSON.stringify(regions));
    const response=await fetch('/api/pdf-engine?operation=redact-pdf',{method:'POST',body:data,cache:'no-store'});
    if(!response.ok){const reason=await response.json().catch(()=>({error:'Error al borrar contenido'}));throw new Error(reason.error||'Error al borrar contenido');}
    input=new File([await response.blob()],file.name,{type:'application/pdf'});
   }
   const out=await exportVisualPdf(input,source.filter(a=>a.kind!=='redact'));
   const url=URL.createObjectURL(out.blob);
   const a=document.createElement('a');a.href=url;a.download=out.name;a.click();
   setTimeout(()=>URL.revokeObjectURL(url),30000);
  }catch(e){setMessage(e instanceof Error?e.message:t.error)}
  finally{setBusy(false);if(hasRedactions){setChallengeToken('');setChallengeVersion(v=>v+1);}}
 }
 return <section className="fm-pdf-visual"><h2>{t.title}</h2><p>{t.guide}</p><label className="fm-editor-file">{t.upload}<input type="file" accept=".pdf,application/pdf" onChange={e=>{const selected=e.target.files?.[0];if(selected){if(selected.size>60*1024*1024){setMessage('Maximum 60 MB');return;}setFile(selected)}}}/></label>
 {file&&total>0&&<><div className="fm-editor-toolbar">
 {([['text',Type,t.text],['highlight',Highlighter,t.highlight],['rectangle',Square,t.rectangle],['form-text',FormInput,t.formText],['form-checkbox',ListChecks,t.formCheckbox],['redact',Eraser,t.redact],['replace',Replace,t.replace]] as const).map(([id,Icon,label])=><button key={id} aria-pressed={tool===id} title={id==='redact'&&!engineReady?'Requiere motor profesional':''} disabled={(id==='redact'||id==='replace')&&!engineReady} className={tool===id?'is-active':''} onClick={()=>setTool(id)}><Icon size={17}/>{label}</button>)}
 <input aria-label="Color" type="color" value={color} onChange={e=>setColor(e.target.value)}/><label>Zoom <select value={zoom} onChange={e=>setZoom(+e.target.value)}><option value={75}>75%</option><option value={100}>100%</option><option value={125}>125%</option><option value={150}>150%</option></select></label>
 <button disabled={cursor===0} onClick={()=>{setCursor(c=>c-1);setDraft(null)}}><Undo2 size={17}/>{t.undo}</button>
 <button disabled={cursor>=history.length-1} onClick={()=>{setCursor(c=>c+1);setDraft(null)}}><Redo2 size={17}/>{t.redo}</button>
 <button disabled={!selected} onClick={()=>{commit(source.filter(a=>a.id!==selected));setSelected(null)}}><Trash2 size={17}/>{t.del}</button>
 </div>
 {(tool==='text'||tool==='form-text')&&<label className="fm-editor-text">{t.text}<input value={content} maxLength={180} placeholder={t.placeholder} onChange={e=>setContent(e.target.value)}/></label>}
 {selectedItem&&<div className="fm-editor-selection"><strong>Editar objeto seleccionado</strong>
 {(selectedItem.kind==='text'||selectedItem.kind==='form-text')&&<label>Texto <input value={selectedItem.text} maxLength={180} onChange={e=>editSelected({text:e.target.value})}/></label>}
 <label>Ancho <input type="range" min="4" max="90" value={Math.round(selectedItem.width*100)} onChange={e=>editSelected({width:Number(e.target.value)/100})}/></label>
 <label>Alto <input type="range" min="2" max="65" value={Math.round(selectedItem.height*100)} onChange={e=>editSelected({height:Number(e.target.value)/100})}/></label>
 {selectedItem.kind==='text'&&<label>Fuente <input type="number" min="8" max="36" value={selectedItem.fontSize} onChange={e=>editSelected({fontSize:Number(e.target.value)})}/></label>}
 <button type="button" onClick={duplicateSelected}>Duplicar objeto</button>
 <button type="button" onClick={()=>{setSelected(null);}}>Deseleccionar</button>
 </div>}
 <div className="fm-editor-pages"><button disabled={page<=1} onClick={()=>{setPage(p=>p-1);setSelected(null)}} aria-label="Previous page"><ChevronLeft/></button>{t.page} {page} / {total}<button disabled={page>=total} onClick={()=>{setPage(p=>p+1);setSelected(null)}} aria-label="Next page"><ChevronRight/></button></div>
 <div className="fm-editor-scroll"><div className="fm-editor-sheet" style={{width:`${zoom}%`}} onClick={insert}>
 <canvas ref={canvas} aria-label="PDF page preview"/>
 {tool==='replace'&&nativeText.filter(it=>it.page===page).map(it=><button type="button" key={it.id}
   className="fm-native-text-target" title={it.text} aria-label={'Sustituir texto: '+it.text}
   style={{left:it.x*100+'%',top:it.y*100+'%',width:it.width*100+'%',height:it.height*100+'%'}}
   onClick={e=>replaceNative(e,it)}/>)}

 {items.filter(a=>a.page===page).map(a=><div key={a.id} data-pdf-overlay="true" role="button" tabIndex={0} aria-label={a.kind+' annotation'} className={'fm-editor-overlay '+(selected===a.id?'is-selected':'')} style={{left:(a.x*100)+'%',top:(a.y*100)+'%',width:(a.width*100)+'%',height:(a.height*100)+'%',borderColor:a.color,background:a.kind==='redact'?'#181818d9':a.kind==='highlight'?a.color+'66':'transparent',color:a.color}} onPointerDown={e=>begin(e,a)} onPointerMove={move} onPointerUp={end} onPointerCancel={end} onKeyDown={e=>{if(e.key==='Delete'||e.key==='Backspace'){commit(source.filter(x=>x.id!==a.id));setSelected(null);}}}>{a.kind==='text'||a.kind==='form-text'?a.text:a.kind==='form-checkbox'?'☐':a.kind==='redact'?'BORRAR':null}</div>)}
 </div></div>{hasRedactions&&engineReady&&<div className="fm-pro-engine-panel"><strong>Eliminación permanente verificada</strong><p>Selecciona regiones de contenido original. No se puede deshacer después de descargar el resultado; se verifica el acceso antes de enviar el documento al motor.</p>{challengeRequired&&<ProfessionalPdfOption key={challengeVersion} siteKey={siteKey} ready={engineReady} onToken={setChallengeToken} onReset={()=>setChallengeToken('')}/>}</div>}<div className="fm-editor-actions"><button className="btn btn-primary" onClick={download} disabled={busy}><Download size={18}/>{busy?'…':t.save}</button><span>{source.length} annotations</span></div></>}
 <p className="fm-editor-note">{t.note}</p>{message&&<p role="alert" className="error">{message}</p>}</section>;
}
