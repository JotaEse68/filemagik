'use client';
import {useEffect,useRef,useState} from 'react';
type TCData={listenerId?:number;gdprApplies?:boolean;tcString?:string;eventStatus?:string;cmpStatus?:string;purpose?:{consents?:Record<string,boolean>};vendor?:{consents?:Record<string,boolean>}};
type TcfAPI=(cmd:string,version:number,callback:(data:TCData,success:boolean)=>void,parameter?:number)=>void;
type GlobalWindow=Window&{__tcfapi?:TcfAPI;adsbygoogle?:Record<string,unknown>[]};
export default function AdsenseSlot({clientId,slotId,label}:{clientId:string;slotId:string;label:string}){
 const ref=useRef<HTMLModElement>(null),[allowed,setAllowed]=useState(false);
 useEffect(()=>{
  const win=window as GlobalWindow;
  if(typeof win.__tcfapi!=='function')return;
  let active=true,listenerId:number|undefined;
  win.__tcfapi('addEventListener',2,(data,success)=>{
   if(!active)return;
   if(data&&typeof data.listenerId==='number')listenerId=data.listenerId;
   const purpose=data?.purpose?.consents||{},vendor=data?.vendor?.consents||{};
   const consent=Boolean(success&&data?.tcString&&purpose['1']&&purpose['3']&&purpose['4']&&vendor['755']&&
    data?.cmpStatus==='loaded'&&['tcloaded','useractioncomplete'].includes(data.eventStatus||''));
   // A revoked or invalid TCF signal must hide the placement immediately,
   // even if this slot was previously authorized.
   setAllowed(consent);
  });
  return()=>{active=false;if(typeof listenerId==='number')win.__tcfapi?.('removeEventListener',2,()=>{},listenerId);};
 },[]);
 useEffect(()=>{
  if(!allowed||!ref.current||ref.current.dataset.initialized)return;
  const win=window as GlobalWindow;
  const src='https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client='+encodeURIComponent(clientId);
  const current=document.querySelector<HTMLScriptElement>('script[data-filemagik-adsense="true"]');
  const initiate=()=>{if(!ref.current||ref.current.dataset.initialized)return;ref.current.dataset.initialized='true';try{(win.adsbygoogle=win.adsbygoogle||[]).push({});}catch{/* Google network failure does not affect conversion */}};
  if(current){if(current.dataset.loaded==='true')initiate();else current.addEventListener('load',initiate,{once:true});return;}
  const script=document.createElement('script');script.src=src;script.async=true;script.crossOrigin='anonymous';script.dataset.filemagikAdsense='true';script.addEventListener('load',()=>{script.dataset.loaded='true';initiate();},{once:true});document.head.appendChild(script);
 },[allowed,clientId]);
 if(!allowed)return null;
 return <aside className="google-ad-slot" aria-label={label}><span>{label}</span><ins ref={ref} className="adsbygoogle" style={{display:'block'}} data-ad-client={clientId} data-ad-slot={slotId} data-ad-format="auto" data-full-width-responsive="true"/></aside>;
}
