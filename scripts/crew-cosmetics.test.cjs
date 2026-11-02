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
 assert.match(ranking,/nameLabel\.dataset\.nameFx=nameFxTier\(p\)/);
 assert.match(ranking,/leader-emperor-name'\)\.dataset\.nameFx=nameFxTier\(champion\)/);
});
test('Bronze Silver Gold and Mythic are rendered by one shared stylesheet',()=>{
 for(const [id,level] of [['bronze',5],['silver',22],['gold',40],['mythic',60]]){
  assert.ok(css.includes('data-frame="'+id+'"'),'missing '+id+' frame effect');
  assert.ok(html.includes('data-unlock-level="'+level+'" data-fx-kind="frame" data-fx-id="'+id+'"'),'missing '+id+' frame preview');
 }
 assert.match(avatars,/crew-cosmetics\.css\?v=orbit-v4-20261102/);
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

const rankingHTML=read('ranking/index.html');
const online=read('staff-online.js');
const worker=read('service-worker.js');
test('V3 rarity makes each equipped avatar visually distinct on every surface',()=>{
 assert.match(css,/CREW CLUB LEGENDARY FRAMES V3/);
 for(const name of ['hero-avatar','level-avatar','leader-tile-icon','dolphin-staff-avatar','drr-frame','sow-avatar']){
  assert.ok(css.includes('.'+name),'V3 must style '+name);
 }
 for(const key of ['bronze','silver','gold','mythic']){
  assert.match(css,new RegExp('data-frame="'+key+'"'));
 }
 assert.match(css,/--crew-fx-glyph:"♛"/);
 assert.match(css,/--crew-fx-glyph:"✧"/);
 assert.match(css,/crew-v3-orbit/);
 assert.match(css,/#staffOnlineWidget\.open \.sow-avatar\[data-frame="mythic"\]/);
 assert.match(css,/#section-level:not\(\[style\*="none"\]\) \.level-avatar\[data-frame="mythic"\]/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
});
test('online people use linked Staff ID directory for equipped frame and title',()=>{
 assert.match(online,/function onlineCosmetics\(staff\)/);
 assert.match(online,/staff\.staffId\s*\?\s*window\.DolphinAvatars\?\.profile\?\./);
 assert.match(online,/data-frame="'\+effect\.frame/);
 assert.match(online,/sow-title/);
 assert.match(online,/DolphinAvatars\?\.subscribe\?\.\(renderList\)/);
});
test('all ranking tabs and the Emperor read a shared equipped frame',()=>{
 assert.match(ranking,/function equippedFrame\(person\)/);
 assert.match(ranking,/icon\.dataset\.frame=equippedFrame\(profile\)/);
 assert.match(ranking,/avatar\.dataset\.frame=equippedFrame\(p\)/);
 assert.match(ranking,/dataset\.frame=equippedFrame\(champion\)/);
 assert.match(rankingHTML,/function rankingAvatarFrame\(name\)/);
 assert.match(rankingHTML,/class="drr-frame[^"\n]*" data-frame="\$\{rankingAvatarFrame\(e\.name\)\}"/);
 assert.match(rankingHTML,/class="dolphin-staff-avatar" data-frame="\$\{rankingAvatarFrame\(e\.name\)\}"/);
 assert.match(rankingHTML,/function rankingTitle\(name\)/);
});
test('both PWA cache and runtime resolve exactly the same V3 cosmetic asset',()=>{
 assert.match(worker,/crew-cosmetics\.css\?v=orbit-v4-20261102/);
 assert.match(avatars,/crew-cosmetics\.css\?v=orbit-v4-20261102/);
});


test('V4 ring satellites have different physical counts and opposite directions',()=>{
 const avatarJs=read('dolphin-avatars.js');
 assert.match(css,/CREW CLUB V4 — TRUE ORBIT ANIMATIONS/);
 assert.match(avatarJs,/const count=\{bronze:1,silver:2,gold:3\}\[frame\]/);
 assert.match(avatarJs,/if\(frame==='mythic'\)/);
 assert.match(avatarJs,/for\(let i=1;i<=2;i\+\+\)/);
 assert.match(css,/crew-fx-ring--1/);
 assert.match(css,/crew-fx-ring--2/);
 assert.match(css,/crew-fx-ring--3/);
 assert.match(css,/crew-fx-spin-cw/);
 assert.match(css,/crew-fx-spin-ccw/);
 assert.match(css,/crew-fx-star-orbit--2/);
 assert.match(css,/animation-name:crew-fx-spin-ccw/);
 assert.match(css,/animation-play-state:paused!important/);
 assert.match(css,/prefers-reduced-motion:reduce/);
 assert.match(avatarJs,/if\(previous&&el\.dataset\.crewFxFrame===frame\)return/);
 assert.match(avatarJs,/decorateFrames\(\);/);
 assert.match(profile,/window\.DolphinFrameFX\?\.refresh\?\.\(\)/);
 assert.match(ranking,/window\.DolphinFrameFX\?\.refresh\?\.\(\)/);
 assert.match(online,/window\.DolphinFrameFX\?\.refresh\?\.\(\)/);
});
