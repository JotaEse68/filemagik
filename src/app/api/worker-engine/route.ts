import {NextRequest,NextResponse} from 'next/server';
import {createHmac} from 'node:crypto';

export const runtime='nodejs';
type Engine='image'|'media'|'archive';
type Operation={engine:Engine;endpoint:string;extension:string[];mime:string;max:number};
const MiB=1024*1024;
const operations:Record<string,Operation>={
 'server-heic-to-png':{engine:'image',endpoint:'heic-to-png',extension:['.heic','.heif'],mime:'image/png',max:3*MiB},
 'server-gif-to-webp':{engine:'image',endpoint:'gif-to-animated-webp',extension:['.gif'],mime:'image/webp',max:3*MiB},
 'server-audio-to-mp3':{engine:'media',endpoint:'audio-to-mp3',extension:['.wav','.mp3','.m4a','.ogg','.flac'],mime:'audio/mpeg',max:3*MiB},
 'server-video-to-gif':{engine:'media',endpoint:'video-to-gif',extension:['.mp4','.webm','.mov'],mime:'image/gif',max:3*MiB},
 'server-video-to-mp4':{engine:'media',endpoint:'video-to-mp4',extension:['.mov','.webm','.mp4'],mime:'video/mp4',max:3*MiB},
 'server-gif-to-mp4':{engine:'media',endpoint:'animated-gif-to-mp4',extension:['.gif'],mime:'video/mp4',max:3*MiB},
 'server-extract-7z':{engine:'archive',endpoint:'extract',extension:['.7z'],mime:'application/zip',max:3*MiB},
 'server-extract-rar':{engine:'archive',endpoint:'extract',extension:['.rar'],mime:'application/zip',max:3*MiB},
};
const config=(engine:Engine)=>{
 // All three engines live behind the existing FileMagik PDF API on Railway.
 const base=process.env.FILEMAGIK_PDF_ENGINE_URL||'';
 const secret=process.env.FILEMAGIK_PDF_ENGINE_SECRET||'';
 const flag=process.env.FILEMAGIK_WORKER_ENGINES_PUBLIC_ENABLED==='true';
 return {base,secret,ready:flag&&/^https:\/\/[^\s/?#]+/i.test(base)&&secret.length>=32};
};
const json=(error:string,status:number)=>NextResponse.json({error},{status,headers:{'Cache-Control':'no-store'}});
export async function GET(request:NextRequest){
 const op=operations[request.nextUrl.searchParams.get('operation')||''];
 const ready=!!op&&config(op.engine).ready&&!!process.env.FILEMAGIK_TURNSTILE_SECRET&&!!process.env.NEXT_PUBLIC_FILEMAGIK_TURNSTILE_SITE_KEY;
 return NextResponse.json({available:ready,challengeRequired:ready,
  siteKey:ready?process.env.NEXT_PUBLIC_FILEMAGIK_TURNSTILE_SITE_KEY:null},
  {headers:{'Cache-Control':'no-store'}});
}
export async function POST(request:NextRequest){
 const name=request.nextUrl.searchParams.get('operation')||'';
 const op=operations[name];
 if(!op)return json('Unsupported operation',400);
 const {base,secret,ready}=config(op.engine);
 if(!ready)return json('Professional engine not enabled',503);
 const tokenSecret=process.env.FILEMAGIK_TURNSTILE_SECRET||'';
 const siteKey=process.env.NEXT_PUBLIC_FILEMAGIK_TURNSTILE_SITE_KEY||'';
 if(tokenSecret.length<16||siteKey.length<6)return json('Verification not configured',503);
 const origin=request.headers.get('origin');
 if(origin&&origin!==request.nextUrl.origin)return json('Origin not allowed',403);
 const length=Number(request.headers.get('content-length')||0);
 if(!Number.isSafeInteger(length)||length<0)return json('Invalid upload size',400);
 if(length>op.max+4096)return json('Maximum 3 MB upload',413);
 let form:FormData;
 try{form=await request.formData();}catch{return json('Invalid upload',400);}
 const file=form.get('file'),token=form.get('turnstile');
 if(!(file instanceof File)||file.size<1||file.size>op.max)return json('File must be 1 byte to 3 MB',413);
 const extension=file.name.toLowerCase().match(/\.[a-z0-9]+$/)?.[0]||'';
 if(!op.extension.includes(extension))return json('Invalid file extension',415);
 if(typeof token!=='string'||token.length<1||token.length>2048)return json('Human verification required',403);
 try{
  const body=new URLSearchParams({secret:tokenSecret,response:token,
   remoteip:(request.headers.get('x-forwarded-for')||'').split(',')[0].trim()});
  const challenge=await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify',{
   method:'POST',body,cache:'no-store',signal:AbortSignal.timeout(8000)});
  const verdict=await challenge.json() as {success?:boolean;hostname?:string;action?:string};
  if(!verdict.success||verdict.hostname!==request.nextUrl.hostname||verdict.action!=='filemagik_worker')
   return json('Human verification failed',403);
 }catch{return json('Human verification unavailable',503);}
 const payload=new FormData();
 payload.set('file',new File([await file.arrayBuffer()],file.name,{type:file.type||'application/octet-stream'}));
 const ip=(request.headers.get('x-forwarded-for')||request.headers.get('x-real-ip')||'unknown').split(',')[0].trim().slice(0,90);
 const visitor=createHmac('sha256',secret).update(ip||'unknown').digest('hex');
 const workerPath=op.engine==='archive'?'/workers/archive/v1/extract':
  '/workers/'+op.engine+'/v1/'+(op.engine==='image'?'convert':'media');
 const url=base.replace(/\/+$/,'')+workerPath+
  (op.engine==='archive'?'':'?operation='+encodeURIComponent(op.endpoint));
 let response:Response;
 try{
  response=await fetch(url,{method:'POST',headers:{Authorization:'Bearer '+secret,'X-Filemagik-Visitor':visitor},
   body:payload,cache:'no-store',signal:AbortSignal.timeout(90000)});
 }catch{return json('Professional engine unavailable',503);}
 if(!response.ok){
  const map:Record<number,[number,string]>={401:[503,'Engine authentication unavailable'],403:[503,'Engine quota configuration unavailable'],
   408:[503,'Processing timed out'],413:[413,'File or output too large'],415:[415,'Unsupported file type'],
   422:[422,'File could not be processed'],429:[429,'Processing quota exceeded'],503:[503,'Processing engine unavailable']};
  const [status,error]=map[response.status]||[502,'Conversion failed'];
  return json(error,status);
 }
 const output=await response.arrayBuffer();
 if(output.byteLength<8||output.byteLength>12*MiB)return json('Output exceeds secure response limits',502);
 const header=new Uint8Array(output.slice(0,16));
 const ascii=new TextDecoder().decode(header);
 const valid=op.mime==='application/zip'?ascii.startsWith('PK'):op.mime==='image/png'?header[0]===137&&ascii.slice(1,4)==='PNG':
  op.mime==='image/webp'?ascii.slice(0,4)==='RIFF'&&ascii.slice(8,12)==='WEBP':
  op.mime==='image/gif'?ascii.startsWith('GIF8'):op.mime==='video/mp4'?ascii.slice(4,8)==='ftyp':
  op.mime==='audio/mpeg'?ascii.startsWith('ID3')||header[0]===255:true;
 if(!valid)return json('Invalid engine output',502);
 return new NextResponse(output,{headers:{'Content-Type':op.mime,'Cache-Control':'private, no-store',
  'X-Content-Type-Options':'nosniff','Content-Disposition':'attachment; filename="filemagik-result"'}});
}
