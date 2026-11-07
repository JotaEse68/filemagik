import {test,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {PDFDocument} from 'pdf-lib';

const languages=['es','en','pt','fr'] as const;

test('circle-based navigation and skip link work with keyboard',async({page})=>{
 await page.goto('/es');
 await expect(page.locator('html')).toHaveAttribute('lang','es');
 await expect(page.locator('.radial-wheel')).toHaveCount(2);
 await expect(page.locator('a.skip-link')).toHaveAttribute('href','#main-content');
 await page.keyboard.press('Tab');
 await expect(page.locator('.skip-link')).toBeFocused();
 await page.locator('.radial-shortcuts').getByRole('link',{name:'Dividir PDF'}).click();
 await expect(page).toHaveURL(/\/es\/split-pdf-by-count$/);
 await expect(page.locator('input[type=file]')).toHaveCount(1);
});

test('PDF split completes actual browser file-to-download flow',async({page})=>{
 await page.goto('/es/split-pdf-by-count');
 const pdf=await PDFDocument.create();
 for(let i=0;i<3;i++){const p=pdf.addPage([400,500]);p.drawText('Page '+(i+1));}
 const bytes=await pdf.save();
 await page.locator('input[type=file]').setInputFiles({name:'example.pdf',mimeType:'application/pdf',buffer:Buffer.from(bytes)});
 await expect(page.locator('.pdf-option-panel input[type=number]')).toHaveValue('2');
 await page.getByRole('button',{name:/convertir ahora/i}).click();
 const link=page.locator('a[download]');
 await expect(link).toBeVisible();
 await expect(link).toHaveAttribute('download',/\.zip$/);
 const downloadPromise=page.waitForEvent('download');
 await link.click();
 const download=await downloadPromise;
 expect(download.suggestedFilename()).toMatch(/\.zip$/);
});

test('SEO canonicals, alternate languages and indexability',async({page,request})=>{
 for(const lang of languages){
  await page.goto('/'+lang+'/pdf-studio');
  await expect(page.locator('html')).toHaveAttribute('lang',lang);
  await expect(page.locator('link[rel=canonical]')).toHaveAttribute('href',new RegExp('/'+lang+'/pdf-studio$'));
  await expect(page.locator('link[hreflang=es]')).toHaveCount(1);
  await expect(page.locator('link[hreflang=fr]')).toHaveCount(1);
  await expect(page.locator('meta[name=description]')).toHaveAttribute('content',/.{35,}/);
 }
 const sitemap=await request.get('/sitemap.xml');
 expect(sitemap.ok()).toBeTruthy();
 const xml=await sitemap.text();
 expect(xml).toContain('/es/pdf-studio');
 expect(xml).toContain('/fr/pdf-studio');
 expect(xml).toContain('hreflang');
 const robots=await request.get('/robots.txt');
 expect(robots.ok()).toBeTruthy();
 expect(await robots.text()).toContain('Sitemap:');
});

test('no mobile horizontal overflow in key routes',async({page,isMobile})=>{
 test.skip(!isMobile,'mobile-only');
 for(const route of ['/es','/es/tools','/es/pdf-studio','/es/merge-pdf']){
  await page.goto(route);
  const dimensions=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,viewport:window.innerWidth}));
  expect(dimensions.scroll,route+' overflows').toBeLessThanOrEqual(dimensions.viewport+2);
 }
});

test('no serious or critical automated accessibility violations',async({page})=>{
 for(const route of ['/es','/es/pdf-studio','/es/split-pdf-by-count']){
  await page.goto(route);
  const results=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
  const critical=results.violations.filter(item=>item.impact==='critical'||item.impact==='serious');
  expect(critical.map(item=>({route,id:item.id,impact:item.impact,targets:item.nodes.slice(0,4).map(n=>n.target)}))).toEqual([]);
 }
});
