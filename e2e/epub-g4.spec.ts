import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import JSZip from 'jszip';

function makeEpub(chapterHref='Text/chapter1.xhtml'){
 const zip=new JSZip();
 zip.file('mimetype','application/epub+zip',{compression:'STORE'});
 zip.file('META-INF/container.xml',
  '<?xml version="1.0"?><container xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="OEBPS/package.opf" media-type="application/oebps-package+xml"/></rootfiles></container>');
 zip.file('OEBPS/package.opf',
  '<?xml version="1.0"?><package xmlns="http://www.idpf.org/2007/opf"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>Libro de prueba</dc:title></metadata><manifest><item id="one" href="'+chapterHref+'" media-type="application/xhtml+xml"/><item id="two" href="Text/chapter2.xhtml" media-type="application/xhtml+xml"/></manifest><spine><itemref idref="two"/><itemref idref="one"/></spine></package>');
 zip.file('OEBPS/Text/chapter1.xhtml',
  '<html xmlns="http://www.w3.org/1999/xhtml"><body><h1>Capítulo uno</h1><p>Final de lectura.</p></body></html>');
 zip.file('OEBPS/Text/chapter2.xhtml',
  '<html xmlns="http://www.w3.org/1999/xhtml"><body><h1>Capítulo dos</h1><p>Primero en el orden.</p></body></html>');
 return zip.generateAsync({type:'nodebuffer'});
}
test('EPUB exports readable text following its spine, not ZIP entry order',async({page})=>{
 await page.goto('/es/epub-to-text');
 const epub=await makeEpub();
 await page.locator('input[type=file]').setInputFiles({
  name:'book.epub',mimeType:'application/epub+zip',buffer:epub,
 });
 await page.getByRole('button',{name:/convertir ahora/i}).click();
 const link=page.locator('a[download]');
 await expect(link).toHaveAttribute('download',/book\.txt$/);
 const pending=page.waitForEvent('download');await link.click();
 const text=(await readFile(await (await pending).path())).toString('utf8');
 expect(text).toContain('Libro de prueba');
 expect(text).toContain('Capítulo uno');
 expect(text.indexOf('Capítulo dos')).toBeLessThan(text.indexOf('Capítulo uno'));
 expect(text).toContain('Final de lectura.');
});
test('EPUB refuses external chapter references and never downloads the result',async({page})=>{
 await page.goto('/es/epub-to-text');
 await page.locator('input[type=file]').setInputFiles({
  name:'unsafe.epub',mimeType:'application/epub+zip',
  buffer:await makeEpub('https://example.com/malicious.xhtml'),
 });
 await page.getByRole('button',{name:/convertir ahora/i}).click();
 await expect(page.locator('p[role="alert"]').first()).toContainText(/external|absolute/i);
 await expect(page.locator('a[download]')).toHaveCount(0);
});
