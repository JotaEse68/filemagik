import {NextRequest,NextResponse} from 'next/server';
import {randomUUID} from 'node:crypto';
import {requireAdmin} from '@/lib/supabase/server';

const MAX_BYTES=1_500_000;
const headers={'Cache-Control':'private, no-store'};
function mimeType(bytes:Uint8Array):{mime:string;ext:string}|null{
 if(bytes.length>=3&&bytes[0]===255&&bytes[1]===216&&bytes[2]===255)return {mime:'image/jpeg',ext:'jpg'};
 if(bytes.length>=8&&bytes[0]===137&&bytes[1]===80&&bytes[2]===78&&bytes[3]===71&&bytes[4]===13&&bytes[5]===10&&bytes[6]===26&&bytes[7]===10)return {mime:'image/png',ext:'png'};
 if(bytes.length>=12&&String.fromCharCode(...bytes.slice(0,4))==='RIFF'&&String.fromCharCode(...bytes.slice(8,12))==='WEBP')return {mime:'image/webp',ext:'webp'};
 return null;
}
export async function POST(request:NextRequest){
 const admin=await requireAdmin();
 if(!admin)return NextResponse.json({error:'Acceso no autorizado'},{status:401,headers});
 if(request.headers.get('origin')!==new URL(request.url).origin)return NextResponse.json({error:'Origen no válido'},{status:403,headers});
 const length=Number(request.headers.get('content-length')??0);
 if(length>MAX_BYTES+150_000)return NextResponse.json({error:'Archivo demasiado grande (máximo 1,5 MB)'},{status:413,headers});
 let body:FormData;
 try{body=await request.formData()}catch{return NextResponse.json({error:'Datos de subida inválidos'},{status:400,headers})}
 const file=body.get('file');
 if(!(file instanceof File)||file.size===0||file.size>MAX_BYTES)return NextResponse.json({error:'Selecciona una imagen JPG, PNG o WebP de hasta 1,5 MB'},{status:400,headers});
 const bytes=new Uint8Array(await file.arrayBuffer()),type=mimeType(bytes);
 if(!type)return NextResponse.json({error:'Formato de imagen no permitido'},{status:415,headers});
 const filename='banners/'+randomUUID()+'.'+type.ext;
 const {error}=await admin.client.storage.from('filemagik-banners').upload(filename,bytes,{contentType:type.mime,cacheControl:'3600',upsert:false});
 if(error)return NextResponse.json({error:'No se pudo guardar la imagen. Comprueba que existe el bucket FileMagik.'},{status:503,headers});
 const {data}=admin.client.storage.from('filemagik-banners').getPublicUrl(filename);
 const {error:auditError}=await admin.client.from('filemagik_admin_audit').insert({actor:admin.user.id,action:'upload',resource:'banner',details:{filename,size:file.size}});
 if(auditError)return NextResponse.json({error:'Imagen subida, pero falló la auditoría. Revisar permisos.'},{status:500,headers});
 return NextResponse.json({url:data.publicUrl},{headers});
}
