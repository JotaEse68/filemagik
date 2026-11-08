import {NextResponse} from 'next/server';
import {readStoredAds,publicAds} from '@/lib/advertising/blob-settings';
import {adSlots,parseAds,type Banner,type PublicAds} from '@/lib/advertising/config';
export const dynamic='force-dynamic';
export const runtime='nodejs';
const headers={'Cache-Control':'public, max-age=0, s-maxage=15'};
function environmentFallback():PublicAds {
 const banners:Banner[]=[];
 for(const slot of adSlots){
  const key=slot.toUpperCase(),src=process.env['FILEMAGIK_AD_'+key+'_IMAGE']||'',href=process.env['FILEMAGIK_AD_'+key+'_URL']||'';
  if(src&&href)banners.push({slot,provider:'own',enabled:true,src,href,alt:process.env['FILEMAGIK_AD_'+key+'_ALT']||'Publicidad FileMagik'});
 }
 try{return parseAds({enabled:process.env.FILEMAGIK_ADS_ENABLED!=='false',banners});}
 catch{return {enabled:true,banners:[]};}
}
export async function GET(){
 try{
  const {settings,revision}=await readStoredAds();
  return NextResponse.json({...publicAds(settings),configured:Boolean(revision),standalone:false},{headers});
 }catch{
  return NextResponse.json({...environmentFallback(),configured:false,standalone:true},{headers});
 }
}
