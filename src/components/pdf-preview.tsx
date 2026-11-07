'use client';
import {useEffect,useState} from 'react';
import {ArrowLeft,ArrowRight} from 'lucide-react';
import type {Locale} from '@/config/site';
type Page={number:number;thumbnail:string};
type Mode='reorder-pdf-pages'|'extract-pdf-pages'|'delete-pdf-pages';
const copy={
 en:{loading:'Loading page previews…',tooMany:'Previewing first 40 pages',order:'Use arrows to reorder pages',select:'Select pages to process'},
 es:{loading:'Cargando vistas previas…',tooMany:'Vista previa de las primeras 40 páginas',order:'Utiliza las flechas para reordenar',select:'Selecciona las páginas que quieras procesar'},
 pt:{loading:'Carregando prévias…',tooMany:'Prévia das primeiras 40 páginas',order:'Use as setas para reorganizar',select:'Selecione as páginas para processar'},
 fr:{loading:'Chargement des aperçus…',tooMany:'Aperçu des 40 premières pages',order:'Utilisez les flèches pour réorganiser',select:'Sélectionnez les pages à traiter'}
} as const;
export default function PdfPreview({file,mode,onChange,locale}:{file:File;mode:Mode;onChange:(value:string)=>void;locale:Locale}){
 const [pages,setPages]=useState<Page[]>([]),[order,setOrder]=useState<number[]>([]);
 const [selected,setSelected]=useState<number[]>([]),[loading,setLoading]=useState(true),[total,setTotal]=useState(0),[error,setError]=useState('');
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
   if(!canceled){setPages(thumbs);setOrder(thumbs.map(p=>p.number));setLoading(false);}
  }catch(e){if(!canceled){setError(e instanceof Error?e.message:'PDF preview unavailable');setLoading(false);}}
  finally{if(pdf)await pdf.destroy();}
 }
 void load();return ()=>{canceled=true};
 },[file]);
 function reorder(index:number,change:number){
  const nextIndex=index+change;if(nextIndex<0||nextIndex>=order.length)return;
  const next=[...order];[next[index],next[nextIndex]]=[next[nextIndex],next[index]];
  setOrder(next);if(total===order.length)onChange(next.join(','));
 }
 function toggle(number:number){
  const next=selected.includes(number)?selected.filter(v=>v!==number):[...selected,number].sort((a,b)=>a-b);
  setSelected(next);onChange(next.join(','));
 }
 const labels=copy[locale];if(loading)return <p className="pdf-preview-message">{labels.loading}</p>;
 if(error)return <p className="pdf-preview-message">{error}</p>;
 return <div className="pdf-preview"><p>{mode==='reorder-pdf-pages'?labels.order:labels.select}</p>{total>40&&<p>{labels.tooMany}</p>}
 <div className="pdf-preview-grid">
 {order.map((number,index)=>{
  const page=pages.find(p=>p.number===number);
  if(!page)return null;
  return <div className="pdf-preview-item" key={number}>
   <button type="button" aria-pressed={selected.includes(number)} className={selected.includes(number)?'pdf-thumb selected':'pdf-thumb'} onClick={()=>{if(mode!=='reorder-pdf-pages')toggle(number)}}>
    <img alt={`PDF page ${number}`} src={page.thumbnail}/><span>{number}</span>
   </button>
   {mode==='reorder-pdf-pages'&&<div className="pdf-reorder-buttons"><button disabled={index===0} aria-label={`Move page ${number} left`} onClick={()=>reorder(index,-1)}><ArrowLeft size={15}/></button><button disabled={index===order.length-1} aria-label={`Move page ${number} right`} onClick={()=>reorder(index,1)}><ArrowRight size={15}/></button></div>}
  </div>;
 })}
 </div>
 </div>;
}