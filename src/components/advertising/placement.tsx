'use client';
import {useEffect,useState} from 'react';
import AdsenseSlot from './adsense-slot';
import {defaultAds,type PublicAds,type AdPlacement} from '@/lib/advertising/config';

const fallbacks:Record<AdPlacement,{brand:string;headline:string;href:string}>={
 top:{brand:'GrabaliA Studio',headline:'Grabación y herramientas para creadores',href:'https://grabalia.iapacks.com/es'},
 desktop:{brand:'AlergenIA',headline:'Control familiar de alergias alimentarias',href:'https://alergenia.com'},
 inline:{brand:'BGMagik',headline:'Elimina fondos y edita imágenes',href:'https://bgmagik.vercel.app'},
 mobile:{brand:'AlergenIA',headline:'Protege a tu peque de las alergias',href:'https://alergenia.com'},
 result:{brand:'GrabaliA Studio',headline:'Crea y edita contenido visual',href:'https://grabalia.iapacks.com/es'}
};
type WindowWithTcf=Window&{__tcfapi?:(cmd:string,version:number,callback:(data:unknown,success:boolean)=>void)=>void};
export default function AdPlacement({placement}:{placement:AdPlacement}){
 const [config,setConfig]=useState<PublicAds>(defaultAds);
 const [index,setIndex]=useState(0);
 const [dismissed,setDismissed]=useState(false);
 const [tcfPresent,setTcfPresent]=useState(false);
 useEffect(()=>{
  let active=true;
  const controller=new AbortController();
  void fetch('/api/advertising',{cache:'no-store',signal:controller.signal})
   .then(r=>r.ok?r.json():defaultAds)
   .then(settings=>{if(!active)return;setConfig(settings?.slots&&settings?.banners?settings:defaultAds)})
   .catch(()=>{});
  return()=>{active=false;controller.abort()};
 },[]);
 const slot=config.slots[placement]??defaultAds.slots[placement];
 const enabled=config.enabled&&slot.enabled&&slot.mode!=='off';
 const banners=config.banners.filter(b=>b.slot===placement&&b.enabled!==false);
 useEffect(()=>{
  if(!enabled||slot.mode!=='own'||banners.length<=1)return;
  const timer=window.setInterval(()=>setIndex(i=>i+1),slot.rotateSeconds*1000);
  return()=>window.clearInterval(timer);
 },[enabled,slot.mode,slot.rotateSeconds,banners.length]);
 useEffect(()=>{
  if(!enabled||slot.mode!=='google')return;
  setTcfPresent(typeof (window as WindowWithTcf).__tcfapi==='function');
 },[enabled,slot.mode]);
 useEffect(()=>{
  if(placement!=='mobile'||!enabled||dismissed)return;
  document.body.classList.add('has-ad-dock');
  return()=>document.body.classList.remove('has-ad-dock');
 },[placement,enabled,dismissed]);
 if(!enabled||(placement==='mobile'&&dismissed))return null;
 const banner=banners.length?banners[index%banners.length]:null;
 const googleReady=slot.mode==='google'&&config.google.approved
  &&/^ca-pub-\d{16}$/.test(config.google.publisherId)
  &&/^\d{5,20}$/.test(config.google.slots[placement]??'')
  &&process.env.NEXT_PUBLIC_ADSENSE_CMP_VERIFIED==='true'&&tcfPresent;
 const fallback=fallbacks[placement];
 return <aside className={`fm-ad fm-ad--${placement}`} aria-label="Publicidad">
  <span className="fm-ad-label">Publicidad</span>
  {placement==='mobile'&&<button type="button" className="fm-ad-close" aria-label="Cerrar publicidad" onClick={()=>setDismissed(true)}>×</button>}
  {googleReady?<AdsenseSlot clientId={config.google.publisherId} slotId={config.google.slots[placement]} label="Publicidad"/>:
   banner?<a className="fm-ad-link" href={banner.href} target="_blank" rel="sponsored nofollow noopener noreferrer">
    {/* External URLs are validated in the public settings API. */}
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img src={banner.src} alt={banner.alt} loading={placement==='top'||placement==='mobile'?'eager':'lazy'} decoding="async"/>
   </a>:
   <a className="fm-ad-fallback" href={fallback.href} target="_blank" rel="sponsored nofollow noopener noreferrer">
    <span className="fm-ad-fallback-brand">{fallback.brand}</span>
    <span>{fallback.headline}</span><strong>Conocer más ↗</strong>
   </a>}
 </aside>;
}
