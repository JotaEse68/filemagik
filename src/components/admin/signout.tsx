'use client';
import {useRouter} from 'next/navigation';
import {createBrowserClient} from '@supabase/ssr';
export default function SignOut(){
 const router=useRouter();
 async function logout(){
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if(!url||!key)return;
  const client=createBrowserClient(url,key);
  await client.auth.signOut();
  router.replace('/admin/login');router.refresh();
 }
 return <button type="button" onClick={()=>void logout()} className="btn btn-ghost">Cerrar sesión</button>;
}
