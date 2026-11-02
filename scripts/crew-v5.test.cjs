'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const read=file=>fs.readFileSync(path.resolve(__dirname,'..',file),'utf8');
const engine=require('../functions/staff-xp-engine.cjs');
test('XP curve is 30% lower than preceding 3500 coefficient, all ranks remain deterministic',()=>{
 for(const level of [2,3,5,15,40,60])assert.equal(engine.xpForLevel(level),2450*(level-1)**2);
 assert.equal(engine.xpForLevel(60),8528450);
 assert.equal(engine.levelForXP(2450),2);
});
test('V5 cosmetics preserve old unlock stages while adding new milestone levels',()=>{
 for(const kind of ['aura','trail','cardFx']){
  const stages=Object.values(engine.COSMETIC_CHOICES[kind]).filter(x=>x>1);
  for(const stage of [3,25,60,6,36,52])assert.ok(stages.includes(stage),kind+' missing Lv.'+stage);
 }
 const profile=read('staff-prestige-profile.js');
 assert.match(profile,/staff-aura-select/);
 assert.match(profile,/staff-cardFx-select/);
 assert.match(profile,/staff-trail-select/);
 assert.match(profile,/selectedNameFx/);
});
test('manager approval is in DOL-0001 profile, not landing',()=>{
 const profile=read('dolphin-profile.html');
 const shell=read('staff-access.js');
 const mgmt=read('staff-admin-profile.js');
 assert.match(profile,/id="crew-manager-approvals"/);
 assert.match(profile,/id="crew-approval-dialog"/);
 assert.match(mgmt,/verifiedOwner\(\)/);
 assert.match(mgmt,/approveRegistration\(p\.employeeId\)/);
 assert.match(mgmt,/staffSetOwnRankingVisibility/);
 assert.doesNotMatch(shell,/manager\.id='dolphinAccessManager'/);
});
test('registration alerts are target-scoped to verified owner devices',()=>{
 const push=read('functions/staff-approval-push.js');
 assert.match(push,/v\?\.employeeId==='DOL-0001'&&v\.verified===true/);
 assert.match(push,/staff_approval_alerts/);
 assert.match(push,/sendEachForMulticast/);
 assert.match(push,/dolphin_push_devices/);
});
test('only the owner can change ranking visibility and all three public boards filter accordingly',()=>{
 const backend=read('functions/staff-prestige.js'),ranking=read('ranking/index.html');
 assert.match(backend,/staffSetOwnRankingVisibility/);
 assert.match(backend,/!testAdmin/);
 assert.match(backend,/rankingVisible===true/);
 assert.match(ranking,/rankingAllowed/);
 assert.match(ranking,/e\.rev > 0 && rankingAllowed\(e\.name\)/);
 assert.match(ranking,/e\.points>0&&rankingAllowed\(e\.name\)/);
});
test('Mythic remains exactly two moving stars with stronger glow, and avatar context follows Staff ID',()=>{
 const css=read('crew-cosmetics.css'),shared=read('dolphin-avatars.js');
 assert.match(css,/CREW CLUB V5/);
 assert.match(css,/crew-fx-star-orbit--2/);
 assert.match(css,/0 0 68px #ffc8ff88/);
 assert.match(shared,/selectedAura/);
 assert.match(shared,/selectedTrail/);
});
