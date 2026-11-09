import {test,expect} from '@playwright/test';

test('Image Cleanup keeps undo/redo history while zooming on desktop and mobile',async({page})=>{
 await page.goto('/es/image-cleanup');
 const png=await page.evaluate(()=>{
  const canvas=document.createElement('canvas');canvas.width=80;canvas.height=80;
  const ctx=canvas.getContext('2d')!;
  ctx.fillStyle='#dddddd';ctx.fillRect(0,0,80,80);
  ctx.fillStyle='#333333';ctx.fillRect(25,25,15,15);
  return canvas.toDataURL('image/png').split(',')[1];
 });
 await page.locator('input[type=file]').setInputFiles({
  name:'cleanup.png',mimeType:'image/png',buffer:Buffer.from(png,'base64'),
 });
 const canvas=page.locator('.image-cleanup-canvas');
 await expect(canvas).toBeVisible();
 const zoom=page.getByRole('combobox',{name:'Zoom imagen'});
 await zoom.selectOption('150');
 await expect(zoom).toHaveValue('150');
 const bounds=await canvas.boundingBox();
 expect(bounds).not.toBeNull();
 const box=bounds!;
 await page.mouse.move(box.x+box.width*.25,box.y+box.height*.25);
 await page.mouse.down();
 await page.mouse.move(box.x+box.width*.55,box.y+box.height*.55,{steps:6});
 await page.mouse.up();
 const apply=page.getByRole('button',{name:'Limpiar zona seleccionada'});
 await expect(apply).toBeEnabled();
 await apply.click();
 const undo=page.getByRole('button',{name:'Deshacer'});
 const redo=page.getByRole('button',{name:'Rehacer'});
 await expect(undo).toBeEnabled();
 await expect(redo).toBeDisabled();
 await undo.click();
 await expect(redo).toBeEnabled();
 await redo.click();
 await expect(undo).toBeEnabled();
 await expect(redo).toBeDisabled();
 await zoom.selectOption('100');
 await expect(zoom).toHaveValue('100');
});
