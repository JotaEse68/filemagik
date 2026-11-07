import type {OutputFile} from './convert';

export type AudioTrim={startSeconds?:number;endSeconds?:number};
function wavFromChannels(buffer:AudioBuffer,from:number,to:number):Blob{
 const channels=Math.min(buffer.numberOfChannels,2),frames=to-from;
 if(frames<1||frames>buffer.sampleRate*600)throw new Error('Select between 0 and 10 minutes of audio');
 const dataLength=frames*channels*2;
 const output=new ArrayBuffer(44+dataLength),view=new DataView(output);
 const writeText=(offset:number,value:string)=>{for(let i=0;i<value.length;i++)view.setUint8(offset+i,value.charCodeAt(i))};
 writeText(0,'RIFF');view.setUint32(4,36+dataLength,true);writeText(8,'WAVE');writeText(12,'fmt ');
 view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,channels,true);
 view.setUint32(24,buffer.sampleRate,true);view.setUint32(28,buffer.sampleRate*channels*2,true);
 view.setUint16(32,channels*2,true);view.setUint16(34,16,true);writeText(36,'data');view.setUint32(40,dataLength,true);
 let offset=44;const samples=Array.from({length:channels},(_,i)=>buffer.getChannelData(i));
 for(let frame=from;frame<to;frame++)for(let channel=0;channel<channels;channel++){
  const value=Math.max(-1,Math.min(1,samples[channel][frame]));
  view.setInt16(offset,value<0?Math.round(value*32768):Math.round(value*32767),true);offset+=2;
 }
 return new Blob([output],{type:'audio/wav'});
}
/** WebAudio codec support depends on the user's browser; no server uploads. */
export async function audioToWav(file:File,trim:AudioTrim={}):Promise<OutputFile>{
 if(file.size>30*1024*1024)throw new Error('Audio file limit is 30 MB');
 const AudioContextClass=window.AudioContext;
 if(!AudioContextClass)throw new Error('Browser audio decoder unavailable');
 const ctx=new AudioContextClass();
 try{
  const bytes=await file.arrayBuffer();
  const decoded=await ctx.decodeAudioData(bytes);
  if(!decoded.duration||decoded.duration>600)throw new Error('Audio duration must be 10 minutes or less');
  const start=trim.startSeconds??0,end=trim.endSeconds??decoded.duration;
  if(!Number.isFinite(start)||!Number.isFinite(end)||start<0||end<=start||end>decoded.duration+.001)throw new Error('Invalid trim range');
  const from=Math.round(start*decoded.sampleRate),to=Math.min(decoded.length,Math.round(end*decoded.sampleRate));
  const blob=wavFromChannels(decoded,from,to);
  return {name:file.name.replace(/\.[^.]+$/,'')+'-filemagik.wav',blob};
 }catch(error){
  if(error instanceof DOMException)throw new Error('This browser cannot decode the audio codec in this file');
  throw error;
 }finally{await ctx.close();}
}
