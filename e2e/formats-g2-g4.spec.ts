import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import JSZip from 'jszip';

test('Markdown exports genuine editable DOCX with paragraphs and lists',async({page})=>{
 await page.goto('/es/markdown-to-docx');
 const markdown='# FileMagik manual\n\nEditable first paragraph.\n\n- One bullet\n- Another bullet\n\n1. Numbered step\n';
 await page.locator('input[type=file]').setInputFiles({
  name:'guide.md',mimeType:'text/markdown',buffer:Buffer.from(markdown),
 });
 await page.getByRole('button',{name:/convertir ahora/i}).click();
 const link=page.locator('a[download]');
 await expect(link).toHaveAttribute('download','guide.docx',{timeout:20000});
 const pending=page.waitForEvent('download');await link.click();
 const bytes=await readFile(await (await pending).path());
 const doc=await JSZip.loadAsync(bytes);
 const xml=await doc.file('word/document.xml')?.async('string');
 expect(xml).toContain('FileMagik manual');
 expect(xml).toContain('Editable first paragraph.');
 expect(xml).toContain('One bullet');
 expect(xml).toContain('Numbered step');
 expect(await doc.file('word/numbering.xml')?.async('string')).toContain('numFmt');
});
test('GIF exports first frame to a genuine PNG, not a fake filename',async({page})=>{
 await page.goto('/es/gif-to-png');
 const gif=Buffer.from('R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==','base64');
 await page.locator('input[type=file]').setInputFiles({name:'animation.gif',mimeType:'image/gif',buffer:gif});
 await page.getByRole('button',{name:/convertir ahora/i}).click();
 const link=page.locator('a[download]');
 await expect(link).toHaveAttribute('download','animation-first-frame.png',{timeout:20000});
 const pending=page.waitForEvent('download');await link.click();
 const bytes=await readFile(await (await pending).path());
 expect([...bytes.subarray(0,8)]).toEqual([137,80,78,71,13,10,26,10]);
});
test('GIF refuses invalid contents, without returning a download',async({page})=>{
 await page.goto('/es/gif-to-png');
 await page.locator('input[type=file]').setInputFiles({
  name:'fake.gif',mimeType:'image/gif',buffer:Buffer.from('this is not GIF image data'),
 });
 await page.getByRole('button',{name:/convertir ahora/i}).click();
 await expect(page.locator('p[role="alert"]').first()).toContainText('Invalid GIF');
 await expect(page.locator('a[download]')).toHaveCount(0);
});
