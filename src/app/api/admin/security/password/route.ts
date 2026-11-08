import {NextRequest,NextResponse} from 'next/server';
import {isLocalAdmin,newLocalSession,localAdminCookie} from '@/lib/admin/local-session';
import {updateCredential,verifyPassword} from '@/lib/admin/owner-credentials';
export const runtime='nodejs';
const headers={'Cache-Control':'private, no-store'};
export async function POST(request:NextRequest){
 if(!await isLocalAdmin())return NextResponse.json({error:'Sesión no autorizada'},{status:401,headers});
 if(request.headers.get('origin')!==request.nextUrl.origin)return NextResponse.json({error:'Origen no autorizado'},{status:403,headers});
 if(Number(request.headers.get('content-length')||0)>1024)return NextResponse.json({error:'Petición demasiado grande'},{status:413,headers});
 const b=await request.json().catch(()=>null);
 if(!b||typeof b.currentPassword!=='string'||typeof b.newPassword!=='string')return NextResponse.json({error:'Datos inválidos'},{status:400,headers});
 if(!await verifyPassword(b.currentPassword))return NextResponse.json({error:'Contraseña actual incorrecta'},{status:403,headers});
 try{
  const c=await updateCredential(b.newPassword);
  const response=NextResponse.json({ok:true,recoveryCode:c.recoveryCode},{headers});
  response.cookies.set(localAdminCookie,await newLocalSession(),{httpOnly:true,secure:true,sameSite:'strict',path:'/',maxAge:7*24*3600});
  return response;
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:'No se pudo cambiar la contraseña'},{status:400,headers});}
}
