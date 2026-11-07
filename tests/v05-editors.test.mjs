import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
import vm from 'node:vm';
const data=readFileSync('src/lib/file-limits.ts','utf8').replace(/import type .*?;\s*/g,'').replaceAll('export function','function').replaceAll('export type','type ');
const compiled=ts.transpileModule(data,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}}).outputText;
const context={};vm.createContext(context);vm.runInContext(compiled+';globalThis.limitsFor=limitsFor;globalThis.validateFiles=validateFiles;',context);
const file=size=>({size:size*1024*1024});
test('batch images accept up to 30 valid files',()=>assert.doesNotThrow(()=>context.validateFiles('batch-images-to-webp',Array(30).fill(0).map(()=>file(2)))));
test('batch images reject oversize inputs',()=>assert.throws(()=>context.validateFiles('batch-images-to-webp',[file(41)]),/40 MB/));
test('batch images reject excessive file counts',()=>assert.throws(()=>context.validateFiles('batch-images-to-webp',Array(31).fill(0).map(()=>file(1))),/Too many/));
test('PDF preview includes drag reorder and keyboard fallback',()=>{
 const source=readFileSync('src/components/pdf-preview.tsx','utf8');
 for(const marker of ['onDragStart','onDragOver','onDrop','aria-label','onClick={()=>reorder'])assert.ok(source.includes(marker),marker);
});
test('image cleanup offers PNG JPG WebP and compare mode',()=>{
 const source=readFileSync('src/components/image-cleanup.tsx','utf8');
 for(const marker of ['toggleOriginal','image/jpeg','image/webp','image/png','showOriginal'])assert.ok(source.includes(marker),marker);
});
