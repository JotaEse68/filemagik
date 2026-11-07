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
 async function importPack(file:File|null){
  if(!file||!loaded)return;
  setUploading('pack');setMessage('Importando banners originales…');
  try{
   if(file.size>8_000_000)throw new Error('El ZIP debe pesar menos de 8 MB');
   const {default:JSZip}=await import('jszip');
   const zip=await JSZip.loadAsync(await file.arrayBuffer());
   const presets:{name:string;alt:string;href:string;slots:AdPlacement[]}[]=[
    {name:'grabalia-clips-horizontal.jpg',alt:'GrabaliA Clips, teleprompter y subtítulos',href:'',slots:['top','mobile','result']},
    {name:'alertiahome-horizontal.jpg',alt:'AlertiaHome, rastreador de vivienda con inteligencia artificial',href:'',slots:['top','inline']},
    {name:'alergenia-horizontal.jpg',alt:'AlergenIA, seguridad alimentaria para familias',href:'https://alergenia.com',slots:['top','inline','mobile']},
    {name:'alergenia-vertical.jpg',alt:'AlergenIA, protege a tu peque de las alergias',href:'https://alergenia.com',slots:['desktop']},
    {name:'grabalia-clips-guion-vertical.jpg',alt:'GrabaliA Clips, guion y teleprompter',href:'',slots:['desktop']},
    {name:'grabalia-clips-video-vertical.jpg',alt:'GrabaliA Clips, vídeos cortos para redes',href:'',slots:['desktop']},
    {name:'grabalia-studio-vertical.jpg',alt:'GrabaliA Studio, graba tu pantalla gratis',href:'https://grabalia.iapacks.com/es',slots:['desktop']},
    {name:'bgmagik-vertical.jpg',alt:'BGMagik, borrador de fondos gratuito',href:'https://bgmagik.vercel.app',slots:['desktop','result']}
   ];
   const newBanners:Banner[]=[];
   for(let i=0;i<presets.length;i++){
    const preset=presets[i],entry=zip.file(preset.name);
    if(!entry)throw new Error('Falta en el ZIP: '+preset.name);
    const bytes=await entry.async('uint8array');
    if(bytes.byteLength>1_500_000)throw new Error('Imagen demasiado grande: '+preset.name);
    const data=new FormData();data.append('file',new File([new Uint8Array(bytes)],preset.name,{type:'image/jpeg'}));
    setMessage('Subiendo '+(i+1)+'/8: '+preset.name);
    const response=await fetch('/api/admin/ads/upload',{method:'POST',body:data,credentials:'same-origin'});
    const body=await response.json();
    if(!response.ok)throw new Error(body.error||'Error al subir '+preset.name);
    for(const slot of preset.slots)newBanners.push({id:'jota-'+i+'-'+slot,slot,src:body.url,href:preset.href,alt:preset.alt,enabled:true});
   }
   setConfig(old=>({...old,enabled:true,slots:Object.fromEntries(adPlacements.map(slot=>[slot,{...old.slots[slot],enabled:true,mode:'own'}])) as PublicAds['slots'],banners:newBanners}));
   setMessage('8 imágenes importadas en 14 posiciones. Completa los destinos de GrabaliA Clips y AlertiaHome y pulsa Guardar configuración.');
  }catch(e){setMessage(e instanceof Error?e.message:'Error al importar el ZIP')}
  finally{setUploading('')}
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
   <div className="fm-admin-placement">
    <h3>Importar los 8 banners de Jota de una sola vez</h3>
    <p>Selecciona el ZIP «FileMagik_Banners_Originales_8.zip». Se cargarán las 8 imágenes y se asignarán a 14 espacios rotativos (escritorio y móvil), sustituyendo la lista actual. No se publican hasta guardar.</p>
    <input type="file" accept=".zip,application/zip" disabled={!loaded||Boolean(uploading)} aria-label="Importar pack de ocho banners" onChange={e=>{void importPack(e.target.files?.[0]??null);e.target.value=''}}/>
   </div>
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
       <option value="own">Banners propios enlazados</option><option value="google">Google AdSense</option><option value="external">Otra red (iframe compatible)</option><option value="off">Ocultar espacio</option>
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
     {setting.mode==='external'&&<div><label>URL HTTPS del anuncio de la red<input type="url" value={config.external.frameUrls[slot]} placeholder="https://proveedor.example/anuncio" onChange={e=>setConfig(old=>({...old,external:{...old.external,frameUrls:{...old.external.frameUrls,[slot]:e.target.value}}}))}/></label><p>Solo integraciones HTTPS en iframe; sin JavaScript externo arbitrario.</p></div>}
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
   <h3>Otras redes publicitarias</h3>
   <label>Nombre del proveedor<input type="text" maxLength={80} value={config.external.name} onChange={e=>setConfig(old=>({...old,external:{...old.external,name:e.target.value}}))} placeholder="Nombre de la red"/></label>
   <label>Identificador TCF del proveedor<input type="number" min={1} max={10000} value={config.external.vendorId??''} onChange={e=>setConfig(old=>({...old,external:{...old.external,vendorId:e.target.value?Number(e.target.value):null}}))}/></label>
   <label className="fm-admin-toggle"><input type="checkbox" checked={config.external.approved} onChange={e=>setConfig(old=>({...old,external:{...old.external,approved:e.target.checked}}))}/> Integración externa verificada y autorizada</label>
   <p>Sin integración externa validada ni consentimiento TCF del proveedor, se muestra el banner propio.</p>
  </section>
  <section>
   <div className="fm-admin-actions"><button type="button" disabled={!loaded||saving||Boolean(uploading)} onClick={()=>void save()}>{saving?'Guardando…':'Guardar configuración'}</button></div>
   <p role="status" aria-live="polite">{message||'Los anuncios propios se etiquetan siempre como Publicidad.'}</p>
  </section>
 </div>;
}
