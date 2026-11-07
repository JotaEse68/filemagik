export const adSlots=['desktop','mobile','result','home','incontent'] as const;
export type AdSlot=typeof adSlots[number];
export type AdProvider='own'|'adsense'|'partner';
export type Banner={
 slot:AdSlot;
 provider?:AdProvider;
 enabled?:boolean;
 src:string;
 href:string;
 alt:string;
 publisherId?:string;
 adSlotId?:string;
};
export type PublicAds={enabled:boolean;banners:Banner[]};
export const defaultAds:PublicAds={enabled:false,banners:[]};
function validPublicUrl(value:string){
 try{
  const url=new URL(value);
  return url.protocol==='https:'&&!url.username&&!url.password&&url.hostname!=='localhost'&&!url.hostname.endsWith('.local')&&!url.hostname.endsWith('.internal');
 }catch{return false;}
}
function validMediaUrl(value:string){
 if(value.startsWith('/ads/'))return /^\/ads\/[a-zA-Z0-9/_-]+\.(jpg|jpeg|png|webp|avif)$/i.test(value)&&!value.includes('..');
 return validPublicUrl(value);
}
export function parseAds(value:unknown):PublicAds{
 if(!value||typeof value!=='object')throw new Error('Invalid advertisement configuration');
 const raw=value as Record<string,unknown>;
 if(typeof raw.enabled!=='boolean'||!Array.isArray(raw.banners)||raw.banners.length>20)throw new Error('Invalid advertisement fields');
 const used=new Set<string>();
 const banners:Banner[]=raw.banners.map((input:unknown)=>{
  if(!input||typeof input!=='object')throw new Error('Invalid banner');
  const b=input as Record<string,unknown>;
  const slot=String(b.slot),provider=String(b.provider||'own'),enabled=b.enabled!==false;
  if(!adSlots.includes(slot as AdSlot)||!['own','adsense','partner'].includes(provider)||typeof enabled!=='boolean')throw new Error('Invalid ad slot or provider');
  if(used.has(slot))throw new Error('Configure one active source per placement: '+slot);
  used.add(slot);
  if(provider==='adsense'){
   if(typeof b.publisherId!=='string'||!/^ca-pub-\d{16}$/.test(b.publisherId)||typeof b.adSlotId!=='string'||!/^\d{5,20}$/.test(b.adSlotId))throw new Error('Invalid Google publisher and ad slot');
   return {slot:slot as AdSlot,provider:'adsense',enabled,src:'',href:'',alt:'Publicidad',publisherId:b.publisherId,adSlotId:b.adSlotId};
  }
  if(typeof b.src!=='string'||!validMediaUrl(b.src)||typeof b.href!=='string'||!validPublicUrl(b.href)||typeof b.alt!=='string'||b.alt.trim().length<3||b.alt.length>160)throw new Error('Invalid banner image, destination or description');
  return {slot:slot as AdSlot,provider:provider as AdProvider,enabled,src:b.src,href:b.href,alt:b.alt.trim()};
 });
 return {enabled:raw.enabled,banners};
}
