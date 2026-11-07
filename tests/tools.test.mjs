import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
import vm from 'node:vm';

function evaluate(path,expose,context={}){
 const source=readFileSync(path,'utf8')
 .replace(/import type \{[^\n]*\} from '[^']+';/g,'')
 .replaceAll('export const ','const ')
 .replaceAll('export function ','function ')
 .replaceAll('export type ','type ');
 const code=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}}).outputText;
 const sandbox={...context};vm.createContext(sandbox);
 vm.runInContext(code+`;globalThis.result={${expose}}`,sandbox);
 return sandbox.result;
}
const {tools,locales}=evaluate('src/config/site.ts','tools,locales',{process:{env:{}}});
const {getToolCopy}=evaluate('src/lib/tool-content.ts','getToolCopy');

test('all tool slugs are unique',()=>assert.equal(new Set(tools.map(x=>x.slug)).size,tools.length));
test('all four locales are present',()=>assert.deepEqual([...locales],['en','es','pt','fr']));
test('every tool has localized copy for four languages',()=>{
 for(const tool of tools){
 const summaries=locales.map(locale=>getToolCopy(locale,tool.slug).summary);
 assert.equal(new Set(summaries).size,4);
 assert.ok(summaries.every(summary=>summary.length>35));
 }
});
test('the language switcher preserves the selected tool',()=>{
 const source=readFileSync('src/components/language-switcher.tsx','utf8');
 assert.match(source,/const suffix=pathname\.replace/);
 assert.match(source,/\$\{l\}\$\{suffix\}/);
});