const publisherPattern=/^ca-pub-\d{16}$/;
export function publisherId():string|null{
 const id=process.env.NEXT_PUBLIC_ADSENSE_PUBLISHER_ID||'';
 return publisherPattern.test(id)?id:null;
}
export function adsenseReadiness(){
 return {
  publisherConfigured:Boolean(publisherId()),
  publisherId:publisherId(),
  enabled:process.env.NEXT_PUBLIC_ADSENSE_ENABLED==='true',
  cmpConfigured:process.env.NEXT_PUBLIC_ADSENSE_CMP_VERIFIED==='true',
  approved:process.env.NEXT_PUBLIC_ADSENSE_SITE_APPROVED==='true',
  slotsConfigured:Boolean(process.env.NEXT_PUBLIC_ADSENSE_SLOT_DESKTOP&&/^\d+$/.test(process.env.NEXT_PUBLIC_ADSENSE_SLOT_DESKTOP)),
 };
}
export function canServeAdsense(){
 const r=adsenseReadiness();
 return Boolean(r.publisherConfigured&&r.enabled&&r.cmpConfigured&&r.approved&&r.slotsConfigured);
}
