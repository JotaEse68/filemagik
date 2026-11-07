'use client';
import {useEffect,useState} from 'react';
import type {AdSlot as Slot,Banner,PublicAds} from '@/lib/advertising/config';
import AdsenseSlot from './adsense-slot';
type AdsResponse=PublicAds&{configured?:boolean;standalone?:boolean};
const initial:AdsResponse={enabled:false,banners:[],configured:false};
export default function AdSlot({slot,label}:{slot:Slot;label:string}){
 const [ads,setAds]=useState<AdsResponse>(initial),[loaded,setLoaded]=useState(false);
 useEffect(()=>{
  let active=true;
  fetch('/api/advertising',{cache:'no-store'}).then(r=>r.ok?r.json():Promise.reject())
   .then((config:AdsResponse)=>{if(active&&typeof config.enabled==='boolean'&&Array.isArray(config.banners))setAds(config);})
   .catch(()=>{}).finally(()=>{if(active)setLoaded(true);});
  return()=>{active=false};
 },[]);
 const ad=ads.enabled?ads.banners.find((item:Banner)=>item.slot===slot&&item.enabled!==false):undefined;
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
 if(ad?.src&&ad.href)return <aside className={`first-party-ad first-party-ad-${slot}`} aria-label={label}><span className="first-party-ad-label">{label}</span><a href={ad.href} target="_blank" rel="nofollow sponsored noopener noreferrer"><img src={ad.src} alt={ad.alt} loading={slot==='home'?'eager':'lazy'} decoding="async"/></a></aside>;
 if(loaded&&process.env.NEXT_PUBLIC_AD_SPACES_PREVIEW!=='false'&&ads.enabled!==false)return <aside className={`first-party-ad first-party-ad-${slot} ad-placeholder`} aria-label={label}><span className="first-party-ad-label">{label}</span><p>Espacio publicitario disponible</p></aside>;
 return null;
}
