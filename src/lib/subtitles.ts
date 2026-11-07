import type {OutputFile} from './convert';

type Caption={start:number;end:number;body:string};
const timeToMs=(value:string):number=>{
 const match=value.trim().match(/^(\d{1,3}):(\d{2}):(\d{2})[,.](\d{3})$/);
 if(!match)throw new Error('Invalid subtitle timestamp: '+value);
 const [,hh,mm,ss,ms]=match;
 if(Number(mm)>59||Number(ss)>59)throw new Error('Invalid subtitle time');
 return ((Number(hh)*60+Number(mm))*60+Number(ss))*1000+Number(ms);
};
const msToTime=(time:number,comma:boolean)=>{
 const total=Math.max(0,Math.round(time)),hours=Math.floor(total/3600000),mins=Math.floor(total%3600000/60000),secs=Math.floor(total%60000/1000),ms=total%1000;
 return [hours,mins,secs].map(x=>String(x).padStart(2,'0')).join(':')+(comma?',':'.')+String(ms).padStart(3,'0');
};
/** Subtitle entries are parsed, not just extensions swapped. */
export function parseCaptions(text:string):Caption[]{
 const clean=text.replace(/^\uFEFF/,'').replace(/\r\n?/g,'\n').replace(/^WEBVTT[^\n]*(?:\n[^\n]*)*?\n\n/,'');
 const chunks=clean.trim().split(/\n\s*\n/);
 if(chunks.length>10000)throw new Error('Too many subtitles');
 const parsed:Caption[]=[];
 for(const block of chunks){
  const lines=block.trim().split('\n');
  if(!lines.length||/^NOTE(?:\s|$)/.test(lines[0])||/^STYLE(?:\s|$)/.test(lines[0])||/^REGION(?:\s|$)/.test(lines[0]))continue;
  const ix=lines.findIndex(line=>line.includes('-->'));
  if(ix<0)continue;
  const match=lines[ix].match(/^\s*([^\s]+)\s+-->\s+([^\s]+)(?:\s+.*)?$/);
  if(!match)throw new Error('Invalid subtitle cue');
  const start=timeToMs(match[1]),end=timeToMs(match[2]);
  if(start>=end)throw new Error('Subtitle end must be after start');
  const body=lines.slice(ix+1).join('\n').trim();
  if(body)parsed.push({start,end,body});
 }
 if(!parsed.length)throw new Error('No valid subtitles found');
 return parsed;
}
export function renderCaptions(captions:Caption[],format:'srt'|'vtt',offsetMs=0):string{
 const vtt=format==='vtt';
 return (vtt?'WEBVTT\n\n':'')+captions.map((cue,i)=>{
  const start=msToTime(cue.start+offsetMs,!vtt),end=msToTime(cue.end+offsetMs,!vtt);
  return (vtt?'':String(i+1)+'\n')+start+' --> '+end+'\n'+cue.body;
 }).join('\n\n')+'\n';
}
export async function convertSubtitles(file:File,format:'srt'|'vtt',offsetMs=0):Promise<OutputFile>{
 if(!Number.isSafeInteger(offsetMs)||Math.abs(offsetMs)>86400000)throw new Error('Subtitle offset must be within 24 hours');
 const text=await file.text();
 const result=renderCaptions(parseCaptions(text),format,offsetMs);
 const name=file.name.replace(/\.(srt|vtt)$/i,'')+'.'+format;
 return {name,blob:new Blob([result],{type:'text/plain;charset=utf-8'})};
}
