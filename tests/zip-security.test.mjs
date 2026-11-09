import test from 'node:test';
import assert from 'node:assert/strict';
import {File,Blob} from 'node:buffer';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
import vm from 'node:vm';
import JSZip from 'jszip';

const source=readFileSync('src/lib/zip-tools.ts','utf8')
 .replace(/import type .*?;\s*/g,'')
 .replace(/await import\('jszip'\)/g,'Promise.resolve({default:ZipLibrary})')
 .replace(/export async function /g,'async function ');
const code=ts.transpileModule(source,{compilerOptions:{
 module:ts.ModuleKind.None,target:ts.ScriptTarget.ES2022,
}}).outputText;
const sandbox={File,Blob,Uint8Array,ArrayBuffer,ZipLibrary:JSZip};
vm.createContext(sandbox);
vm.runInContext(code+';globalThis.extractZip=extractZip;',sandbox);

test('ZIP extraction returns valid original file content',async()=>{
 const input=new JSZip();
 input.file('notes.txt','FileMagik safe extraction');
 const packed=await input.generateAsync({type:'nodebuffer'});
 const extracted=await sandbox.extractZip(new File([packed],'documents.zip'));
 const unzipped=await JSZip.loadAsync(await extracted.blob.arrayBuffer());
 const entries=Object.values(unzipped.files).filter(f=>!f.dir);
 assert.equal(entries.length,1);
 assert.equal(await entries[0].async('string'),'FileMagik safe extraction');
});
test('ZIP preflight rejects inflated central directory entries before decompressing',async()=>{
 const source=new JSZip();source.file('sample.txt','hello');
 const bytes=new Uint8Array(await source.generateAsync({type:'uint8array'}));
 const i=bytes.findIndex((_,n)=>bytes[n]===0x50&&bytes[n+1]===0x4b&&bytes[n+2]===0x01&&bytes[n+3]===0x02);
 assert.ok(i>=0);
 new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength).setUint32(i+24,0x20000000,true);
 await assert.rejects(()=>sandbox.extractZip(new File([bytes],'unsafe.zip')),/size|corrupt|mismatch|invalid/i);
});
test('ZIP extraction refuses Unix symbolic links',async()=>{
 const archive=new JSZip();
 archive.file('link', 'target-file',{unixPermissions:0o120777});
 const bytes=await archive.generateAsync({type:'nodebuffer',platform:'UNIX'});
 await assert.rejects(()=>sandbox.extractZip(new File([bytes],'links.zip')),/symbolic links/i);
});
