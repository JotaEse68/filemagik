'use client';
import {useEffect,useState} from 'react';
type Ad={slot:string;src:string;href:string;alt:string;enabled?:boolean};
type Config={enabled:boolean;banners:Ad[];standalone?:boolean};
const labels:Record<string,string>={home:'Portada · bajo las ruedas',desktop:'Escritorio · lateral',mobile:'Móvil',incontent:'Herramientas · contenido',result:'Página de resultado'};
const slots=['home','desktop','mobile','incontent','result'];
export default function StandaloneDashboard(){
 const [config,setConfig]=useState<Config|null>(null);
 useEffect(()=>{fetch('/api/advertising',{cache:'no-store'}).then(r=>r.json()).then(setConfig).catch(()=>{});},[]);
 return <main style={{maxWidth:1100,margin:'40px auto',padding:24}}>
  <header style={{display:'flex',justifyContent:'space-between',gap:20,alignItems:'center',flexWrap:'wrap'}}>
   <div><span style={{color:'#9ec9ff',fontSize:12,letterSpacing:2}}>FILEMAGIK CONTROL CENTER</span><h1>FileMagik · Mi administración</h1><p>Panel privado del propietario · modalidad sin Supabase</p></div>
   <button onClick={async()=>{await fetch('/api/admin/local-logout',{method:'POST'});location.assign('/admin/login');}} style={{padding:12,borderRadius:12}}>Cerrar sesión</button>
  </header>
  <section style={{padding:24,border:'1px solid #39466b',borderRadius:20,background:'#141d33',margin:'20px 0'}}>
   <h2>Publicidad · 5 ubicaciones</h2>
   <p>Los espacios están activos para reserva visual. Los banners reales se muestran cuando tienen una URL de imagen y un enlace de destino configurados.</p>
   <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(230px,1fr))',gap:14}}>
    {slots.map(slot=>{const ad=config?.banners.find(b=>b.slot===slot);return <article key={slot} style={{padding:16,border:'1px solid #435171',borderRadius:15,background:'#0b1428'}}>
     <strong>{labels[slot]}</strong><p style={{color:'#aebfdd'}}>{ad?.enabled!==false&&ad?.src&&ad?.href?'Banner configurado':'Espacio reservado'}</p>
     {ad?.src?<img src={ad.src} alt={ad.alt} style={{width:'100%',height:125,objectFit:'contain'}}/>:<div style={{height:125,border:'1px dashed #4f628c',display:'grid',placeItems:'center',color:'#a4b6d0',borderRadius:10}}>Publicidad</div>}
     {ad?.href?<p><a href={ad.href} rel="noopener noreferrer" target="_blank">Comprobar destino</a></p>:null}
    </article>})}
   </div>
  </section>
  <section style={{padding:24,border:'1px solid #39466b',borderRadius:20,background:'#141d33'}}>
   <h2>Estado de administración</h2><p>Acceso privado operativo sin base de datos. La configuración publicitaria se define mediante las variables de entorno de Vercel.</p>
   <p>Para modificar anuncios desde interruptores y guardar cambios permanentes se conectará el almacenamiento posteriormente; no se presentan controles que aparenten guardar sin hacerlo.</p>
   <a href="https://vercel.com/jsantospro/filemagik/settings/environment-variables" target="_blank" rel="noopener noreferrer">Gestionar configuración en Vercel</a>
  </section>
 </main>;
}
