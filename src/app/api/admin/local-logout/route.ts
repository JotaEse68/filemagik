import {NextRequest,NextResponse} from 'next/server';
import {localAdminCookie} from '@/lib/admin/local-session';
export async function POST(request:NextRequest){
 if(request.headers.get('origin')!==request.nextUrl.origin)return NextResponse.json({error:'Origen inválido'},{status:403});
 const response=NextResponse.json({ok:true},{headers:{'Cache-Control':'no-store'}});
 response.cookies.set(localAdminCookie,'',{httpOnly:true,secure:request.nextUrl.protocol==='https:',sameSite:'strict',path:'/',maxAge:0});
 return response;
}
