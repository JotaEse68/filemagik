import {NextResponse} from 'next/server';
import {createClient} from '@supabase/supabase-js';
import {supabaseConfig} from '@/lib/supabase/env';
import {defaultAds,parseAds} from '@/lib/advertising/config';
export async function GET(){
 const config=supabaseConfig();if(!config)return NextResponse.json(defaultAds,{headers:{'Cache-Control':'no-store'}});
 const client=createClient(config.url,config.key,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data,error}=await client.from('filemagik_settings').select('value').eq('key','ads_public').maybeSingle();
 if(error)return NextResponse.json({...defaultAds,enabled:false},{headers:{'Cache-Control':'no-store'}});
 if(!data)return NextResponse.json(defaultAds,{headers:{'Cache-Control':'no-store'}});
 try{return NextResponse.json(parseAds(data.value),{headers:{'Cache-Control':'no-store'}});}
 catch{return NextResponse.json(defaultAds,{headers:{'Cache-Control':'no-store'}});}
}