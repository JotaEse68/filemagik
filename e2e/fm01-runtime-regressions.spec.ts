import {test,expect} from '@playwright/test';

test('FM-01: runtime JavaScript íntegro en las rutas principales',async({page})=>{
 const errors:string[]=[];
 page.on('pageerror',error=>errors.push(error.message));
 for(const route of ['/es','/es/pdf-studio','/es/split-pdf-by-count','/es/csv-to-json']){
  const response=await page.goto(route);
  expect(response?.status(),route).toBe(200);
  await expect(page.locator('h1').first()).toBeVisible();
 }
 expect(errors,'Incluye regresiones exports is not defined').toEqual([]);
});

test('FM-01: propietario inicia sesión real con credenciales sintéticas del CI',async({page})=>{
 const password=process.env.FILEMAGIK_E2E_OWNER_PASSWORD;
 test.skip(!password,'Solo se ejecuta cuando el runner genera credenciales aisladas');
 // Chromium acepta cookies secure en localhost; 127.0.0.1 no reproduce esta excepción.
 await page.goto('http://localhost:3100/admin/login');
 await page.getByLabel('Contraseña del propietario').fill(password!);
 const loginResponse=page.waitForResponse(response=>response.url().includes('/api/admin/local-login')&&response.request().method()==='POST');
 await page.getByRole('button',{name:'Entrar al panel'}).click();
 const response=await loginResponse;
 expect(response.status(),'POST /api/admin/local-login debe autenticar la sesión').toBe(200);
 await expect(page).toHaveURL(/\/admin\/?$/);
 await expect(page.locator('.fm-admin-content h1')).toContainText('Biblioteca de banners');
});

test('FM-01: anónimo no puede leer campañas del propietario',async({request})=>{
 expect((await request.get('/api/admin/advertising')).status()).toBe(401);
});
