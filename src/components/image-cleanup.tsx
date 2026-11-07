'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import {Download,ImagePlus,RotateCcw,Undo2,WandSparkles} from 'lucide-react';
import type {Locale} from '@/config/site';
import {healRectangle,normalizeArea,type Area} from '@/lib/image-heal';

type Point={x:number;y:number};
const copies={
 en:{load:'Choose an image or screenshot',select:'Draw a rectangle around the area you want to remove',apply:'Clean selected area',undo:'Undo',reset:'Reset',download:'Download PNG',tip:'Works best for small overlays on simple backgrounds. Complex detail cannot be reconstructed perfectly.',error:'Unable to open image',authorized:'Edit images you own or have permission to modify.'},
 es:{load:'Selecciona una imagen o captura',select:'Dibuja un rectángulo sobre la zona que quieres eliminar',apply:'Limpiar zona seleccionada',undo:'Deshacer',reset:'Restablecer',download:'Descargar PNG',tip:'Funciona mejor con marcas pequeñas sobre fondos sencillos. No recupera perfectamente detalles complejos.',error:'No se pudo abrir la imagen',authorized:'Edita imágenes propias o con autorización.'},
 pt:{load:'Selecione uma imagem ou captura',select:'Desenhe um retângulo na área que deseja remover',apply:'Limpar área selecionada',undo:'Desfazer',reset:'Restaurar',download:'Baixar PNG',tip:'Melhor para pequenas sobreposições em fundos simples. Detalhes complexos não são reconstruídos perfeitamente.',error:'Não foi possível abrir a imagem',authorized:'Edite apenas imagens próprias ou autorizadas.'},
 fr:{load:'Choisissez une image ou capture',select:'Tracez un rectangle sur la zone à retirer',apply:'Nettoyer la zone',undo:'Annuler',reset:'Réinitialiser',download:'Télécharger PNG',tip:'Idéal pour les petites zones sur fonds simples. Les détails complexes ne peuvent pas être parfaitement reconstruits.',error:'Impossible d’ouvrir l’image',authorized:'Modifiez uniquement vos images ou celles pour lesquelles vous avez une autorisation.'}
} as const;

export default function ImageCleanup({locale}:{locale:Locale}){
 const copy=copies[locale],input=useRef<HTMLInputElement>(null),canvas=useRef<HTMLCanvasElement>(null);
 const original=useRef<ImageData|null>(null),history=useRef<ImageData[]>([]);
 const start=useRef<Point|null>(null),preview=useRef<ImageData|null>(null);
 const [selection,setSelection]=useState<Area|null>(null),[loaded,setLoaded]=useState(false),[error,setError]=useState('');
 const [historySize,setHistorySize]=useState(0);
 const [name,setName]=useState('cleaned-image.png');
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
  setError('');if(!/^image\/(png|jpeg|webp)$/.test(file.type)||file.size>25*1024*1024){setError(copy.error);return;}
  let bitmap:ImageBitmap|null=null;
  try{
   bitmap=await createImageBitmap(file);
   if(bitmap.width*bitmap.height>24_000_000)throw new Error(copy.error);
   const el=canvas.current!;el.width=bitmap.width;el.height=bitmap.height;
   const ctx=el.getContext('2d',{willReadFrequently:true})!;
   ctx.drawImage(bitmap,0,0);original.current=ctx.getImageData(0,0,el.width,el.height);
   history.current=[];setHistorySize(0);setSelection(null);setLoaded(true);setName(file.name.replace(/\.[^.]+$/,'')+'-cleaned.png');
  }catch(e){setError(e instanceof Error?e.message:copy.error);}finally{bitmap?.close();}
 }
 function begin(e:React.PointerEvent<HTMLCanvasElement>){if(!loaded)return;const el=canvas.current!;el.setPointerCapture(e.pointerId);start.current=coords(e);preview.current=el.getContext('2d',{willReadFrequently:true})!.getImageData(0,0,el.width,el.height);setSelection(null);}
 function move(e:React.PointerEvent<HTMLCanvasElement>){if(!start.current||!preview.current)return;const point=coords(e),el=canvas.current!;const rect=normalizeArea(start.current,point,el.width,el.height);drawSelection(rect,preview.current);}
 function finish(e:React.PointerEvent<HTMLCanvasElement>){if(!start.current||!preview.current)return;const point=coords(e),el=canvas.current!;const rect=normalizeArea(start.current,point,el.width,el.height);drawSelection(rect,preview.current);setSelection(rect);start.current=null;preview.current=null;}
 function apply(){
  const el=canvas.current,ctx=el?.getContext('2d',{willReadFrequently:true});
  if(!ctx||!el||!selection)return;
  try{
   const current=ctx.getImageData(0,0,el.width,el.height);
   const result=healRectangle(current,selection);
   history.current=[...history.current.slice(-9),current];setHistorySize(history.current.length);
   ctx.putImageData(result,0,0);setSelection(null);setError('');
  }catch(e){setError(e instanceof Error?e.message:copy.error);}
 }
 function undo(){const previous=history.current.pop();if(previous){canvas.current?.getContext('2d')?.putImageData(previous,0,0);setHistorySize(history.current.length);setSelection(null);}}
 function reset(){const initial=original.current;if(initial){canvas.current?.getContext('2d')?.putImageData(initial,0,0);history.current=[];setHistorySize(0);setSelection(null);}}
 function download(){const el=canvas.current;if(!el)return;const url=el.toDataURL('image/png');const anchor=document.createElement('a');anchor.href=url;anchor.download=name;anchor.click();}
 useEffect(()=>()=>{original.current=null;history.current=[]},[]);
 return <section className="image-cleanup">
  <input ref={input} type="file" accept="image/png,image/jpeg,image/webp" className="visually-hidden" onChange={e=>{const f=e.target.files?.[0];if(f)void openFile(f);}}/>
  <div className="image-cleanup-toolbar">
   <button className="btn btn-primary" onClick={()=>input.current?.click()}><ImagePlus size={17}/>{copy.load}</button>
   <button className="btn btn-ghost" disabled={!selection} onClick={apply}><WandSparkles size={17}/>{copy.apply}</button>
   <button className="btn btn-ghost" disabled={!historySize} onClick={undo}><Undo2 size={17}/>{copy.undo}</button>
   <button className="btn btn-ghost" disabled={!loaded} onClick={reset}><RotateCcw size={17}/>{copy.reset}</button>
   <button className="btn btn-primary" disabled={!loaded} onClick={download}><Download size={17}/>{copy.download}</button>
  </div>
  <p>{copy.select}</p>
  <div className="image-cleanup-stage"><canvas ref={canvas} className={loaded?'image-cleanup-canvas':'image-cleanup-empty'} style={{display:loaded?'block':'none'}} onPointerDown={begin} onPointerMove={move} onPointerUp={finish} onPointerCancel={finish}/>{!loaded&&<span>{copy.load}</span>}</div>
  {error&&<p role="alert" className="error">{error}</p>}
  <p className="image-cleanup-note">{copy.tip} {copy.authorized}</p>
 </section>;
}