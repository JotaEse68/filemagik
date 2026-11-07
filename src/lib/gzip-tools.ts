import type {OutputFile} from './convert';

const MAX_INPUT=60*1024*1024,MAX_OUTPUT=120*1024*1024;
async function collectBounded(stream:ReadableStream<Uint8Array>,limit:number):Promise<Blob>{
 const reader=stream.getReader(),chunks:Uint8Array<ArrayBuffer>[]=[];let size=0;
 try{
  while(true){
   const {done,value}=await reader.read();if(done)break;
   size+=value.byteLength;
   if(size>limit)throw new Error('The resulting file exceeds the safe browser size limit');
   chunks.push(new Uint8Array(value));
  }
 }catch(e){await reader.cancel().catch(()=>{});throw e}finally{reader.releaseLock();}
 return new Blob(chunks,{type:'application/octet-stream'});
}
export async function gzipFile(file:File,mode:'compress'|'decompress'):Promise<OutputFile>{
 if(file.size>MAX_INPUT)throw new Error('Maximum input size is 60 MB');
 if(typeof CompressionStream==='undefined'||typeof DecompressionStream==='undefined')throw new Error('This browser does not support GZIP streams');
 const stream=mode==='compress'?file.stream().pipeThrough(new CompressionStream('gzip')):file.stream().pipeThrough(new DecompressionStream('gzip'));
 const blob=await collectBounded(stream,MAX_OUTPUT);
 const name=mode==='compress'?file.name+'.gz':file.name.replace(/\.gz$/i,'')||'file';
 return {name,blob};
}
