import {NextRequest,NextResponse} from 'next/server';
import {requireAdmin} from '@/lib/supabase/server';
import {defaultAds,parseAds} from '@/lib/advertising/config';
const headers={'Cache-Control':'private, no-store'};
export async function GET(){
 const admin=await requireAdmin();if(!admin)return NextResponse.json({error:'Unauthorized'},{status:401,headers});
 const {data,error}=await admin.client.from('filemagik_settings').select('value').eq('key','ads_public').maybeSingle();
 if(error)return NextResponse.json({error:'Database unavailable'},{status:503,headers});
 try{return NextResponse.json(parseAds(data?.value??defaultAds),{headers});}catch{return NextResponse.json(defaultAds,{headers});}
}
export async function PUT(request:NextRequest){
 const admin=await requireAdmin();if(!admin)return NextResponse.json({error:'Unauthorized'},{status:401,headers});
 if(request.headers.get('origin')!==new URL(request.url).origin)return NextResponse.json({error:'Invalid origin'},{status:403,headers});
 if(Number(request.headers.get('content-length')??0)>80_000)return NextResponse.json({error:'Too large'},{status:413,headers});
 let ads;try{const raw=await request.text();if(raw.length>80_000)throw new Error('Too large');ads=parseAds(JSON.parse(raw));}
 catch{return NextResponse.json({error:'Invalid configuration'},{status:400,headers});}
 const {error}=await admin.client.from('filemagik_settings').upsert({key:'ads_public',value:ads,updated_at:new Date().toISOString(),updated_by:admin.user.id},{onConflict:'key'});
 if(error)return NextResponse.json({error:'Update blocked'},{status:500,headers});
 const audit=await admin.client.from('filemagik_admin_audit').insert({actor:admin.user.id,action:'update',resource:'ads_public',details:{enabled:ads.enabled,bannerCount:ads.banners.length}});
 if(audit.error)return NextResponse.json({error:'Settings saved but audit failed; review access'},{status:500,headers});
 return NextResponse.json({ok:true,ads},{headers});
}