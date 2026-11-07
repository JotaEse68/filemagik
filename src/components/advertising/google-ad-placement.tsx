import {canServeAdsense,publisherId} from '@/lib/advertising/adsense';
import AdsenseSlot from './adsense-slot';
type Placement='home'|'incontent'|'desktop'|'mobile';
const names:Record<Placement,string>={home:'Anuncio patrocinado',incontent:'Publicidad',desktop:'Publicidad',mobile:'Publicidad'};
const variables:Record<Placement,string|undefined>={
 home:process.env.NEXT_PUBLIC_ADSENSE_SLOT_HOME,
 incontent:process.env.NEXT_PUBLIC_ADSENSE_SLOT_INCONTENT,
 desktop:process.env.NEXT_PUBLIC_ADSENSE_SLOT_DESKTOP,
 mobile:process.env.NEXT_PUBLIC_ADSENSE_SLOT_MOBILE
};
export default function GoogleAdPlacement({placement}:{placement:Placement}){
 const slot=variables[placement],id=publisherId();
 if(!canServeAdsense()||!id||!slot||!/^\d{5,20}$/.test(slot))return null;
 return <div className={`ad-placement ad-placement-${placement}`}><AdsenseSlot clientId={id} slotId={slot} label={names[placement]}/></div>;
}
