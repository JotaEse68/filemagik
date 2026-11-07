'use client';
import {useState} from 'react';
import {createBrowserClient} from '@supabase/ssr';
export default function Login(){
 const [email,setEmail]=useState(''),[message,setMessage]=useState(''),[loading,setLoading]=useState(false);
 async function signIn(event:React.FormEvent){
  event.preventDefault();setLoading(true);setMessage('');
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if(!url||!key){setMessage('El panel necesita una base de datos FileMagik configurada.');setLoading(false);return;}
  const client=createBrowserClient(url,key);
  const {error}=await client.auth.signInWithOtp({email,emailRedirectTo:`${window.location.origin}/auth/callback`});
  setMessage(error?'No se pudo enviar el acceso. Revisa la configuración.':'Revisa tu correo para iniciar sesión.');
  setLoading(false);
 }
 return <main style={{maxWidth:420,margin:'12vh auto',padding:28,background:'#1a263f',borderRadius:20}}>
 <h1>FileMagik · Acceso privado</h1><p>Solo administradores autorizados.</p>
 <form onSubmit={signIn}><label htmlFor="admin-email">Correo electrónico</label><input id="admin-email" type="email" required autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} style={{display:'block',width:'100%',padding:12,margin:'10px 0',boxSizing:'border-box'}}/><button disabled={loading} type="submit" style={{padding:12}}>Enviar enlace de acceso</button></form><p aria-live="polite">{message}</p>
 </main>;
}