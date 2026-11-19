
import {test,expect} from '@playwright/test';

const ad=(slot:string,alt:string,src='',href='https://example.org/product')=>({
 slot,provider:'own',enabled:true,src,href,alt,newTab:true,
});
test('FM-04 URL-only sponsor renders a safe linked text ad on OCR and rotates',async({page})=>{
 await page.clock.install();
 await page.route('**/api/advertising',route=>route.fulfill({
  status:200,contentType:'application/json',
  body:JSON.stringify({enabled:true,banners:[ad('toolHorizontal','Producto A')],
   rotation:{toolHorizontal:{seconds:15,banners:[
    ad('toolHorizontal','Producto A',undefined,'https://example.org/a'),
    ad('toolHorizontal','Producto B',undefined,'https://example.org/b')
   ]}}})
 }));
 await page.goto('/es/ocr-pdf');
 const sponsor=page.locator('.fm-tool-horizontal-ad .fm-text-ad-link');
 await expect(sponsor).toBeVisible();
 await expect(sponsor).toHaveAttribute('rel',/sponsored/);
 await expect(sponsor).toHaveAttribute('rel',/noopener/);
 const before=await sponsor.getAttribute('href');
 await page.clock.runFor(16000);
 await expect(sponsor).not.toHaveAttribute('href',before!);
});

test('FM-04 additional real placements render without horizontal scroll on desktop',async({page},testInfo)=>{
 await page.route('**/api/advertising',route=>route.fulfill({
  status:200,contentType:'application/json',
  body:JSON.stringify({enabled:true,banners:[
    ad('homeHeroSide','Campaña junto a Smart Drop'),
    ad('toolSide','Campaña junto al editor')
   ]})
 }));
 await page.goto('/es');
 const sideHome=page.locator('.fm-smartdrop-banner .fm-text-ad-link');
 await expect(sideHome).toHaveCount(1);
 await page.goto('/es/ocr-pdf');
 const sideTool=page.locator('.fm-tool-side-ad .fm-text-ad-link');
 await expect(sideTool).toHaveCount(1);
 const size=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,width:document.documentElement.clientWidth}));
 expect(size.scroll).toBeLessThanOrEqual(size.width+3);
 if(testInfo.project.name.includes('mobile')){
  await expect(sideTool).toBeHidden();
 }else{
  await expect(sideTool).toBeVisible();
 }
});

test('FM-04 postconversion space does not appear before finishing a job',async({page})=>{
 await page.route('**/api/advertising',route=>route.fulfill({
  status:200,contentType:'application/json',
  body:JSON.stringify({enabled:true,banners:[ad('result','Resultado patrocinado')]})
 }));
 await page.goto('/es/csv-to-json');
 await expect(page.locator('.ad-placement-result .first-party-ad')).toHaveCount(0);
});
