import type {OutputFile} from './convert';
type Fragment={text:string;x:number;y:number;width:number;height:number};
export type GridRow={y:number;cells:Fragment[]};

/** Reconstructs editable rows and approximate columns from PDF text positions. */
export function makePositionedRows(points:Fragment[],tolerance=3):GridRow[]{
 const rows:GridRow[]=[];
 for(const p of [...points].sort((a,b)=>b.y-a.y||a.x-b.x)){
  const row=rows.find(r=>Math.abs(r.y-p.y)<=tolerance);
  if(row)row.cells.push(p);
  else rows.push({y:p.y,cells:[p]});
 }
 return rows.sort((a,b)=>b.y-a.y).map(r=>({...r,cells:r.cells.sort((a,b)=>a.x-b.x)}));
}
export function detectColumns(rows:GridRow[],max=30):number[]{
 const anchors:number[]=[];
 for(const row of rows)for(const cell of row.cells){
  const near=anchors.findIndex(x=>Math.abs(x-cell.x)<11);
  if(near<0)anchors.push(cell.x);
 }
 const unique=anchors.sort((a,b)=>a-b);
 // Ignore positions that are rarely reused, unless this is a small dataset.
 const frequent=unique.filter(anchor=>rows.length<=2||rows.filter(row=>row.cells.some(c=>Math.abs(c.x-anchor)<11)).length>=2);
 const chosen=(frequent.length?frequent:unique).slice(0,max);
 return chosen;
}
export function mapToCells(row:GridRow,columns:number[]):string[]{
 const out=Array.from({length:columns.length},()=> '');
 for(const fragment of row.cells){
  if(!columns.length)continue;
  const index=columns.reduce((best,x,i)=>Math.abs(fragment.x-x)<Math.abs(fragment.x-columns[best])?i:best,0);
  out[index]+=(out[index]?' ':'')+fragment.text;
 }
 return out;
}
export async function pdfToExcelBestEffort(file:File):Promise<OutputFile>{
 const pdfjs=await import('pdfjs-dist');
 const {default:ExcelJS}=await import('exceljs');
 pdfjs.GlobalWorkerOptions.workerSrc=new URL('pdfjs-dist/build/pdf.worker.min.mjs',import.meta.url).toString();
 const pdf=await pdfjs.getDocument({data:new Uint8Array(await file.arrayBuffer())}).promise;
 const book=new ExcelJS.Workbook();
 try{
  if(pdf.numPages>50)throw new Error('Maximum 50 PDF pages');
  for(let n=1;n<=pdf.numPages;n++){
   const page=await pdf.getPage(n);
   try{
    const content=await page.getTextContent();
    const fragments:Fragment[]=content.items.filter((item):item is Extract<typeof item,{str:string}>=>'str' in item).filter(item=>item.str.trim()).map(item=>({text:item.str.trim(),x:item.transform[4],y:item.transform[5],width:item.width,height:item.height}));
    const rows=makePositionedRows(fragments),columns=detectColumns(rows);
    if(columns.length>30)throw new Error('Too many columns to reconstruct');
    const sheet=book.addWorksheet('Page '+n);
    for(const row of rows)sheet.addRow(mapToCells(row,columns));
    sheet.columns.forEach(col=>{col.width=24;});
    sheet.views=[{state:'frozen',ySplit:0}];
   }finally{page.cleanup();}
  }
  const bytes=await book.xlsx.writeBuffer();
  return {name:file.name.replace(/\.pdf$/i,'')+'-editable.xlsx',blob:new Blob([new Uint8Array(bytes)],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'})};
 }finally{await pdf.cleanup();}
}
