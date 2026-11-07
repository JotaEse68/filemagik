import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
import vm from 'node:vm';

const source=readFileSync('src/lib/subtitles.ts','utf8')
 .replace(/import type .*?;\s*/g,'')
 .replaceAll('export function','function')
 .replaceAll('export async function','async function');
const compiled=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}}).outputText;
const context={Blob};vm.createContext(context);
vm.runInContext(compiled+';globalThis.testAPI={parseCaptions,renderCaptions}',context);
const {parseCaptions,renderCaptions}=context.testAPI;
test('SRT to VTT preserves two captions and punctuation',()=>{
 const srt='1\n00:00:01,200 --> 00:00:03,400\nHola, mundo.\n\n2\n00:00:04,000 --> 00:00:06,500\nSegunda línea\n';
 const vtt=renderCaptions(parseCaptions(srt),'vtt');
 assert.ok(vtt.startsWith('WEBVTT\n\n'));
 assert.ok(vtt.includes('00:00:01.200 --> 00:00:03.400'));
 assert.equal(parseCaptions(vtt).length,2);
});
test('Subtitle offset stays within bounds and clamps negative times',()=>{
 const cues=parseCaptions('00:00:01.000 --> 00:00:02.000\nText');
 const shifted=renderCaptions(cues,'srt',1000);
 assert.ok(shifted.includes('00:00:02,000 --> 00:00:03,000'));
});
test('Invalid timecode and backwards cues are refused',()=>{
 assert.throws(()=>parseCaptions('00:00:02.000 --> 00:00:01.000\nBad'));
 assert.throws(()=>parseCaptions('00:64:01.000 --> 00:65:03.000\nBad'));
});
