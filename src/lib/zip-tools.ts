import type {OutputFile} from './convert';
const MAX_TOTAL=120*1024*1024;
const safe=(name:string)=>name.replace(/[\\/]/g,'_').replace(/^\.+/,'').slice(0,150)||'file';
export async function createZip(files:File[]):Promise<OutputFile>{
 if(!files.length||files.length>100)throw new Error('Select between 1 and 100 files');
 const size=files.reduce((sum,f)=>sum+f.size,0);if(size>MAX_TOTAL)throw new Error('Maximum total size: 120 MB');
 const {default:JSZip}=await import('jszip');const zip=new JSZip();
 for(const [i,file] of files.entries())zip.file(`${String(i+1).padStart(3,'0')}-${safe(file.name)}`,await file.arrayBuffer());
 return {name:'filemagik-archive.zip',blob:await zip.generateAsync({type:'blob',compression:'DEFLATE',compressionOptions:{level:6}})};
}
export async function extractZip(file:File):Promise<OutputFile>{
 if(file.size>MAX_TOTAL)throw new Error('ZIP exceeds 120 MB');
 const {default:JSZip}=await import('jszip'),input=await JSZip.loadAsync(await file.arrayBuffer()),out=new JSZip();
 const entries=Object.values(input.files).filter(f=>!f.dir);
 if(entries.length>150)throw new Error('Archive has too many files (150 maximum)');
 let total=0;
 for(const [i,entry] of entries.entries()){
  const data=await entry.async('uint8array');total+=data.byteLength;
  if(total>MAX_TOTAL)throw new Error('Unpacked archive is too large (120 MB maximum)');
  out.file(`${String(i+1).padStart(3,'0')}-${safe(entry.name.split('/').pop()||'file')}`,data);
 }
 return {name:file.name.replace(/\.zip$/i,'')+'-extracted.zip',blob:await out.generateAsync({type:'blob',compression:'DEFLATE'})};
}
