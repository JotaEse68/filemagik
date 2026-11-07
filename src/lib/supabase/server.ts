import {cookies} from 'next/headers';
import {createServerClient} from '@supabase/ssr';
import {supabaseConfig} from './env';
export async function getServerClient(){
 const config=supabaseConfig();if(!config)return null;
 const store=await cookies();
 return createServerClient(config.url,config.key,{
  cookies:{
   getAll(){return store.getAll();},
   setAll(toSet){try{toSet.forEach(({name,value,options})=>store.set(name,value,options));}catch(error){
    if(!(error instanceof Error)||!error.message.includes('Cookies can only be modified'))throw error;
   }}
  }
 });
}
export async function requireAdmin(){
 const client=await getServerClient();if(!client)return null;
 const {data:{user},error}=await client.auth.getUser();if(error||!user||!user.email_confirmed_at)return null;
 const {data,error:membershipError}=await client.from('filemagik_admins').select('user_id').eq('user_id',user.id).maybeSingle();
 if(membershipError||!data)return null;
 return {client,user};
}