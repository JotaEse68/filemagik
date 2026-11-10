'use client';
import {useEffect,useRef,useState} from 'react';

declare global {
 interface Window { turnstile?:{
  render:(element:HTMLElement,options:{sitekey:string;action:string;callback:(token:string)=>void;
   'expired-callback':()=>void;'error-callback':()=>void})=>string|number;
  reset:(widgetId:string|number)=>void;
  remove:(widgetId:string|number)=>void;
 }; }
}
export const professionalOperations={
 'ods-to-pdf':'office-to-pdf','odp-to-pdf':'office-to-pdf',
 'pdf-to-word-text':'pdf-to-docx','pdf-to-excel-text':'pdf-to-xlsx',
 'word-to-layout-pdf':'office-to-pdf','xlsx-to-layout-pdf':'office-to-pdf',
 'pptx-to-pdf-layout':'office-to-pdf','compress-pdf-lossless':'optimize-pdf',
 'compress-pdf-raster':'optimize-pdf',
} as const;
export type ProfessionalSlug=keyof typeof professionalOperations;
export function isProfessionalSlug(slug:string):slug is ProfessionalSlug{
 return Object.prototype.hasOwnProperty.call(professionalOperations,slug);
}
export async function runProfessionalConversion(slug:ProfessionalSlug,file:File,token:string,
 quality:'lossless'|'balanced'|'maximum'='lossless'){
 const form=new FormData();
 form.set('file',file,file.name);form.set('turnstile',token);
 const response=await fetch('/api/pdf-engine?operation='+professionalOperations[slug]+'&quality='+quality,{
  method:'POST',body:form,cache:'no-store'});
 if(!response.ok){
  const data=await response.json().catch(()=>({error:'Professional conversion failed'}));
  throw new Error(typeof data.error==='string'?data.error:'Professional conversion failed');
 }
 const suffix=slug==='pdf-to-word-text'?'.docx':slug==='pdf-to-excel-text'?'.xlsx':'.pdf';
 const name=file.name.replace(/\.[^.]+$/,'')+'-professional'+suffix;
 return {name,blob:await response.blob()};
}
export default function ProfessionalPdfOption({siteKey,ready,onToken,onReset}:{siteKey:string;
 ready:boolean;onToken:(token:string)=>void;onReset:()=>void}){
 const ref=useRef<HTMLDivElement|null>(null),widget=useRef<string|number|null>(null);
 const [status,setStatus]=useState<'loading'|'ready'|'failed'>('loading');
 useEffect(()=>{
  if(!ready||!siteKey)return;
  let active=true;
  function mount(){
   if(!active||!ref.current||!window.turnstile||widget.current!==null)return;
   try{widget.current=window.turnstile.render(ref.current,{
    sitekey:siteKey,action:'filemagik_pdf',
    callback:token=>{if(active)onToken(token);},
    'expired-callback':()=>{if(active)onReset();},
    'error-callback':()=>{if(active){onReset();setStatus('failed');}},
   });setStatus('ready');}catch{setStatus('failed');}
  }
  const existing=document.querySelector<HTMLScriptElement>('script[data-filemagik-turnstile]');
  let script=existing;
  if(!script){
   script=document.createElement('script');script.dataset.filemagikTurnstile='true';
   script.src='https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
   script.async=true;script.defer=true;document.head.appendChild(script);
  }
  script.addEventListener('load',mount);
  const interval=window.setInterval(mount,300);
  mount();
  return()=>{active=false;if(interval!==undefined)window.clearInterval(interval);script?.removeEventListener('load',mount);
   if(widget.current!==null&&window.turnstile){try{window.turnstile.remove(widget.current);}catch{/* ignore */}widget.current=null;}};
 // Callbacks are stable at render for this widget's lifetime.
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[ready,siteKey]);
 return <div className="fm-professional-challenge" aria-live="polite">
  <div ref={ref}/>
  {status==='loading'&&<small>Cargando verificación para la conversión profesional…</small>}
  {status==='failed'&&<small>No se puede verificar esta operación. Selecciona procesamiento local.</small>}
 </div>;
}
