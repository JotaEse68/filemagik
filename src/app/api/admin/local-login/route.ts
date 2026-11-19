import {verifyPassword} from '@/lib/admin/owner-credentials';
import {NextRequest,NextResponse} from 'next/server';
import {localAdminAvailable,newLocalSession,localAdminCookie} from '@/lib/admin/local-session';
export async function POST(request:NextRequest){
 if(!localAdminAvailable())return NextResponse.json({error:'Acceso privado no configurado'},{status:503});
 if(request.headers.get('origin')!==request.nextUrl.origin)return NextResponse.json({error:'Origen inválido'},{status:403});
 if(!request.headers.get('content-type')?.startsWith('application/json'))
  return NextResponse.json({error:'Formato de acceso inválido'},{status:415});
 const declared=request.headers.get('content-length');
 if(declared!==null&&(!Number.isSafeInteger(Number(declared))||Number(declared)<0||Number(declared)>2048))
  return NextResponse.json({error:'Solicitud de acceso demasiado grande'},{status:413});
 const raw=await request.text();
 if(Buffer.byteLength(raw,'utf8')>2048)return NextResponse.json({error:'Solicitud de acceso demasiado grande'},{status:413});
 const body=(()=>{try{return JSON.parse(raw||'{}') as {password?:unknown};}catch{return {};}})();
 const password=typeof body.password==='string'?body.password:'';
 if(password.length>256)return NextResponse.json({error:'Credenciales inválidas'},{status:401});
 if(!await verifyPassword(password))return NextResponse.json({error:'Contraseña incorrecta'},{status:401});
 const response=NextResponse.json({ok:true},{headers:{'Cache-Control':'no-store'}});
 response.cookies.set(localAdminCookie,await newLocalSession(),{httpOnly:true,secure:request.nextUrl.protocol==='https:',sameSite:'strict',path:'/',maxAge:7*24*3600});
 return response;
}
