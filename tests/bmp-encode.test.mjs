import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
import vm from 'node:vm';
const source=readFileSync('src/lib/bmp-encode.ts','utf8').replace(/import type .*?;\s*/g,'').replaceAll('export function','function').replaceAll('export async function','async function');
const code=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}}).outputText;
const sandbox={Blob,Uint8ClampedArray,Uint8Array,DataView,ArrayBuffer};vm.createContext(sandbox);
vm.runInContext(code+';globalThis.bmp=encodeBGR24',sandbox);
test('BMP header describes a true Windows 24 bit bitmap',async()=>{
 const blob=sandbox.bmp(2,1,new Uint8ClampedArray([255,0,0,255,0,255,0,255]));
 const bytes=new Uint8Array(await blob.arrayBuffer()),view=new DataView(bytes.buffer);
 assert.equal(view.getUint16(0,true),0x4d42);assert.equal(view.getInt32(18,true),2);assert.equal(view.getInt32(22,true),1);
 assert.equal(view.getUint16(28,true),24);assert.deepEqual([...bytes.slice(54,60)],[0,0,255,0,255,0]);
});
test('BMP encoder flattens transparent pixels over white',async()=>{
 const blob=sandbox.bmp(1,1,new Uint8ClampedArray([0,0,0,0]));
 const bytes=new Uint8Array(await blob.arrayBuffer());
 assert.deepEqual([...bytes.slice(54,57)],[255,255,255]);
});
test('BMP encoder blocks excessive dimensions',()=>assert.throws(()=>sandbox.bmp(5000,5000,new Uint8ClampedArray(1)),/too large/));
