'use client';
import {useEffect,useState} from 'react';
type Audit={id:number;created_at:string;action:string;resource:string;details:Record<string,unknown>};
export default function AuditPanel(){
 const [rows,setRows]=useState<Audit[]>([]),[error,setError]=useState('');
 useEffect(()=>{let live=true;void fetch('/api/admin/audit',{cache:'no-store'}).then(r=>{if(!r.ok)throw new Error('Auditoría pendiente de configuración');return r.json()}).then(data=>{if(live)setRows(data.events??[])}).catch(e=>{if(live)setError(e.message)});return()=>{live=false};},[]);
 return <section className="admin-card"><h2>Últimos movimientos de administración</h2><p>Registro de cambios sensibles: publicidad y configuración.</p>
 {error&&<p role="status">{error}</p>}
 {!error&&!rows.length&&<p>Aún no se han registrado cambios.</p>}
 <div className="admin-audit-list">{rows.map(row=><div key={row.id}><time dateTime={row.created_at}>{new Date(row.created_at).toLocaleString('es-ES')}</time><strong>{row.action}</strong><span>{row.resource}</span></div>)}</div></section>;
}
