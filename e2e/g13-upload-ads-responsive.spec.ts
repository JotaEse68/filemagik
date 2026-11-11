import {test,expect} from '@playwright/test';

const sample=(slot:string)=>({slot,provider:'own',enabled:true,src:'/ads/layout-fixture.jpg',href:'https://example.org',alt:'Publicidad de prueba',newTab:true});
const coordinates=async (locator:import('@playwright/test').Locator)=>locator.evaluate(element=>{
 const r=element.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height};
});
test('G13 home: upload card and sponsored creative share a coherent aligned grid on desktop',async({page},testInfo)=>{
 await page.route('**/api/advertising',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({enabled:true,banners:[sample('homeHeroSide'),sample('home')]})}));
 await page.goto('/es');
 const upload=page.locator('.fm-smartdrop-main'),ad=page.locator('.fm-smartdrop-banner .first-party-ad');
 await expect(upload).toBeVisible();
 if(testInfo.project.name.includes('mobile')){
  await expect(ad).toBeHidden();
  const card=await coordinates(upload);
  expect(card.left).toBeGreaterThanOrEqual(0);
  expect(card.right).toBeLessThanOrEqual(testInfo.project.use.viewport!.width+3);
 }else{
  await expect(ad).toBeVisible();
  const card=await coordinates(upload),sponsored=await coordinates(ad);
  expect(Math.abs(card.top-sponsored.top)).toBeLessThanOrEqual(3);
  expect(card.right).toBeLessThan(sponsored.left);
  expect(card.width).toBeGreaterThan(sponsored.width*2);
 }
 await expect(page.locator('.magik-uploader .dropzone')).toBeVisible();
 const size=await page.evaluate(()=>({total:document.documentElement.scrollWidth,viewport:document.documentElement.clientWidth}));
 expect(size.total).toBeLessThanOrEqual(size.viewport+3);
});

test('G13 tools: shared ad placement stays aligned and never overlaps conversion controls',async({page},testInfo)=>{
 await page.route('**/api/advertising',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({enabled:true,banners:[sample('toolSide'),sample('toolHorizontal')]})}));
 await page.goto('/es/png-to-webp');
 const upload=page.locator('.fm-tool-ad-layout .tool-main');
 await expect(upload.locator('.dropzone')).toBeVisible();
 const ad=page.locator('.fm-tool-side-ad .first-party-ad');
 if(testInfo.project.name.includes('mobile'))await expect(ad).toBeHidden();
 else{
  await expect(ad).toBeVisible();
  const a=await coordinates(upload),b=await coordinates(ad);
  expect(Math.abs(a.top-b.top)).toBeLessThanOrEqual(3);
  expect(a.right).toBeLessThan(b.left);
  expect(a.width).toBeGreaterThan(b.width*1.8);
 }
 const size=await page.evaluate(()=>({total:document.documentElement.scrollWidth,viewport:document.documentElement.clientWidth}));
 expect(size.total).toBeLessThanOrEqual(size.viewport+3);
});

test('G13 no phantom ad column when all campaigns disabled',async({page})=>{
 await page.route('**/api/advertising',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({enabled:false,banners:[]})}));
 await page.goto('/es/png-to-webp');
 const layout=page.locator('.fm-tool-ad-layout'),main=layout.locator('.tool-main');
 await expect(main).toBeVisible();
 const l=await coordinates(layout),m=await coordinates(main);
 expect(m.width).toBeGreaterThan(l.width*.88);
});
