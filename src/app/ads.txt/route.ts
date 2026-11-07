import {createClient} from '@supabase/supabase-js';
import {publisherId} from '@/lib/advertising/adsense';
import {supabaseConfig} from '@/lib/supabase/env';
import {parseAds} from '@/lib/advertising/config';
export const dynamic='force-dynamic';
export async function GET(){
 let id=publisherId();
 const config=supabaseConfig();
 if(config){
  const client=createClient(config.url,config.key,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data,error}=await client.from('filemagik_settings').select('value').eq('key','ads_public').maybeSingle();
  if(!error&&data){
   try{const ads=parseAds(data.value);if(ads.google.publisherId)id=ads.google.publisherId;}catch{}
  }
 }
 const body=id?'google.com, '+id.replace('ca-','')+', DIRECT, f08c47fec0942fa0\n':'';
 return new Response(body,{headers:{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'public, max-age=600'}});
}
