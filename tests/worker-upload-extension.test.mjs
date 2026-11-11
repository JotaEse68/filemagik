import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

// G20 regression: the proxy must recognize ordinary extensions before Turnstile.
// A previously double-escaped dot rejected every valid media/batch upload with 415.
const source=fs.readFileSync(new URL('../src/app/api/worker-engine/route.ts',import.meta.url),'utf8');
const expression=source.match(/file\.name\.toLowerCase\(\)\.match\((\/[^\n]+?\/)\)/);
assert.ok(expression,'worker extension validator must remain present');
const extensionRegex=Function('return '+expression[1])();
test('worker accepts audio and batch filename extensions',()=>{
 for(const name of ['sample.wav','clip.mp3','movie.mp4','image.gif','photo.heic']){
  assert.equal(name.toLowerCase().match(extensionRegex)?.[0],'.'+name.split('.').pop(),name);
 }
});
test('worker rejects names without a valid terminal extension',()=>{
 for(const name of ['sample','sample.wav.exe/','file.','file.???']){
  assert.equal(name.toLowerCase().match(extensionRegex)?.[0]||'', '');
 }
});
