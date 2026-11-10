/** Browser-only, bounded batch recovery. No localStorage file URLs or server-side
 * retention. IndexedDB structured clones File and Blob; content expires in 24h.
 * A server request interrupted before completion MUST be retried and can use
 * additional quota. This is not a remote resumable job queue.
 */
const DB='filemagik-mixed-batch-v1',STORE='recovery',KEY='latest';
const MAX_AGE=24*60*60*1000;
type Draft={id:string;created:number;preset:'web-friendly'|'extract';files:File[];result?:Blob;resultName?:string};
function openDatabase():Promise<IDBDatabase>{
 return new Promise((resolve,reject)=>{
  const request=indexedDB.open(DB,1);
  request.onupgradeneeded=()=>{if(!request.result.objectStoreNames.contains(STORE))request.result.createObjectStore(STORE);};
  request.onsuccess=()=>resolve(request.result);
  request.onerror=()=>reject(new Error('Local batch storage unavailable'));
 });
}
async function transact<T>(mode:IDBTransactionMode,callback:(store:IDBObjectStore,done:(value:T)=>void)=>void):Promise<T>{
 const db=await openDatabase();
 try{return await new Promise<T>((resolve,reject)=>{
  const tx=db.transaction(STORE,mode);
  tx.onerror=()=>reject(new Error('Unable to persist local batch'));
  callback(tx.objectStore(STORE),resolve);
 });}finally{db.close();}
}
export async function loadBatch():Promise<Draft|null>{
 if(typeof indexedDB==='undefined')return null;
 const draft=await transact<Draft|undefined>('readonly',(store,done)=>{
  const request=store.get(KEY);
  request.onsuccess=()=>done(request.result as Draft|undefined);
 });
 if(!draft)return null;
 if(Date.now()-draft.created>MAX_AGE){await clearBatch();return null;}
 return draft;
}
export async function saveBatch(files:File[],preset:'web-friendly'|'extract'):Promise<void>{
 if(typeof indexedDB==='undefined')return;
 if(!files.length||files.length>6||files.some(f=>f.size>3*1024*1024)||files.reduce((s,f)=>s+f.size,0)>12*1024*1024)
  throw new Error('Batch exceeds local recovery limits');
 const draft:Draft={id:crypto.randomUUID(),created:Date.now(),preset,files};
 await transact<void>('readwrite',(store,done)=>{
  const request=store.put(draft,KEY);request.onsuccess=()=>done();
 });
}
export async function saveBatchResult(result:Blob,resultName:string):Promise<void>{
 const existing=await loadBatch();if(!existing)return;
 if(result.size>12*1024*1024)throw new Error('Batch output too large for recovery');
 await transact<void>('readwrite',(store,done)=>{
  const request=store.put({...existing,result,resultName},KEY);
  request.onsuccess=()=>done();
 });
}
export async function clearBatch():Promise<void>{
 if(typeof indexedDB==='undefined')return;
 await transact<void>('readwrite',(store,done)=>{
  const request=store.delete(KEY);request.onsuccess=()=>done();
 });
}
