import {NextResponse} from 'next/server';
import {readStoredAds} from '@/lib/advertising/blob-settings';
export const dynamic='force-dynamic';
export const runtime='nodejs';
export async function GET(){
 try{
  const {settings}=await readStoredAds();
  const choice=settings.rewarded;
  const providerReady=process.env.FILEMAGIK_REWARDED_SSV_VERIFIED==='true'&&process.env.FILEMAGIK_REWARDED_BACKEND_READY==='true';
  const available=choice.enabled&&choice.provider==='admanager'&&providerReady&&/^\/\d{4,20}\/[A-Za-z0-9/_-]{1,128}$/.test(choice.adUnitPath);
  return NextResponse.json({available,provider:available?'admanager':null,adUnitPath:available?choice.adUnitPath:null,operations:available?choice.operations:{video:false,aiExport:false,credit:false},paidFallbackUrl:choice.paidFallbackUrl||null},{headers:{'Cache-Control':'no-store'}});
 }catch{return NextResponse.json({available:false,provider:null,adUnitPath:null,operations:{video:false,aiExport:false,credit:false},paidFallbackUrl:null},{headers:{'Cache-Control':'no-store'}});}
}
