export type Banner={slot:'desktop'|'mobile'|'result';src:string;href:string;alt:string};
export type PublicAds={enabled:boolean;banners:Banner[]};
export const defaultAds:PublicAds={enabled:false,banners:[]};
function validPublicUrl(value:string){
 try{const parsed=new URL(value);return parsed.protocol==='https:'&&parsed.username===''&&parsed.password===''&&parsed.hostname!=='localhost'&&!parsed.hostname.endsWith('.local')&&!parsed.hostname.endsWith('.internal');}
 catch{return false;}
}
export function parseAds(value:unknown):PublicAds{
 if(!value||typeof value!=='object')throw new Error('Invalid advertisement configuration');
 const record=value as Record<string,unknown>;
 if(typeof record.enabled!=='boolean'||!Array.isArray(record.banners)||record.banners.length>10)throw new Error('Invalid advertisement fields');
 const banners:Banner[]=record.banners.map((input:unknown)=>{
  if(!input||typeof input!=='object')throw new Error('Invalid banner');
  const b=input as Record<string,unknown>;
  if(!['desktop','mobile','result'].includes(String(b.slot))||typeof b.src!=='string'||typeof b.href!=='string'||typeof b.alt!=='string'||b.alt.trim().length<3||b.alt.length>160||!validPublicUrl(b.src)||!validPublicUrl(b.href))throw new Error('Invalid banner details');
  return {slot:b.slot as Banner['slot'],src:b.src,href:b.href,alt:b.alt.trim()};
 });
 return {enabled:record.enabled,banners};
}