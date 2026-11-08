import {createHmac,timingSafeEqual} from 'node:crypto';
import {cookies} from 'next/headers';
import {credentialVersion} from './owner-credentials';
const COOKIE='filemagik_owner';
function signature(value:string){const secret=process.env.FILEMAGIK_ADMIN_SESSION_SECRET;if(!secret)return '';return createHmac('sha256',secret).update(value).digest('hex');}
export function localAdminAvailable(){return Boolean(process.env.FILEMAGIK_ADMIN_PASSWORD_SHA256&&process.env.FILEMAGIK_ADMIN_SESSION_SECRET);}
export async function isLocalAdmin(){
 if(!localAdminAvailable())return false;
 const value=(await cookies()).get(COOKIE)?.value||'';
 const fields=value.split('.');
 const [stamp,version,mac]=fields.length===3?fields:[fields[0],'initial',fields[1]];
 if(!stamp||!mac||!/^[0-9]+$/.test(stamp)||Date.now()-Number(stamp)>7*24*60*60*1000||Number(stamp)>Date.now()+60000)return false;
 const active=await credentialVersion();
 if(version!==active)return false;
 const expected=signature(fields.length===3?stamp+'.'+version:stamp);
 return /^[a-f0-9]{64}$/.test(mac)&&timingSafeEqual(Buffer.from(mac,'hex'),Buffer.from(expected,'hex'));
}
export async function newLocalSession(){const stamp=String(Date.now()),version=await credentialVersion();return stamp+'.'+version+'.'+signature(stamp+'.'+version);}
export const localAdminCookie=COOKIE;
