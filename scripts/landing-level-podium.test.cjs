'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),get=p=>fs.readFileSync(path.join(root,p),'utf8');
const landing=get('royal-leaders.js'),ranking=get('ranking/staff-prestige-ranking.js'),
      server=get('functions/staff-prestige.js'),index=get('index.html'),
      directory=get('functions/staff-profile.js'),avatars=get('dolphin-avatars.js');
test('three transparent equally-sized Landing podiums: Revenue, raised Level, Work',()=>{
 new vm.Script(landing);
 assert.match(landing,/grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
 assert.match(landing,/grid-template-areas:"revenue level work"/);
 assert.match(landing,/#drl-level\{width:100%;min-width:0;grid-area:level;transform:translateY\(-12px\)/);
 assert.match(landing,/:is\(#drl-level,#drl-revenue,#drl-work\) \.drl-level-surface/);
 assert.match(landing,/:is\(#drl-level,#drl-revenue,#drl-work\) \.drl-level-surface\[data-banner="mythic"\]::before/);
 assert.match(index,/royal-leaders\.js\?v=crew-global-v9/);
 for(const slot of ["revenue","level","work"])assert.ok(landing.includes("podium('"+slot+"'"));
});
test('the Top 1 winners have no decorative crown or hard-coded name flames',()=>{
 assert.doesNotMatch(landing,/drl-crown|drlNameFlame|drlFireFlicker|KING OF SALES|WORK CHAMPION/);
 assert.doesNotMatch(landing,/<div class="drl-level-crown"/);
 assert.match(landing,/function renderAppearance\(type,leader\)/);
 assert.match(landing,/renderAppearance\(type,actor\)/);
 assert.match(landing,/renderAppearance\('level',valid\?leader:null\)/);
 assert.match(landing,/\.drl-name\[data-name-fx="inferno"\]/);
});
test('Revenue/Work get personal avatar/effects from verified unique Staff ID directory',()=>{
 assert.match(landing,/window\.DolphinAvatars\?\.profile\?\.\(name,employeeId\)/);
 assert.match(landing,/window\.addEventListener\('dolphin-avatars-updated'/);
 assert.match(landing,/const rankSnapshots=\{revenue:null,work:null\}/);
 assert.match(landing,/avatar\.dataset\.frame=safe\('frame'/);
 assert.match(landing,/avatar\.dataset\.avatarMotion=safe\('avatarMotion'/);
 assert.match(landing,/avatar\.dataset\.crewAura=safe\('aura'/);
 assert.match(landing,/surface\.dataset\.crewCard=safe\('cardFx'/);
 assert.match(landing,/surface\.dataset\.banner=safe\('banner'/);
 assert.match(landing,/name\.dataset\.nameFx=safe\('nameFx'/);
 assert.match(landing,/dataset\.crewTrail=safe\('trail'/);
 assert.match(landing,/surface\.dataset\.personalTheme=theme/);
 assert.match(landing,/DolphinFrameFX\?\.decorate\?\.\(avatar\)/);
 assert.match(directory,/selectedBanner:safe\.selectedBanner/);
 assert.match(directory,/engine\.currentCosmetics\(p\)/);
 assert.match(directory,/personalTheme:safe\.personalTheme/);
 assert.match(avatars,/selectedBanner:p\.selectedBanner/);
 assert.match(avatars,/personalTheme:p\.personalTheme/);
});
test('Level uses its own authoritative Firebase leaderboard; Revenue/Work relay stays unchanged',()=>{
 assert.match(landing,/window\.DolphinPrestige\?\.getBoard\?\.\(\)/);
 assert.match(landing,/window\.addEventListener\('dolphin-prestige-updated',event=>applyLevelBoard\(event\.detail\)\)/);
 assert.match(landing,/Array\.isArray\(board\?\.leaderboard\)\?board\.leaderboard\[0\]/);
 assert.match(landing,/event\.origin!==location\.origin\|\|event\.source!==frame\.contentWindow/);
 assert.doesNotMatch(landing,/if\(event\.data\.type==='dolphin-level-leader'\)/);
 assert.match(ranking,/window\.parent\.postMessage\(\{type:'dolphin-level-leader',leader:view\},location\.origin\)/);
 assert.match(server,/leaderboard:employees/);
 assert.match(landing,/draw\('revenue',event\.data\.revenue\);draw\('work',event\.data\.work\)/);
 assert.match(landing,/frame\.src='ranking\/'/);
 assert.doesNotMatch(landing,/getFirestore|onSnapshot\(/);
});

test('Manager APK Landing has no inserted daily overview or redundant staff-online dashboard listener',()=>{
 const ui=get('dolphin-ui.js'),manager=get('manager/dashboard.html');
 assert.doesNotMatch(ui,/function ensureDashEl|function injectDashboardStyles|function renderDashboard|function listenStaff|dashStats/);
 assert.doesNotMatch(ui,/TỔNG QUAN HÔM NAY|mgrGrid|mgrTime/);
 assert.match(ui,/function hideManagerWidgets\(/);
 assert.match(ui,/function listenOrders\(/);
 assert.match(ui,/function updateDelayAlert\(/);
 assert.match(ui,/document\.getElementById\('mgrDash'\)\?\.remove\(\)/);
 assert.match(index,/html\[data-app="manager"\] #mgrDash/);
 assert.match(index,/dolphin-ui\.js\?v=manager-summary-removed-v3/);
 assert.match(index,/manager\/dashboard\.html/);
 assert.match(manager,/Manager Dashboard/);
});
