import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';

test('RTF to TXT exports Unicode, paragraphs and excludes hidden metadata',async({page})=>{
 await page.goto('/es/rtf-to-text');
 const source=String.raw`{\rtf1\ansi\uc1{\fonttbl{\f0 Arial;}}{\info{\title PRIVATE TITLE}}\f0 Ejemplo \u241?and\u250?\par Segunda l\'ednea\tab Precio 20\par{\*\unknown hidden value} Final}`;
 await page.locator('input[type=file]').setInputFiles({
  name:'example.rtf',mimeType:'application/rtf',buffer:Buffer.from(source,'latin1'),
 });
 await page.getByRole('button',{name:/convertir ahora/i}).click();
 const link=page.locator('a[download]');
 await expect(link).toHaveAttribute('download','example.txt');
 const promise=page.waitForEvent('download');await link.click();
 const output=(await readFile(await (await promise).path())).toString('utf8');
 expect(output).toContain('Ejemplo ñandú');
 expect(output).toContain('Segunda línea\tPrecio 20');
 expect(output).toContain('Final');
 expect(output).not.toContain('PRIVATE TITLE');
 expect(output).not.toContain('hidden value');
});
test('Invalid RTF fails closed without download',async({page})=>{
 await page.goto('/es/rtf-to-text');
 await page.locator('input[type=file]').setInputFiles({
  name:'invalid.rtf',mimeType:'application/rtf',buffer:Buffer.from('plain text instead of RTF'),
 });
 await page.getByRole('button',{name:/convertir ahora/i}).click();
 await expect(page.locator('p[role="alert"]').first()).toContainText('Invalid RTF');
 await expect(page.locator('a[download]')).toHaveCount(0);
});
