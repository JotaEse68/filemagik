import {NextResponse} from 'next/server';
import {requireAdmin} from '@/lib/supabase/server';
export async function GET(){
 const admin=await requireAdmin();
 if(!admin)return NextResponse.json({error:'Unauthorized'},{status:401,headers:{'Cache-Control':'no-store'}});
 const {data,error}=await admin.client.from('filemagik_admin_audit').select('id,created_at,action,resource,details').order('created_at',{ascending:false}).limit(30);
 if(error)return NextResponse.json({error:'Audit unavailable'},{status:503,headers:{'Cache-Control':'no-store'}});
 return NextResponse.json({events:data??[]},{headers:{'Cache-Control':'no-store'}});
}
