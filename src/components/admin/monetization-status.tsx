import {adsenseReadiness} from '@/lib/advertising/adsense';
import {requireAdmin} from '@/lib/supabase/server';
import {defaultAds,parseAds} from '@/lib/advertising/config';
import Link from 'next/link';
export default async function MonetizationStatus(){
 const admin=await requireAdmin();
 let config=defaultAds;
 if(admin){
  const {data}=await admin.client.from('filemagik_settings').select('value').eq('key','ads_public').maybeSingle();
  if(data){try{config=parseAds(data.value)}catch{}}
 }
 const google=adsenseReadiness();
 const slots=Object.values(config.slots);
 const checks=[
  ['Espacios de publicidad habilitados',config.enabled&&slots.some(slot=>slot.enabled)],
  ['Editor de Google AdSense / ca-pub-',Boolean(config.google.publisherId||google.publisherConfigured)],
  ['Dominio aprobado por Google',config.google.approved||google.approved],
  ['CMP certificada y TCF verificado',google.cmpConfigured],
  ['Bloques de Google configurados',Object.values(config.google.slots).some(Boolean)||google.slotsConfigured],
  ['Banners propios cargados',config.banners.length>0]
 ] as const;
 return <section className="admin-card">
  <h2>Publicidad · Estado real</h2>
  <p>Los banners propios pueden mostrarse sin cuenta de Google. Los anuncios de terceros se cargan únicamente cuando están aprobados y existe consentimiento válido.</p>
  <div className="admin-checklist">{checks.map(([label,ready])=><div key={label}><span aria-hidden="true">{ready?'✓':'○'}</span><span>{label}</span><strong>{ready?'Configurado':'Pendiente'}</strong></div>)}</div>
  <p className="admin-muted">Los anuncios propios se gestionan en FileMagik. Para un editor de anuncios se utiliza AdSense; Google Ads es la plataforma para comprar publicidad.</p>
  <Link href="/admin/publicidad" className="admin-doc-link">Administrar todas las ubicaciones</Link>
 </section>;
}
