'use client';
import {useRef,useState} from 'react';
import {Archive,Download,FileArchive,FileUp,Loader2} from 'lucide-react';
import type {Locale} from '@/config/site';
type ZipEntry={name:string;size:number;entry:import('jszip').JSZipObject};
const labels={
 en:{title:'Open a ZIP archive',intro:'Browse and download individual files from your ZIP. Nothing is uploaded.',choose:'Choose ZIP',empty:'Select a ZIP to view its contents.',download:'Download',files:'files',limit:'For safety: 120 MB ZIP, 100 files, 30 MB per extracted file.'},
 es:{title:'Abrir un archivo ZIP',intro:'Consulta y descarga archivos individuales del ZIP, sin subirlos.',choose:'Elegir ZIP',empty:'Selecciona un ZIP para ver su contenido.',download:'Descargar',files:'archivos',limit:'Límites de seguridad: ZIP de 120 MB, 100 archivos, 30 MB por archivo.'},
 pt:{title:'Abrir arquivo ZIP',intro:'Veja e baixe os arquivos do ZIP sem envio ao servidor.',choose:'Escolher ZIP',empty:'Selecione um ZIP para ver o conteúdo.',download:'Baixar',files:'arquivos',limit:'Limites: ZIP de 120 MB, 100 arquivos, 30 MB por arquivo.'},
 fr:{title:'Ouvrir une archive ZIP',intro:'Parcourez et téléchargez les fichiers du ZIP sans transfert.',choose:'Choisir un ZIP',empty:'Choisissez un ZIP pour voir son contenu.',download:'Télécharger',files:'fichiers',limit:'Limites : ZIP de 120 Mo, 100 fichiers, 30 Mo par fichier.'}
} as const;
const MAX_FILE=30*1024*1024;
export default function ZipExplorer({locale}:{locale:Locale}){
 const t=labels[locale],input=useRef<HTMLInputElement>(null);
 const [entries,setEntries]=useState<ZipEntry[]>([]),[name,setName]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(''),[loading,setLoading]=useState(false);
 const [downloadName,setDownloadName]=useState('');
 async function open(file:File){
  setError('');setDownloadName('');setEntries([]);setLoading(true);setName(file.name);
  try{
   if(file.size>120*1024*1024)throw new Error(t.limit);
   const {default:JSZip}=await import('jszip');const zip=await JSZip.loadAsync(await file.arrayBuffer());
   const items=Object.values(zip.files).filter(v=>!v.dir);
   if(items.length>100)throw new Error(t.limit);
   const details:ZipEntry[]=items.map(entry=>{
    const raw=(entry as unknown as {_data?:{uncompressedSize?:number}})._data?.uncompressedSize;
    if(typeof raw!=='number'||raw>MAX_FILE)throw new Error(t.limit);
    return {name:entry.name,size:raw,entry};
   });
   setEntries(details);
  }catch(e){setError(e instanceof Error?e.message:'Invalid ZIP');}finally{setLoading(false);}
 }
 async function download(item:ZipEntry){
  setBusy(item.name);setError('');
  try{
   const data=await item.entry.async('uint8array');
   if(data.byteLength>MAX_FILE)throw new Error(t.limit);
   const blob=new Blob([new Uint8Array(data)],{type:'application/octet-stream'});
   const url=URL.createObjectURL(blob),link=document.createElement('a');
   link.href=url;link.download=item.name.split('/').pop()||'file';link.click();
   setDownloadName(link.download);
   setTimeout(()=>URL.revokeObjectURL(url),12000);
  }catch(e){setError(e instanceof Error?e.message:'Unable to extract file');}finally{setBusy('');}
 }
 return <section className="zip-explorer">
  <header className="zip-explorer-title"><Archive size={32}/><div><h2>{t.title}</h2><p>{t.intro}</p></div></header>
  <input className="visually-hidden" ref={input} type="file" accept=".zip,application/zip" onChange={e=>{const f=e.target.files?.[0];if(f)void open(f);}}/>
  <button type="button" className="btn btn-primary" onClick={()=>input.current?.click()}><FileUp size={17}/>{t.choose}</button>
  <p className="zip-explorer-note">{t.limit}</p>
  {loading&&<p><Loader2 className="spin" size={18}/></p>}
  {downloadName&&<div className="conversion-complete" role="status" data-testid="conversion-success"><div className="conversion-complete-heading"><Download size={22} aria-hidden="true"/><div><h3>{({es:'Archivo extraído correctamente',en:'File extracted successfully',pt:'Ficheiro extraído corretamente',fr:'Fichier extrait avec succès'} as const)[locale]}</h3><p>{({es:'Se ha solicitado su descarga. Revisa las descargas del navegador.',en:'Download requested. Check your browser downloads.',pt:'Transferência solicitada. Consulte o navegador.',fr:'Téléchargement demandé. Consultez votre navigateur.'} as const)[locale]}</p></div></div><p className="conversion-complete-file">{downloadName}</p></div>}
  {error&&<p role="alert" className="error">{error}</p>}
  {!entries.length&&!loading&&!error&&<p className="zip-explorer-empty">{t.empty}</p>}
  {entries.length>0&&<div><h3>{name} · {entries.length} {t.files}</h3><div className="zip-entries">{entries.map((item,i)=><div key={i}><span><FileArchive size={18}/><span>{item.name}</span><small>{Math.ceil(item.size/1024)} KB</small></span><button className="btn btn-ghost" disabled={Boolean(busy)} onClick={()=>void download(item)}><Download size={15}/>{busy===item.name?'…':t.download}</button></div>)}</div></div>}
 </section>;
}
