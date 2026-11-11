import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import crypto from 'node:crypto';

const slots=['desktop','desktopLower','homeHeroSide','popularTop','toolSide','toolHorizontal','mobile','result','home','incontent'];
const source=fs.readFileSync(new URL('../src/lib/advertising/blob-settings.ts',import.meta.url),'utf8');
const transpiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const sandboxModule={exports:{}};
new Function('require','module','exports',transpiled)((id)=>{
 if(id==='./config')return {adSlots:slots};
 if(id==='@vercel/blob')return {list:async()=>({blobs:[],hasMore:false}),put:async()=>({})};
 if(id==='node:crypto')return crypto;
 throw new Error('Unexpected dependency '+id);
},sandboxModule,sandboxModule.exports);
const {emptyAds,validateAds,publicAds}=sandboxModule.exports;
const campaign=(changes={})=>({id:'test-banner-001',name:'Banner',src:'https://example.com/banner.jpg',href:'',alt:'',enabled:true,...changes});

test('can enable banner by HTTPS image URL without destination or description',()=>{
 const data=emptyAds();data.campaigns=[campaign()];data.placements.home.enabled=true;data.placements.home.campaignIds=['test-banner-001'];
 const validated=validateAds(data);
 assert.equal(validated.campaigns[0].enabled,true);
 assert.equal(publicAds(validated).banners.find(a=>a.slot==='home')?.href,'');
 assert.equal(validated.campaigns[0].newTab,true);
});

test('existing advertising configuration migrates with missing optional slots and rewarded',()=>{
 const data=emptyAds();
 delete data.placements.desktopLower;delete data.placements.homeHeroSide;delete data.placements.popularTop;delete data.placements.toolSide;delete data.placements.toolHorizontal;delete data.rewarded;
 const checked=validateAds(data);
 assert.equal(checked.placements.desktopLower.enabled,false);
 assert.equal(checked.placements.homeHeroSide.enabled,false);
 assert.equal(checked.placements.toolSide.enabled,false);
 assert.equal(checked.placements.toolHorizontal.enabled,false);
 assert.equal(checked.rewarded.enabled,false);
});

test('scheduled banner only appears between its start and end dates',()=>{
 const today=new Date().toISOString().slice(0,10);
 const data=emptyAds();
 data.campaigns=[campaign({startsAt:'2099-01-01',endsAt:'2099-12-31'})];
 data.placements.home.campaignIds=['test-banner-001'];
 assert.equal(publicAds(validateAds(data)).banners.some(x=>x.slot==='home'),false);
 data.campaigns[0].startsAt='2000-01-01';data.campaigns[0].endsAt='2099-12-31';
 assert.equal(publicAds(validateAds(data)).banners.some(x=>x.slot==='home'),true);
 assert.ok(today<'2099-12-31');
});

test('rejects invalid dates and end date before start date',()=>{
 const data=emptyAds();data.campaigns=[campaign({startsAt:'2026-12-31',endsAt:'2026-12-30'})];
 assert.throws(()=>validateAds(data),/Fechas de campaña incorrectas/);
 data.campaigns[0].startsAt='2026-02-31';data.campaigns[0].endsAt='';
 assert.throws(()=>validateAds(data),/Fechas de campaña incorrectas/);
});

test('desktop rail shows two direct banners but only one when a Google sticky is configured',()=>{
 const data=emptyAds();
 data.campaigns=[campaign()];
 data.placements.desktop.campaignIds=['test-banner-001'];
 data.placements.desktopLower.campaignIds=['test-banner-001'];
 assert.equal(publicAds(validateAds(data)).banners.filter(x=>x.slot==='desktop'||x.slot==='desktopLower').length,2);
 data.placements.desktop.provider='adsense';
 data.placements.desktop.publisherId='ca-pub-1234567890123456';
 data.placements.desktop.adSlotId='1234567890';
 assert.equal(publicAds(validateAds(data)).banners.filter(x=>x.slot==='desktop'||x.slot==='desktopLower').length,1);
});

test('G18 provisionally fills empty enabled slots with existing URL campaigns',()=>{
 const data=emptyAds();
 data.campaigns=[
  campaign({id:'banner-a',src:'https://example.com/a.jpg',href:'https://example.com/a'}),
  campaign({id:'banner-b',src:'https://example.com/b.jpg',href:'https://example.com/b'})
 ];
 data.placements.desktop.campaignIds=['banner-a'];
 const published=publicAds(validateAds(data));
 for(const slot of ['desktopLower','home','toolHorizontal','incontent']){
  assert.equal(published.rotation[slot]?.banners.length,2);
  assert.ok(published.banners.find(item=>item.slot===slot)?.src.startsWith('https://example.com/'));
 }
 assert.equal(published.banners.find(x=>x.slot==='desktop')?.src,'https://example.com/a.jpg');
 assert.notEqual(published.banners.find(x=>x.slot==='desktopLower')?.src,published.banners.find(x=>x.slot==='home')?.src);
});

test('G18 does not show disabled assigned placements or inactive campaigns',()=>{
 const data=emptyAds();
 data.campaigns=[campaign(),campaign({id:'not-ready',enabled:false,src:'https://example.com/disabled.jpg'})];
 data.placements.desktopLower.enabled=false;
 data.placements.desktopLower.campaignIds=['test-banner-001'];
 const published=publicAds(validateAds(data));
 assert.equal(published.banners.some(x=>x.slot==='desktopLower'),false);
 assert.deepEqual(published.rotation.home.banners.map(x=>x.src),['https://example.com/banner.jpg']);
 data.campaigns[0].startsAt='2099-01-01';
 assert.equal(publicAds(validateAds(data)).banners.some(x=>x.slot==='home'),false);
});
