export function parseCsv(content:string):string[][]{
 const rows:string[][]=[];let row:string[]=[];let field='';let quoted=false;
 for(let i=0;i<content.length;i++){const c=content[i];
  if(c==='"'){if(quoted&&content[i+1]==='"'){field+='"';i++;}else quoted=!quoted;}
  else if(c===','&&!quoted){row.push(field);field='';}
  else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&content[i+1]==='\n')i++;row.push(field);if(row.some(x=>x.length>0))rows.push(row);row=[];field='';}
  else field+=c;
 }
 if(quoted)throw new Error('Invalid CSV: unmatched quotation mark');
 row.push(field);if(row.some(x=>x.length>0))rows.push(row);return rows;
}
export function csvToJson(content:string):string{
 const [header,...rows]=parseCsv(content.replace(/^\uFEFF/,''));
 if(!header||header.length===0)throw new Error('Empty CSV');
 return JSON.stringify(rows.map(row=>Object.fromEntries(header.map((key,i)=>[key,row[i]??'']))),null,2);
}
export function jsonToCsv(content:string):string{
 const values:unknown=JSON.parse(content);
 if(!Array.isArray(values)||!values.every(x=>x!==null&&typeof x==='object'&&!Array.isArray(x)))throw new Error('Expected a JSON array of objects');
 const objects=values as Record<string,unknown>[];
 const keys=[...new Set(objects.flatMap(x=>Object.keys(x)))];
 const escape=(v:unknown)=>{const s=v==null?'':typeof v==='object'?JSON.stringify(v):String(v);return /[",\n\r]/.test(s)?'"'+s.replaceAll('"','""')+'"':s;};
 return [keys.map(escape).join(','),...objects.map(o=>keys.map(k=>escape(o[k])).join(','))].join('\r\n');
}