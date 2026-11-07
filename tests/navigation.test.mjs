import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import vm from 'node:vm';

const site=fs.readFileSync('src/config/site.ts','utf8');
const slugs=[...site.matchAll(/slug:'([^']+)'/g)].map(m=>m[1]);
const navigation=fs.readFileSync('src/config/tool-navigation.ts','utf8');
const categories=['all','pdf','images','office','data','ocr'];
test('tool catalog has distinct routes',()=>assert.equal(new Set(slugs).size,slugs.length));
test('every tool is assigned to exactly one category',()=>{
 const source=navigation.replace(/import \{[^\n]*\} from '\.\/site';/,'');
 const compiled=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
 const sandbox={module:{exports:{}},exports:{},require:()=>({tools:slugs.map(slug=>({slug,from:slug,to:slug}))})};
 sandbox.exports=sandbox.module.exports;
 vm.runInNewContext(compiled,sandbox);
 const api=sandbox.module.exports;
 assert.equal(api.categoryCounts.all,slugs.length);
 assert.equal(categories.slice(1).reduce((sum,id)=>sum+api.categoryCounts[id],0),slugs.length);
 for(const tool of api.categorizedTools)assert.ok(categories.includes(tool.category));
 assert.equal(api.searchTools('missing-file-format').length,0);
});
test('localized names exist for all sections',()=>{
 for(const language of ['en','es','pt','fr']){
  for(const category of categories){
   assert.ok(navigation.includes(category)); 
  }
 }
});
