import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import vm from 'node:vm';
const raw=fs.readFileSync('src/lib/advertising/config.ts','utf8').replaceAll('export type','type ').replaceAll('export const','const ').replaceAll('export function','function ');
const built=ts.transpileModule(raw,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}}).outputText;
const sandbox={URL};vm.createContext(sandbox);vm.runInContext(built+';globalThis.api={parseAds,defaultAds,adPlacements}',sandbox);
const {parseAds,defaultAds,adPlacements}=sandbox.api;
test('five placement controls start visible with own ads as the safe fallback',()=>{
 assert.equal(defaultAds.enabled,true);
 assert.equal(adPlacements.length,5);
 for(const slot of adPlacements){assert.equal(defaultAds.slots[slot].enabled,true);assert.equal(defaultAds.slots[slot].mode,'own');}
 assert.equal(defaultAds.google.approved,false);
 assert.equal(defaultAds.external.approved,false);
});
test('per-slot switches, Google ID and rotation are validated',()=>{
 const settings={...defaultAds,slots:{...defaultAds.slots,mobile:{enabled:false,mode:'off',rotateSeconds:90}}};
 assert.equal(parseAds(settings).slots.mobile.enabled,false);
 assert.equal(parseAds({...settings,google:{...settings.google,publisherId:'ca-pub-1234567890123456',approved:false}}).google.publisherId,'ca-pub-1234567890123456');
 assert.throws(()=>parseAds({...settings,slots:{...settings.slots,top:{enabled:true,mode:'own',rotateSeconds:5}}}),/rotation/);
});
test('browser cannot receive unsafe banner, redirect or iframe URLs',()=>{
 const banner={slot:'top',src:'https://example.org/ad.jpg',href:'https://example.org',alt:'Valid banner'};
 assert.equal(parseAds({...defaultAds,banners:[banner]}).banners.length,1);
 assert.throws(()=>parseAds({...defaultAds,banners:[{...banner,src:'javascript:alert(1)'}]}),/banner/);
 assert.throws(()=>parseAds({...defaultAds,banners:[{...banner,href:'http://example.org'}]}),/banner/);
 assert.throws(()=>parseAds({...defaultAds,banners:[{...banner,src:'https://127.0.0.1/x.png'}]}),/banner/);
 assert.throws(()=>parseAds({...defaultAds,external:{name:'Test',approved:true,vendorId:3,frameUrls:{...defaultAds.external.frameUrls,top:'http://example.com'}}}),/external/);
});
test('each placement can contain up to five own creatives',()=>{
 const banners=Array.from({length:5},(_,i)=>({slot:'desktop',src:'https://example.org/'+i+'.jpg',href:'',alt:'Banner '+i}));
 assert.equal(parseAds({...defaultAds,banners}).banners.length,5);
 assert.throws(()=>parseAds({...defaultAds,banners:[...banners,banners[0]]}),/five/);
});
test('superadmin uploads do not allow unrestricted file types or access',()=>{
 const code=fs.readFileSync('src/app/api/admin/ads/upload/route.ts','utf8');
 for(const key of ['requireAdmin','Invalid origin','image/jpeg','image/png','image/webp','filemagik-banners']){
  assert.ok(code.includes(key)||key==='Invalid origin'&&code.includes('Origen no válido'),key);
 }
});
