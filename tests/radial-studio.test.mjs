import {readFileSync} from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';

const site=readFileSync('src/config/site.ts','utf8');
const slugs=[...site.matchAll(/slug:'([^']+)'/g)].map(m=>m[1]);
const circle=readFileSync('src/components/radial-studio.tsx','utf8');
const hub=readFileSync('src/app/[locale]/pdf-studio/page.tsx','utf8');
const seo=readFileSync('src/lib/tool-content.ts','utf8');
const entries=[...circle.matchAll(/slug:'([^']+)'/g)].map(m=>m[1]);

test('radial wheels never link to nonexistent tools',()=>{
 const unknown=entries.filter(name=>!slugs.includes(name));assert.deepEqual(unknown,[]);
});
test('wheel supports six useful desktop and mobile categories',()=>{
 for(const cat of ['pdf','images','office','data','ocr','archives'])assert.ok(circle.includes(cat));
 assert.match(circle,/aria-pressed/);assert.match(circle,/aria-label/);
});
test('PDF hub makes splitting and merging visible',()=>{
 for(const slug of ['split-pdf','split-pdf-by-count','extract-pdf-pages','merge-pdf','delete-pdf-pages','reorder-pdf-pages'])assert.ok(hub.includes(slug));
});
test('every tool has multilingual landing copy',()=>{
 const begin=seo.indexOf('const summaries:Record<ToolSlug,[string,string,string,string]>=');
 const start=seo.indexOf('=',begin)+1,end=seo.indexOf(';\nconst index:',start);
 const dict=JSON.parse(seo.slice(start,end));
 assert.equal(Object.keys(dict).length,slugs.length);
 for(const slug of slugs){
  assert.ok(Array.isArray(dict[slug]),'Missing '+slug);
  assert.equal(dict[slug].length,4);
  assert.ok(dict[slug].every(text=>text.length>30));
 }
});
test('Google ads remain off without verified consent and site approval',()=>{
 const adsense=readFileSync('src/lib/advertising/adsense.ts','utf8');
 assert.ok(adsense.includes("NEXT_PUBLIC_ADSENSE_SITE_APPROVED"));
 assert.ok(adsense.includes("NEXT_PUBLIC_ADSENSE_CMP_VERIFIED"));
 assert.ok(adsense.includes("NEXT_PUBLIC_ADSENSE_ENABLED"));
});
