import {test,expect} from '@playwright/test';

const own=(slot:string,name:string)=>({
 slot,provider:'own',enabled:true,src:'/ads/g10-test.jpg',
 href:'https://example.org/campaign',alt:name,newTab:true,
});

test('G10: home ad positions share one public configuration request and keep safe sponsored links',async({page})=>{
 let requests=0;
 await page.route('**/api/advertising',async route=>{
  requests++;
  await route.fulfill({status:200,contentType:'application/json',
   body:JSON.stringify({enabled:true,configured:true,standalone:false,
    banners:[own('home','Portada campaña'),own('desktop','Lateral superior')],
    rotation:{home:{seconds:60,banners:[own('home','Portada campaña'),own('home','Alternativa campaña')]}}})});
 });
 await page.goto('/es');
 await expect(page.locator('.first-party-ad-home img')).toHaveCount(1);
 await expect(page.locator('.fm-site-rail .first-party-ad-desktop img')).toHaveCount(1);
 await expect(page.locator('.first-party-ad-home a')).toHaveAttribute('rel',/sponsored/);
 await expect(page.locator('.first-party-ad-home a')).toHaveAttribute('rel',/noopener/);
 await expect(page.locator('.fm-ad-rotation')).toContainText('Campaña');
 expect(requests).toBe(1);
});

test('G10: public advertising disabled never renders banners even when configured',async({page})=>{
 await page.route('**/api/advertising',route=>route.fulfill({
  status:200,contentType:'application/json',
  body:JSON.stringify({enabled:false,banners:[own('home','Must not show')],configured:true})
 }));
 await page.goto('/es');
 await expect(page.locator('.first-party-ad-home img')).toHaveCount(0);
 await expect(page.locator('script[src*="googlesyndication"]')).toHaveCount(0);
});

test('G10: AdSense placement fails closed without production approval and CMP',async({page})=>{
 await page.route('**/api/advertising',route=>route.fulfill({
  status:200,contentType:'application/json',
  body:JSON.stringify({enabled:true,banners:[{slot:'home',provider:'adsense',enabled:true,src:'',href:'',alt:'Publicidad',publisherId:'ca-pub-1234567890123456',adSlotId:'1234567890'}]})
 }));
 await page.goto('/es');
 await expect(page.locator('script[src*="googlesyndication"]')).toHaveCount(0);
 await expect(page.locator('.first-party-ad-home .adsbygoogle')).toHaveCount(0);
});

test('G10: admin campaign read/write APIs require authentication',async({request})=>{
 const get=await request.get('/api/admin/advertising');
 expect(get.status()).toBe(401);
 const put=await request.put('/api/admin/advertising',{
  headers:{origin:'http://localhost:3000','content-type':'application/json'},
  data:{revision:'',settings:{}},
 });
 expect(put.status()).toBe(401);
 const legacy=await request.get('/api/admin/ads');
 expect(legacy.status()).toBe(401);
});
