import type {OutputFile} from './convert';
import {parseCsv} from './csv';
function escapeCsv(value:string){
 const safe=/^[=+@]/.test(value)?'\''+value:value;
 return /[",\n\r]/.test(safe)?'"'+safe.replaceAll('"','""')+'"':safe;
}
export async function csvToXlsx(file:File):Promise<OutputFile>{
 const {default:ExcelJS}=await import('exceljs');
 const workbook=new ExcelJS.Workbook();
 const sheet=workbook.addWorksheet('Data');
 const rows=parseCsv((await file.text()).replace(/^\uFEFF/,''));
 if(rows.length>100_000)throw new Error('Maximum 100,000 rows');
 for(const row of rows)sheet.addRow(row.map(x=>x));
 sheet.views=[{state:'frozen',ySplit:1}];
 const buffer=await workbook.xlsx.writeBuffer();
 return {name:file.name.replace(/\.csv$/i,'')+'.xlsx',blob:new Blob([new Uint8Array(buffer)],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'})};
}
export async function xlsxToCsv(file:File):Promise<OutputFile>{
 const {default:ExcelJS}=await import('exceljs');
 const workbook=new ExcelJS.Workbook();
 await workbook.xlsx.load(await file.arrayBuffer());
 const sheet=workbook.worksheets[0];if(!sheet)throw new Error('Workbook has no sheets');
 if(sheet.rowCount>100_000)throw new Error('Maximum 100,000 rows');
 const rows:string[]=[];
 sheet.eachRow({includeEmpty:true},row=>{
  const cells:Array<string>=Array.from({length:sheet.columnCount},(_,i)=>{
   const cell=row.getCell(i+1);
   return escapeCsv(cell.text??'');
  });
  rows.push(cells.join(','));
 });
 return {name:file.name.replace(/\.xlsx$/i,'')+'.csv',blob:new Blob(['\uFEFF'+rows.join('\r\n')],{type:'text/csv;charset=utf-8'})};
}