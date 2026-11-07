import {NextResponse} from 'next/server';
import {createClient} from '@supabase/supabase-js';
import {supabaseConfig} from '@/lib/supabase/env';
import {adSlots,parseAds,type Banner,type PublicAds} from '@/lib/advertising/config';

export const dynamic='force-dynamic';
const noCache={'Cache-Control':'no-store'};
function standaloneAds():PublicAds {
 const banners:Banner[]=[];
 for (const slot of adSlots) {
  const key=slot.toUpperCase();
  const src=process.env['FILEMAGIK_AD_'+key+'_IMAGE']||'';
  const href=process.env['FILEMAGIK_AD_'+key+'_URL']||'';
  const alt=process.env['FILEMAGIK_AD_'+key+'_ALT']||'FileMagik · Publicidad';
  if(src&&href) banners.push({slot,provider:'own',enabled:true,src,href,alt});
 }
 try{return parseAds({enabled:process.env.FILEMAGIK_ADS_ENABLED!=='false',banners});}
 catch{return {enabled:false,banners:[]};}
}
export async function GET(){
 const standalone=standaloneAds();
 const config=supabaseConfig();
 if(!config)return NextResponse.json({...standalone,configured:standalone.banners.length>0,standalone:true},{headers:noCache});
 try{
  const client=createClient(config.url,config.key,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data,error}=await client.from('filemagik_settings').select('value').eq('key','ads_public').maybeSingle();
  if(error||!data)return NextResponse.json({...standalone,configured:standalone.banners.length>0,standalone:true},{headers:noCache});
  return NextResponse.json({...parseAds(data.value),configured:true,standalone:false},{headers:noCache});
 }catch{return NextResponse.json({...standalone,configured:standalone.banners.length>0,standalone:true},{headers:noCache});}
}
