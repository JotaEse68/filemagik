import {createHmac,timingSafeEqual} from 'node:crypto';
import {cookies} from 'next/headers';
const COOKIE='filemagik_owner';
function signature(value:string){const key=process.env.FILEMAGIK_ADMIN_SESSION_SECRET;if(!key)return '';return createHmac('sha256',key).update(value).digest('hex');}
export function localAdminAvailable(){return Boolean(process.env.FILEMAGIK_ADMIN_PASSWORD_SHA256&&process.env.FILEMAGIK_ADMIN_SESSION_SECRET);}
export async function isLocalAdmin(){
 if(!localAdminAvailable())return false;
 const value=(await cookies()).get(COOKIE)?.value||'';
 const [stamp,mac]=value.split('.');
 if(!stamp||!mac||!/^[0-9]+$/.test(stamp)||Date.now()-Number(stamp)>7*24*60*60*1000||Number(stamp)>Date.now()+60000)return false;
 const expected=signature(stamp);
 return /^[a-f0-9]{64}$/.test(mac)&&timingSafeEqual(Buffer.from(mac,'hex'),Buffer.from(expected,'hex'));
}
export function newLocalSession(){const stamp=String(Date.now());return stamp+'.'+signature(stamp);}
export const localAdminCookie=COOKIE;
