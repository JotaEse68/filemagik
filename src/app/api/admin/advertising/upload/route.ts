import {NextRequest,NextResponse} from 'next/server';
import {put} from '@vercel/blob';
import {randomUUID} from 'node:crypto';
import {isLocalAdmin} from '@/lib/admin/local-session';
export const runtime='nodejs';
const headers={'Cache-Control':'private, no-store'};
export async function POST(request:NextRequest){
 if(!await isLocalAdmin())return NextResponse.json({error:'Acceso denegado'},{status:401,headers});
 if(request.headers.get('origin')!==request.nextUrl.origin)return NextResponse.json({error:'Origen no permitido'},{status:403,headers});
 if(Number(request.headers.get('content-length')||0)>4_000_000)return NextResponse.json({error:'Imagen demasiado grande'},{status:413,headers});
 const form=await request.formData().catch(()=>null);
 const file=form?.get('image');
 if(!(file instanceof File))return NextResponse.json({error:'Selecciona una imagen válida'},{status:400,headers});
 if(file.size===0||file.size>2_000_000||!['image/jpeg','image/png','image/webp'].includes(file.type))return NextResponse.json({error:'Solo JPG, PNG o WebP de hasta 2 MB'},{status:400,headers});
 const bytes=new Uint8Array(await file.arrayBuffer());
 const jpg=bytes[0]===0xff&&bytes[1]===0xd8&&bytes[2]===0xff;
 const png=bytes.length>8&&bytes[0]===137&&bytes[1]===80&&bytes[2]===78&&bytes[3]===71;
 const webp=bytes.length>12&&String.fromCharCode(...bytes.subarray(0,4))==='RIFF'&&String.fromCharCode(...bytes.subarray(8,12))==='WEBP';
 if(!(file.type==='image/jpeg'&&jpg||file.type==='image/png'&&png||file.type==='image/webp'&&webp))return NextResponse.json({error:'La imagen no coincide con el formato declarado'},{status:400,headers});
 try{
  const ext=file.type==='image/jpeg'?'jpg':file.type==='image/png'?'png':'webp';
  const blob=await put('filemagik/ads/images/'+randomUUID()+'.'+ext,bytes,{access:'public',contentType:file.type});
  return NextResponse.json({url:blob.url,pathname:blob.pathname},{headers});
 }catch{return NextResponse.json({error:'No se pudo subir a Vercel Blob'},{status:503,headers});}
}
