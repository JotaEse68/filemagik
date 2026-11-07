'use client';
import {useEffect,useRef,useState} from 'react';
import {ArrowLeft,ArrowRight} from 'lucide-react';
import type {Locale} from '@/config/site';
type Page={number:number;thumbnail:string};
type Mode='reorder-pdf-pages'|'extract-pdf-pages'|'delete-pdf-pages';
const copy={
 en:{loading:'Loading page previews…',tooMany:'Only 40 pages are shown. For larger PDFs, enter the complete order in the field above.',order:'Drag pages or use the arrow buttons',select:'Select pages to process'},
 es:{loading:'Cargando vistas previas…',tooMany:'Solo mostramos 40 páginas. Para un PDF mayor, escribe el orden completo en el campo de arriba.',order:'Arrastra las páginas o utiliza las flechas para reordenar',select:'Selecciona las páginas que quieras procesar'},
 pt:{loading:'Carregando prévias…',tooMany:'Mostramos só 40 páginas. Para um PDF maior, escreva a ordem completa acima.',order:'Arraste páginas ou use as setas',select:'Selecione as páginas para processar'},
 fr:{loading:'Chargement des aperçus…',tooMany:'Seulement 40 pages affichées. Pour un PDF plus grand, indiquez tout l’ordre ci-dessus.',order:'Glissez les pages ou utilisez les flèches',select:'Sélectionnez les pages à traiter'}
} as const;
export default function PdfPreview({file,mode,onChange,locale}:{file:File;mode:Mode;onChange:(value:string)=>void;locale:Locale}){
 const [pages,setPages]=useState<Page[]>([]),[order,setOrder]=useState<number[]>([]);
 const [selected,setSelected]=useState<number[]>([]),[loading,setLoading]=useState(true),[total,setTotal]=useState(0),[error,setError]=useState('');
 const dragged=useRef<number|null>(null);
 useEffect(()=>{
 let canceled=false;let pdf:import('pdfjs-dist').PDFDocumentProxy|null=null;
 async function load(){
  setLoading(true);setPages([]);setOrder([]);setSelected([]);setError('');
  try{
   const pdfjs=await import('pdfjs-dist');
   pdfjs.GlobalWorkerOptions.workerSrc=new URL('pdfjs-dist/build/pdf.worker.min.mjs',import.meta.url).toString();
   pdf=await pdfjs.getDocument({data:new Uint8Array(await file.arrayBuffer())}).promise;
   const count=pdf.numPages;if(canceled)return;setTotal(count);
   const thumbs:Page[]=[];
   for(let i=1;i<=Math.min(count,40);i++){
    if(canceled)break;
    const page=await pdf.getPage(i),view=page.getViewport({scale:.22});
    const canvas=document.createElement('canvas');
    canvas.width=Math.max(1,Math.ceil(view.width));canvas.height=Math.max(1,Math.ceil(view.height));
    const ctx=canvas.getContext('2d');if(!ctx)break;
    await page.render({canvas,canvasContext:ctx,viewport:view}).promise;
    thumbs.push({number:i,thumbnail:canvas.toDataURL('image/jpeg',.65)});
    page.cleanup();
   }
   if(!canceled){setPages(thumbs);setOrder(thumbs.map(p=>p.number));if(mode==='reorder-pdf-pages'&&count<=40)onChange(thumbs.map(p=>p.number).join(','));setLoading(false);}
  }catch(e){if(!canceled){setError(e instanceof Error?e.message:'PDF preview unavailable');setLoading(false);}}
  finally{if(pdf)await pdf.cleanup();}
 }
 void load();return ()=>{canceled=true};
 },[file]);
 function reorder(index:number,change:number){
  const nextIndex=index+change;if(nextIndex<0||nextIndex>=order.length)return;
  const next=[...order];[next[index],next[nextIndex]]=[next[nextIndex],next[index]];
  setOrder(next);if(total===order.length)onChange(next.join(','));
 }
 function dropOn(target:number){const from=dragged.current;dragged.current=null;if(from===null||from===target||total!==order.length)return;const next=[...order];const [page]=next.splice(from,1);next.splice(target,0,page);setOrder(next);onChange(next.join(','));}
 function toggle(number:number){
  const next=selected.includes(number)?selected.filter(v=>v!==number):[...selected,number].sort((a,b)=>a-b);
  setSelected(next);onChange(next.join(','));
 }
 const labels=copy[locale];if(loading)return <p role="status" className="pdf-preview-message">{labels.loading}</p>;
 if(error)return <p role="alert" className="pdf-preview-message">{error}</p>;
 return <div className="pdf-preview"><p>{mode==='reorder-pdf-pages'?labels.order:labels.select}</p>{total>40&&<p>{labels.tooMany}</p>}
 <div className="pdf-preview-grid">
 {order.map((number,index)=>{
  const page=pages.find(p=>p.number===number);
  if(!page)return null;
  return <div className="pdf-preview-item" key={number} draggable={mode==='reorder-pdf-pages'&&total===order.length} onDragStart={event=>{if(mode!=='reorder-pdf-pages'||total!==order.length)return;dragged.current=index;event.dataTransfer.effectAllowed='move';event.dataTransfer.setData('text/plain',String(index));}} onDragOver={event=>{if(mode==='reorder-pdf-pages'&&total===order.length)event.preventDefault();}} onDrop={event=>{event.preventDefault();dropOn(index);}} onDragEnd={()=>{dragged.current=null;}}>
   <button type="button" aria-pressed={mode==="reorder-pdf-pages"?undefined:selected.includes(number)} aria-label={`PDF page ${number}`} className={selected.includes(number)?'pdf-thumb selected':'pdf-thumb'} onClick={()=>{if(mode!=='reorder-pdf-pages')toggle(number)}}>
    <img alt={`PDF page ${number}`} src={page.thumbnail}/><span>{number}</span>
   </button>
   {mode==='reorder-pdf-pages'&&<div className="pdf-reorder-buttons"><button disabled={index===0} aria-label={`Move page ${number} left`} type="button" onClick={()=>reorder(index,-1)}><ArrowLeft size={15}/></button><button disabled={index===order.length-1} aria-label={`Move page ${number} right`} type="button" onClick={()=>reorder(index,1)}><ArrowRight size={15}/></button></div>}
  </div>;
 })}
 </div>
 </div>;
}