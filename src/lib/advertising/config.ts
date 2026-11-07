export const adPlacements=['top','desktop','inline','mobile','result'] as const;
export type AdPlacement=(typeof adPlacements)[number];
export type AdMode='own'|'google'|'external'|'off';
export type Banner={id?:string;slot:AdPlacement;src:string;href:string;alt:string;enabled?:boolean};
export type SlotSetting={enabled:boolean;mode:AdMode;rotateSeconds:number};
export type GoogleAds={publisherId:string;approved:boolean;slots:Record<AdPlacement,string>};
export type ExternalNetwork={name:string;approved:boolean;frameUrls:Record<AdPlacement,string>};
export type PublicAds={enabled:boolean;slots:Record<AdPlacement,SlotSetting>;banners:Banner[];google:GoogleAds;external:ExternalNetwork};
const defaultSlot=(enabled:boolean):SlotSetting=>({enabled,mode:'own',rotateSeconds:60});
export const defaultAds:PublicAds={
 enabled:true,
 slots:{top:defaultSlot(true),desktop:defaultSlot(true),inline:defaultSlot(true),mobile:defaultSlot(true),result:defaultSlot(true)},
 banners:[],
 google:{publisherId:'',approved:false,slots:{top:'',desktop:'',inline:'',mobile:'',result:''}},
 external:{name:'',approved:false,frameUrls:{top:'',desktop:'',inline:'',mobile:'',result:''}}
};
function validPublicUrl(value:string){
 try{const parsed=new URL(value);return parsed.protocol==='https:'&&!parsed.username&&!parsed.password&&parsed.hostname!=='localhost'&&!parsed.hostname.endsWith('.local')&&!parsed.hostname.endsWith('.internal');}
 catch{return false;}
}
function validImage(value:string){
 return validPublicUrl(value)||/^\/ads\/[a-zA-Z0-9][a-zA-Z0-9._-]{0,119}\.(webp|png|jpe?g)$/i.test(value);
}
function normalizeSlots(input:unknown):Record<AdPlacement,SlotSetting>{
 const raw=input&&typeof input==='object'?input as Record<string,unknown>:{};
 return Object.fromEntries(adPlacements.map(key=>{
  const x=raw[key]&&typeof raw[key]==='object'?raw[key] as Record<string,unknown>:{};
  const fallback=defaultAds.slots[key];
  const enabled=typeof x.enabled==='boolean'?x.enabled:fallback.enabled;
  const mode=['own','google','external','off'].includes(String(x.mode))?x.mode as AdMode:fallback.mode;
  const seconds=x.rotateSeconds??fallback.rotateSeconds;
  if(!Number.isInteger(seconds)||Number(seconds)<30||Number(seconds)>300)throw new Error('Invalid rotation interval');
  return [key,{enabled,mode,rotateSeconds:Number(seconds)}];
 })) as Record<AdPlacement,SlotSetting>;
}
export function parseAds(value:unknown):PublicAds{
 if(!value||typeof value!=='object')throw new Error('Invalid advertisement configuration');
 const input=value as Record<string,unknown>;
 if(typeof input.enabled!=='boolean'||!Array.isArray(input.banners)||input.banners.length>25)throw new Error('Invalid advertisement fields');
 const slots=normalizeSlots(input.slots);
 const counts:Record<string,number>={};
 const banners:Banner[]=input.banners.map((entry:unknown,index:number)=>{
  if(!entry||typeof entry!=='object')throw new Error('Invalid banner');
  const b=entry as Record<string,unknown>;
  if(!adPlacements.includes(b.slot as AdPlacement)||typeof b.src!=='string'||typeof b.href!=='string'||typeof b.alt!=='string'||b.alt.trim().length<3||b.alt.length>160||!validImage(b.src)||!validPublicUrl(b.href))throw new Error('Invalid banner details');
  counts[String(b.slot)]=(counts[String(b.slot)]??0)+1;
  if(counts[String(b.slot)]>5)throw new Error('Maximum five banners per placement');
  return {id:typeof b.id==='string'&&/^[a-zA-Z0-9_-]{1,64}$/.test(b.id)?b.id:'ad-'+(index+1),slot:b.slot as AdPlacement,src:b.src,href:b.href,alt:b.alt.trim(),enabled:b.enabled!==false};
 });
 const rawGoogle=input.google&&typeof input.google==='object'?input.google as Record<string,unknown>:{};
 const publisher=typeof rawGoogle.publisherId==='string'?rawGoogle.publisherId.trim():'';
 if(publisher&&!/^ca-pub-\d{16}$/.test(publisher))throw new Error('Invalid AdSense publisher ID');
 const units=rawGoogle.slots&&typeof rawGoogle.slots==='object'?rawGoogle.slots as Record<string,unknown>:{};
 const googleSlots=Object.fromEntries(adPlacements.map(key=>{
  const id=typeof units[key]==='string'?units[key].trim():'';
  if(id&&!/^\d{5,20}$/.test(id))throw new Error('Invalid AdSense unit ID');
  return [key,id];
 })) as Record<AdPlacement,string>;
 const ext=input.external&&typeof input.external==='object'?input.external as Record<string,unknown>:{};
 const rawFrames=ext.frameUrls&&typeof ext.frameUrls==='object'?ext.frameUrls as Record<string,unknown>:{};
 const frameUrls=Object.fromEntries(adPlacements.map(key=>{const url=typeof rawFrames[key]==='string'?rawFrames[key].trim():'';if(url&&!validPublicUrl(url))throw new Error('Invalid external advertising URL');return [key,url];})) as Record<AdPlacement,string>;
 const name=typeof ext.name==='string'?ext.name.trim():'';if(name.length>80)throw new Error('External network name too long');
 return {enabled:input.enabled,slots,banners,google:{publisherId:publisher,approved:rawGoogle.approved===true,slots:googleSlots},external:{name,approved:ext.approved===true,frameUrls}};
}
