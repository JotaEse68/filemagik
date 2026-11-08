import {createHash,timingSafeEqual} from 'node:crypto';
import {NextRequest,NextResponse} from 'next/server';
import {localAdminAvailable,newLocalSession,localAdminCookie} from '@/lib/admin/local-session';
export async function POST(request:NextRequest){
 if(!localAdminAvailable())return NextResponse.json({error:'Acceso privado no configurado'},{status:503});
 if(request.headers.get('origin')!==request.nextUrl.origin)return NextResponse.json({error:'Origen inválido'},{status:403});
 const body=await request.json().catch(()=>({}));
 const password=typeof body.password==='string'?body.password:'';
 if(password.length>256)return NextResponse.json({error:'Credenciales inválidas'},{status:401});
 const expected=process.env.FILEMAGIK_ADMIN_PASSWORD_SHA256||'';
 const digest=createHash('sha256').update(password).digest('hex');
 if(!/^[a-f0-9]{64}$/.test(expected)||!timingSafeEqual(Buffer.from(digest,'hex'),Buffer.from(expected,'hex')))return NextResponse.json({error:'Contraseña incorrecta'},{status:401});
 const response=NextResponse.json({ok:true},{headers:{'Cache-Control':'no-store'}});
 response.cookies.set(localAdminCookie,newLocalSession(),{httpOnly:true,secure:request.nextUrl.protocol==='https:',sameSite:'strict',path:'/admin',maxAge:7*24*3600});
 return response;
}
