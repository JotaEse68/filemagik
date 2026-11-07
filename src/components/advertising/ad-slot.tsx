'use client';
import {useEffect,useState} from 'react';
import type {Banner,PublicAds} from '@/lib/advertising/config';
type Slot=Banner['slot'];
export default function AdSlot({slot,label}:{slot:Slot;label:string}){
 const [ads,setAds]=useState<PublicAds>({enabled:false,banners:[]});
 useEffect(()=>{let active=true;void fetch('/api/advertising').then(r=>r.json()).then(config=>{if(active&&config?.enabled===true&&Array.isArray(config.banners))setAds(config)}).catch(()=>{});return()=>{active=false};},[]);
 const banners=ads.enabled?ads.banners.filter(b=>b.slot===slot):[];
 useEffect(()=>{if(slot!=='mobile'||!banners.length)return;document.body.classList.add('has-ad-dock');return()=>{document.body.classList.remove('has-ad-dock')}},[slot,banners.length]);
 if(!banners.length)return null;
 const ad=banners[0];
 return <aside className={`first-party-ad first-party-ad-${slot}`} aria-label={label}>
  <span className="first-party-ad-label">{label}</span>
  <a href={ad.href} target="_blank" rel="nofollow sponsored noopener noreferrer"><img src={ad.src} alt={ad.alt} loading="lazy" decoding="async"/></a>
 </aside>;
}