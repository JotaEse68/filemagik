import test from 'node:test';
import assert from 'node:assert/strict';
import {File} from 'node:buffer';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
import vm from 'node:vm';
const code=readFileSync('src/lib/gzip-tools.ts','utf8')
 .replace(/import type .*?;\s*/g,'').replace('export async function','async function');
const transpiled=ts.transpileModule(code,{compilerOptions:{module:ts.ModuleKind.None,target:ts.ScriptTarget.ES2022}}).outputText;
const sandbox={File,Blob,CompressionStream,DecompressionStream,ReadableStream,Response,Uint8Array,ArrayBuffer};vm.createContext(sandbox);
vm.runInContext(transpiled+';globalThis.gzipFile=gzipFile',sandbox);
test('GZIP compress and extract restores original bytes',async()=>{
 const input=new File(['Hello FileMagik!'.repeat(100)],'example.txt',{type:'text/plain'});
 const compressed=await sandbox.gzipFile(input,'compress');
 assert.equal(compressed.name,'example.txt.gz');
 const packed=new File([compressed.blob],'example.txt.gz');
 const restored=await sandbox.gzipFile(packed,'decompress');
 assert.equal(restored.name,'example.txt');
 assert.equal(await restored.blob.text(),await input.text());
});
test('GZIP invalid compressed input is rejected',async()=>{
 await assert.rejects(()=>sandbox.gzipFile(new File(['not gzip'],'invalid.gz'),'decompress'));
});
