'use client';
import {useState} from 'react';
import Link from 'next/link';
export default function AccountSecurity({recoveryOnly=false}:{recoveryOnly?:boolean}){
 const [current,setCurrent]=useState(''),[next,setNext]=useState(''),[confirm,setConfirm]=useState(''),[code,setCode]=useState(''),[newCode,setNewCode]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 async function submit(e:React.FormEvent){
  e.preventDefault();setError('');
  if(next!==confirm){setError('Las contraseñas nuevas no coinciden');return;}
  setBusy(true);
  try{
   const res=await fetch(recoveryOnly?'/api/admin/security/recover':'/api/admin/security/password',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify(recoveryOnly?{code,newPassword:next}:{currentPassword:current,newPassword:next})});
   const body=await res.json();if(!res.ok)throw new Error(body.error||'Operación fallida');
   setNewCode(body.recoveryCode||'');setCurrent('');setNext('');setConfirm('');setCode('');
  }catch(e){setError(e instanceof Error?e.message:'No se pudo guardar');}finally{setBusy(false);}
 }
 return <main style={{minHeight:'100vh',background:'radial-gradient(circle at top,#25335d,#0d1425 70%)',color:'#f5f7ff',padding:'clamp(22px,7vw,70px)',fontFamily:'system-ui'}}>
 <div style={{maxWidth:630,margin:'0 auto'}}>
  <Link href={recoveryOnly?'/admin/login':'/admin'} style={{color:'#b0c8ff'}}>← {recoveryOnly?'Volver al inicio de sesión':'Volver al superadmin'}</Link>
  <p style={{letterSpacing:2,color:'#a7a8ff',fontSize:12,marginTop:35}}>FILEMAGIK CONTROL CENTER</p>
  <h1>{recoveryOnly?'Recuperar el acceso':'Seguridad de la cuenta'}</h1>
  <p style={{color:'#bccae2'}}>{recoveryOnly?'Si conservas tu código de recuperación, restablece la contraseña aquí. Si lo perdiste, el propietario puede restablecer el acceso desde Vercel, sin borrar campañas.':'Cambia la contraseña del propietario y genera un nuevo código de recuperación. La sesión anterior quedará invalidada.'}</p>
  {newCode?<section style={{background:'#17382f',padding:25,borderRadius:16,border:'1px solid #51a89a',display:'grid',gap:16}}>
   <h2>Contraseña cambiada</h2><p><strong>Guarda este código en un gestor de contraseñas.</strong> Solo se muestra ahora; sustituye al código anterior y permite recuperar tu acceso.</p>
   <code style={{wordBreak:'break-all',background:'#0b1c1d',padding:14,borderRadius:9}}>{newCode}</code>
   <button type="button" style={{padding:12,borderRadius:9}} onClick={()=>void navigator.clipboard.writeText(newCode)}>Copiar código de recuperación</button>
   <Link href="/admin">Ir al superadmin</Link>
  </section>:<form onSubmit={e=>void submit(e)} style={{background:'#172440',border:'1px solid #41577d',padding:26,borderRadius:18,display:'grid',gap:17}}>
   <label style={{display:'grid',gap:6}}>{recoveryOnly?'Código de recuperación':'Contraseña actual'}<input required type={recoveryOnly?'text':'password'} autoComplete={recoveryOnly?'off':'current-password'} value={recoveryOnly?code:current} onChange={e=>recoveryOnly?setCode(e.target.value):setCurrent(e.target.value)} style={{padding:13,borderRadius:9,border:'1px solid #6379a4',background:'#0c182d',color:'white'}}/></label>
   <label style={{display:'grid',gap:6}}>Contraseña nueva<input required type="password" autoComplete="new-password" minLength={10} value={next} onChange={e=>setNext(e.target.value)} style={{padding:13,borderRadius:9,border:'1px solid #6379a4',background:'#0c182d',color:'white'}}/></label>
   <label style={{display:'grid',gap:6}}>Repetir contraseña nueva<input required type="password" autoComplete="new-password" value={confirm} onChange={e=>setConfirm(e.target.value)} style={{padding:13,borderRadius:9,border:'1px solid #6379a4',background:'#0c182d',color:'white'}}/></label>
   <small style={{color:'#bacbe8'}}>Mínimo 10 caracteres, incluyendo mayúsculas, minúsculas y números.</small>
   {error&&<p role="alert" style={{color:'#ffb4bd'}}>{error}</p>}
   <button type="submit" disabled={busy} style={{background:'#aaafff',color:'#101b35',padding:13,border:0,borderRadius:10,fontWeight:800}}>{busy?'Guardando…':recoveryOnly?'Restablecer contraseña':'Cambiar contraseña'}</button>
  </form>}
  {recoveryOnly&&<p style={{marginTop:20,color:'#a7b7d5'}}>¿No tienes el código? Puedes restablecer el acceso cambiando la variable FILEMAGIK_ADMIN_PASSWORD_SHA256 de Vercel por el SHA-256 de una contraseña nueva. Al iniciar sesión y cambiarla en Seguridad, el acceso de emergencia se desactiva automáticamente. No se pierden campañas. Nunca publiques contraseñas ni códigos en repositorios.</p>}
 </div>
 </main>;
}
