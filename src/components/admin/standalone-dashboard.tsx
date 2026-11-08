'use client';
import {useCallback,useEffect,useState} from 'react';
import Link from 'next/link';
import {upload as blobUpload} from '@vercel/blob/client';
import type {AdsSettings,Campaign,Placement} from '@/lib/advertising/blob-settings';
import {adSlots,type AdSlot} from '@/lib/advertising/config';
import './filemagik-admin.css';

const labels:Record<AdSlot,string>={home:'Portada',desktop:'Lateral PC · superior',desktopLower:'Lateral PC · inferior',homeHeroSide:'Banner junto a Smart Drop',popularTop:'Banner horizontal bajo categorías',mobile:'Móvil',incontent:'Dentro de herramientas',result:'Tras la conversión'};
const hints:Record<AdSlot,string>={home:'Antes de las dos ruedas · responsive',desktop:'Bloque 1/2 · rectángulo superior sticky',desktopLower:'Bloque 2/2 · rectángulo inferior sticky',homeHeroSide:'Portada · columna 25% junto a subida de archivos',popularTop:'Debajo de filtros de herramientas · 728×90 responsive',mobile:'Bloque exclusivo de móvil',incontent:'Integrado en la herramienta',result:'Después de completar una conversión'};
const blank=():Campaign=>({id:crypto.randomUUID(),name:'Nueva campaña',src:'',href:'',alt:'',enabled:false,newTab:true});
export default function StandaloneDashboard(){
 const [settings,setSettings]=useState<AdsSettings|null>(null),[revision,setRevision]=useState(''),[tab,setTab]=useState<'overview'|'banners'|'spaces'|'google'>('overview'),[busy,setBusy]=useState(false),[uploading,setUploading]=useState(''),[message,setMessage]=useState(''),[error,setError]=useState('');
 const load=useCallback(async()=>{
  const res=await fetch('/api/admin/advertising',{cache:'no-store',credentials:'same-origin'});
  const body=await res.json();
  if(!res.ok)throw new Error(body.error||'No se pudo cargar la configuración');
  setSettings(body.settings);setRevision(body.revision);setError('');
 },[]);
 useEffect(()=>{void load().catch(e=>setError(e instanceof Error?e.message:'Error de conexión'));},[load]);
 function patchCampaign(id:string,changes:Partial<Campaign>){setSettings(prev=>prev?{...prev,campaigns:prev.campaigns.map(c=>c.id===id?{...c,...changes}:c)}:prev);}
 function patchPlacement(slot:AdSlot,changes:Partial<Placement>){setSettings(prev=>prev?{...prev,placements:{...prev.placements,[slot]:{...prev.placements[slot],...changes}}}:prev);}
 function addCampaignToSlot(slot:AdSlot){const campaign={...blank(),name:slot==='desktop'?'Lateral superior':slot==='desktopLower'?'Lateral inferior':'Nuevo anuncio '+labels[slot]};setSettings(prev=>prev?{...prev,campaigns:[...prev.campaigns,campaign],placements:{...prev.placements,[slot]:{...prev.placements[slot],enabled:true,provider:'own',campaignIds:[...prev.placements[slot].campaignIds,campaign.id]}}}:prev);setTab('banners');setMessage('Campaña añadida y asignada a «'+labels[slot]+'». Sube la imagen, indica el enlace y activa el anuncio; después guarda.');}
 function importGoogleCode(slot:AdSlot,code:string){const publisher=code.match(/data-ad-client\s*=\s*["'](ca-pub-\d{16})["']/i)?.[1]||code.match(/client=(ca-pub-\d{16})/i)?.[1];const unit=code.match(/data-ad-slot\s*=\s*["'](\d{5,20})["']/i)?.[1];if(!publisher||!unit){setError('Código inválido: no se encuentran data-ad-client y data-ad-slot.');return;}patchPlacement(slot,{publisherId:publisher,adSlotId:unit});setError('');setMessage('Código de Google interpretado. Solo se guardan los identificadores seguros; no se ejecuta HTML. Guarda para aplicar cambios.');}
 function removeCampaign(id:string){setSettings(prev=>prev?{...prev,campaigns:prev.campaigns.filter(c=>c.id!==id),placements:Object.fromEntries(adSlots.map(slot=>[slot,{...prev.placements[slot],campaignIds:prev.placements[slot].campaignIds.filter(x=>x!==id)}])) as AdsSettings['placements']}:prev);}
 async function upload(id:string,file:File){
  setError('');setMessage('');
  if(file.size===0||file.size>8_000_000||!['image/jpeg','image/png','image/webp'].includes(file.type)){setError('Imagen JPG, PNG o WebP de máximo 8 MB');return;}
  setUploading(id);
  try{
   const extension=file.type==='image/jpeg'?'jpg':file.type==='image/png'?'png':'webp';
   const uploaded=await blobUpload('filemagik/ads/images/'+crypto.randomUUID()+'.'+extension,file,{access:'public',handleUploadUrl:'/api/admin/advertising/client-upload'});
   patchCampaign(id,{src:uploaded.url});
   setMessage('Imagen subida directamente a Vercel Blob. Pulsa Guardar para publicar la campaña.');
  }catch(e){setError(e instanceof Error?e.message:'No se pudo subir');}finally{setUploading('');}
 }
 async function save(){
  if(!settings||busy)return;
  setBusy(true);setError('');setMessage('');
  try{
   const res=await fetch('/api/admin/advertising',{method:'PUT',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({revision,settings})});
   const body=await res.json();
   if(!res.ok)throw new Error(body.error||'No se pudo guardar');
   setRevision(body.revision);setSettings(body.settings);
   setMessage('Cambios guardados de forma permanente en Vercel Blob. Ya están publicados.');
  }catch(e){setError(e instanceof Error?e.message:'No se pudo guardar');}
  finally{setBusy(false);}
 }
 async function logout(){await fetch('/api/admin/local-logout',{method:'POST',credentials:'same-origin'});window.location.assign('/admin/login');}
 const complete=settings?.campaigns.filter(c=>c.enabled&&c.src).length??0;
 const active=settings?adSlots.filter(s=>settings.placements[s].enabled).length:0;
 return <main className="fm-admin">
  <aside className="fm-admin-side">
   <div className="fm-admin-brand"><span>✦</span> FileMagik <small>CONTROL CENTER</small></div>
   <nav aria-label="Menú de administración">
    {([['overview','Resumen'],['banners','Mis banners'],['spaces','Espacios publicitarios'],['google','Google AdSense']] as const).map(([key,name])=><button key={key} type="button" aria-current={tab===key?'page':undefined} className={tab===key?'fm-admin-nav active':'fm-admin-nav'} onClick={()=>setTab(key)}>{name}</button>)}
   </nav>
   <Link href="/admin/seguridad" className="fm-admin-nav">Seguridad de la cuenta</Link>
   <a href="/es" target="_blank" rel="noreferrer">Abrir FileMagik ↗</a>
   <button type="button" className="fm-admin-nav" onClick={()=>void logout()}>Cerrar sesión</button>
  </aside>
  <div className="fm-admin-content">
   <header className="fm-admin-header"><div><span className="fm-admin-kicker">Administración protegida · Vercel Blob</span><h1>{tab==='overview'?'Panel general':tab==='banners'?'Biblioteca de banners':tab==='spaces'?'Espacios de publicidad':'Google AdSense'}</h1><p>FileMagik Free · Configuración persistente sin Supabase</p></div>
    <div className="fm-admin-actions"><button type="button" className="fm-admin-secondary" onClick={()=>void load().catch(e=>setError(String(e)))}>Recargar</button><button type="button" disabled={!settings||busy} className="fm-admin-primary" onClick={()=>void save()}>{busy?'Guardando…':'Guardar y publicar'}</button></div>
   </header>
   {error&&<div className="fm-admin-alert error" role="alert">{error}</div>}
   {message&&<div className="fm-admin-alert success" role="status">{message}</div>}
   {!settings?<section className="fm-admin-panel">{error?'Revisa el acceso y la conexión de Vercel Blob.':'Cargando campañas…'}</section>:<>
    {tab==='overview'&&<>
     <div className="fm-admin-stats"><article><span>Campañas activas</span><strong>{complete}</strong><small>de {settings.campaigns.length} en biblioteca</small></article><article><span>Espacios habilitados</span><strong>{active}/{adSlots.length}</strong><small>Control independiente</small></article><article><span>Publicación</span><strong>{settings.enabled?'Activa':'Pausada'}</strong><small>Configuración global</small></article></div>
     <section className="fm-admin-panel"><h2>Estado general</h2><label className="fm-admin-toggle"><input type="checkbox" checked={settings.enabled} onChange={e=>setSettings({...settings,enabled:e.target.checked})}/> Publicidad activada en toda la aplicación</label><p>La publicidad propia funciona sin Google. Una campaña puede mostrar una imagen sin enlace. Si añades un destino HTTPS, la imagen será clicable. La descripción es opcional.</p><div className="fm-admin-quick"><button onClick={()=>setTab('banners')}>Gestionar banners</button><button onClick={()=>setTab('spaces')}>Configurar espacios</button></div></section>
     <section className="fm-admin-panel"><h2>Inventario de espacios</h2><div className="fm-admin-space-summary">{adSlots.map(slot=><div key={slot}><strong>{labels[slot]}</strong><span>{settings.placements[slot].enabled?'Habilitado':'Desactivado'}</span><small>{settings.placements[slot].campaignIds.length} campañas asignadas</small></div>)}</div></section>
    </>}
    {tab==='banners'&&<section className="fm-admin-panel">
     <div className="fm-admin-section-head"><div><h2>Mis campañas publicitarias</h2><p>Puedes subir una imagen o indicar una URL HTTPS de imagen, sin tener que usar ambas. El enlace de destino y la descripción son opcionales; activa y guarda la campaña para publicarla.</p></div><button className="fm-admin-primary" type="button" disabled={settings.campaigns.length>=50} onClick={()=>setSettings({...settings,campaigns:[...settings.campaigns,blank()]})}>+ Crear campaña</button></div>
     {settings.campaigns.length===0&&<p className="fm-admin-empty">Aún no hay banners cargados. Añade una campaña y sube su imagen.</p>}
     <div className="fm-admin-campaigns">{settings.campaigns.map(c=><article className="fm-admin-campaign" key={c.id}>
      <div className="fm-admin-preview">{c.src?<img src={c.src} alt={c.alt||c.name}/>:<span>Vista previa del banner</span>}</div>
      <div className="fm-admin-fields">
       <label>Nombre de la campaña<input value={c.name} maxLength={100} onChange={e=>patchCampaign(c.id,{name:e.target.value})}/></label>
       <label>Imagen · Subir JPG, PNG o WebP (máx. 8 MB)<input type="file" accept="image/jpeg,image/png,image/webp" disabled={Boolean(uploading)} onChange={e=>{const file=e.target.files?.[0];if(file)void upload(c.id,file);e.currentTarget.value='';}}/></label>
       <label>O URL pública de imagen<input type="url" value={c.src} onChange={e=>patchCampaign(c.id,{src:e.target.value})} placeholder="https://..."/></label>
       <label>Enlace de destino (opcional)<input type="url" value={c.href} onChange={e=>patchCampaign(c.id,{href:e.target.value})} placeholder="https://tu-producto.com/"/></label>
       <label>Descripción de imagen (opcional)<input value={c.alt} maxLength={160} onChange={e=>patchCampaign(c.id,{alt:e.target.value})} placeholder="Descripción del producto anunciado"/></label>
       <div className="fm-admin-campaign-footer"><label className="fm-admin-toggle"><input type="checkbox" checked={c.newTab!==false} onChange={e=>patchCampaign(c.id,{newTab:e.target.checked})}/> Abrir destino en ventana nueva</label><label className="fm-admin-toggle"><input type="checkbox" checked={c.enabled} onChange={e=>patchCampaign(c.id,{enabled:e.target.checked})}/> Campaña activada</label><button type="button" className="fm-admin-danger" onClick={()=>{if(window.confirm('¿Eliminar esta campaña de la configuración?'))removeCampaign(c.id);}}>Eliminar</button></div>
       {uploading===c.id&&<span role="status">Subiendo imagen…</span>}
      </div>
     </article>)}</div></section>}
    {tab==='spaces'&&<section className="fm-admin-panel">
     <h2>Ubicaciones y rotación</h2><p><strong>PC: dos anuncios simultáneos propios o de anunciantes directos</strong> en la columna lateral (superior e inferior), cada uno con sus propias campañas y rotación. <strong>Si eliges AdSense, se publica como máximo un anuncio sticky de Google</strong> para respetar sus reglas; no combines este lateral con los side rails automáticos de Google.</p><p><strong>Cómo hacerlo:</strong> crea una campaña para este espacio, sube la imagen o pega su URL HTTPS; el enlace y la descripción son opcionales. Actívala y guarda. Regresa aquí para marcar tantas campañas como quieras; si seleccionas varias, rotarán dentro de ese bloque.</p>
     <div className="fm-admin-placements">{adSlots.map(slot=>{const p=settings.placements[slot];return <article key={slot} className="fm-admin-placement">
      <header><div><h3>{labels[slot]}</h3><small>{hints[slot]}</small></div><label className="fm-admin-toggle"><input type="checkbox" checked={p.enabled} onChange={e=>patchPlacement(slot,{enabled:e.target.checked})}/> Mostrar</label></header>
      <div className="fm-admin-placement-fields"><label>Proveedor<select value={p.provider} onChange={e=>patchPlacement(slot,{provider:e.target.value as Placement['provider']})}><option value="own">Productos propios</option><option value="partner">Colaboradores</option><option value="adsense">AdSense (pendiente)</option></select></label><label>Rotación de banners<select value={p.rotationSeconds} onChange={e=>patchPlacement(slot,{rotationSeconds:Number(e.target.value)})}>{[15,30,45,60,90,120,180,300,600].map(n=><option value={n} key={n}>{n} segundos</option>)}</select></label></div>
      {p.provider==='adsense'?<p>Configura o pega el código de Google en «Google AdSense». No se ejecutará HTML arbitrario; se aplican los identificadores del anuncio. La visualización pública permanece bloqueada hasta contar con aprobación y consentimiento.</p>:<><div className="fm-admin-ad-manager"><strong>{p.campaignIds.length} banner(s) asignados a este espacio</strong><button type="button" disabled={settings.campaigns.length>=50} className="fm-admin-secondary" onClick={()=>addCampaignToSlot(slot)}>+ Crear y asignar banner</button></div><div className="fm-admin-choices">{settings.campaigns.map(c=><label key={c.id}><input type="checkbox" checked={p.campaignIds.includes(c.id)} onChange={e=>patchPlacement(slot,{campaignIds:e.target.checked?[...p.campaignIds,c.id]:p.campaignIds.filter(x=>x!==c.id)})}/>{c.name}{!c.enabled&&<small> (desactivada)</small>}</label>)}{settings.campaigns.length===0&&<p>Primero crea tus campañas con el botón anterior.</p>}</div></>}
      {p.provider!=='adsense'&&<div className="fm-admin-small-preview">{p.campaignIds.map(id=>settings.campaigns.find(c=>c.id===id)).filter((c):c is Campaign=>Boolean(c?.src)).map(c=><img src={c.src} alt={c.alt||c.name} key={c.id}/>)}</div>}
     </article>})}</div>
    </section>}
    {tab==='google'&&<section className="fm-admin-panel"><h2>Google AdSense · preparación</h2><p>Puedes pegar aquí el código HTML estándar de tu bloque de AdSense; FileMagik extraerá exclusivamente el Publisher ID y el Ad Slot ID, sin ejecutar código externo ni guardar scripts. Google decide el destino del anuncio: los enlaces individuales no se editan aquí. AdSense seguirá desactivado hasta disponer de aprobación y consentimiento.</p>{adSlots.map(slot=><div className="fm-admin-google" key={slot}><h3>{labels[slot]}</h3><label>Publisher ID<input placeholder="ca-pub-0000000000000000" value={settings.placements[slot].publisherId} onChange={e=>patchPlacement(slot,{publisherId:e.target.value})}/></label><label>Ad Slot ID<input placeholder="1234567890" value={settings.placements[slot].adSlotId} onChange={e=>patchPlacement(slot,{adSlotId:e.target.value})}/></label><label className="fm-admin-google-code">Pegar bloque HTML de Google<textarea rows={4} placeholder={'<ins class="adsbygoogle" data-ad-client="ca-pub-..." data-ad-slot="..."></ins>'} onChange={e=>{const value=e.target.value;if(value.includes('data-ad-client')&&value.includes('data-ad-slot'))importGoogleCode(slot,value);}} /></label></div>)}</section>}
    <footer className="fm-admin-bottom"><span>{revision?'Última configuración cargada de Vercel Blob':'Configuración inicial (sin guardar)'}</span><button className="fm-admin-primary" type="button" disabled={busy} onClick={()=>void save()}>{busy?'Guardando…':'Guardar todos los cambios'}</button></footer>
   </>}
  </div>
 </main>;
}
