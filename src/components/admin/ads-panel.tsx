'use client';
import {useEffect,useRef,useState} from 'react';
import {adPlacements,defaultAds,type Banner,type PublicAds,type AdPlacement,type AdMode} from '@/lib/advertising/config';
const names:Record<AdPlacement,string>={
 top:'Cabecera · banner horizontal',desktop:'Columna derecha · escritorio',inline:'Entre secciones',
 mobile:'Barra fija inferior · móvil',result:'Después de convertir o descargar'
};
const campaigns=[
 {name:'GrabaliA Clips',link:'https://grabalia.iapacks.com/es'},
 {name:'AlergenIA',link:'https://alergenia.com'},
 {name:'BGMagik',link:'https://bgmagik.vercel.app'}
] as const;
export default function AdsAdmin(){
 const [config,setConfig]=useState<PublicAds>(defaultAds);
 const [loaded,setLoaded]=useState(false),[saving,setSaving]=useState(false);
 const [message,setMessage]=useState(''),[uploading,setUploading]=useState('');
 const uploadRef=useRef<HTMLInputElement>(null);
 const [uploadTarget,setUploadTarget]=useState<string>('');
 useEffect(()=>{
  let active=true;
  void fetch('/api/admin/ads',{cache:'no-store',credentials:'same-origin'})
   .then(async r=>{if(!r.ok)throw new Error('Falta configurar la base de datos y el usuario superadmin.');return r.json()})
   .then(data=>{if(active){setConfig(data);setLoaded(true)}})
   .catch(e=>{if(active)setMessage(e instanceof Error?e.message:'No se pudo cargar la configuración')});
  return()=>{active=false};
 },[]);
 const updateSlot=(slot:AdPlacement,patch:Partial<PublicAds['slots'][AdPlacement]>)=>
  setConfig(old=>({...old,slots:{...old.slots,[slot]:{...old.slots[slot],...patch}}}));
 const changeBanner=(i:number,patch:Partial<Banner>)=>
  setConfig(old=>({...old,banners:old.banners.map((banner,index)=>index===i?{...banner,...patch}:banner)}));
 function newBanner(slot:AdPlacement){
  if(config.banners.filter(b=>b.slot===slot).length>=5)return;
  setConfig(old=>({...old,banners:[...old.banners,{
   id:'banner-'+crypto.randomUUID().slice(0,12),slot,src:'',href:campaigns[0].link,alt:campaigns[0].name,enabled:true
  }]}));
 }
 async function uploadImage(file:File|null,sourceId:string){
  if(!file)return;
  setUploading(sourceId);setMessage('');
  try{
   if(file.size>1_500_000)throw new Error('Archivo máximo 1,5 MB');
   const data=new FormData();data.append('file',file);
   const res=await fetch('/api/admin/ads/upload',{method:'POST',body:data,credentials:'same-origin'});
   const body=await res.json();if(!res.ok)throw new Error(body.error||'No se pudo subir el banner');
   const index=config.banners.findIndex(b=>b.id===sourceId);
   if(index<0)throw new Error('Banner no encontrado');
   changeBanner(index,{src:body.url});
   setMessage('Imagen subida. Pulsa «Guardar configuración» para publicarla.');
  }catch(e){setMessage(e instanceof Error?e.message:'Fallo al subir la imagen')}finally{setUploading('');if(uploadRef.current)uploadRef.current.value=''}
 }
 async function save(){
  setSaving(true);setMessage('');
  try{
   const res=await fetch('/api/admin/ads',{method:'PUT',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify(config)});
   const result=await res.json();if(!res.ok)throw new Error(result.error||'No se pudo guardar');
   setConfig(result.ads);setMessage('Configuración guardada y lista para mostrarse en la web.');
  }catch(e){setMessage(e instanceof Error?e.message:'Error de conexión')}finally{setSaving(false)}
 }
 return <div className="fm-ads-admin">
  <section>
   <h2>Control general de publicidad</h2>
   <p>Cada ubicación se controla por separado. Si no hay imagen propia, se muestra un espacio de autopromoción visible; no un hueco vacío.</p>
   <label className="fm-admin-toggle"><input type="checkbox" disabled={!loaded} checked={config.enabled} onChange={e=>setConfig({...config,enabled:e.target.checked})}/> Mostrar publicidad en FileMagik</label>
   <p>Sube cualquiera de los 8 banners que has preparado. Admitimos JPG, PNG o WebP hasta 1,5 MB. Después añade su enlace de destino.</p>
  </section>
  <section>
   <h2>Ubicaciones y campañas</h2>
   {adPlacements.map(slot=>{
    const setting=config.slots[slot],banners=config.banners.map((banner,index)=>({...banner,index})).filter(b=>b.slot===slot);
    return <div className="fm-admin-placement" key={slot}>
     <h3>{names[slot]}</h3>
     <div className="fm-admin-rows">
      <label className="fm-admin-toggle"><input type="checkbox" checked={setting.enabled} disabled={!loaded} onChange={e=>updateSlot(slot,{enabled:e.target.checked})}/> Espacio visible</label>
      <label>Qué mostrar<select disabled={!loaded} value={setting.mode} onChange={e=>updateSlot(slot,{mode:e.target.value as AdMode})}>
       <option value="own">Banners propios enlazados</option><option value="google">Google AdSense</option><option value="off">Ocultar espacio</option>
      </select></label>
      <label>Cambiar banner cada (segundos)<input type="number" min={30} max={300} disabled={!loaded} value={setting.rotateSeconds} onChange={e=>updateSlot(slot,{rotateSeconds:Number(e.target.value)})}/></label>
     </div>
     {setting.mode==='own'&&<>
      {banners.map(b=><div className="fm-admin-banner" key={b.id??b.index}>
       <label className="fm-admin-toggle"><input type="checkbox" checked={b.enabled!==false} onChange={e=>changeBanner(b.index,{enabled:e.target.checked})}/> Banner activado</label>
       {b.src&&<img src={b.src} alt={b.alt}/>}
       <div className="fm-admin-actions">
        <button type="button" disabled={Boolean(uploading)} onClick={()=>{setUploadTarget(b.id??'');uploadRef.current?.click()}}>{uploading===b.id?'Subiendo…':'Subir imagen original'}</button>
        <button type="button" onClick={()=>setConfig(old=>({...old,banners:old.banners.filter((_,i)=>i!==b.index)}))}>Eliminar</button>
       </div>
       <label>URL de la imagen<input type="url" value={b.src} placeholder="https://... o /ads/archivo.jpg" onChange={e=>changeBanner(b.index,{src:e.target.value})}/></label>
       <label>Enlace de destino<input type="url" value={b.href} placeholder="https://destino.com/" onChange={e=>changeBanner(b.index,{href:e.target.value})}/></label>
       <label>Descripción de imagen<input type="text" maxLength={160} value={b.alt} onChange={e=>changeBanner(b.index,{alt:e.target.value})}/></label>
      </div>)}
      <div className="fm-admin-actions">
       <button type="button" disabled={!loaded||banners.length>=5} onClick={()=>newBanner(slot)}>+ Añadir banner ({banners.length}/5)</button>
      </div>
     </>}
     {setting.mode==='google'&&<div className="fm-admin-rows"><label>ID del bloque AdSense<input type="text" value={config.google.slots[slot]} placeholder="1234567890" onChange={e=>setConfig(old=>({...old,google:{...old.google,slots:{...old.google.slots,[slot]:e.target.value}}}))}/></label><p>No se cargará Google si faltan la aprobación del sitio y el consentimiento CMP/TCF.</p></div>}
    </div>;
   })}
   <input ref={uploadRef} type="file" accept="image/jpeg,image/png,image/webp" style={{display:'none'}} onChange={e=>{const file=e.target.files?.[0]??null;void uploadImage(file,uploadTarget)}}/>
  </section>
  <section>
   <h2>Google AdSense y futuras redes</h2>
   <p>AdSense es la plataforma para mostrar anuncios. Google Ads es la plataforma para contratarlos. Para otras redes se podrá añadir su adaptador sin introducir JavaScript arbitrario en el panel.</p>
   <label>ID del editor (público)<input type="text" placeholder="ca-pub-0000000000000000" value={config.google.publisherId} onChange={e=>setConfig(old=>({...old,google:{...old.google,publisherId:e.target.value}}))}/></label>
   <label className="fm-admin-toggle"><input type="checkbox" checked={config.google.approved} onChange={e=>setConfig(old=>({...old,google:{...old.google,approved:e.target.checked}}))}/> Confirmo que Google aprobó el dominio</label>
   <p>La CMP certificada debe estar configurada y comprobada en producción. Si Google no está listo, se mantiene la autopromoción propia.</p>
  </section>
  <section>
   <div className="fm-admin-actions"><button type="button" disabled={!loaded||saving||Boolean(uploading)} onClick={()=>void save()}>{saving?'Guardando…':'Guardar configuración'}</button></div>
   <p role="status" aria-live="polite">{message||'Los anuncios propios se etiquetan siempre como Publicidad.'}</p>
  </section>
 </div>;
}
