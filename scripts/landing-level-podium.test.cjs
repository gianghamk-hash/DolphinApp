'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const get=p=>fs.readFileSync(path.join(root,p),'utf8');
const landing=get('royal-leaders.js'),ranking=get('ranking/staff-prestige-ranking.js'),server=get('functions/staff-prestige.js'),index=get('index.html');
test('landing podium places Level in the centre and above Revenue and Work',()=>{
 new vm.Script(landing);
 assert.match(landing,/grid-template-areas:"revenue level work"/);
 assert.match(landing,/#drl-level\{grid-area:level;z-index:3;transform:translateY\(-17px\)/);
 assert.match(landing,/grid-template-areas:"level level" "revenue work"/);
 for(const name of ['drl-revenue','drl-level','drl-work'])assert.match(landing,new RegExp('id="'+name+'"'));
 assert.match(index,/royal-leaders\.js\?v=level-podium-v1/);
});
test('Level #1 is the verified server-ranked leaderboard entry, not a client XP guess',()=>{
 new vm.Script(ranking);
 assert.match(ranking,/Array\.isArray\(board\?\.leaderboard\)\?board\.leaderboard\[0\]/);
 assert.match(ranking,/window\.parent\.postMessage\(\{type:'dolphin-level-leader',leader:view\},location\.origin\)/);
 assert.match(ranking,/dolphin-prestige-updated[^\n]*publishLandingLevel\(\)/);
 assert.match(landing,/event\.origin!==location\.origin\|\|event\.source!==frame\.contentWindow/);
 assert.match(landing,/event\.data\.type==='dolphin-level-leader'/);
});
test('Level card receives complete equipped cosmetics and selected personal theme',()=>{
 for(const prop of ['selectedFrame','selectedAvatarMotion','selectedAura','selectedTrail','selectedNameFx','selectedTitle','selectedBanner','selectedCardFx','personalTheme'])
  assert.match(ranking,new RegExp(prop+':leader\\.'+prop));
 for(const field of ['dataset.frame','dataset.avatarMotion','dataset.crewAura','dataset.crewTrail','dataset.nameFx','dataset.banner','dataset.crewCard','dataset.personalTheme'])
  assert.ok(landing.includes(field),field);
 for(const tier of ['ember','inferno','prism','celestial'])assert.match(landing,new RegExp('drl-name\\[data-name-fx="'+tier+'"\\]'));
 assert.match(server,/selectedCardFx:x\.selectedCardFx,personalTheme:x\.personalTheme/);
 assert.match(landing,/DolphinFrameFX\?\.decorate\?\.\(avatar\)/);
 assert.match(landing,/id="drl-level-avatar"/);
 assert.doesNotMatch(landing,/data-staff-avatar[^>]*id="drl-level-avatar"/,'do not overwrite trusted Level cosmetics during asynchronous directory paint');
});
test('other champion categories still publish unchanged, no new Landing Firestore streams',()=>{
 assert.match(landing,/draw\('revenue',event\.data\.revenue\);draw\('work',event\.data\.work\)/);
 assert.match(landing,/frame\.src='ranking\/'/);
 assert.doesNotMatch(landing,/getFirestore|firebase-admin|onSnapshot\(/);
 assert.match(ranking,/publishLandingLevel\(\)/);
});
