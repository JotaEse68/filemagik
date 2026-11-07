import {NextRequest,NextResponse} from 'next/server';
import {getServerClient} from '@/lib/supabase/server';
export async function GET(request:NextRequest){
 const {searchParams,origin}=new URL(request.url);
 const client=await getServerClient();
 if(!client)return NextResponse.redirect(new URL('/admin/login',origin));
 const code=searchParams.get('code'),tokenHash=searchParams.get('token_hash'),type=searchParams.get('type');
 let success=false;
 if(code){const {error}=await client.auth.exchangeCodeForSession(code);success=!error;}
 else if(tokenHash&&type==='email'){const {error}=await client.auth.verifyOtp({token_hash:tokenHash,type:'email'});success=!error;}
 return NextResponse.redirect(new URL(success?'/admin':'/admin/login',origin));
}