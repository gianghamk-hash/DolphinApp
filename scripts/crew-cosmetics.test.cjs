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
  assert.ok(profile.includes("['"+id+"',")&&profile.includes("element('span','Dolphin','fx-name-preview')"),'missing '+id+' dynamic name preview');
 }
 assert.match(profile,/function activeNameTier\(/);
 assert.match(profile,/dataset\.nameFx=activeNameTier\(\)/);
 assert.match(ranking,/nameLabel\.dataset\.nameFx=nameFxTier\(p\)/);
 assert.match(ranking,/leader-emperor-name'\)\.dataset\.nameFx=nameFxTier\(champion\)/);
});
test('Bronze Silver Gold and Mythic are rendered by one shared stylesheet',()=>{
 for(const [id,level] of [['bronze',5],['silver',22],['gold',40],['mythic',60]]){
  assert.ok(css.includes('data-frame="'+id+'"'),'missing '+id+' frame effect');
  assert.ok(profile.includes("['"+id+"',")&&profile.includes("preview.dataset.frame=id"),'missing '+id+' dynamic frame preview');
 }
 assert.match(avatars,/crew-cosmetics\.css\?v=crew-global-v9/);
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
  assert.match(rankingHTML,/function rankingAvatarFrame\(name,employeeId\)/);
  assert.match(rankingHTML,/class="drr-frame[^"\n]*" data-frame="\$\{rankingAvatarFrame\(e\.name,e\.employeeId\)\}"/);
 assert.match(rankingHTML,/class="dolphin-staff-avatar" data-frame="\$\{rankingAvatarFrame\(e\.name\)\}"/);
 assert.match(rankingHTML,/function rankingTitle\(name,employeeId\)/);
});
test('both PWA cache and runtime resolve exactly the same V3 cosmetic asset',()=>{
 assert.match(worker,/crew-cosmetics\.css\?v=crew-global-v9/);
 assert.match(avatars,/crew-cosmetics\.css\?v=crew-global-v9/);
});


test('V4 ring satellites have different physical counts and opposite directions',()=>{
 const avatarJs=read('dolphin-avatars.js');
 assert.match(css,/CREW CLUB V4 — TRUE ORBIT ANIMATIONS/);
 assert.match(avatarJs,/const count=\{bronze:1,silver:2,gold:3\}\[frame\]/);
 assert.match(avatarJs,/if\(frame==='mythic'\)/);
 assert.match(avatarJs,/for\(let i=1;i<=4;i\+\+\)/);
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


test('new collectible themes, frames, motions and avatar sets have validated unlock levels',()=>{
 const engine=require('../functions/staff-xp-engine.cjs');
 const backend=read('functions/staff-prestige.js'),themes=read('theme-system.js');
 const catalog=JSON.parse(read('functions/staff-avatar-catalog.json'));
 const ui=read('staff-prestige-profile.js');
 const expectedMotion={comet:6,tide:14,vortex:24,phoenix:36,supernova:52};
 for(const [name,level] of Object.entries(expectedMotion)){
  assert.equal(engine.COSMETIC_CHOICES.avatarMotion[name],level);
  assert.ok(ui.includes("'"+name+"'"),name+' missing UI');
  assert.ok(css.includes('data-avatar-motion="'+name+'"'),name+' missing CSS');
 }
 for(const [id,level] of Object.entries({emerald:12,sapphire:28,nebula:48})){
  assert.equal(engine.COSMETIC_CHOICES.frame[id],level);
  assert.ok(css.includes('data-frame="'+id+'"'));
 }
 for(const id of ['abyss','aurora','coral','neon','cosmic','royal','obsidian']){
  assert.ok(backend.includes(id+':'),id+' server approval missing');
  assert.ok(themes.includes('"'+id+'"'),id+' theme definition missing');
  assert.ok(ui.includes(id+':'),id+' UI level missing');
 }
 const labels=Object.keys(catalog);
 for(const level of [2,7,12,18,28,36,48,55]){
  assert.ok(labels.some(x=>x.includes('Lv.'+level)),'missing avatar unlock Lv.'+level);
 }
 assert.equal(new Set(Object.values(catalog).flat()).size,Object.values(catalog).flat().length);
});
test('V4 complex animations have layered spark, ring and core nodes with reduced-motion fallback',()=>{
 const avatars=read('dolphin-avatars.js');
 for(const name of ['crew-motion-core','crew-motion-ring','crew-motion-spark'])assert.ok(avatars.includes(name));
 assert.match(css,/CREW CLUB CELESTIAL V4/);
 assert.match(css,/crew-v4-spark/);
 assert.match(css,/prefers-reduced-motion:reduce/);
 assert.match(avatars,/layer\.setAttribute\('aria-hidden','true'\)/);
 assert.match(avatars,/if\(previous&&el\.dataset\.crewFxFrame===frame\)return/);
});


test('avatar categories are ascending numeric Level and every collection has a curated theme',()=>{
 const catalog=JSON.parse(read('functions/staff-avatar-catalog.json'));
 const groups=Object.keys(catalog),levels=groups.map(s=>Number((s.match(/Lv\.(\d+)/)||[])[1]));
 assert.deepEqual(levels,[1,2,3,5,7,10,12,15,18,20,28,30,36,40,48,55]);
 const all=Object.values(catalog).flat();
 assert.equal(new Set(all).size,all.length,'every avatar appears in only one folder');
 for(const [name,required] of Object.entries({
  'Ocean Collection Lv.5':['🦈','🐙','🪼','🐧'],
  'Safari Lv.7':['🦓','🦒','🐆'],
  'Thủy thủ Lv.12':['⚓','⛵','🚢'],
  'Thiên hà Lv.36':['🌌','🪐','☄️'],
  'Mythic Collection Lv.40':['🐉','🐦‍🔥','🔱'],
  'Hoàng gia Lv.55':['👑','🤴','👸','🏰']
 }))for(const avatar of required)assert.ok(catalog[name].includes(avatar),name+' missing '+avatar);
 assert.ok(read('staff-profile.js').includes('Object.keys(catalog).sort((a,b)=>levelOf(a)-levelOf(b)'), 'picker must sort levels numerically');
});
test('every public crew surface supports new frames, motions and real mythical rarity',()=>{
 const avatar=read('dolphin-avatars.js');
 const rank=read('ranking/staff-prestige-ranking.js');
 const rankingPage=read('ranking/index.html');
 const online=read('staff-online.js');
 const landing=read('royal-leaders.js');
 for(const id of ['emerald','sapphire','nebula']){
  for(const source of [avatar,rank,rankingPage,online,landing])assert.ok(source.includes(id),id+' missing in crew renderer');
 }
 for(const id of ['comet','tide','vortex','phoenix','supernova']){
  assert.ok(landing.includes(id),id+' missing in podium allowlist');
  assert.ok(css.includes('data-avatar-motion="'+id+'"'),id+' missing live CSS');
 }
 assert.ok(rank.includes('avatar.dataset.avatarMotion=p.selectedAvatarMotion'),'level board must supply motion');
 assert.match(online,/data-avatar-motion/);
 assert.match(rank,/leader-emperor-avatar'\)\.dataset\.avatarMotion/);
 assert.match(avatar,/const mythicAvatars=new Set/);
 assert.match(avatar,/const royalAvatars=new Set/);
 assert.match(css,/crew-avatar-insignia::before/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
 for(const name of ['.sow-avatar','.drr-frame','.leader-tile-icon'])assert.ok(css.includes(name));
});
