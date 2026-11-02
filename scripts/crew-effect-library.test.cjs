'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const read=p=>fs.readFileSync(path.resolve(__dirname,'..',p),'utf8');
const html=read('dolphin-profile.html'),js=read('staff-prestige-profile.js'),css=read('staff-profile.css');
const engine=require('../functions/staff-xp-engine.cjs');
test('every cosmetic is organized into a visual gallery without visible dropdown selectors',()=>{
 for(const section of ['name','avatar','profile','theme'])assert.match(html,new RegExp('data-crew-tab="'+section+'"'));
 for(const category of ['nameFx','trail','frame','aura','title','banner','cardFx']){
  assert.match(html,new RegExp('data-crew-gallery="'+category+'"'));
  assert.match(html,new RegExp('id="staff-'+category+'-select"'));
  assert.match(js,new RegExp('staff-\\'\\+kind\\+\\'-select'));
 }
 assert.match(html,/id="staff-cosmetic-values" hidden aria-hidden="true"/);
 assert.match(html,/id="staff-save-style"/);
 assert.match(css,/#staff-cosmetic-values\[hidden\]\{display:none!important\}/);
 assert.match(css,/grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
});
test('every option including locked and none tiers gets a real preview surface',()=>{
 assert.match(js,/for\(const \[kind,choices\] of Object\.entries\(cosmeticOptions\)\)/);
 assert.match(js,/for\(const \[id,label,level\] of choices\)/);
 assert.match(js,/makeEffectPreview\(kind,id,label\)/);
 for(const [kind,source] of [
  ['frame','preview.dataset.frame=id'],['nameFx','preview.dataset.nameFx=id'],
  ['trail','preview.dataset.crewTrail=id'],['aura','preview.dataset.crewAura=id'],
  ['cardFx','preview.dataset.crewCard=id'],['banner','preview.dataset.banner=id'],
  ['title','preview.dataset.title=id']])assert.ok(js.includes(source),kind+' lacks a real visual preview');
 assert.match(js,/tile\.dataset\.locked=String\(!unlocked\)/);
 assert.match(js,/badge\.textContent=equipped/);
 assert.doesNotMatch(js,/tile\.disabled=!unlocked/);
});
test('click equips only unlocked effects, past unlocks remain selected until Save',()=>{
 assert.match(js,/const unlocked=!!mine&&mine.level>=level/);
 assert.match(js,/if\(!unlocked\)\{/);
 assert.match(js,/select\.value=id/);
 assert.match(js,/renderFxGallery\(\)/);
 assert.match(js,/tile\.setAttribute\('aria-pressed',String\(equipped\)\)/);
 assert.match(js,/mine=await window\.DolphinPrestige\.call\('staffSetPersonalStyle'/);
 for(const [kind,choices]of Object.entries(engine.COSMETIC_CHOICES)){
  assert.ok(Object.values(choices).some(n=>n===1),kind+' requires an always-available default option');
 }
});
test('tab categories are keyboard accessible and reduced-motion remains available',()=>{
 assert.match(html,/role="tablist"/);
 assert.match(html,/role="tabpanel"/);
 assert.match(js,/event\.key==='ArrowRight'/);
 assert.match(js,/tab\.setAttribute\('aria-selected',String\(active\)\)/);
 assert.match(css,/:focus-visible/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
});
