import {handleUpload,type HandleUploadBody} from '@vercel/blob/client';
import {NextRequest,NextResponse} from 'next/server';
import {isLocalAdmin} from '@/lib/admin/local-session';

export const runtime='nodejs';
export async function POST(request:NextRequest){
 const origin=request.headers.get('origin');
 if(origin&&origin!==request.nextUrl.origin)return NextResponse.json({error:'Origen no autorizado'},{status:403});
 const raw=await request.text();
 if(Buffer.byteLength(raw)>25000)return NextResponse.json({error:'Solicitud demasiado grande'},{status:413});
 let body:HandleUploadBody;
 try{body=JSON.parse(raw) as HandleUploadBody;}catch{return NextResponse.json({error:'Petición inválida'},{status:400});}
 try{
  const data=await handleUpload({
   body,request,
   onBeforeGenerateToken:async pathname=>{
    if(!await isLocalAdmin())throw new Error('Necesitas una sesión de administrador');
    if(!/^filemagik\/ads\/images\/[a-zA-Z0-9_.-]{1,160}$/.test(pathname))throw new Error('Ruta de archivo no permitida');
    return {allowedContentTypes:['image/jpeg','image/png','image/webp'],maximumSizeInBytes:8_000_000,addRandomSuffix:true};
   },
   onUploadCompleted:async()=>{/* The admin saves its campaign configuration separately after upload. */},
  });
  return NextResponse.json(data,{headers:{'Cache-Control':'private, no-store'}});
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:'No se pudo subir el banner'},{status:400});}
}
