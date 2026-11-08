import {redirect} from 'next/navigation';
import {isLocalAdmin} from '@/lib/admin/local-session';
import AccountSecurity from '@/components/admin/account-security';
export const dynamic='force-dynamic';
export const metadata={title:'Seguridad de la cuenta · FileMagik',robots:{index:false,follow:false}};
export default async function SecurityPage(){if(!await isLocalAdmin())redirect('/admin/login');return <AccountSecurity/>;}
