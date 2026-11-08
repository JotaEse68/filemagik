'use client';
import {useState} from 'react';
import {createBrowserClient} from '@supabase/ssr';
export default function Login(){
 const [password,setPassword]=useState(''),[email,setEmail]=useState(''),[message,setMessage]=useState(''),[loading,setLoading]=useState(false);
 async function enter(event:React.FormEvent){
  event.preventDefault();setLoading(true);setMessage('');
  try{
   const response=await fetch('/api/admin/local-login',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',body:JSON.stringify({password})});
   const result=await response.json();
   if(!response.ok)throw new Error(result.error||'No se pudo entrar');
   window.location.assign('/admin');
  }catch(e){setMessage(e instanceof Error?e.message:'Error');setLoading(false);}
 }
 async function signIn(event:React.FormEvent){
  event.preventDefault();setLoading(true);setMessage('');
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if(!url||!key){setMessage('El acceso por correo necesita Supabase. Utiliza tu contraseña de propietario.');setLoading(false);return;}
  const client=createBrowserClient(url,key);
  const {error}=await client.auth.signInWithOtp({email,options:{shouldCreateUser:false,emailRedirectTo:`${window.location.origin}/auth/callback`}});
  setMessage(error?'No se pudo enviar el acceso. Revisa la configuración.':'Revisa tu correo para iniciar sesión.');
  setLoading(false);
 }
 return <main style={{maxWidth:460,margin:'10vh auto',padding:30,background:'#1a263f',borderRadius:22,border:'1px solid #50608b'}}>
 <span style={{color:'#a8b7ff',fontSize:12,letterSpacing:2}}>FILEMAGIK · CONTROL CENTER</span>
 <h1>Mi administración</h1><p>Acceso privado del propietario.</p>
 <form onSubmit={enter}><label htmlFor="admin-password">Contraseña del propietario</label><input id="admin-password" type="password" required autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} style={{display:'block',width:'100%',padding:13,margin:'10px 0',boxSizing:'border-box',background:'#f6f8ff',color:'#091020',borderRadius:9}}/><button disabled={loading} type="submit" style={{padding:13,background:'#a99afc',color:'#0b1020',border:0,borderRadius:9,fontWeight:700}}>Entrar al panel</button></form>
 {process.env.NEXT_PUBLIC_SUPABASE_URL&&process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?<details style={{marginTop:24}}><summary>Acceso por correo (Supabase)</summary><form onSubmit={signIn}><label htmlFor="admin-email">Correo electrónico</label><input id="admin-email" type="email" required autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} style={{display:'block',width:'100%',padding:12,margin:'10px 0'}}/><button disabled={loading} type="submit">Enviar acceso</button></form></details>:null}
 <p><a href="/admin/recuperar" style={{color:"#b6cfff"}}>¿Olvidaste la contraseña? Recuperar acceso</a></p>
 <p role="status" aria-live="polite">{message}</p>
 </main>;
}
