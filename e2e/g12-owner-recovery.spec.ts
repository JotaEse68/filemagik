import {test,expect} from '@playwright/test';

test('G12: owner can choose 10-character password and recovery explains the Vercel alternative',async({page})=>{
 await page.goto('/admin/recuperar');
 const password=page.getByRole('textbox',{name:'Contraseña nueva'});
 await expect(password).toHaveAttribute('minlength','10');
 await expect(page.getByText('Mínimo 10 caracteres, incluyendo mayúsculas, minúsculas y números.')).toBeVisible();
 await expect(page.getByText(/Si lo perdiste, el propietario puede restablecer el acceso desde Vercel/)).toBeVisible();
 await expect(page.getByText(/No se pierden campañas/)).toBeVisible();
 await expect(page.getByRole('textbox',{name:'Código de recuperación'})).toBeVisible();
});
test('G12: unauthenticated user cannot change owner password',async({request})=>{
 const response=await request.post('/api/admin/security/password',{
  headers:{Origin:'http://localhost:3000'},
  data:{currentPassword:'wrong',newPassword:'FileMagik2026'},
 });
 expect(response.status()).toBe(401);
});
