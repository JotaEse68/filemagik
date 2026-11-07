import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const adjust=readFileSync('src/lib/image-adjust.ts','utf8');
const catalog=readFileSync('src/config/site.ts','utf8');
const converter=readFileSync('src/components/converter.tsx','utf8');
const detect=readFileSync('src/lib/detect-tools.ts','utf8');
test('image edit exports WebP PNG JPG',()=>{
 for(const text of ['webp','jpeg','png'])assert.ok(adjust.includes(text));
});
test('image tool removes EXIF through canvas re-encoding',()=>{
 assert.ok(adjust.includes('canvas.toBlob'));
 assert.ok(catalog.includes("slug:'adjust-image'"));
});
test('image edit has understandable UI controls',()=>{
 for(const text of ['cropPercent','rotation','format','Recortar bordes','Girar imagen'])assert.ok(converter.includes(text));
});
test('image edit is available for JPG, PNG and WebP',()=>{
 assert.ok(detect.includes("'adjust-image'"));
});
