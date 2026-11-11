import {test,expect} from '@playwright/test';

const sample=(slot:string,name:string)=>({slot,provider:'own',enabled:true,src:'/ads/layout-fixture.jpg',href:'https://example.org',alt:name,newTab:true});
async function box(locator:import('@playwright/test').Locator){
 return locator.evaluate(el=>{const r=el.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width};});
}
async function noOverflow(page:import('@playwright/test').Page){
 const values=await page.evaluate(()=>({width:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth}));
 expect(values.scroll).toBeLessThanOrEqual(values.width+3);
}
test('G14 sidebar shows TWO independently rotating vertical banners and a horizontal banner on desktop',async({page},info)=>{
 await page.route('**/api/advertising',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({
  enabled:true,configured:true,banners:[sample('desktop','Superior'),sample('desktopLower','Inferior'),sample('home','Horizontal')],
  rotation:{
   desktop:{seconds:30,banners:[sample('desktop','Superior'),sample('desktop','Alternativa superior')]},
   desktopLower:{seconds:45,banners:[sample('desktopLower','Inferior'),sample('desktopLower','Alternativa inferior')]}
  }
 })}));
 await page.goto('/es');
 await expect(page.locator('.fm-smartdrop-main .magik-uploader')).toBeVisible();
 await expect(page.locator('.first-party-ad-home img')).toHaveCount(1);
 const upper=page.locator('.fm-site-rail .first-party-ad-desktop');
 const lower=page.locator('.fm-site-rail .first-party-ad-desktopLower');
 if(info.project.name.includes('mobile')){
  await expect(upper).toBeHidden();
  await expect(lower).toBeHidden();
 }else{
  await expect(upper).toBeVisible();
  await expect(lower).toBeVisible();
  const main=await box(page.locator('.fm-site-primary'));
  const a=await box(upper),b=await box(lower);
  expect(main.right).toBeLessThan(a.left);
  expect(b.top).toBeGreaterThan(a.bottom);
  await expect(upper.locator('.fm-ad-rotation')).toContainText('de 2');
  await expect(lower.locator('.fm-ad-rotation')).toContainText('de 2');
  expect(main.width).toBeGreaterThan(a.width*2.3);
 }
 await noOverflow(page);
});
test('G14 tool page uses same centered grid and horizontal banner without duplicate side rail',async({page},info)=>{
 await page.route('**/api/advertising',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({
  enabled:true,banners:[sample('desktop','Superior'),sample('desktopLower','Inferior'),sample('toolHorizontal','Horizontal conversor')]
 })}));
 await page.goto('/es/png-to-webp');
 await expect(page.locator('.fm-tool-ad-layout .tool-main .dropzone')).toBeVisible();
 await expect(page.locator('.fm-tool-horizontal-ad .first-party-ad img')).toHaveCount(1);
 await expect(page.locator('.fm-tool-side-ad .first-party-ad')).toHaveCount(0);
 if(!info.project.name.includes('mobile')){
  const main=await box(page.locator('.fm-site-primary')),rail=await box(page.locator('.fm-site-rail'));
  expect(main.right).toBeLessThan(rail.left);
 }
 await noOverflow(page);
});
test('G14 no phantom column when all adverts disabled',async({page})=>{
 await page.route('**/api/advertising',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({enabled:false,banners:[]})}));
 await page.goto('/es/png-to-webp');
 const shell=await box(page.locator('.fm-site-frame')),main=await box(page.locator('.fm-site-primary'));
 expect(main.width).toBeGreaterThan(shell.width*.95);
 await noOverflow(page);
});
