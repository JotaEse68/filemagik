import type {OutputFile} from './convert';

const MAX_ARCHIVE=60*1024*1024, MAX_TEXT=5*1024*1024, MAX_CHAPTERS=150;
function xml(text:string):Document{
 const parsed=new DOMParser().parseFromString(text,'application/xml');
 if(parsed.querySelector('parsererror'))throw new Error('Invalid EPUB XML structure');
 return parsed;
}
function resolveArchivePath(base:string,relative:string):string{
 if(/^[a-z][a-z\d+.-]*:/i.test(relative)||relative.startsWith('/'))
  throw new Error('EPUB contains an external or absolute document path');
 const raw=decodeURIComponent(relative.split(/[?#]/)[0]);
 const parts=base.split('/').filter(Boolean).concat(raw.split('/'));
 const resolved:string[]=[];
 for(const part of parts){
  if(!part||part==='.')continue;
  if(part==='..'){
   if(!resolved.length)throw new Error('EPUB path escapes its archive');
   resolved.pop();
  }else if(/[\\\x00-\x1f]/.test(part))throw new Error('Invalid EPUB path');
  else resolved.push(part);
 }
 return resolved.join('/');
}
function cleanText(text:string){
 return text.replace(/[\t\r\n ]+/g,' ').trim();
}
/** EPUB text extraction only: preserves reading order, never executes embedded HTML. */
export async function epubToText(file:File):Promise<OutputFile>{
 if(file.size===0||file.size>MAX_ARCHIVE)throw new Error('EPUB exceeds the 60 MB input limit');
 const {default:JSZip}=await import('jszip');
 let archive:InstanceType<typeof JSZip>;
 try{archive=await JSZip.loadAsync(await file.arrayBuffer());}
 catch{throw new Error('Invalid EPUB archive');}
 const entries=Object.values(archive.files).filter(item=>!item.dir);
 if(entries.length>500)throw new Error('EPUB contains too many internal files');
 let expanded=0;
 for(const entry of entries){
  const count=(entry as typeof entry & {_data?:{uncompressedSize?:number}})._data?.uncompressedSize;
  if(typeof count!=='number'||!Number.isSafeInteger(count)||count<0||count>MAX_ARCHIVE-expanded)
   throw new Error('EPUB expanded content exceeds safety limits');
  expanded+=count;
 }
 const container=archive.file('META-INF/container.xml');
 if(!container)throw new Error('EPUB package manifest is missing');
 const doc=xml(await container.async('string'));
 const root=doc.getElementsByTagName('rootfile')[0];
 const packagePath=root?.getAttribute('full-path');
 if(!packagePath)throw new Error('EPUB reading manifest is missing');
 const opfPath=resolveArchivePath('',packagePath);
 const packageFile=archive.file(opfPath);
 if(!packageFile)throw new Error('EPUB content package is missing');
 const opf=xml(await packageFile.async('string'));
 const dir=opfPath.includes('/')?opfPath.slice(0,opfPath.lastIndexOf('/')):'';
 const manifest=new Map<string,string>();
 for(const item of Array.from(opf.getElementsByTagName('item'))){
  const id=item.getAttribute('id'),href=item.getAttribute('href');
  if(id&&href)manifest.set(id,href);
 }
 const spine=Array.from(opf.getElementsByTagName('itemref'))
  .map(item=>item.getAttribute('idref')).filter((id):id is string=>!!id);
 if(!spine.length||spine.length>MAX_CHAPTERS)throw new Error('EPUB chapter count is unsupported');
 const title=cleanText(opf.getElementsByTagNameNS('*','title')[0]?.textContent||'');
 const chapters:string[]=[];let characterCount=0;
 for(const id of spine){
  const href=manifest.get(id);
  if(!href)throw new Error('EPUB has a missing chapter reference');
  const path=resolveArchivePath(dir,href);
  const item=archive.file(path);
  if(!item)throw new Error('EPUB has a missing chapter');
  const data=(item as typeof item & {_data?:{uncompressedSize?:number}})._data?.uncompressedSize;
  if(typeof data!=='number'||data>MAX_TEXT)throw new Error('EPUB chapter exceeds safe size');
  const chapter=xml(await item.async('string'));
  const body=chapter.getElementsByTagNameNS('*','body')[0];
  if(!body)throw new Error('EPUB chapter has no readable body');
  const blocks=Array.from(body.querySelectorAll('h1,h2,h3,h4,p,li,blockquote,pre'))
   // A list item or blockquote can contain paragraphs: extract each visible
   // paragraph once rather than repeating its text through the parent.
   .filter(node=>!node.parentElement?.closest('li,blockquote,pre'))
   .map(node=>cleanText(node.textContent||'')).filter(Boolean);
  const text=blocks.length?blocks.join('\n\n'):cleanText(body.textContent||'');
  characterCount+=text.length;
  if(characterCount>MAX_TEXT)throw new Error('EPUB extracted text exceeds 5 MB');
  if(text)chapters.push(text);
 }
 if(!chapters.length)throw new Error('EPUB contains no readable text');
 const output=(title?title+'\n\n':'')+chapters.join('\n\n---\n\n')+'\n';
 return {name:file.name.replace(/\.epub$/i,'')+'.txt',
  blob:new Blob([output],{type:'text/plain;charset=utf-8'})};
}
