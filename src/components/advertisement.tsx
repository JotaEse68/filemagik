import type {Dictionary} from '@/lib/i18n';
import AdSlot from '@/components/advertising/ad-slot';
export default function Advertisement({d}:{d:Dictionary}){return <AdSlot slot="desktop" label={d.adsLabel}/>;}
