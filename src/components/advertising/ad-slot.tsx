'use client';
import {useEffect,useState} from 'react';
import {usePathname} from 'next/navigation';
import type {AdSlot as Slot,Banner,PublicAds} from '@/lib/advertising/config';
import AdsenseSlot from './adsense-slot';
type AdsResponse=PublicAds&{rotation?:Partial<Record<Slot,{seconds:number;banners:Banner[]}>>;configured?:boolean};
const initial:AdsResponse={enabled:false,banners:[],configured:false};
// The same page can mount ten placements. Fetch a single sanitized public
// configuration per short TTL, coalescing simultaneous mounts.
let cachedAds:{value:AdsResponse;expires:number}|null=null;
let pendingAds:Promise<AdsResponse>|null=null;
function getPublicAds():Promise<AdsResponse>{
 if(cachedAds&&Date.now()<cachedAds.expires)return Promise.resolve(cachedAds.value);
 if(!pendingAds)pendingAds=fetch('/api/advertising',{cache:'no-store'})
  .then(async response=>{
   if(!response.ok)throw new Error('Publicidad temporalmente no disponible');
   const data=await response.json() as AdsResponse;
   if(typeof data.enabled!=='boolean'||!Array.isArray(data.banners))throw new Error('Publicidad inválida');
   cachedAds={value:data,expires:Date.now()+15000};
   return data;
  }).finally(()=>{pendingAds=null;});
 return pendingAds;
}
export default function AdSlot({slot,label}:{slot:Slot;label:string}){
 const pathname=usePathname();
 const [ads,setAds]=useState<AdsResponse>(initial),[loaded,setLoaded]=useState(false),[index,setIndex]=useState(0),[dismissed,setDismissed]=useState(false);
 useEffect(()=>{if(slot==='mobile')setDismissed(sessionStorage.getItem('filemagik-mobile-ad-closed')==='1');},[slot]);
 useEffect(()=>{
  let active=true;
  getPublicAds()
   .then(config=>{if(active)setAds(config);})
   .catch(()=>{}).finally(()=>{if(active)setLoaded(true);});
  return()=>{active=false};
 },[]);
 const rotating=ads.rotation?.[slot],group=rotating?.banners||[];
 useEffect(()=>{if(group.length>1){const hash=Array.from(pathname||'').reduce((n,ch)=>(Math.imul(n,31)+ch.charCodeAt(0))|0,0);setIndex(Math.abs(hash)%group.length);}},[pathname,group.length]);
 useEffect(()=>{
  if(group.length<2||!rotating||window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  const timer=window.setInterval(()=>setIndex(i=>(i+1)%group.length),Math.max(15,rotating.seconds)*1000);
  return()=>window.clearInterval(timer);
 },[rotating,group.length]);
 const ad=ads.enabled&&!dismissed?(group[index%Math.max(1,group.length)]||ads.banners.find((item:Banner)=>item.slot===slot&&item.enabled!==false)):undefined;
 const googleEnabled=process.env.NEXT_PUBLIC_ADSENSE_ENABLED==='true'
  &&process.env.NEXT_PUBLIC_ADSENSE_SITE_APPROVED==='true'
  &&process.env.NEXT_PUBLIC_ADSENSE_CMP_VERIFIED==='true';
 const isGoogle=ad?.provider==='adsense'&&googleEnabled&&Boolean(ad.publisherId&&ad.adSlotId);
 const showDock=slot==='mobile'&&Boolean(ad)&&!isGoogle;
 useEffect(()=>{
  if(!showDock)return;
  document.body.classList.add('has-ad-dock');
  return()=>document.body.classList.remove('has-ad-dock');
 },[showDock]);
 if(isGoogle&&ad?.publisherId&&ad.adSlotId)return <aside className={`first-party-ad first-party-ad-${slot}`} aria-label={label}><AdsenseSlot clientId={ad.publisherId} slotId={ad.adSlotId} label={label}/></aside>;
 if(ad?.provider==='adsense')return <aside className={`first-party-ad first-party-ad-${slot} ad-placeholder`} aria-label={label}><span className="first-party-ad-label">{label}</span><p>Espacio reservado · Google pendiente de aprobación</p></aside>;
 if(ad?.src)return <aside className={`first-party-ad first-party-ad-${slot}`} aria-label={label}><span className="first-party-ad-label">{label}</span>{slot==='mobile'&&<button type="button" className="fm-mobile-ad-close" aria-label="Cerrar banner inferior" onClick={()=>{sessionStorage.setItem('filemagik-mobile-ad-closed','1');setDismissed(true);}}>×</button>}{ad.href?<a href={ad.href} target={ad.newTab===false?'_self':'_blank'} rel="nofollow sponsored noopener noreferrer"><img src={ad.src} alt={ad.alt} loading={slot==='home'?'eager':'lazy'} decoding="async"/></a>:<img src={ad.src} alt={ad.alt} loading={slot==='home'?'eager':'lazy'} decoding="async"/>}{group.length>1&&<small className="fm-ad-rotation">Campaña {index%group.length+1} de {group.length}</small>}</aside>;
 if(loaded&&process.env.NEXT_PUBLIC_AD_SPACES_PREVIEW==='true'&&ads.enabled!==false)return <aside className={`first-party-ad first-party-ad-${slot} ad-placeholder`} aria-label={label}><span className="first-party-ad-label">{label}</span><p>Espacio publicitario disponible</p></aside>;
 return null;
}
