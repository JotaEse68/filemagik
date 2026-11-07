export type PageGroupOptions={range?:string;groupSize?:number};
export function parsePageSelection(input:string,total:number):number[]{
 if(!Number.isSafeInteger(total)||total<1||total>1000)throw new Error('Invalid page count');
 const selected=new Set<number>();
 if(!/^\s*\d+(?:\s*-\s*\d+)?(?:\s*,\s*\d+(?:\s*-\s*\d+)?)*\s*$/.test(input))throw new Error('Enter pages such as 1,3,5-8');
 for(const token of input.split(',')){
  const [start,end]=token.split('-').map(part=>Number(part.trim()));
  if(!Number.isSafeInteger(start)||start<1||start>total||end!==undefined&&(!Number.isSafeInteger(end)||end<start||end>total))throw new Error('Page selection is outside the document');
  for(let page=start;page<=(end??start);page++)selected.add(page-1);
 }
 return [...selected].sort((a,b)=>a-b);
}
export function partitionPages(total:number,size:number):number[][]{
 if(!Number.isSafeInteger(total)||total<1||total>1000)throw new Error('Invalid page count');
 if(!Number.isSafeInteger(size)||size<1||size>total)throw new Error('Invalid group size');
 const out:number[][]=[];
 for(let start=0;start<total;start+=size)out.push(Array.from({length:Math.min(size,total-start)},(_,i)=>start+i));
 return out;
}
export function remainingPages(total:number,removed:number[]):number[]{
 const omit=new Set(removed);return Array.from({length:total},(_,i)=>i).filter(p=>!omit.has(p));
}
