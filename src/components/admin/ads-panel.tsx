'use client';
import {useEffect,useState} from 'react';
import type {Banner,PublicAds} from '@/lib/advertising/config';
const initial:PublicAds={enabled:false,banners:[]};
export default function AdsAdmin(){
 const [config,setConfig]=useState<PublicAds>(initial),[message,setMessage]=useState(''),[saving,setSaving]=useState(false),[loaded,setLoaded]=useState(false);
 useEffect(()=>{let active=true;void fetch('/api/admin/ads',{cache:'no-store'}).then(r=>{if(!r.ok)throw new Error('Sin permisos o base de datos sin inicializar');return r.json()}).then(data=>{if(active){setConfig(data);setLoaded(true);}}).catch(e=>{if(active)setMessage(e.message)});return()=>{active=false};},[]);
 function update(index:number,patch:Partial<Banner>){setConfig(prev=>({...prev,banners:prev.banners.map((b,i)=>i===index?{...b,...patch}:b)}));}
 async function save(){
  setSaving(true);setMessage('');
  try{const res=await fetch('/api/admin/ads',{method:'PUT',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify(config)});const data=await res.json();if(!res.ok)throw new Error(data.error||'Error al guardar');setMessage('Configuración guardada.');}
  catch(e){setMessage(e instanceof Error?e.message:'Error de conexión')}finally{setSaving(false)}
 }
 return <section style={{padding:20,border:'1px solid #33496d',borderRadius:16}}>
  <h2>Publicidad propia</h2><p>El sistema solo muestra banners propios configurados. AdSense está desactivado.</p>
  <label><input type="checkbox" checked={config.enabled} disabled={!loaded} onChange={e=>setConfig({...config,enabled:e.target.checked})}/> Activar banners propios</label>
  {config.banners.map((banner,index)=><fieldset key={index} style={{margin:'18px 0',padding:14,border:'1px solid #405474'}}>
   <legend>Banner {index+1}</legend>
   <label>Ubicación <select value={banner.slot} onChange={e=>update(index,{slot:e.target.value as Banner['slot']})}><option value="desktop">Escritorio</option><option value="mobile">Móvil</option><option value="result">Resultado</option></select></label>
   {(['src','href','alt'] as const).map(field=><label key={field} style={{display:'block',margin:'12px 0'}}>{field}<input style={{display:'block',padding:10,width:'100%',boxSizing:'border-box'}} type={field==='alt'?'text':'url'} value={banner[field]} placeholder={field==='src'?'https://...imagen.webp':field==='href'?'https://...destino':'Descripción accesible'} onChange={e=>update(index,{[field]:e.target.value})}/></label>)}
   <button onClick={()=>setConfig(prev=>({...prev,banners:prev.banners.filter((_,i)=>i!==index)}))}>Eliminar banner</button>
  </fieldset>)}
  <div style={{display:'flex',gap:12,flexWrap:'wrap'}}>
  <button disabled={!loaded||config.banners.length>=10} onClick={()=>setConfig(prev=>({...prev,banners:[...prev.banners,{slot:'desktop',src:'',href:'',alt:''}]}))}>Añadir banner</button>
  <button disabled={!loaded||saving} onClick={()=>void save()}>{saving?'Guardando…':'Guardar cambios'}</button>
  </div><p role="status" aria-live="polite">{message}</p>
 </section>;
}