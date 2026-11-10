'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import {Download,ImagePlus,RotateCcw,Undo2,Redo2,WandSparkles} from 'lucide-react';
import type {Locale} from '@/config/site';
import {healRectangle,healBrushStroke,normalizeArea,type Area} from '@/lib/image-heal';

type Point={x:number;y:number};
const copies={
 en:{load:'Choose an image or screenshot',select:'Draw a rectangle around the area you want to remove',apply:'Clean selected area',undo:'Undo',redo:'Redo',reset:'Reset',download:'Download PNG',tip:'Works best for small overlays on simple backgrounds. Complex detail cannot be reconstructed perfectly.',error:'Unable to open image',authorized:'Edit images you own or have permission to modify.'},
 es:{load:'Selecciona una imagen o captura',select:'Dibuja un rectángulo sobre la zona que quieres eliminar',apply:'Limpiar zona seleccionada',undo:'Deshacer',redo:'Rehacer',reset:'Restablecer',download:'Descargar PNG',tip:'Funciona mejor con marcas pequeñas sobre fondos sencillos. No recupera perfectamente detalles complejos.',error:'No se pudo abrir la imagen',authorized:'Edita imágenes propias o con autorización.'},
 pt:{load:'Selecione uma imagem ou captura',select:'Desenhe um retângulo na área que deseja remover',apply:'Limpar área selecionada',undo:'Desfazer',redo:'Refazer',reset:'Restaurar',download:'Baixar PNG',tip:'Melhor para pequenas sobreposições em fundos simples. Detalhes complexos não são reconstruídos perfeitamente.',error:'Não foi possível abrir a imagem',authorized:'Edite apenas imagens próprias ou autorizadas.'},
 fr:{load:'Choisissez une image ou capture',select:'Tracez un rectangle sur la zone à retirer',apply:'Nettoyer la zone',undo:'Annuler',redo:'Rétablir',reset:'Réinitialiser',download:'Télécharger PNG',tip:'Idéal pour les petites zones sur fonds simples. Les détails complexes ne peuvent pas être parfaitement reconstruits.',error:'Impossible d’ouvrir l’image',authorized:'Modifiez uniquement vos images ou celles pour lesquelles vous avez une autorisation.'}
} as const;

export default function ImageCleanup({locale}:{locale:Locale}){
 const copy=copies[locale],input=useRef<HTMLInputElement>(null),canvas=useRef<HTMLCanvasElement>(null);
 const original=useRef<ImageData|null>(null),history=useRef<ImageData[]>([]),future=useRef<ImageData[]>([]);
 const start=useRef<Point|null>(null),preview=useRef<ImageData|null>(null),base=useRef<ImageData|null>(null);
 const stroke=useRef<Point[]>([]);
 const [mode,setMode]=useState<'rectangle'|'brush'>('rectangle'),[brushSize,setBrushSize]=useState(8);
 const [selection,setSelection]=useState<Area|null>(null),[loaded,setLoaded]=useState(false),[error,setError]=useState('');
 const [historySize,setHistorySize]=useState(0),[redoSize,setRedoSize]=useState(0),[zoom,setZoom]=useState(100);
 const [name,setName]=useState('cleaned-image');
 const [downloadName,setDownloadName]=useState('');
 const [format,setFormat]=useState<'png'|'jpeg'|'webp'>('png'),[showOriginal,setShowOriginal]=useState(false);
 const coords=(e:React.PointerEvent<HTMLCanvasElement>):Point=>{
  const el=canvas.current!,rect=el.getBoundingClientRect();
  return {x:(e.clientX-rect.left)*el.width/rect.width,y:(e.clientY-rect.top)*el.height/rect.height};
 };
 const drawSelection=useCallback((area:Area|null,base?:ImageData|null)=>{
  const el=canvas.current,ctx=el?.getContext('2d',{willReadFrequently:true});if(!ctx||!el)return;
  if(base)ctx.putImageData(base,0,0);
  if(area&&area.width>1&&area.height>1){ctx.strokeStyle='#8cf5ff';ctx.lineWidth=Math.max(1,el.width/600);ctx.setLineDash([8,5]);ctx.strokeRect(area.x,area.y,area.width,area.height);ctx.setLineDash([]);}
 },[]);
 async function openFile(file:File){
  setError('');if(!/^image\/(png|jpeg|webp)$/.test(file.type)||file.size>60*1024*1024){setError(copy.error);return;}
  let bitmap:ImageBitmap|null=null;
  try{
   bitmap=await createImageBitmap(file);
   if(bitmap.width*bitmap.height>24_000_000)throw new Error(copy.error);
   const el=canvas.current!;el.width=bitmap.width;el.height=bitmap.height;
   const ctx=el.getContext('2d',{willReadFrequently:true})!;
   ctx.drawImage(bitmap,0,0);original.current=ctx.getImageData(0,0,el.width,el.height);
   history.current=[];future.current=[];setHistorySize(0);setRedoSize(0);setZoom(100);setSelection(null);setLoaded(true);setName(file.name.replace(/\.[^.]+$/,'')+'-cleaned');setShowOriginal(false);
  }catch(e){setError(e instanceof Error?e.message:copy.error);}finally{bitmap?.close();}
 }
 function begin(e:React.PointerEvent<HTMLCanvasElement>){if(!loaded||showOriginal)return;const el=canvas.current!;el.setPointerCapture(e.pointerId);const ctx=el.getContext('2d',{willReadFrequently:true})!;if(base.current)ctx.putImageData(base.current,0,0);start.current=coords(e);preview.current=ctx.getImageData(0,0,el.width,el.height);base.current=preview.current;stroke.current=[start.current];setSelection(null);}
 function move(e:React.PointerEvent<HTMLCanvasElement>){if(!start.current||!preview.current)return;const point=coords(e),el=canvas.current!;if(mode==='brush'){const previous=stroke.current.at(-1)!;if(Math.hypot(point.x-previous.x,point.y-previous.y)>brushSize*.8&&stroke.current.length<40)stroke.current.push(point);const ctx=el.getContext('2d')!;ctx.putImageData(preview.current,0,0);ctx.strokeStyle='#8cf5ff';ctx.lineWidth=Math.max(2,brushSize*2);ctx.lineCap='round';ctx.beginPath();stroke.current.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.stroke();return;}const rect=normalizeArea(start.current,point,el.width,el.height);drawSelection(rect,preview.current);}
 function finish(e:React.PointerEvent<HTMLCanvasElement>){if(!start.current||!preview.current)return;const point=coords(e),el=canvas.current!;if(mode==='brush'){const ctx=el.getContext('2d',{willReadFrequently:true})!;const before=preview.current;ctx.putImageData(before,0,0);try{const points=[...stroke.current,point].slice(0,40);const result=healBrushStroke(before,points,brushSize);history.current=[...history.current.slice(-9),before];future.current=[];setHistorySize(history.current.length);setRedoSize(0);ctx.putImageData(result,0,0);base.current=null;setError('');}catch(err){setError(err instanceof Error?err.message:copy.error);base.current=before;}stroke.current=[];start.current=null;preview.current=null;return;}const rect=normalizeArea(start.current,point,el.width,el.height);drawSelection(rect,preview.current);setSelection(rect);start.current=null;preview.current=null;}
 function apply(){ensureEditedPreview();
  const el=canvas.current,ctx=el?.getContext('2d',{willReadFrequently:true});
  if(!ctx||!el||!selection)return;
  try{
   const current=base.current??ctx.getImageData(0,0,el.width,el.height);
   const result=healRectangle(current,selection);
   history.current=[...history.current.slice(-9),current];future.current=[];setHistorySize(history.current.length);setRedoSize(0);
   ctx.putImageData(result,0,0);base.current=null;setSelection(null);setError('');
  }catch(e){setError(e instanceof Error?e.message:copy.error);}
 }
 function undo(){ensureEditedPreview();const ctx=canvas.current?.getContext('2d',{willReadFrequently:true});const previous=history.current.pop();if(previous&&ctx&&canvas.current){future.current=[...future.current.slice(-9),ctx.getImageData(0,0,canvas.current.width,canvas.current.height)];ctx.putImageData(previous,0,0);setHistorySize(history.current.length);setRedoSize(future.current.length);base.current=null;setSelection(null);}}
 function redo(){ensureEditedPreview();const ctx=canvas.current?.getContext('2d',{willReadFrequently:true});const next=future.current.pop();if(next&&ctx&&canvas.current){history.current=[...history.current.slice(-9),ctx.getImageData(0,0,canvas.current.width,canvas.current.height)];ctx.putImageData(next,0,0);setHistorySize(history.current.length);setRedoSize(future.current.length);base.current=null;setSelection(null);}}
 function reset(){ensureEditedPreview();const initial=original.current;if(initial){canvas.current?.getContext('2d')?.putImageData(initial,0,0);history.current=[];future.current=[];setHistorySize(0);setRedoSize(0);base.current=null;setSelection(null);}}
 function download(){const el=canvas.current;if(!el)return;if(base.current)el.getContext('2d')?.putImageData(base.current,0,0);const type=format==='jpeg'?'image/jpeg':format==='webp'?'image/webp':'image/png';const url=el.toDataURL(type,.9);const anchor=document.createElement('a');anchor.href=url;anchor.download=name+'.'+(format==='jpeg'?'jpg':format);anchor.click();setDownloadName(anchor.download);}
 function toggleOriginal(){const el=canvas.current,ctx=el?.getContext('2d',{willReadFrequently:true});if(!el||!ctx||!original.current)return;if(!showOriginal){const current=base.current??ctx.getImageData(0,0,el.width,el.height);preview.current=current;ctx.putImageData(original.current,0,0);setShowOriginal(true);}else{if(preview.current)ctx.putImageData(preview.current,0,0);setShowOriginal(false);preview.current=null;}}
 function ensureEditedPreview(){if(showOriginal){const ctx=canvas.current?.getContext('2d');if(ctx&&preview.current)ctx.putImageData(preview.current,0,0);setShowOriginal(false);preview.current=null;}}

 useEffect(()=>()=>{original.current=null;history.current=[];future.current=[]},[]);
 return <section className="image-cleanup">
  <input ref={input} type="file" accept="image/png,image/jpeg,image/webp" className="visually-hidden" onChange={e=>{const f=e.target.files?.[0];if(f)void openFile(f);}}/>
  <div className="image-cleanup-toolbar">
   <button className="btn btn-primary" onClick={()=>input.current?.click()}><ImagePlus size={17}/>{copy.load}</button>
   <label className="image-export-select">{({es:'Herramienta',en:'Tool',pt:'Ferramenta',fr:'Outil'} as const)[locale]} <select aria-label="Herramienta de retoque" value={mode} onChange={e=>{setMode(e.target.value as 'rectangle'|'brush');setSelection(null);}}><option value="rectangle">{({es:'Zona rectangular',en:'Rectangle',pt:'Área retangular',fr:'Rectangle'} as const)[locale]}</option><option value="brush">{({es:'Pincel corrector',en:'Healing brush',pt:'Pincel de retoque',fr:'Pinceau correcteur'} as const)[locale]}</option></select></label>
   {mode==='brush'&&<label className="image-export-select">{({es:'Tamaño de pincel',en:'Brush size',pt:'Tamanho do pincel',fr:'Taille du pinceau'} as const)[locale]} <input aria-label="Tamaño de pincel" type="range" min="3" max="20" value={brushSize} onChange={e=>setBrushSize(Number(e.target.value))}/>{brushSize}px</label>}
   <button className="btn btn-ghost" disabled={!selection} onClick={apply}><WandSparkles size={17}/>{copy.apply}</button>
   <button className="btn btn-ghost" disabled={!historySize} onClick={undo}><Undo2 size={17}/>{copy.undo}</button>
   <button className="btn btn-ghost" disabled={!redoSize} onClick={redo}><Redo2 size={17}/>{copy.redo}</button>
   <button className="btn btn-ghost" disabled={!loaded} onClick={reset}><RotateCcw size={17}/>{copy.reset}</button>
   <button className="btn btn-ghost" disabled={!loaded||!historySize} onClick={toggleOriginal}>{showOriginal?'After / Después':'Before / Antes'}</button>
   <label className="image-export-select">Zoom <select aria-label="Zoom imagen" value={zoom} onChange={e=>setZoom(Number(e.target.value))}><option value={100}>100%</option><option value={150}>150%</option><option value={200}>200%</option></select></label>
   <label className="image-export-select">Formato <select value={format} onChange={e=>setFormat(e.target.value as 'png'|'jpeg'|'webp')}><option value="png">PNG</option><option value="jpeg">JPG</option><option value="webp">WebP</option></select></label>
   <button className="btn btn-primary" disabled={!loaded||showOriginal} onClick={download}><Download size={17}/>{copy.download.replace('PNG',format==='jpeg'?'JPG':format.toUpperCase())}</button>
  </div>
  <p>{mode==='brush'?({es:'Pinta trazos cortos sobre los detalles que quieres corregir. Máximo 4 megapíxeles por imagen.',en:'Brush over small details in short strokes. Maximum 4 megapixels per image.',pt:'Pinte traços curtos nos detalhes a corrigir. Máximo de 4 megapixels por imagem.',fr:'Passez le pinceau par petites touches. Maximum 4 mégapixels par image.'} as const)[locale]:copy.select}</p>
  <div className="image-cleanup-stage" style={zoom>100?{justifyContent:'flex-start'}:undefined}><canvas ref={canvas} className={loaded?'image-cleanup-canvas':'image-cleanup-empty'} style={{display:loaded?'block':'none',maxWidth:zoom===100?'100%':'none',width:zoom+'%',flexShrink:0}} onPointerDown={begin} onPointerMove={move} onPointerUp={finish} onPointerCancel={finish}/>{!loaded&&<span>{copy.load}</span>}</div>
  {downloadName&&<div className="conversion-complete" role="status" data-testid="conversion-success"><div className="conversion-complete-heading"><Download size={22} aria-hidden="true"/><div><h3>{({es:'¡Imagen exportada!',en:'Image export requested!',pt:'Imagem exportada!',fr:'Image exportée !'} as const)[locale]}</h3><p>{({es:'La descarga se ha solicitado. Comprueba la carpeta de descargas de tu navegador.',en:'Download requested. Check your browser downloads.',pt:'Transferência solicitada. Consulte as transferências do navegador.',fr:'Téléchargement demandé. Vérifiez les téléchargements du navigateur.'} as const)[locale]}</p></div></div><p className="conversion-complete-file">{downloadName}</p></div>}
  {error&&<p role="alert" className="error">{error}</p>}
  <p className="image-cleanup-note">{copy.tip} {copy.authorized}</p>
 </section>;
}