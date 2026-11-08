import {redirect} from 'next/navigation';
import {requireAdmin} from '@/lib/supabase/server';
import {isLocalAdmin} from '@/lib/admin/local-session';
import StandaloneDashboard from '@/components/admin/standalone-dashboard';
import AdsAdmin from '@/components/admin/ads-panel';
import MonetizationStatus from '@/components/admin/monetization-status';
import AuditPanel from '@/components/admin/audit-panel';
import SignOut from '@/components/admin/signout';
export const dynamic='force-dynamic';
export default async function AdminHome(){
 if(await isLocalAdmin())return <StandaloneDashboard/>;
 const admin=await requireAdmin();if(!admin)redirect('/admin/login');
 return <main style={{maxWidth:980,margin:'40px auto',padding:24}}>
 <header className="admin-dashboard-header"><div><span className="radial-kicker">FILEMAGIK CONTROL CENTER</span><h1>FileMagik · Superadmin</h1><p>Configuración, anuncios propios, Google AdSense y auditoría.</p></div><SignOut/></header>
 <MonetizationStatus/><AdsAdmin/><AuditPanel/>
 </main>;
}
