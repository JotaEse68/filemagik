/**
 * Read a private conversion response with a hard in-memory bound.
 * Upstream Content-Length is only an early rejection hint; transfer encodings
 * can change the number of decoded bytes delivered by fetch.
 */
export async function readLimitedUpstream(response:Response,maxBytes:number):Promise<ArrayBuffer|null>{
 if(!Number.isSafeInteger(maxBytes)||maxBytes<=0)return null;
 const declared=response.headers.get('content-length');
 if(declared!==null){
  const length=Number(declared);
  if(!Number.isSafeInteger(length)||length<0||length>maxBytes){
   try{await response.body?.cancel();}catch{/* best effort */}
   return null;
  }
 }
 if(!response.body)return null;
 const reader=response.body.getReader();
 const chunks:Uint8Array[]=[];
 let total=0;
 try{
  while(true){
   const {done,value}=await reader.read();
   if(done)break;
   total+=value.byteLength;
   if(total>maxBytes){
    try{await reader.cancel();}catch{/* best effort */}
    return null;
   }
   chunks.push(value);
  }
 }catch{
  try{await reader.cancel();}catch{/* best effort */}
  return null;
 }finally{reader.releaseLock();}
 if(total===0)return null;
 const data=new Uint8Array(total);
 let offset=0;
 for(const part of chunks){data.set(part,offset);offset+=part.byteLength;}
 return data.buffer;
}
