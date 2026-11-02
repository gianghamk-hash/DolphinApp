'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const get=p=>fs.readFileSync(path.join(root,p),'utf8');
const landing=get('royal-leaders.js'),ranking=get('ranking/staff-prestige-ranking.js'),server=get('functions/staff-prestige.js'),index=get('index.html');
test('Landing shows three equally-sized transparent podium columns, Level slightly raised',()=>{
 new vm.Script(landing);
 assert.match(landing,/grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
 assert.match(landing,/grid-template-areas:"revenue level work"/);
 assert.match(landing,/#drl-level\{width:100%;min-width:0;grid-area:level;transform:translateY\(-12px\)/);
 assert.match(landing,/#drl-level \.drl-level-surface\[data-banner\]\{background:transparent!important\}/);
 assert.match(landing,/#drl-level \.drl-level-surface\[data-banner="mythic"\]::before\{background:conic-gradient/);
 for(const id of ['drl-revenue','drl-level','drl-work'])assert.ok(landing.includes('id="'+id+'"'));
 assert.match(index,/royal-leaders\.js\?v=level-podium-v2/);
});
test('Landing uses its own authenticated public Level leaderboard, not the hidden iframe relay',()=>{
 new vm.Script(ranking);
 assert.match(landing,/window\.DolphinPrestige\?\.getBoard\?\.\(\)/);
 assert.match(landing,/window\.addEventListener\('dolphin-prestige-updated',event=>applyLevelBoard\(event\.detail\)\)/);
 assert.match(landing,/Array\.isArray\(board\?\.leaderboard\)\?board\.leaderboard\[0\]/);
 assert.match(landing,/event\.origin!==location\.origin\|\|event\.source!==frame\.contentWindow/);
 assert.doesNotMatch(landing,/if\(event\.data\.type==='dolphin-level-leader'\)/);
 assert.match(ranking,/window\.parent\.postMessage\(\{type:'dolphin-level-leader',leader:view\},location\.origin\)/);
 assert.match(server,/leaderboard:employees/);
});
test('All equipped cosmetics are copied from verified profile and rendered by shared animator',()=>{
 for(const field of ['dataset.frame','dataset.avatarMotion','dataset.crewAura','dataset.crewTrail','dataset.nameFx','dataset.banner','dataset.crewCard','dataset.personalTheme'])
  assert.ok(landing.includes(field),field);
 for(const kind of ['ember','inferno','prism','celestial'])assert.ok(landing.includes('drl-name[data-name-fx="'+kind+'"]'),kind);
 assert.match(server,/selectedCardFx:x\.selectedCardFx,personalTheme:x\.personalTheme/);
 assert.match(landing,/DolphinFrameFX\?\.decorate\?\.\(avatar\)/);
 assert.match(landing,/id="drl-level-avatar"/);
 assert.doesNotMatch(landing,/data-staff-avatar[^>]*id="drl-level-avatar"/);
});
test('Revenue/Work iframe remains unchanged; Level is direct with no second Firebase stream',()=>{
 assert.match(landing,/draw\('revenue',event\.data\.revenue\);draw\('work',event\.data\.work\)/);
 assert.match(landing,/frame\.src='ranking\/'/);
 assert.doesNotMatch(landing,/getFirestore|onSnapshot\(/);
 assert.match(ranking,/publishLandingLevel\(\)/);
});
