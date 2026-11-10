import type {OutputFile} from './convert';

const MAX_INPUT=5*1024*1024,MAX_OUTPUT=8*1024*1024;
const IGNORE=new Set(['fonttbl','colortbl','stylesheet','info','pict','object','header','footer','headerl','headerr','footerl','footerr','listtable','listoverridetable','generator','xmlopen','xmlattrname','xmlattrvalue','datastore','themedata','colorschememapping']);
const cp1252=new TextDecoder('windows-1252');
type State={hidden:boolean,uc:number,pending:number,star:boolean};

/** Plain-text RTF reader. Skips embedded destinations, pictures and objects; never evaluates commands. */
export function rtfToPlainText(source:string):string{
 if(!/^\{\s*\\rtf\d/.test(source))throw new Error('Invalid RTF document header');
 const stack:State[]=[];
 let state:State={hidden:false,uc:1,pending:0,star:false};
 let output='',index=0,depth=0;
 const append=(s:string)=>{
  if(!state.hidden&&s){output+=s;if(output.length>MAX_OUTPUT)throw new Error('RTF output exceeds 8 MB');}
 };
 while(index<source.length){
  const ch=source[index++];
  if(ch==='{'){
   if(++depth>128)throw new Error('RTF nesting exceeds the safe limit');
   stack.push({...state});state={...state,star:false};continue;
  }
  if(ch==='}'){
   if(!depth||!stack.length)throw new Error('Unbalanced RTF groups');
   state=stack.pop()!;depth--;continue;
  }
  if(ch!=='\\'){
   if(state.pending){state.pending--;continue;}
   if(ch==='\r'||ch==='\n')continue;
   append(ch);continue;
  }
  if(index>=source.length)throw new Error('Truncated RTF escape');
  const marker=source[index++];
  if(marker==='\\'||marker==='{'||marker==='}'){
   if(state.pending)state.pending--;
   else append(marker);
   continue;
  }
  if(marker==="'"){
   const encoded=source.slice(index,index+2);
   if(!/^[0-9a-f]{2}$/i.test(encoded))throw new Error('Invalid RTF byte escape');
   index+=2;
   if(state.pending)state.pending--;
   else append(cp1252.decode(new Uint8Array([parseInt(encoded,16)])));
   continue;
  }
  if(marker==='*'){state.star=true;continue;}
  if(!/[A-Za-z]/.test(marker)){
   if(marker==='~')append('\u00a0');
   else if(marker==='-')append('\u00ad');
   else if(marker==='_')append('\u2011');
   continue;
  }
  let word=marker;
  while(index<source.length&&/[A-Za-z]/.test(source[index]))word+=source[index++];
  let sign=1;
  if(source[index]==='-'){sign=-1;index++;}
  let digits='';
  while(index<source.length&&/[0-9]/.test(source[index]))digits+=source[index++];
  const arg=digits?sign*Number(digits):undefined;
  if(source[index]===' ')index++;
  if(state.star||IGNORE.has(word)){state.hidden=true;state.star=false;continue;}
  if(word==='bin'&&arg!==undefined){
   if(arg<0||arg>MAX_INPUT||index+arg>source.length)throw new Error('Invalid RTF binary payload');
   index+=arg;continue;
  }
  if(word==='uc'&&arg!==undefined){state.uc=Math.max(0,Math.min(arg,16));continue;}
  if(word==='u'&&arg!==undefined){
   append(String.fromCharCode((arg+65536)%65536));
   state.pending=state.uc;
   continue;
  }
  if(state.pending)continue;
  if(word==='par'||word==='line')append('\n');
  else if(word==='tab')append('\t');
  else if(word==='emdash')append('—');
  else if(word==='endash')append('–');
  else if(word==='bullet')append('•');
  else if(word==='lquote')append('‘');
  else if(word==='rquote')append('’');
  else if(word==='ldblquote')append('“');
  else if(word==='rdblquote')append('”');
 }
 if(depth!==0||stack.length)throw new Error('Unbalanced RTF groups');
 return output.replace(/\n{3,}/g,'\n\n').trim();
}

export async function rtfToText(file:File):Promise<OutputFile>{
 if(file.size<5||file.size>MAX_INPUT)throw new Error('RTF input must be 5 bytes to 5 MB');
 const bytes=new Uint8Array(await file.arrayBuffer());
 const text=cp1252.decode(bytes);
 const plain=rtfToPlainText(text);
 if(!plain)throw new Error('RTF contains no extractable text');
 return {name:file.name.replace(/\.rtf$/i,'')+'.txt',
  blob:new Blob([plain+'\n'],{type:'text/plain;charset=utf-8'})};
}
