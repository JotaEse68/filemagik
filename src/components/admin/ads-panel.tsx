'use client';
import {useEffect,useState} from 'react';
import {adSlots,type AdSlot,type AdProvider,type Banner,type PublicAds} from '@/lib/advertising/config';
const empty:PublicAds={enabled:false,banners:[]};
const names:Record<AdSlot,string>={
 desktop:'Lateral escritorio · superior',desktopLower:'Lateral escritorio · inferior',homeHeroSide:'Junto a Smart Drop',popularTop:'Bajo categorías',toolSide:'Junto al conversor',toolHorizontal:'Debajo del conversor',mobile:'Móvil',result:'Resultado de conversión',
 home:'Portada, bajo las ruedas',incontent:'Dentro de las herramientas'
};
function makeBanner(slot:AdSlot):Banner{return {slot,provider:'own',enabled:false,src:'',href:'',alt:''};}
export default function AdsAdmin(){
 const [config,setConfig]=useState<PublicAds>(empty),[message,setMessage]=useState(''),[saving,setSaving]=useState(false),[loaded,setLoaded]=useState(false);
 useEffect(()=>{let active=true;void fetch('/api/admin/ads',{cache:'no-store'}).then(r=>{if(!r.ok)throw new Error('Falta activar el acceso administrador o su base de datos');return r.json()}).then(data=>{if(active){setConfig(data);setLoaded(true);}}).catch(e=>{if(active)setMessage(e.message)});return()=>{active=false};},[]);
 const getBanner=(slot:AdSlot)=>config.banners.find(b=>b.slot===slot)??makeBanner(slot);
 function patch(slot:AdSlot,changes:Partial<Banner>){setConfig(prev=>({...prev,banners:adSlots.map(key=>key===slot?{...getBanner(key),...changes}:getBanner(key))}));}
 async function save(){
  setSaving(true);setMessage('');
  try{
   // Disabled slots with incomplete details are omitted from the published configuration.
   const banners=config.banners.filter(b=>b.enabled!==false);
   const res=await fetch('/api/admin/ads',{method:'PUT',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({enabled:config.enabled,banners})});
   const result=await res.json();if(!res.ok)throw new Error(result.error||'No se pudo guardar');
   setMessage('Cambios guardados. Revisa la web para comprobar cada espacio.');
  }catch(e){setMessage(e instanceof Error?e.message:'Error de conexión');}finally{setSaving(false);}
 }
 return <section className="admin-card">
  <h2>Publicidad · Espacios y banners</h2>
  <p>Activa cada espacio, utiliza los banners originales con su enlace o prepara un proveedor externo. Las campañas de Google necesitan aprobación y consentimiento.</p>
  <label className="admin-ad-master"><input type="checkbox" checked={config.enabled} disabled={!loaded} onChange={e=>setConfig({...config,enabled:e.target.checked})}/> Activar publicidad en FileMagik</label>
  <div className="admin-ad-grid">{adSlots.map(slot=>{const item=getBanner(slot),source=item.provider||'own';return <fieldset key={slot} className="admin-ad-item">
   <legend>{names[slot]}</legend>
   <label className="admin-ad-switch"><input type="checkbox" checked={item.enabled!==false&&config.banners.some(b=>b.slot===slot)} disabled={!loaded} onChange={e=>patch(slot,{enabled:e.target.checked})}/> Mostrar este espacio</label>
   <label>Origen de publicidad<select value={source} onChange={e=>patch(slot,{provider:e.target.value as AdProvider})}>
    <option value="own">Banner propio</option><option value="partner">Campaña de colaborador</option><option value="adsense">Google AdSense</option>
   </select></label>
   {source==='adsense'?<>
    <label>Identificador editor ca-pub<input type="text" value={item.publisherId??''} onChange={e=>patch(slot,{publisherId:e.target.value})} placeholder="ca-pub-0000000000000000"/></label>
    <label>ID de anuncio<input type="text" value={item.adSlotId??''} onChange={e=>patch(slot,{adSlotId:e.target.value})} placeholder="0000000000"/></label>
    <p>La emisión solo podrá activarse con la cuenta aprobada y una CMP configurada. El espacio no cargará Google sin consentimiento.</p>
   </>:<>
    <label>Imagen original (URL pública)<input type="text" value={item.src} onChange={e=>patch(slot,{src:e.target.value})} placeholder="/ads/banner-original.jpg"/></label>
    <label>Enlace de destino<input type="url" value={item.href} onChange={e=>patch(slot,{href:e.target.value})} placeholder="https://..."/></label>
    <label>Descripción<input type="text" maxLength={160} value={item.alt} onChange={e=>patch(slot,{alt:e.target.value})} placeholder="Anuncio del producto"/></label>
    {item.src&&<div className="admin-ad-preview"><img src={item.src} alt={item.alt||'Vista previa de banner'}/></div>}
   </>}
  </fieldset>})}</div>
  <button className="btn btn-primary" type="button" disabled={!loaded||saving} onClick={()=>void save()}>{saving?'Guardando…':'Guardar configuración de anuncios'}</button>
  <p role="status" aria-live="polite">{message}</p>
 </section>;
}
