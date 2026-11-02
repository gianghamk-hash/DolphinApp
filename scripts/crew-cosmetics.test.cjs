'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const css=read('crew-cosmetics.css');
const html=read('dolphin-profile.html');
const profile=read('staff-prestige-profile.js');
const ranking=read('ranking/staff-prestige-ranking.js');
const avatars=read('dolphin-avatars.js');

test('all four name effects have distinct styles and correctly staged unlock previews',()=>{
 for(const [id,level] of [['ember',3],['inferno',25],['prism',45],['celestial',60]]){
  assert.ok(css.includes('data-name-fx="'+id+'"'),'missing '+id+' name effect selector');
  assert.ok(html.includes('data-unlock-level="'+level+'" data-fx-kind="name" data-fx-id="'+id+'"'),'missing '+id+' name preview');
 }
 assert.match(profile,/function activeNameTier\(/);
 assert.match(profile,/dataset\.nameFx=activeNameTier\(\)/);
 assert.match(ranking,/nameLabel\.dataset\.nameFx=nameTier/);
});
test('Bronze Silver Gold and Mythic are rendered by one shared stylesheet',()=>{
 for(const [id,level] of [['bronze',5],['silver',22],['gold',40],['mythic',60]]){
  assert.ok(css.includes('data-frame="'+id+'"'),'missing '+id+' frame effect');
  assert.ok(html.includes('data-unlock-level="'+level+'" data-fx-kind="frame" data-fx-id="'+id+'"'),'missing '+id+' frame preview');
 }
 assert.match(avatars,/crew-cosmetics\.css\?v=epic-fx-20261102/);
 assert.match(avatars,/crew-cosmetics-stylesheet/);
});
test('previews accurately show locked, unlocked, and equipped states',()=>{
 assert.match(profile,/function renderFxGallery\(/);
 assert.match(profile,/tile\.dataset\.locked=String\(!unlocked\)/);
 assert.match(profile,/tile\.dataset\.equipped=String\(equipped\)/);
 assert.match(profile,/renderFxGallery\(\);renderAdminSandbox\(\)/);
 assert.match(profile,/level>=60&&\(mine\.nameFlame\|\|mine\.nameGradient\)/);
});
test('premium animations are accessible and contained on narrow/mobile screens',()=>{
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
 assert.match(css,/@media\(max-width:420px\)/);
 assert.match(css,/:is\(\.dolphin-staff-avatar,\.level-avatar,\[data-staff-avatar\]\)\[data-frame\]::before/);
 assert.match(css,/animation:none!important/);
 assert.ok(!css.includes('position:fixed'),'cosmetics must never cover the page');
});
