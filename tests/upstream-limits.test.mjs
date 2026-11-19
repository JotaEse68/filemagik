import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
import vm from 'node:vm';

const raw=readFileSync('src/lib/limited-upstream-response.ts','utf8').replaceAll('export async function','async function');
const script=ts.transpileModule(raw,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}}).outputText;
const sandbox={Uint8Array,Number,ArrayBuffer};
vm.createContext(sandbox);
vm.runInContext(script+';globalThis.readLimitedUpstream=readLimitedUpstream;',sandbox);
const bounded=sandbox.readLimitedUpstream;

test('accepts valid chunked output below hard limit',async()=>{
 const response=new Response(new ReadableStream({start(controller){
  controller.enqueue(new Uint8Array([80,75]));
  controller.enqueue(new Uint8Array([3,4]));
  controller.close();
 }}));
 const data=await bounded(response,6);
 assert.deepEqual([...new Uint8Array(data)],[80,75,3,4]);
});
test('rejects oversized declared response without buffering',async()=>{
 const response=new Response(new Uint8Array([1,2,3]),{headers:{'Content-Length':'100'}});
 assert.equal(await bounded(response,4),null);
});
test('cancels a chunked response as soon as it exceeds limit',async()=>{
 let cancelled=false;
 const response=new Response(new ReadableStream({pull(controller){
  controller.enqueue(new Uint8Array(5));
 },cancel(){cancelled=true;}}));
 assert.equal(await bounded(response,4),null);
 assert.equal(cancelled,true);
});
test('rejects empty and interrupted responses',async()=>{
 assert.equal(await bounded(new Response(null),10),null);
 const stream=new ReadableStream({start(controller){controller.error(new Error('upstream interrupted'));}});
 assert.equal(await bounded(new Response(stream),10),null);
});
test('rejects malformed size headers and invalid max limits',async()=>{
 assert.equal(await bounded(new Response('ok',{headers:{'Content-Length':'not-a-number'}}),10),null);
 assert.equal(await bounded(new Response('ok'),0),null);
});
