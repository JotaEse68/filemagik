import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('SEO: 4 locales, absolute canonical and sitemap/hreflang',()=>{
 const site=read('src/config/site.ts'),sitemap=read('src/app/sitemap.ts'),robots=read('src/app/robots.ts');
 assert.match(site,/locales=\['en','es','pt','fr'\]/);
 assert.match(site,/https:\/\/www\.filemagik\.com/);
 assert.match(sitemap,/locales\.map\(locale/);
 assert.match(sitemap,/x-default/);
 assert.match(robots,/sitemap\.xml/);
});
test('SEO: all tools have category routing and indexed explanatory HTML',()=>{
 const cat=read('src/config/tool-navigation.ts'),page=read('src/app/[locale]/[slug]/page.tsx');
 for(const kind of ['image','video','audio','archive','subtitle','data','document'])assert.ok(cat.includes("case '"+kind+"'"));
 assert.match(page,/ToolSeoGuide locale=\{locale\}/);
 assert.match(page,/BreadcrumbList/);
 assert.match(page,/WebApplication/);
});
test('SEO: four-language intent and transparency, no fabricated review ratings',()=>{
 const seo=read('src/lib/seo.ts'),guide=read('src/components/tool-seo-guide.tsx'),home=read('src/app/[locale]/page.tsx');
 for(const lang of ['en','es','pt','fr'])assert.ok(seo.includes(lang+':'));
 assert.match(guide,/getConversionBenefit/);
 assert.match(guide,/related\.map/);
 assert.match(home,/isAccessibleForFree:true/);
 assert.doesNotMatch(home,/aggregateRating|ratingValue/);
});
