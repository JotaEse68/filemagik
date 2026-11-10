import {test,expect} from '@playwright/test';

test('image cleanup freehand lasso only alters selected pixels and undo restores exact original',async({page})=>{
 await page.goto('/es/image-cleanup');
 const encoded=await page.evaluate(()=>{
  const canvas=document.createElement('canvas');canvas.width=100;canvas.height=100;
  const ctx=canvas.getContext('2d')!;
  ctx.fillStyle='#c8c8c8';ctx.fillRect(0,0,100,100);
  ctx.fillStyle='#c90020';ctx.fillRect(43,43,14,14);
  return canvas.toDataURL('image/png').split(',')[1];
 });
 await page.locator('input[type=file]').setInputFiles({
  name:'real-pixels.png',mimeType:'image/png',buffer:Buffer.from(encoded,'base64')
 });
 await page.getByLabel('Herramienta de retoque').selectOption('lasso');
 const canvas=page.locator('canvas.image-cleanup-canvas');
 await expect(canvas).toBeVisible();
 await canvas.scrollIntoViewIfNeeded();
 const snapshot=()=>canvas.evaluate(el=>{
  const target=el as HTMLCanvasElement;
  return Array.from(target.getContext('2d')!.getImageData(0,0,target.width,target.height).data);
 });
 const before=await snapshot();const bounds=await canvas.boundingBox();expect(bounds).not.toBeNull();
 const xy=(x:number,y:number)=>({x:bounds!.x+bounds!.width*x/100,y:bounds!.y+bounds!.height*y/100});
 const first=xy(39,39);await page.mouse.move(first.x,first.y);await page.mouse.down();
 for(const [x,y] of [[61,39],[61,61],[39,61],[39,39]]){
  const p=xy(x,y);await page.mouse.move(p.x,p.y,{steps:7});
 }
 await page.mouse.up();
 await page.getByRole('button',{name:/Limpiar zona seleccionada/i}).click();
 const after=await snapshot();
 let changedInside=0,changedOutside=0;
 for(let y=0;y<100;y++)for(let x=0;x<100;x++){
  const at=(y*100+x)*4;
  const changed=[0,1,2,3].some(c=>before[at+c]!==after[at+c]);
  if(changed){if(x>=39&&x<=61&&y>=39&&y<=61)changedInside++;else changedOutside++;}
 }
 expect(changedInside).toBeGreaterThan(0);
 expect(changedOutside).toBe(0);
 await page.getByRole('button',{name:/Deshacer/i}).click();
 expect(await snapshot()).toEqual(before);
 await page.getByRole('button',{name:/Rehacer/i}).click();
 expect(await snapshot()).toEqual(after);
});
