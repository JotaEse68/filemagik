import {redirect} from 'next/navigation';
import {requireAdmin} from '@/lib/supabase/server';
import AdsAdmin from '@/components/admin/ads-panel';
export const dynamic='force-dynamic';
export default async function AdminHome(){
 const admin=await requireAdmin();if(!admin)redirect('/admin/login');
 return <main style={{maxWidth:980,margin:'40px auto',padding:24}}>
 <header><h1>FileMagik · Superadmin</h1><p>Configuración protegida y publicidad propia. Google permanece desactivado.</p></header>
 <AdsAdmin/>
 </main>;
}