import {redirect} from 'next/navigation';
import {requireAdmin} from '@/lib/supabase/server';
import Link from 'next/link';
import MonetizationStatus from '@/components/admin/monetization-status';
import AuditPanel from '@/components/admin/audit-panel';
import SignOut from '@/components/admin/signout';
export const dynamic='force-dynamic';
export default async function AdminHome(){
 const admin=await requireAdmin();if(!admin)redirect('/admin/login');
 return <main style={{maxWidth:980,margin:'40px auto',padding:24}}>
 <header className="admin-dashboard-header"><div><span className="radial-kicker">FILEMAGIK CONTROL CENTER</span><h1>FileMagik · Superadmin</h1><p>Configuración, anuncios propios, Google AdSense y auditoría.</p></div><SignOut/></header>
 <p><Link href="/admin/publicidad" style={{color:'#b4d4ff',fontWeight:800,fontSize:19}}>Gestionar publicidad propia y AdSense →</Link></p><MonetizationStatus/><AuditPanel/>
 </main>;
}