import {list,put} from '@vercel/blob';
import {randomUUID} from 'node:crypto';
import {adSlots,parseAds,type AdSlot,type PublicAds,type Banner} from './config';

export type Campaign={id:string;name:string;src:string;href:string;alt:string;enabled:boolean};
export type Placement={enabled:boolean;provider:'own'|'partner'|'adsense';campaignIds:string[];rotationSeconds:number;publisherId:string;adSlotId:string};
export type AdsSettings={enabled:boolean;campaigns:Campaign[];placements:Record<AdSlot,Placement>};
const prefix='filemagik/ads/settings/';
const allowedProviders=['own','partner','adsense'];
const defaultPlacement=():Placement=>({enabled:true,provider:'own',campaignIds:[],rotationSeconds:60,publisherId:'',adSlotId:''});
export function emptyAds():AdsSettings {
 return {enabled:true,campaigns:[],placements:Object.fromEntries(adSlots.map(s=>[s,defaultPlacement()])) as Record<AdSlot,Placement>};
}
function httpsUrl(value:string){
 try{const url=new URL(value);return url.protocol==='https:'&&Boolean(url.hostname)&&!url.username&&!url.password&&url.hostname!=='localhost'&&!url.hostname.endsWith('.local')}catch{return false;}
}
function validImage(value:string){return httpsUrl(value)||/^\/ads\/[a-zA-Z0-9/_-]+\.(jpg|jpeg|png|webp|avif)$/i.test(value)&&!value.includes('..');}
export function validateAds(input:unknown):AdsSettings {
 if(!input||typeof input!=='object')throw new Error('Configuración inválida');
 const o=input as Record<string,unknown>;
 if(typeof o.enabled!=='boolean'||!Array.isArray(o.campaigns)||o.campaigns.length>50||!o.placements||typeof o.placements!=='object')throw new Error('Datos de publicidad incorrectos');
 const names=new Set<string>();
 const campaigns:Campaign[]=o.campaigns.map(item=>{
  if(!item||typeof item!=='object')throw new Error('Campaña inválida');
  const b=item as Record<string,unknown>;
  const id=String(b.id||''),name=String(b.name||'').trim(),src=String(b.src||'').trim(),href=String(b.href||'').trim(),alt=String(b.alt||'').trim(),enabled=b.enabled===true;
  if(!/^[A-Za-z0-9_-]{3,64}$/.test(id)||names.has(id)||name.length<2||name.length>100||alt.length>160||typeof b.enabled!=='boolean')throw new Error('Identificador, nombre o descripción incorrectos');
  names.add(id);
  if(src&&!validImage(src))throw new Error('La imagen debe tener una URL HTTPS válida o una ruta /ads/');
  if(href&&!httpsUrl(href))throw new Error('El destino debe ser HTTPS');
  if(enabled&&(!src||!href||alt.length<3))throw new Error('Para activar una campaña debes indicar imagen, enlace y descripción');
  return {id,name,src,href,alt,enabled};
 });
 const placements={} as Record<AdSlot,Placement>;
 const raw=o.placements as Record<string,unknown>;
 for(const slot of adSlots){
  const p=raw[slot] as Record<string,unknown>|undefined;
  if(!p||typeof p!=='object')throw new Error('Falta espacio: '+slot);
  const provider=String(p.provider),campaignIds=p.campaignIds;
  const rotationSeconds=Number(p.rotationSeconds);
  if(typeof p.enabled!=='boolean'||!allowedProviders.includes(provider)||!Array.isArray(campaignIds)||campaignIds.length>50||!Number.isInteger(rotationSeconds)||rotationSeconds<15||rotationSeconds>600)throw new Error('Configuración incorrecta en '+slot);
  const ids=campaignIds.map(x=>String(x));
  if(new Set(ids).size!==ids.length||ids.some(id=>!names.has(id)))throw new Error('Campaña inexistente en '+slot);
  const publisherId=String(p.publisherId||''),adSlotId=String(p.adSlotId||'');
  if(p.enabled&&provider==='adsense'&&( !/^ca-pub-\d{16}$/.test(publisherId)||!/^\d{5,20}$/.test(adSlotId)))throw new Error('Datos AdSense incompletos en '+slot);
  placements[slot]={enabled:p.enabled,provider:provider as Placement['provider'],campaignIds:ids,rotationSeconds,publisherId,adSlotId};
 }
 return {enabled:o.enabled,campaigns,placements};
}
export async function readStoredAds():Promise<{settings:AdsSettings;revision:string}>{
 if(!process.env.BLOB_READ_WRITE_TOKEN)throw new Error('Vercel Blob no está configurado');
 let cursor: string|undefined,blobs:Array<{pathname:string;url:string;uploadedAt:Date}>=[];
 do{
  const page=await list({prefix,limit:1000,cursor});
  blobs=blobs.concat(page.blobs);
  cursor=page.hasMore?page.cursor:undefined;
 }while(cursor);
 const latest=blobs.filter(b=>b.pathname.startsWith(prefix+'ads-')&&b.pathname.endsWith('.json')).sort((a,b)=>b.pathname.localeCompare(a.pathname))[0];
 if(!latest)return {settings:emptyAds(),revision:''};
 const response=await fetch(latest.url,{cache:'no-store'});
 if(!response.ok)throw new Error('No se puede recuperar la configuración publicada');
 return {settings:validateAds(await response.json()),revision:latest.pathname};
}
export async function saveStoredAds(input:unknown,revision:string){
 const current=await readStoredAds();
 if(current.revision!==revision)throw new Error('CONFLICT: La configuración ha cambiado; recarga antes de guardar');
 const settings=validateAds(input);
 const pathname=prefix+'ads-'+new Date().toISOString().replace(/\D/g,'').padEnd(17,'0')+'-'+randomUUID()+'.json';
 await put(pathname,JSON.stringify(settings),{access:'public',contentType:'application/json',cacheControlMaxAge:60});
 return {settings,revision:pathname};
}
export function publicAds(state:AdsSettings):PublicAds&{rotation:Partial<Record<AdSlot,{seconds:number;banners:Banner[]}>>}{
 const banners:Banner[]=[],rotation:Partial<Record<AdSlot,{seconds:number;banners:Banner[]}>>={};
 if(!state.enabled)return {enabled:false,banners,rotation};
 for(const slot of adSlots){
  const p=state.placements[slot];if(!p.enabled)continue;
  if(p.provider==='adsense'){
   banners.push({slot,provider:'adsense',enabled:true,src:'',href:'',alt:'Publicidad',publisherId:p.publisherId,adSlotId:p.adSlotId});continue;
  }
  const group=p.campaignIds.map(id=>state.campaigns.find(c=>c.id===id)).filter((c):c is Campaign=>Boolean(c&&c.enabled&&c.src&&c.href));
  const items=group.map(c=>({slot,provider:p.provider,enabled:true,src:c.src,href:c.href,alt:c.alt} as Banner));
  if(items.length){banners.push(items[0]);rotation[slot]={seconds:p.rotationSeconds,banners:items};}
 }
 return {enabled:true,banners,rotation};
}
