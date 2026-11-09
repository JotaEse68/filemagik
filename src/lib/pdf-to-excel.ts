import type {OutputFile} from './convert';
type TextPoint={text:string;x:number;y:number};
function rowsFromPoints(points:TextPoint[]):Array<Array<{x:number;text:string}>>{
 const rows:Array<{y:number;cells:Array<{x:number;text:string}>}>=[];
 for(const point of points.sort((a,b)=>b.y-a.y||a.x-b.x)){
  const row=rows.find(r=>Math.abs(r.y-point.y)<3);
  if(row)row.cells.push({x:point.x,text:point.text});else rows.push({y:point.y,cells:[{x:point.x,text:point.text}]});
 }
 return rows.sort((a,b)=>b.y-a.y).map(r=>r.cells.sort((a,b)=>a.x-b.x));
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
   const content=await page.getTextContent();
   const points:TextPoint[]=content.items.filter((it):it is Extract<typeof it,{str:string}>=>'str' in it).filter(it=>it.str.trim()).map(it=>({text:it.str.trim(),x:it.transform[4],y:it.transform[5]}));
   const rows=rowsFromPoints(points),sheet=book.addWorksheet('Page '+n);
   // Layout inference is a best-effort text extraction, not a table reconstruction engine.
   for(const row of rows){
    if(row.length>35)throw new Error('Page has too many fragments to form useful columns');
    sheet.addRow(row.map(x=>x.text));
   }
   sheet.columns.forEach(col=>{col.width=25;});
   page.cleanup();
  }
  const bytes=await book.xlsx.writeBuffer();
  return {name:file.name.replace(/\.pdf$/i,'')+'-text-columns.xlsx',blob:new Blob([new Uint8Array(bytes)],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'})};
 }finally{await pdf.cleanup();}
}
