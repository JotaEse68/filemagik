/** Validate the existing synchronous mixed-worker ZIP before reporting success.
 * This is NOT remote job recovery: only the finished ZIP can be retained locally.
 */
export type BatchReport={total:number;success:number;failed:number;rows:Array<{name:string;status:string;output?:string}>};
type Item={index:number;name:string;status:string;output?:string;sha256?:string;bytes?:number};
export async function inspectMixedBatch(blob:Blob,expectedFiles:number):Promise<BatchReport>{
 const {default:JSZip}=await import('jszip');
 const zip=await JSZip.loadAsync(blob,{checkCRC32:true});
 const raw=zip.file('manifest.json');
 if(!raw)throw new Error('El ZIP del lote no contiene su informe de conversión.');
 const text=await raw.async('string');
 if(text.length>10000)throw new Error('El informe del lote supera el límite.');
 let parsed:{files?:Item[]};
 try{parsed=JSON.parse(text);}catch{throw new Error('Informe de lote inválido.');}
 if(!Array.isArray(parsed.files)||parsed.files.length!==expectedFiles)
  throw new Error('El informe del lote no coincide con los archivos enviados.');
 let success=0;
 for(const [i,item] of parsed.files.entries()){
  if(!item||item.index!==i||typeof item.name!=='string'||item.name.length>150||
    !['ok','unsupported','too_large_or_empty','error'].includes(item.status))
   throw new Error('El lote contiene estados de conversión incorrectos.');
  if(item.status==='ok'){
   if(typeof item.output!=='string'||!/^[a-zA-Z0-9_-]+\.(png|webp|mp3|wav|mp4|zip)$/.test(item.output)||
    !/^[a-f0-9]{64}$/.test(item.sha256||'')||!Number.isSafeInteger(item.bytes)||item.bytes!<=0)
    throw new Error('El lote contiene un archivo de salida inválido.');
   const file=zip.file(item.output);
   if(!file)throw new Error('Falta un archivo convertido en el ZIP.');
   const bytes=await file.async('uint8array');
   if(bytes.length!==item.bytes)throw new Error('El archivo convertido está incompleto.');
   const hash=new Uint8Array(await crypto.subtle.digest('SHA-256',Uint8Array.from(bytes).buffer));
   const actual=Array.from(hash,b=>b.toString(16).padStart(2,'0')).join('');
   if(actual!==item.sha256)throw new Error('Un archivo convertido no supera la comprobación de integridad.');
   success++;
  }
 }
 if(!success)throw new Error('Ningún archivo del lote se convirtió correctamente.');
 const entries=Object.values(zip.files).filter(x=>!x.dir&&x.name!=='manifest.json');
 if(entries.length!==success)throw new Error('El ZIP contiene archivos inesperados o faltantes.');
 return {total:parsed.files.length,success,failed:parsed.files.length-success,
  rows:parsed.files.map(row=>({name:row.name,status:row.status,output:row.output}))};
}
