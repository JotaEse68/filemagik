import {NextRequest,NextResponse} from 'next/server';
import {createServerClient} from '@supabase/ssr';
export async function middleware(request:NextRequest){
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
 if(!url||!key)return NextResponse.next({request});
 let response=NextResponse.next({request});
 const client=createServerClient(url,key,{cookies:{
  getAll(){return request.cookies.getAll();},
  setAll(values){
   values.forEach(({name,value})=>request.cookies.set(name,value));
   response=NextResponse.next({request});
   values.forEach(({name,value,options})=>response.cookies.set(name,value,options));
  }
 }});
 await client.auth.getUser();
 return response;
}
export const config={matcher:['/admin/:path*','/api/admin/:path*','/auth/:path*']};