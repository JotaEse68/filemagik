import {NextRequest,NextResponse} from 'next/server';
import {isLocalAdmin} from '@/lib/admin/local-session';
import {readStoredAds,saveStoredAds} from '@/lib/advertising/blob-settings';
export const dynamic='force-dynamic';
export const runtime='nodejs';
const headers={'Cache-Control':'private, no-store'};
export async function GET(){
 if(!await isLocalAdmin())return NextResponse.json({error:'Acceso denegado'},{status:401,headers});
 try{return NextResponse.json(await readStoredAds(),{headers});}
 catch(e){return NextResponse.json({error:e instanceof Error?e.message:'No se pudo leer'}, {status:503,headers});}
}
export async function PUT(request:NextRequest){
 if(!await isLocalAdmin())return NextResponse.json({error:'Acceso denegado'},{status:401,headers});
 if(request.headers.get('origin')!==request.nextUrl.origin)return NextResponse.json({error:'Origen no permitido'},{status:403,headers});
 if(!request.headers.get('content-type')?.startsWith('application/json'))return NextResponse.json({error:'Formato incorrecto'},{status:415,headers});
 const raw=await request.text();
 if(Buffer.byteLength(raw)>100_000)return NextResponse.json({error:'Configuración demasiado grande'},{status:413,headers});
 try{
  const body=JSON.parse(raw);
  if(typeof body.revision!=='string'||body.revision.length>250)throw new Error('Versión de datos incorrecta');
  return NextResponse.json(await saveStoredAds(body.settings,body.revision),{headers});
 }catch(e){
  const msg=e instanceof Error?e.message:'No se pudo guardar';
  return NextResponse.json({error:msg},{status:msg.startsWith('CONFLICT:')?409:400,headers});
 }
}
