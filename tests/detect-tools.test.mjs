import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
import vm from 'node:vm';
const src=readFileSync('src/lib/detect-tools.ts','utf8')
 .replace(/import type \{[^\n]*\} from '[^']+';/g,'')
 .replace('export function ','function ');
const code=ts.transpileModule(src,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}}).outputText;
const sandbox={};vm.createContext(sandbox);
vm.runInContext(code+';globalThis.detect=getAvailableTools',sandbox);
const detect=(...names)=>sandbox.detect(names.map(name=>({name})));
test('jpg offers webp, png and image PDF',()=>assert.deepEqual([...detect('photo.jpg')],['jpg-to-webp','jpg-to-png','images-to-pdf','resize-image','adjust-image']));
test('mixed images can become one PDF',()=>assert.deepEqual([...detect('a.png','b.jpg')],['images-to-pdf','batch-images-to-webp']));
test('several PDFs can merge',()=>assert.deepEqual([...detect('a.pdf','b.pdf')],['merge-pdf']));
test('single PDF can split or rotate',()=>assert.deepEqual([...detect('a.pdf')],['split-pdf','rotate-pdf','pdf-to-png','pdf-to-word-text','crop-pdf','annotate-pdf-text']));
test('Excel XLSX offers CSV export',()=>assert.deepEqual([...detect('table.xlsx')],['xlsx-to-csv']));
test('CSV offers JSON and Excel',()=>assert.deepEqual([...detect('table.csv')],['csv-to-json','csv-to-xlsx']));
test('unsupported inputs return no actions',()=>assert.equal(detect('script.exe').length,0));

test('mixed WebP and PNG can be exported as a WebP ZIP',()=>assert.deepEqual([...detect('a.webp','b.png')],['batch-images-to-webp']));

test('subtitles can be converted both ways',()=>{assert.deepEqual([...detect('movie.srt')],['srt-to-vtt']);assert.deepEqual([...detect('movie.vtt')],['vtt-to-srt']);});

test('audio WAV conversion is offered for browser-supported files',()=>assert.deepEqual([...detect('song.mp3')],['audio-to-wav']));
