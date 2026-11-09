import test from 'node:test';
import assert from 'node:assert/strict';
import {File,Blob} from 'node:buffer';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
import vm from 'node:vm';
import JSZip from 'jszip';

const source=readFileSync('src/lib/tar-tools.ts','utf8')
 .replace(/import type .*?;\s*/g,'')
 .replace(/const \{default:JSZip\}=await import\('jszip'\)/g,'const JSZip=globalThis.JSZip')
 .replace(/export async function /g,'async function ');
const code=ts.transpileModule(source,{compilerOptions:{
 module:ts.ModuleKind.None,target:ts.ScriptTarget.ES2022,
}}).outputText;
const sandbox={File,Blob,TextEncoder,TextDecoder,Uint8Array,ArrayBuffer,JSZip};
vm.createContext(sandbox);
vm.runInContext(code+';globalThis.createTar=createTar;globalThis.extractTar=extractTar;',sandbox);

test('TAR creates a real ustar and safely extracts into a ZIP with original bytes',async()=>{
 const inputs=[
  new File(['First entry content'],'first.txt',{type:'text/plain'}),
  new File([new Uint8Array([0,1,2,3,255])],'data.bin'),
 ];
 const packed=await sandbox.createTar(inputs);
 assert.equal(packed.name,'filemagik-archive.tar');
 const raw=new Uint8Array(await packed.blob.arrayBuffer());
 assert.equal(new TextDecoder().decode(raw.subarray(257,262)),'ustar');
 const extracted=await sandbox.extractTar(new File([packed.blob],'bundle.tar'));
 const zip=await JSZip.loadAsync(await extracted.blob.arrayBuffer());
 const files=Object.values(zip.files).filter(f=>!f.dir);
 assert.equal(files.length,2);
 assert.deepEqual(new Uint8Array(await files[1].async('uint8array')),new Uint8Array([0,1,2,3,255]));
 assert.equal(await files[0].async('string'),'First entry content');
});
test('TAR rejects tampered checksums',async()=>{
 const packed=await sandbox.createTar([new File(['hello'],'sample.txt')]);
 const bytes=new Uint8Array(await packed.blob.arrayBuffer());
 bytes[0]^=1;
 await assert.rejects(()=>sandbox.extractTar(new File([bytes],'tampered.tar')),/checksum/i);
});
test('TAR rejects symlink payloads even with a valid checksum',async()=>{
 const packed=await sandbox.createTar([new File(['hello'],'sample.txt')]);
 const bytes=new Uint8Array(await packed.blob.arrayBuffer());
 bytes[156]=50;bytes.fill(32,148,156);
 const sum=bytes.subarray(0,512).reduce((n,v)=>n+v,0);
 const checksum=sum.toString(8).padStart(6,'0')+'\0 ';
 bytes.set(new TextEncoder().encode(checksum),148);
 await assert.rejects(()=>sandbox.extractTar(new File([bytes],'linked.tar')),/links/i);
});
test('TAR rejects truncated archives and overly large input batches',async()=>{
 const packed=await sandbox.createTar([new File(['hello'],'sample.txt')]);
 const bytes=new Uint8Array(await packed.blob.arrayBuffer());
 await assert.rejects(()=>sandbox.extractTar(new File([bytes.subarray(0,512)],'short.tar')),/truncated/i);
 const files=Array.from({length:101},(_,i)=>new File(['x'],i+'.txt'));
 await assert.rejects(()=>sandbox.createTar(files),/100 files/i);
});
