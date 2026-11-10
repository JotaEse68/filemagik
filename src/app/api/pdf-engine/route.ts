import {NextRequest,NextResponse} from 'next/server';
import {createHmac} from 'node:crypto';

export const runtime='nodejs';
const supported:Record<string,readonly string[]>={
 'pdf-to-docx':['.pdf'],'pdf-to-xlsx':['.pdf'],
 'office-to-pdf':['.docx','.xlsx','.pptx','.odt','.ods','.odp'],
 'optimize-pdf':['.pdf'],'redact-pdf':['.pdf'],'ocr-pdf':['.pdf'],'replace-pdf-image':['.pdf'],
};
const maxBytes=3*1024*1024;
const maxResponseBytes=22*1024*1024;
const safeExt=(name:string)=>name.toLowerCase().match(/\.[a-z0-9]+$/)?.[0]||'';
const allowedMime:Record<string,string>={
 'pdf-to-docx':'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
 'pdf-to-xlsx':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
 'office-to-pdf':'application/pdf','optimize-pdf':'application/pdf','redact-pdf':'application/pdf','ocr-pdf':'application/pdf','replace-pdf-image':'application/pdf',
};
function configured(){
 const base=process.env.FILEMAGIK_PDF_ENGINE_URL||'';
 const secret=process.env.FILEMAGIK_PDF_ENGINE_SECRET||'';
 return process.env.FILEMAGIK_PDF_ENGINE_PUBLIC_ENABLED==='true'&&
  /^https:\/\/[^\s]+$/i.test(base)&&secret.length>=32;
}
function requiresChallenge(){
 return !!process.env.FILEMAGIK_TURNSTILE_SECRET&&process.env.FILEMAGIK_TURNSTILE_SECRET.length>=16&&
  !!process.env.NEXT_PUBLIC_FILEMAGIK_TURNSTILE_SITE_KEY&&process.env.NEXT_PUBLIC_FILEMAGIK_TURNSTILE_SITE_KEY.length>5;
}
export async function GET(){
 return NextResponse.json({available:configured(),challengeRequired:configured()&&requiresChallenge(),
  siteKey:configured()&&requiresChallenge()?process.env.NEXT_PUBLIC_FILEMAGIK_TURNSTILE_SITE_KEY:null},
  {headers:{'Cache-Control':'no-store'}});
}
export async function POST(request:NextRequest){
 const operation=request.nextUrl.searchParams.get('operation')||'';
 const quality=request.nextUrl.searchParams.get('quality')||'lossless';
 if(!supported[operation]||!['lossless','balanced','maximum'].includes(quality))
  return NextResponse.json({error:'Unsupported conversion'},{status:400});
 if(!configured())return NextResponse.json({error:'Advanced engine not configured'},{status:503});
 const origin=request.headers.get('origin');
 if(origin&&origin!==request.nextUrl.origin)return NextResponse.json({error:'Origin not allowed'},{status:403});
 const length=Number(request.headers.get('content-length')||0);
 if(!Number.isSafeInteger(length)||length<0)return NextResponse.json({error:'Invalid request size'},{status:400});
 if(length>(operation==='replace-pdf-image'?2*maxBytes+8192:maxBytes+4096))return NextResponse.json({error:'Upload exceeds secure size limit'},{status:413});
 let data:FormData;
 try{data=await request.formData();}catch{return NextResponse.json({error:'Invalid upload'},{status:400});}
 const token=data.get('turnstile');
 const file=data.get('file');
 if(!(file instanceof File)||typeof token==='string'&&token.length>2048)
  return NextResponse.json({error:'Invalid verification token or file'},{status:400});
 if(file.size<1||file.size>maxBytes||!supported[operation].includes(safeExt(file.name)))
  return NextResponse.json({error:'File type or size not allowed'},{status:413});
 // Challenge is extra protection. Persisted daily/global quotas remain mandatory
 // even when the site owner has not configured a CAPTCHA provider.
 if(requiresChallenge()){
 if(typeof token!=='string'||!token)return NextResponse.json({error:'Verification required'},{status:403});
 try{
  const body=new URLSearchParams({secret:process.env.FILEMAGIK_TURNSTILE_SECRET!,response:token,
   remoteip:request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()||''});
  const check=await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify',
   {method:'POST',body,cache:'no-store',signal:AbortSignal.timeout(8000)});
  const answer=await check.json() as {success?:boolean;hostname?:string;action?:string};
  if(!answer.success||answer.hostname!==request.nextUrl.hostname||answer.action!=='filemagik_pdf')
   return NextResponse.json({error:'Human verification failed'},{status:403});
 }catch{return NextResponse.json({error:'Verification unavailable'},{status:503});}
 }
 const payload=new FormData();
 payload.set('file',new File([await file.arrayBuffer()],file.name,{type:file.type||'application/octet-stream'}));
 if(operation==='replace-pdf-image'){
  const image=data.get('replacement'),page=Number(data.get('page')),imageIndex=Number(data.get('image_index'));
  if(!(image instanceof File)||image.size<1||image.size>maxBytes||!/^image\\/(png|jpeg|webp)$/.test(image.type)||
    !/\\.(png|jpg|jpeg|webp)$/i.test(image.name)||!Number.isInteger(page)||page<1||page>100||
    !Number.isInteger(imageIndex)||imageIndex<1||imageIndex>100)
   return NextResponse.json({error:'Invalid replacement image or object index'},{status:400});
  payload.set('replacement',new File([await image.arrayBuffer()],image.name,{type:image.type}));
  payload.set('page',String(page));payload.set('image_index',String(imageIndex));
 }
 if(operation==='redact-pdf'){
  const regions=data.get('regions');
  if(typeof regions!=='string'||regions.length>6000)return NextResponse.json({error:'Invalid redaction request'},{status:400});
  payload.set('regions',regions);
 }
 const base=process.env.FILEMAGIK_PDF_ENGINE_URL!.replace(/\/+$/,'');
 // Only the trusted Vercel server can derive the privacy-preserving quota identity.
 const ip=(request.headers.get('x-forwarded-for')||request.headers.get('x-real-ip')||'unknown').split(',')[0].trim().slice(0,90);
 const visitor=createHmac('sha256',process.env.FILEMAGIK_PDF_ENGINE_SECRET!).update(ip||'unknown').digest('hex');
 let answer:Response;
 try{
  answer=await fetch(base+'/v1/jobs?operation='+encodeURIComponent(operation)+'&quality='+encodeURIComponent(quality),
   {method:'POST',headers:{Authorization:'Bearer '+process.env.FILEMAGIK_PDF_ENGINE_SECRET!,'X-Filemagik-Visitor':visitor},
    body:payload,cache:'no-store',signal:AbortSignal.timeout(85000)});
 }catch{return NextResponse.json({error:'Advanced conversion engine unavailable'},{status:503});}
 if(!answer.ok){
  // Preserve actionable refusal statuses instead of hiding quota and availability
  // errors as generic 502 responses. Never expose upstream response bodies.
  const failures:Record<number,{status:number;error:string}>={
   401:{status:503,error:'Professional engine authentication unavailable'},
   403:{status:503,error:'Professional processing configuration unavailable'},
   413:{status:413,error:'File exceeds professional processing limits'},
   422:{status:422,error:'Document cannot be converted reliably'},
   429:{status:429,error:'Professional processing quota exceeded. Try again later'},
   503:{status:503,error:'Advanced conversion engine unavailable'},
  };
  const failure=failures[answer.status]||{status:502,error:'Professional processing failed'};
  const headers:Record<string,string>={'Cache-Control':'no-store'};
  const retryAfter=answer.headers.get('retry-after');
  if(failure.status===429&&retryAfter&&/^[0-9]{1,6}$/.test(retryAfter))
   headers['Retry-After']=retryAfter;
  return NextResponse.json({error:failure.error},{status:failure.status,headers});
 }
 const bytes=await answer.arrayBuffer();
 if(bytes.byteLength===0||bytes.byteLength>maxResponseBytes)
  return NextResponse.json({error:'Engine returned a file outside allowed limits'},{status:502});
 const targetMime=allowedMime[operation];
 const magic=new Uint8Array(bytes).slice(0,5);
 if(targetMime==='application/pdf'&&new TextDecoder().decode(magic)!=='%PDF-')
  return NextResponse.json({error:'Invalid output PDF'},{status:502});
 if(targetMime!=='application/pdf'&&!(magic[0]===0x50&&magic[1]===0x4b))
  return NextResponse.json({error:'Invalid output Office document'},{status:502});
 return new NextResponse(bytes,{headers:{'Content-Type':targetMime,'Cache-Control':'private, no-store',
  'X-Content-Type-Options':'nosniff','Content-Disposition':'attachment; filename="filemagik-result"'}});
}
