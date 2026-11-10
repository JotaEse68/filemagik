import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
import vm from 'node:vm';

const source=readFileSync('src/lib/rtf-to-text.ts','utf8')
 .replace(/import type .*?;\s*/g,'')
 .replace(/export function /g,'function ')
 .replace(/export async function /g,'async function ');
const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.None,target:ts.ScriptTarget.ES2022}}).outputText;
const ctx={TextDecoder,Uint8Array,Blob};
vm.createContext(ctx);
vm.runInContext(js+';globalThis.rtfToPlainText=rtfToPlainText',ctx);
const convert=ctx.rtfToPlainText;
test('RTF strips hidden groups and preserves Unicode',()=>{
 const input=String.raw`{\rtf1\ansi\uc1{\fonttbl{\f0 Arial;}}Hello \u241?and\u250?\par Second line {\*\private Confidential}}`;
 const result=convert(input);
 assert.equal(result,'Hello ñandú\nSecond line');
 assert.ok(!result.includes('Confidential'));
});
test('RTF refuses malformed group structure',()=>{
 assert.throws(()=>convert(String.raw`{\rtf1\ansi Missing closing`),/Unbalanced/);
 assert.throws(()=>convert(String.raw`{\rtf1\ansi Closing} }`),/Unbalanced/);
});
test('RTF refuses excessive nested groups and overlong binary commands',()=>{
 assert.throws(()=>convert(String.raw`{\rtf1`+'{'.repeat(130)+'x'+'}'.repeat(131)),/nesting/);
 assert.throws(()=>convert(String.raw`{\rtf1\bin999999999 `+'a'+'}'),/binary payload/);
});
