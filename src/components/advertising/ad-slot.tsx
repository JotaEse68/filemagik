'use client';
import {useEffect,useState} from 'react';
import type {AdSlot as Slot,Banner,PublicAds} from '@/lib/advertising/config';
import AdsenseSlot from './adsense-slot';
type AdvertiserResponse=PublicAds&{configured?:boolean};
const initial:AdvertiserResponse={enabled:false,banners:[],configured:false};
export default function AdSlot({slot,label}:{slot:Slot;label:string}){
 const [ads,setAds]=useState<AdvertiserResponse>(initial),[loaded,setLoaded]=useState(false);
 useEffect(()=>{
  let active=true;
  void fetch('/api/advertising',{cache:'no-store'})
   .then(r=>r.ok?r.json():Promise.reject(new Error('Advertising unavailable')))
   .then((config:AdvertiserResponse)=>{if(active&&typeof config.enabled==='boolean'&&Array.isArray(config.banners))setAds(config)})
   .catch(()=>{})
   .finally(()=>{if(active)setLoaded(true)});
  return()=>{active=false};
 },[]);
 const configured=ads.configured===true,ad=ads.enabled?ads.banners.find((item:Banner)=>item.slot===slot&&item.enabled!==false):undefined;
 const googleEnabled=process.env.NEXT_PUBLIC_ADSENSE_ENABLED==='true'
   &&process.env.NEXT_PUBLIC_ADSENSE_SITE_APPROVED==='true'
   &&process.env.NEXT_PUBLIC_ADSENSE_CMP_VERIFIED==='true';
 const isGoogle=ad?.provider==='adsense'&&googleEnabled&&Boolean(ad.publisherId&&ad.adSlotId);
 useEffect(()=>{
  if(slot!=='mobile'||!ad||isGoogle)return;
  document.body.classList.add('has-ad-dock');
  return()=>document.body.classList.remove('has-ad-dock');
 },[slot,ad,isGoogle]);
 if(ad?.provider==='adsense'&&!isGoogle)return <aside className={`first-party-ad first-party-ad-${slot} ad-placeholder`} aria-label={label}><span className="first-party-ad-label">{label}</span><p>Espacio Google AdSense pendiente de activación</p></aside>;
 if(isGoogle&&ad?.publisherId&&ad?.adSlotId)return <aside className={`first-party-ad first-party-ad-${slot}`} aria-label={label}><AdsenseSlot clientId={ad.publisherId} slotId={ad.adSlotId} label={label}/></aside>;
 if(ad&&ad.src&&ad.href)return <aside className={`first-party-ad first-party-ad-${slot}`} aria-label={label}>
   <span className="first-party-ad-label">{label}</span>
   <a href={ad.href} target="_blank" rel="nofollow sponsored noopener noreferrer"><img src={ad.src} alt={ad.alt} loading={slot==='home'?'eager':'lazy'} decoding="async"/></a>
  </aside>;
 // While FileMagik has no ad database, show the real placement instead of hiding it silently.
 // As soon as the admin saves an explicit on/off configuration, obey the switches.
 if(loaded&&!configured&&process.env.NEXT_PUBLIC_AD_SPACES_PREVIEW!=='false')return <aside className={`first-party-ad first-party-ad-${slot} ad-placeholder`} aria-label={label}>
  <span className="first-party-ad-label">{label}</span><p>Espacio publicitario · {slot}</p>
 </aside>;
 return null;
}