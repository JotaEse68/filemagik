import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
import vm from 'node:vm';
function load(file,functions){
 const raw=readFileSync(file,'utf8').replace(/import type [^\n]+\n/g,'').replaceAll('export function','function').replaceAll('export const','const').replaceAll('export type','type ');
 const code=ts.transpileModule(raw,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}}).outputText;
 const sandbox={URL};vm.createContext(sandbox);vm.runInContext(code+`;globalThis.api={${functions}}`,sandbox);return sandbox.api;
}
const pages=load('src/lib/pdf-pages.ts','parsePageSelection,partitionPages,remainingPages,parsePageOrder');
test('PDF range parser supports 1,3,5-8',()=>assert.deepEqual([...pages.parsePageSelection('1,3,5-8',8)],[0,2,4,5,6,7]));
test('PDF range parser rejects out-of-bound pages',()=>assert.throws(()=>pages.parsePageSelection('1,10',9),/outside/));
test('PDF grouping partitions last partial group',()=>assert.deepEqual(pages.partitionPages(7,3).map(group=>[...group]),[[0,1,2],[3,4,5],[6]]));
test('PDF delete leaves all other pages',()=>assert.deepEqual([...pages.remainingPages(5,[1,3])],[0,2,4]));
test('PDF reorder requires a complete permutation',()=>assert.deepEqual([...pages.parsePageOrder('3,1,2',3)],[2,0,1]));
test('PDF reorder rejects duplicates',()=>assert.throws(()=>pages.parsePageOrder('1,1,3',3),/every page/));
const ads=load('src/lib/advertising/config.ts','parseAds,defaultAds');
test('ad settings reject scripts and http links',()=>assert.throws(()=>ads.parseAds({enabled:true,banners:[{slot:'desktop',src:'javascript:alert(1)',href:'http://example.com',alt:'Test banner'}]}),/banner/));
test('ad settings normalize HTTPS creatives',()=>assert.equal(ads.parseAds({enabled:true,banners:[{slot:'desktop',src:'https://example.com/ad.png',href:'https://example.com',alt:' Test banner '}]}).banners[0].alt,'Test banner'));
