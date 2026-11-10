import {NextRequest,NextResponse} from 'next/server';

export const runtime='nodejs';
type Engine='image'|'media'|'archive';
type Operation={extensions:string[];path:string;mime:string;magic:string};
const operations:Record<Engine,Record<string,Operation>>={
 image:{
  'heic-to-png':{extensions:['.heic','.heif'],path:'/v1/convert',mime:'image/png',magic:'png'},
  'gif-to-animated-webp':{extensions:['.gif'],path:'/v1/convert',mime:'image/webp',magic:'webp'},
 },
 media:{
  'audio-to-mp3':{extensions:['.mp3','.wav','.ogg','.m4a','.flac'],path:'/v1/media',mime:'audio/mpeg',magic:'mp3'},
  'audio-to-wav':{extensions:['.mp3','.wav','.ogg','.m4a','.flac'],path:'/v1/media',mime:'audio/wav',magic:'wav'},
  'video-to-mp4':{extensions:['.mp4','.webm','.mov'],path:'/v1/media',mime:'video/mp4',magic:'mp4'},
  'extract-audio-mp3':{extensions:['.mp4','.webm','.mov'],path:'/v1/media',mime:'audio/mpeg',magic:'mp3'},
  'video-to-gif':{extensions:['.mp4','.webm','.mov'],path:'/v1/media',mime:'image/gif',magic:'gif'},
  'animated-gif-to-mp4':{extensions:['.gif'],path:'/v1/media',mime:'video/mp4',magic:'mp4'},
 },
 archive:{
  'extract-7z':{extensions:['.7z'],path:'/v1/extract',mime:'application/zip',magic:'zip'},
  'extract-rar':{extensions:['.rar'],path:'/v1/extract',mime:'application/zip',magic:'zip'},
 },
};
const ENV:Record<Engine,{url:string;secret:string;enabled:string}>={
 image:{url:'FILEMAGIK_IMAGE_ENGINE_URL',secret:'FILEMAGIK_IMAGE_SECRET',enabled:'FILEMAGIK_IMAGE_ENGINE_PUBLIC_ENABLED'},
 media:{url:'FILEMAGIK_MEDIA_ENGINE_URL',secret:'FILEMAGIK_MEDIA_SECRET',enabled:'FILEMAGIK_MEDIA_ENGINE_PUBLIC_ENABLED'},
 archive:{url:'FILEMAGIK_ARCHIVE_ENGINE_URL',secret:'FILEMAGIK_ARCHIVE_SECRET',enabled:'FILEMAGIK_ARCHIVE_ENGINE_PUBLIC_ENABLED'},
};
function configured(engine:Engine){
 const v=ENV[engine],url=process.env[v.url]||'',secret=process.env[v.secret]||'';
 return process.env[v.enabled]==='true'&&process.env.FILEMAGIK_ENGINE_QUOTAS_READY==='true'&&
  /^https:\/\/[^\s]+$/i.test(url)&&secret.length>=32&&
  (process.env.FILEMAGIK_TURNSTILE_SECRET||'').length>=16&&
  (process.env.NEXT_PUBLIC_FILEMAGIK_TURNSTILE_SITE_KEY||'').length>5;
}
function validMagic(bytes:Uint8Array,type:string){
 const ascii=(start:number,count:number)=>String.fromCharCode(...bytes.slice(start,start+count));
 if(type==='png')return bytes.length>=8&&ascii(1,3)==='PNG';
 if(type==='zip')return ascii(0,2)==='PK';
 if(type==='gif')return ascii(0,4)==='GIF8';
 if(type==='mp4')return ascii(4,4)==='ftyp';
 if(type==='webp')return ascii(0,4)==='RIFF'&&ascii(8,4)==='WEBP';
 if(type==='wav')return ascii(0,4)==='RIFF'&&ascii(8,4)==='WAVE';
 if(type==='mp3')return ascii(0,3)==='ID3'||bytes[0]===0xff&&(bytes[1]&0xe0)===0xe0;
 return false;
}
type Ctx={params:Promise<{engine:string}>};
export async function GET(_request:NextRequest,{params}:Ctx){
 const {engine}=await params;
 if(!(engine in operations))return NextResponse.json({available:false},{status:404});
 return NextResponse.json({available:configured(engine as Engine)},{
  headers:{'Cache-Control':'no-store'}});
}
export async function POST(request:NextRequest,{params}:Ctx){
 const {engine}=await params;
 if(!(engine in operations))return NextResponse.json({error:'Unknown engine'},{status:404});
 const key=engine as Engine;
 const operation=request.nextUrl.searchParams.get('operation')||'';
 const config=operations[key][operation];
 if(!config)return NextResponse.json({error:'Unsupported conversion'},{status:400});
 if(!configured(key))return NextResponse.json({error:'Professional engine unavailable'},{status:503});
 const origin=request.headers.get('origin');
 if(origin&&origin!==request.nextUrl.origin)return NextResponse.json({error:'Origin not allowed'},{status:403});
 const length=Number(request.headers.get('content-length')||0);
 if(!Number.isSafeInteger(length)||length>3*1024*1024+4096||length<0)
  return NextResponse.json({error:'Request exceeds 3 MB'},{status:413});
 let data:FormData;
 try{data=await request.formData();}catch{return NextResponse.json({error:'Invalid upload'},{status:400});}
 const file=data.get('file'),token=data.get('turnstile');
 if(!(file instanceof File)||file.size<1||file.size>3*1024*1024||
    typeof token!=='string'||token.length<1||token.length>2048)
  return NextResponse.json({error:'Invalid file or verification'},{status:400});
 const extension=file.name.toLowerCase().match(/\.[a-z0-9]+$/)?.[0]||'';
 if(!config.extensions.includes(extension))return NextResponse.json({error:'Unsupported file extension'},{status:415});
 try{
  const check=await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify',{
   method:'POST',body:new URLSearchParams({secret:process.env.FILEMAGIK_TURNSTILE_SECRET!,response:token}),
   cache:'no-store',signal:AbortSignal.timeout(8000)});
  const answer=await check.json() as {success?:boolean;hostname?:string;action?:string};
  if(!answer.success||answer.hostname!==request.nextUrl.hostname||answer.action!=='filemagik_'+engine)
   return NextResponse.json({error:'Human verification failed'},{status:403});
 }catch{return NextResponse.json({error:'Human verification unavailable'},{status:503});}
 const cfg=ENV[key],payload=new FormData();
 payload.set('file',new File([await file.arrayBuffer()],file.name,{type:file.type||'application/octet-stream'}));
 const url=process.env[cfg.url]!.replace(/\/+$/,'')+config.path+(key==='archive'?'':'?operation='+encodeURIComponent(operation));
 let response:Response;
 try{response=await fetch(url,{method:'POST',headers:{Authorization:'Bearer '+process.env[cfg.secret]!},
   body:payload,cache:'no-store',signal:AbortSignal.timeout(80000)});}
 catch{return NextResponse.json({error:'Private engine unreachable'},{status:503});}
 if(!response.ok){
  const code=[413,415,422,429,503].includes(response.status)?response.status:502;
  return NextResponse.json({error:code===429?'Private engine busy':'Conversion could not be completed'},
   {status:code,headers:{'Cache-Control':'no-store'}});
 }
 const bytes=new Uint8Array(await response.arrayBuffer());
 // Vercel runtime has tight response limits: reject non-streaming large files.
 if(!bytes.length||bytes.byteLength>4*1024*1024||!validMagic(bytes,config.magic))
  return NextResponse.json({error:'Output exceeds inline response limits or is invalid'},{status:502});
 return new NextResponse(bytes,{headers:{'Content-Type':config.mime,'Cache-Control':'private, no-store',
  'X-Content-Type-Options':'nosniff','Content-Disposition':'attachment; filename="filemagik-result"'}});
}
