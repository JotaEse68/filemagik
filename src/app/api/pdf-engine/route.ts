import {NextRequest,NextResponse} from 'next/server';

export const runtime='nodejs';
const supported:Record<string,readonly string[]>={
 'pdf-to-docx':['.pdf'],'pdf-to-xlsx':['.pdf'],
 'office-to-pdf':['.docx','.xlsx','.pptx','.odt','.ods','.odp'],
 'optimize-pdf':['.pdf'],
};
const maxBytes=3*1024*1024;
const maxResponseBytes=22*1024*1024;
const safeExt=(name:string)=>name.toLowerCase().match(/\.[a-z0-9]+$/)?.[0]||'';
const allowedMime:Record<string,string>={
 'pdf-to-docx':'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
 'pdf-to-xlsx':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
 'office-to-pdf':'application/pdf','optimize-pdf':'application/pdf',
};
function configured(){
 const base=process.env.FILEMAGIK_PDF_ENGINE_URL||'';
 const secret=process.env.FILEMAGIK_PDF_ENGINE_SECRET||'';
 const siteKey=process.env.NEXT_PUBLIC_FILEMAGIK_TURNSTILE_SITE_KEY||'';
 const challenge=process.env.FILEMAGIK_TURNSTILE_SECRET||'';
 return process.env.FILEMAGIK_PDF_ENGINE_PUBLIC_ENABLED==='true'&&
  /^https:\/\/[^\s]+$/i.test(base)&&secret.length>=32&&challenge.length>=16&&siteKey.length>5;
}
export async function GET(){
 return NextResponse.json({available:configured(),siteKey:configured()?process.env.NEXT_PUBLIC_FILEMAGIK_TURNSTILE_SITE_KEY:null}, {headers:{'Cache-Control':'no-store'}});
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
 if(length>maxBytes+4096)return NextResponse.json({error:'Maximum 3 MB upload'},{status:413});
 let data:FormData;
 try{data=await request.formData();}catch{return NextResponse.json({error:'Invalid upload'},{status:400});}
 const token=data.get('turnstile');
 const file=data.get('file');
 if(typeof token!=='string'||token.length>2048||!(file instanceof File))
  return NextResponse.json({error:'Verification and file required'},{status:400});
 if(file.size<1||file.size>maxBytes||!supported[operation].includes(safeExt(file.name)))
  return NextResponse.json({error:'File type or size not allowed'},{status:413});
 // A valid CAPTCHA token is required on EVERY paid-compute request. Never trust the browser alone.
 try{
  const body=new URLSearchParams({secret:process.env.FILEMAGIK_TURNSTILE_SECRET!,response:token,
   remoteip:request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()||''});
  const check=await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify',
   {method:'POST',body,cache:'no-store',signal:AbortSignal.timeout(8000)});
  const answer=await check.json() as {success?:boolean;hostname?:string;action?:string};
  if(!answer.success||answer.hostname!==request.nextUrl.hostname||answer.action!=='filemagik_pdf')
   return NextResponse.json({error:'Human verification failed'},{status:403});
 }catch{return NextResponse.json({error:'Verification unavailable'},{status:503});}
 const payload=new FormData();
 payload.set('file',new File([await file.arrayBuffer()],file.name,{type:file.type||'application/octet-stream'}));
 const base=process.env.FILEMAGIK_PDF_ENGINE_URL!.replace(/\/+$/,'');
 let answer:Response;
 try{
  answer=await fetch(base+'/v1/jobs?operation='+encodeURIComponent(operation)+'&quality='+encodeURIComponent(quality),
   {method:'POST',headers:{Authorization:'Bearer '+process.env.FILEMAGIK_PDF_ENGINE_SECRET!},
    body:payload,cache:'no-store',signal:AbortSignal.timeout(85000)});
 }catch{return NextResponse.json({error:'Advanced conversion engine unavailable'},{status:503});}
 if(!answer.ok){
  return NextResponse.json({error:answer.status===422?'Document cannot be converted reliably':'Professional processing failed'},
    {status:answer.status===413?413:answer.status===422?422:502});
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
