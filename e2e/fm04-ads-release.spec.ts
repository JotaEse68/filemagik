
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

test('FM-04 propietario autentica sesión y configura una campaña HTTPS sin imagen',async({page})=>{
 const password=process.env.FILEMAGIK_E2E_OWNER_PASSWORD;
 test.skip(!password,'Requiere credenciales sintéticas del runner');
 const slots=['desktop','desktopLower','homeHeroSide','popularTop','toolSide','toolHorizontal','mobile','result','home','incontent'];
 const placements=Object.fromEntries(slots.map(slot=>[slot,{enabled:true,provider:'own',campaignIds:[],rotationSeconds:60,publisherId:'',adSlotId:''}]));
 const initial={enabled:true,campaigns:[],placements,
  rewarded:{enabled:false,provider:'admanager',adUnitPath:'',paidFallbackUrl:'',operations:{video:true,aiExport:true,credit:true}}};
 let persisted:typeof initial|null=null;
 await page.route('**/api/admin/advertising',async route=>{
  if(route.request().method()==='PUT'){
   const input=route.request().postDataJSON() as {revision:string;settings:typeof initial};
   persisted=input.settings;
   return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({settings:persisted,revision:'revision-2'})});
  }
  return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({settings:initial,revision:'revision-1'})});
 });
 await page.goto('http://localhost:3100/admin/login');
 await page.getByLabel('Contraseña del propietario').fill(password!);
 await page.getByRole('button',{name:'Entrar al panel'}).click();
 await expect(page).toHaveURL(/\/admin\/?$/);
 await expect(page.locator('.fm-admin-campaign')).toHaveCount(0);
 await page.getByRole('button',{name:'\+ Añadir banner'}).click();
 const campaign=page.locator('.fm-admin-campaign').first();
 await expect(campaign).toBeVisible();
 await campaign.getByLabel('Enlace de destino (opcional)').fill('https://example.org/producto');
 await campaign.getByLabel('Campaña activada').check();
 await page.getByRole('button',{name:'Guardar y publicar'}).click();
 await expect(page.getByText('Cambios guardados de forma permanente en Vercel Blob. Ya están publicados.')).toBeVisible();
 expect(persisted?.campaigns[0].src).toBe('');
 expect(persisted?.campaigns[0].href).toBe('https://example.org/producto');
 expect(persisted?.campaigns[0].enabled).toBe(true);
 expect(persisted?.placements.desktop.campaignIds).toHaveLength(1);
 await page.getByRole('button',{name:'Cerrar sesión'}).click();
 await expect(page).toHaveURL(/\/admin\/login/);
});

test('FM-04 login rechaza carga excesiva sin procesar contraseña',async({request})=>{
 const response=await request.post('http://localhost:3100/api/admin/local-login',{
  headers:{origin:'http://localhost:3100','content-type':'application/json'},
  data:{password:'x'.repeat(2400)},
 });
 expect(response.status()).toBe(413);
});
