import {adsenseReadiness} from '@/lib/advertising/adsense';
import Link from 'next/link';
export default function MonetizationStatus(){
 const status=adsenseReadiness();
 const checks=[
  ['Cuenta publicitaria / ca-pub-',status.publisherConfigured],
  ['Dominio aprobado en AdSense',status.approved],
  ['CMP certificada y TCF verificado',status.cmpConfigured],
  ['ID de espacio publicitario configurado',status.slotsConfigured],
  ['Activación manual final',status.enabled]
 ] as const;
 return <section className="admin-card"><h2>Google AdSense · Estado de activación</h2><p>No se cargará ninguna etiqueta de Google mientras falte cualquiera de las condiciones.</p>
 <div className="admin-checklist">{checks.map(([label,ready])=><div key={label}><span aria-hidden="true">{ready?'✓':'○'}</span><span>{label}</span><strong>{ready?'Configurado':'Pendiente'}</strong></div>)}</div>
 <p className="admin-muted">FileMagik no dispone todavía de una cuenta AdSense verificada a través de esta integración. La activación requiere revisión del dominio, CMP certificada y los valores de entorno correspondientes.</p>
 <Link href="https://support.google.com/adsense/answer/13554116" target="_blank" rel="noreferrer" className="admin-doc-link">Requisitos oficiales de consentimiento de Google</Link>
 </section>;
}
