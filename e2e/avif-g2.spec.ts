import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';

const AVIF='AAAAIGZ0eXBhdmlmAAAAAGF2aWZtaWYxbWlhZk1BMUIAAADrbWV0YQAAAAAAAAAhaGRscgAAAAAAAAAAcGljdAAAAAAAAAAAAAAAAAAAAAAOcGl0bQAAAAAAAQAAAB5pbG9jAAAAAEQAAAEAAQAAAAEAAAETAAAAKQAAAChpaW5mAAAAAAABAAAAGmluZmUCAAAAAAEAAGF2MDFDb2xvcgAAAABqaXBycAAAAEtpcGNvAAAAFGlzcGUAAAAAAAAACAAAAAgAAAAQcGl4aQAAAAADCAgIAAAADGF2MUOBAAwAAAAAE2NvbHJuY2x4AAEADQAGgAAAABdpcG1hAAAAAAAAAAEAAQQBAoMEAAAAMW1kYXQSAAoIGAi/aICGg0IyGxTHh4ZlAgggnlAAAABIWtlc1jNRcyldRPcxoA==';
test('AVIF to PNG exports genuine static PNG pixels',async({page})=>{
 await page.goto('/es/avif-to-png');
 await page.locator('input[type=file]').setInputFiles({
  name:'photo.avif',mimeType:'image/avif',buffer:Buffer.from(AVIF,'base64'),
 });
 await page.getByRole('button',{name:/convertir ahora/i}).click();
 const link=page.locator('a[download]');
 await expect(link).toHaveAttribute('download','photo.png',{timeout:20000});
 const pending=page.waitForEvent('download');await link.click();
 const bytes=await readFile(await (await pending).path());
 expect([...bytes.subarray(0,8)]).toEqual([137,80,78,71,13,10,26,10]);
});
test('AVIF rejects a fake file even when named with AVIF extension',async({page})=>{
 await page.goto('/es/avif-to-png');
 await page.locator('input[type=file]').setInputFiles({
  name:'fake.avif',mimeType:'image/avif',buffer:Buffer.from('This is not a genuine AVIF file'),
 });
 await page.getByRole('button',{name:/convertir ahora/i}).click();
 await expect(page.locator('p[role="alert"]').first()).toContainText('Not a valid AVIF');
 await expect(page.locator('a[download]')).toHaveCount(0);
});
