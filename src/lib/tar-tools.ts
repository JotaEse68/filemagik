import type {OutputFile} from './convert';

const BLOCK=512, MAX_BYTES=120*1024*1024, MAX_FILES=100;
const encoder=new TextEncoder(),decoder=new TextDecoder('utf-8',{fatal:false});

function safeName(name:string):string{
 const base=name.replace(/\\/g,'/').split('/').pop()||'file';
 return base.normalize('NFKD').replace(/[\u0300-\u036f]/g,'')
  .replace(/[^a-zA-Z0-9._-]/g,'_').replace(/^\.+/,'').slice(0,90)||'file';
}
function writeText(bytes:Uint8Array,offset:number,length:number,value:string){
 const chars=encoder.encode(value);
 if(chars.length>length)throw new Error('Archive entry name is too long');
 bytes.set(chars,offset);
}
function writeOctal(bytes:Uint8Array,offset:number,length:number,value:number){
 const oct=value.toString(8).padStart(length-1,'0');
 if(oct.length>length-1)throw new Error('TAR numeric value too large');
 writeText(bytes,offset,length,oct+'\0');
}
function header(name:string,size:number):Uint8Array{
 const h=new Uint8Array(BLOCK);
 writeText(h,0,100,name);
 writeOctal(h,100,8,0o644);writeOctal(h,108,8,0);
 writeOctal(h,116,8,0);writeOctal(h,124,12,size);writeOctal(h,136,12,0);
 h.fill(32,148,156);h[156]=48; // regular file
 writeText(h,257,6,'ustar\0');writeText(h,263,2,'00');
 const sum=h.reduce((total,n)=>total+n,0);
 const oct=sum.toString(8).padStart(6,'0');
 writeText(h,148,8,oct+'\0 ');
 return h;
}
function readString(bytes:Uint8Array,start:number,length:number){
 const raw=bytes.subarray(start,start+length);
 const end=raw.indexOf(0);
 return decoder.decode(end>=0?raw.subarray(0,end):raw).trim();
}
function readOctal(bytes:Uint8Array,start:number,length:number){
 const value=readString(bytes,start,length);
 if(!/^[0-7]+$/.test(value))throw new Error('Invalid TAR numeric field');
 const parsed=parseInt(value,8);
 if(!Number.isSafeInteger(parsed))throw new Error('Invalid TAR size');
 return parsed;
}
/** Supports regular POSIX ustar files; deliberately refuses links and extended headers. */
export async function createTar(files:File[]):Promise<OutputFile>{
 if(!files.length||files.length>MAX_FILES)throw new Error('Select 1 to 100 files');
 const size=files.reduce((n,file)=>n+file.size,0);
 if(size>MAX_BYTES)throw new Error('Maximum TAR input is 120 MB');
 const parts:BlobPart[]=[];
 for(const [i,file] of files.entries()){
  const name=String(i+1).padStart(3,'0')+'-'+safeName(file.name);
  const bytes=new Uint8Array(await file.arrayBuffer());
  parts.push(new Uint8Array(header(name,bytes.byteLength)),bytes);
  const padding=(BLOCK-bytes.byteLength%BLOCK)%BLOCK;
  if(padding)parts.push(new Uint8Array(padding));
 }
 parts.push(new Uint8Array(BLOCK*2));
 return {name:'filemagik-archive.tar',blob:new Blob(parts,{type:'application/x-tar'})};
}
export async function extractTar(file:File):Promise<OutputFile>{
 if(file.size>MAX_BYTES)throw new Error('Maximum TAR input is 120 MB');
 const bytes=new Uint8Array(await file.arrayBuffer());
 const {default:JSZip}=await import('jszip');const zip=new JSZip();
 let offset=0,total=0,entries=0,endFound=false;
 while(offset+BLOCK<=bytes.length){
  const h=bytes.subarray(offset,offset+BLOCK);
  if(h.every(v=>v===0)){endFound=true;break;}
  if(readString(h,257,6)!=='ustar')throw new Error('Only standard ustar archives are supported');
  const expected=readOctal(h,148,8);
  const actual=h.reduce((sum,value,index)=>sum+(index>=148&&index<156?32:value),0);
  if(actual!==expected)throw new Error('TAR header checksum mismatch');
  const name=readString(h,0,100),prefix=readString(h,345,155);
  const type=h[156],size=readOctal(h,124,12);
  if(!Number.isSafeInteger(size)||size>MAX_BYTES-total)throw new Error('TAR unpacked data exceeds 120 MB');
  const next=offset+BLOCK+Math.ceil(size/BLOCK)*BLOCK;
  if(next>bytes.byteLength)throw new Error('Truncated TAR archive');
  if(type===48||type===0){
   if(++entries>MAX_FILES)throw new Error('Maximum 100 TAR files');
   const filename=safeName(prefix?prefix+'/'+name:name);
   zip.file(String(entries).padStart(3,'0')+'-'+filename,bytes.slice(offset+BLOCK,offset+BLOCK+size));
   total+=size;
  }else if(type!==53){
   throw new Error('TAR links or extended entries are not supported for security');
  }
  offset=next;
 }
 if(!endFound||!entries)throw new Error('TAR archive is empty or incomplete');
 return {name:file.name.replace(/\.tar$/i,'')+'-extracted.zip',
  blob:await zip.generateAsync({type:'blob',compression:'DEFLATE',compressionOptions:{level:4}})};
}
