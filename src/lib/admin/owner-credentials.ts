import {createCipheriv,createDecipheriv,createHash,randomBytes,randomUUID,scryptSync,timingSafeEqual} from 'node:crypto';
import {list,put} from '@vercel/blob';

const prefix='filemagik/admin/secure/credential-';
type Credential={version:string;passSalt:string;passHash:string;recoverSalt:string;recoverHash:string};
function key(){const secret=process.env.FILEMAGIK_ADMIN_SESSION_SECRET;if(!secret||secret.length<32)throw new Error('Secreto de administrador no configurado');return createHash('sha256').update('FileMagik Owner Encrypted Credential v1').update(secret).digest();}
function hash(value:string,salt:string){return scryptSync(value,Buffer.from(salt,'hex'),64).toString('hex');}
function same(a:string,b:string){return /^[a-f0-9]{128}$/.test(a)&&/^[a-f0-9]{128}$/.test(b)&&timingSafeEqual(Buffer.from(a,'hex'),Buffer.from(b,'hex'));}
export async function readCredential():Promise<Credential|null>{
 if(!process.env.BLOB_READ_WRITE_TOKEN)return null;
 const rows:Array<{pathname:string;url:string}> = [];
 let cursor:string|undefined;
 do{const page=await list({prefix,limit:1000,cursor});rows.push(...page.blobs);cursor=page.hasMore?page.cursor:undefined;}while(cursor);
 const latest=rows.sort((a,b)=>b.pathname.localeCompare(a.pathname))[0];if(!latest)return null;
 const response=await fetch(latest.url,{cache:'no-store'});if(!response.ok)throw new Error('No se pudo leer la credencial');
 const payload=await response.json() as {data:string};
 const encoded=Buffer.from(payload.data,'base64');
 if(encoded.length<29)throw new Error('Registro de contraseña corrupto');
 const decipher=createDecipheriv('aes-256-gcm',key(),encoded.subarray(0,12));decipher.setAuthTag(encoded.subarray(12,28));
 const plaintext=Buffer.concat([decipher.update(encoded.subarray(28)),decipher.final()]).toString('utf8');
 const c=JSON.parse(plaintext) as Credential;
 if(!c.version||!c.passHash||!c.recoverHash)throw new Error('Registro incompleto');
 return c;
}
export async function verifyPassword(password:string):Promise<boolean>{
 if(!password||password.length>256)return false;
 const stored=await readCredential();
 if(stored)return same(hash(password,stored.passSalt),stored.passHash);
 const expected=process.env.FILEMAGIK_ADMIN_PASSWORD_SHA256||'';
 const actual=createHash('sha256').update(password).digest('hex');
 return /^[a-f0-9]{64}$/.test(expected)&&timingSafeEqual(Buffer.from(expected,'hex'),Buffer.from(actual,'hex'));
}
export async function verifyRecovery(code:string):Promise<boolean>{
 const c=await readCredential();
 return Boolean(c&&code.length>=20&&code.length<=180&&same(hash(code,c!.recoverSalt),c!.recoverHash));
}
export async function credentialVersion():Promise<string>{return (await readCredential())?.version||'initial';}
export async function updateCredential(password:string):Promise<{recoveryCode:string;version:string}>{
 if(password.length<14||password.length>128||!/[A-Z]/.test(password)||!/[a-z]/.test(password)||!/[0-9]/.test(password))throw new Error('La contraseña debe tener 14–128 caracteres, mayúsculas, minúsculas y números');
 const recoveryCode=randomBytes(25).toString('base64url');
 const c:Credential={version:randomUUID(),passSalt:randomBytes(16).toString('hex'),passHash:'',recoverSalt:randomBytes(16).toString('hex'),recoverHash:''};
 c.passHash=hash(password,c.passSalt);c.recoverHash=hash(recoveryCode,c.recoverSalt);
 const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',key(),iv);
 const encrypted=Buffer.concat([cipher.update(JSON.stringify(c)),cipher.final()]);
 const data=Buffer.concat([iv,cipher.getAuthTag(),encrypted]);
 const stamp=new Date().toISOString().replace(/\D/g,'').padEnd(17,'0');
 await put(prefix+stamp+'-'+randomUUID()+'.bin',JSON.stringify({data:data.toString('base64')}),{access:'public',contentType:'application/json',cacheControlMaxAge:60});
 return {recoveryCode,version:c.version};
}
