'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const server=read('functions/staff-profile.js'),client=read('staff-id.js'),
 gate=read('staff-access.js'),admin=read('staff-admin-profile.js'),
 cosmetics=read('crew-cosmetics.css'),avatar=read('dolphin-avatars.js'),
 profile=read('dolphin-profile.html'),prestige=read('functions/staff-prestige.js'),
 engine=require('../functions/staff-xp-engine.cjs');
test('account recovery never hands out a linking code solely from a matching name',()=>{
 assert.match(server,/exports\.staffRequestNameRecovery=onCall/);
 assert.match(server,/normalizedRecoveryName\(p\.name\)===name/);
 assert.match(server,/matches\.length===1/);
 assert.match(server,/return \{submitted:true,message:/);
 assert.doesNotMatch(server.slice(server.indexOf('exports.staffRequestNameRecovery='),server.indexOf('exports.staffListRecoveryRequests=')),/return \{code/);
 assert.match(server,/exports\.staffApproveNameRecovery=onCall/);
 assert.match(server,/const managerUid=await requireAccessManager\(req\)/);
 assert.match(server,/status:'issued'/);
 assert.match(server,/crypto\.randomBytes\(18\)/);
 assert.match(server,/expiresAt:Date\.now\(\)\+600000/);
 assert.match(server,/staffEnrollmentCodes/);
});
test('recovery UI and identity response are isolated from profile writes',()=>{
 assert.match(gate,/data-panel="recovery"/);
 assert.match(gate,/dag-recovery-name/);
 assert.match(client,/staffRequestNameRecovery/);
 assert.match(client,/staffListRecoveryRequests/);
 assert.match(client,/staffApproveNameRecovery/);
 assert.match(client,/staffRequestNameRecovery','staffListRecoveryRequests','staffApproveNameRecovery/);
 assert.match(profile,/id="crew-recovery-list"/);
 assert.match(admin,/function displayRecovery\(/);
 assert.match(admin,/approveNameRecovery/);
});
test('avatar motion is server-validated, level-gated, persistent and previewable',()=>{
 assert.deepEqual(engine.COSMETIC_CHOICES.avatarMotion,{
  none:1,pulse:3,float:10,wave:20,orbit:30,prism:45,ascension:60,comet:6,tide:14,vortex:24,phoenix:36,supernova:52
 });
 assert.match(prestige,/const cosmetics=engine\.currentCosmetics\(p\)/);
 assert.match(prestige,/selectedAvatarMotion:selected\.avatarMotion===undefined/);
 assert.match(prestige,/\['frame','avatarMotion','title'/);
 assert.match(profile,/data-crew-gallery="avatarMotion"/);
 assert.match(profile,/id="staff-avatarMotion-select"/);
 assert.match(avatar,/selectedAvatarMotion/);
 assert.match(avatar,/avatarMotion/);
 assert.match(cosmetics,/crew-avatar-motion/);
 assert.match(cosmetics,/crew-mythic-universe/);
 assert.match(cosmetics,/crew-mythic-orbit--4/);
});
