import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import JSZip from 'jszip';
import ExcelJS from 'exceljs';
import {Document,Packer,Paragraph} from 'docx';

async function getDownload(page:import('@playwright/test').Page){
 await page.getByRole('button',{name:/convertir ahora/i}).click();
 const link=page.locator('a[download]');await expect(link).toBeVisible({timeout:30000});
 const waiting=page.waitForEvent('download');await link.click();
 return readFile(await (await waiting).path());
}
async function zipCorrupted(){
 const zip=new JSZip();zip.file('note.txt','G9-CHECKSUM-SAMPLE');
 const bytes=Buffer.from(await zip.generateAsync({type:'uint8array',compression:'STORE'}));
 const at=bytes.indexOf(Buffer.from('G9-CHECKSUM-SAMPLE'));
 if(at<0)throw new Error('Fixture missing');
 bytes[at]=bytes[at]===65?66:65;
 return bytes;
}

test('G9 corrupted ZIP CRC cannot produce a fake success download',async({page})=>{
 await page.goto('/es/extract-zip');
 const invalid=await zipCorrupted();
 await page.locator('input[type=file]').first().setInputFiles({name:'damaged.zip',mimeType:'application/zip',buffer:invalid});
 await page.getByRole('button',{name:/convertir ahora/i}).click();
 await expect(page.locator('p.error[role="alert"]')).toBeVisible();
 await expect(page.locator('a[download]')).toHaveCount(0);
 await expect(page.getByTestId('conversion-success')).toHaveCount(0);
});

test('G9 valid ZIP extracts files losslessly and preserves output',async({page})=>{
 const zip=new JSZip();zip.file('report.csv','name,value\nAbril,120\n');zip.file('notes.txt','México y España');
 const bytes=Buffer.from(await zip.generateAsync({type:'uint8array'}));
 await page.goto('/es/extract-zip');
 await page.locator('input[type=file]').first().setInputFiles({name:'docs.zip',mimeType:'application/zip',buffer:bytes});
 const output=await getDownload(page);
 const unpacked=await JSZip.loadAsync(output);
 const items=Object.values(unpacked.files).filter(f=>!f.dir);
 expect(items).toHaveLength(2);
 const values=await Promise.all(items.map(f=>f.async('string')));
 expect(values).toContain('name,value\nAbril,120\n');
 expect(values).toContain('México y España');
});

test('G9 EPUB conversion follows spine and does not duplicate nested list and quote paragraphs',async({page})=>{
 const zip=new JSZip();
 zip.file('META-INF/container.xml','<?xml version="1.0"?><container><rootfiles><rootfile full-path="OPS/content.opf"/></rootfiles></container>');
 zip.file('OPS/content.opf','<?xml version="1.0"?><package xmlns:dc="http://purl.org/dc/elements/1.1/"><metadata><dc:title>Guía práctica</dc:title></metadata><manifest><item id="b" href="b.xhtml"/><item id="a" href="a.xhtml"/></manifest><spine><itemref idref="a"/><itemref idref="b"/></spine></package>');
 zip.file('OPS/a.xhtml','<?xml version="1.0"?><html xmlns="http://www.w3.org/1999/xhtml"><body><h1>Primero</h1><ul><li><p>Una sola vez</p></li></ul><blockquote><p>Cita única</p></blockquote></body></html>');
 zip.file('OPS/b.xhtml','<?xml version="1.0"?><html xmlns="http://www.w3.org/1999/xhtml"><body><p>Después en orden</p></body></html>');
 const bytes=Buffer.from(await zip.generateAsync({type:'uint8array'}));
 await page.goto('/es/epub-to-text');
 await page.locator('input[type=file]').first().setInputFiles({name:'book.epub',mimeType:'application/epub+zip',buffer:bytes});
 const output=(await getDownload(page)).toString('utf-8');
 expect(output).toContain('Guía práctica');
 expect(output.indexOf('Primero')).toBeLessThan(output.indexOf('Después en orden'));
 expect(output.match(/Una sola vez/g)).toHaveLength(1);
 expect(output.match(/Cita única/g)).toHaveLength(1);
});

test('G9 Office conversions return actual valid DOCX/XLSX downloads',async({page})=>{
 await page.goto('/es/markdown-to-docx');
 await page.locator('input[type=file]').first().setInputFiles({name:'manual.md',mimeType:'text/markdown',buffer:Buffer.from('# Manual final\n\n- Paso uno\n- Paso dos\n')});
 const word=await getDownload(page), docZip=await JSZip.loadAsync(word);
 expect(await docZip.file('word/document.xml')?.async('string')).toContain('Manual final');
 await page.goto('/es/csv-to-xlsx');
 await page.locator('input[type=file]').first().setInputFiles({name:'sales.csv',mimeType:'text/csv',buffer:Buffer.from('id,valor\n00012,20\n00013,30\n')});
 const output=await getDownload(page);const workbook=new ExcelJS.Workbook();
 await workbook.xlsx.load(Uint8Array.from(output).buffer);
 const worksheet=workbook.worksheets[0];
 expect(worksheet.getCell('A2').value).toBe('00012');
 expect(worksheet.getCell('B3').value).toBe('30');
});
