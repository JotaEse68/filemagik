import {redirect} from 'next/navigation';
import Link from 'next/link';
import {requireAdmin} from '@/lib/supabase/server';
import AdsAdmin from '@/components/admin/ads-panel';
export const dynamic='force-dynamic';
export const metadata={title:'FileMagik · Administrar publicidad',robots:{index:false,follow:false}};
export default async function AdvertisingAdminPage(){
 const admin=await requireAdmin();if(!admin)redirect('/admin/login');
 return <main style={{maxWidth:1150,margin:'30px auto',padding:'18px'}}>
  <Link href="/admin" style={{color:'#a7cbff',display:'inline-block',marginBottom:20}}>← Volver al superadmin</Link>
  <h1 style={{fontSize:'clamp(28px,3vw,43px)'}}>FileMagik · Publicidad</h1>
  <p style={{color:'#c3d5f0'}}>Activa o desactiva cada ubicación, sube tus banners originales, enlázalos y configura AdSense cuando esté aprobado.</p>
  <AdsAdmin/>
 </main>;
}
