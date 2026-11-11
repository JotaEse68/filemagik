import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';

async function actualPng(page:import('@playwright/test').Page){
 const raw=await page.evaluate(()=>{
  const canvas=document.createElement('canvas');canvas.width=20;canvas.height=20;
  const ctx=canvas.getContext('2d')!;ctx.fillStyle='#10b981';ctx.fillRect(0,0,20,20);
  return canvas.toDataURL('image/png').split(',')[1];
 });
 return Buffer.from(raw,'base64');
}

test('anti-confusion UX: explains why, confirms conversion, then acknowledges download',async({page})=>{
 await page.goto('/es/png-to-webp');
 await expect(page.getByText('¿Por qué hacer esta conversión?')).toBeVisible();
 await expect(page.getByRole('complementary', {name:'¿Por qué hacer esta conversión?'}).getByText(/Optimiza imágenes para que las webs carguen más rápido/)).toBeVisible();
 await page.locator('input[type=file]').setInputFiles({
  name:'foto.png',mimeType:'image/png',buffer:await actualPng(page),
 });
 await page.getByRole('button',{name:/convertir ahora/i}).click();
 const done=page.getByTestId('conversion-success');
 await expect(done.getByText('¡Conversión completada!')).toBeVisible();
 await expect(done.getByText('El archivo está listo. Descárgalo cuando quieras.')).toBeVisible();
 await expect(page.getByTestId('download-notice')).toHaveCount(0);
 await expect(page.locator('.upload-limit')).toHaveCount(0); // 3 MB / 3 MB is not output size
 const link=page.locator('a[download]');
 await expect(link).toHaveAttribute('download',/\.webp$/);
 const pending=page.waitForEvent('download');
 await link.click();
 const saved=await pending;
 const bytes=await readFile(await saved.path());
 expect(bytes.subarray(0,4).toString()).toBe('RIFF');
 await expect(page.getByTestId('download-notice')).toContainText('Descarga solicitada');
 await page.getByRole('button',{name:/nueva conversión|reiniciar|restablecer|reset|convertir otra|empezar de nuevo/i}).last().click();
 await expect(done).toHaveCount(0);
 await expect(page.getByTestId('download-notice')).toHaveCount(0);
});

test('failed conversion never displays success or downloadable output',async({page})=>{
 await page.goto('/es/png-to-webp');
 await page.locator('input[type=file]').setInputFiles({
  name:'corrupta.png',mimeType:'image/png',buffer:Buffer.from('this is not a PNG'),
 });
 await page.getByRole('button',{name:/convertir ahora/i}).click();
 await expect(page.locator('p.error[role="alert"]')).toBeVisible();
 await expect(page.getByTestId('conversion-success')).toHaveCount(0);
 await expect(page.locator('a[download]')).toHaveCount(0);
});

test('localized benefit appears for animated GIF and PDF tools',async({page})=>{
 for(const [locale,text] of [
  ['es','Conserva la animación del GIF'],
  ['en','Keep your GIF animation'],
  ['pt','Mantém a animação do GIF'],
  ['fr','Conserve l’animation GIF'],
 ]){
  await page.goto('/'+locale+'/server-gif-to-webp');
  await expect(page.locator('.conversion-benefit')).toContainText(text);
 }
 await page.goto('/es/ocr-pdf-searchable');
 await expect(page.locator('.conversion-benefit')).toContainText('Busca y selecciona texto en PDF escaneados');
 await page.goto('/es/image-cleanup');
 await expect(page.locator('.conversion-benefit')).toBeVisible();
});
