'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=p=>fs.readFileSync(path.resolve(__dirname,'..',p),'utf8');
const html=read('dolphin-profile.html');
const ui=read('staff-admin-profile.js');
const gate=read('staff-access.js');
const server=read('functions/staff-profile.js');
const client=read('staff-id.js');
test('Manager-only UI is conditional on both APK and verified DOL-0001',()=>{
 assert.match(ui,/const isManagerApk=/);
 assert.match(ui,/const ownerInManagerApk=\(\)=>isManagerApk\(\)&&verifiedOwner\(\)/);
 assert.match(ui,/i\?\.employeeId==='DOL-0001'&&i\.verified===true/);
 assert.match(ui,/manager-owner-mode/);
 for(const id of ['manager-owner-actions','manager-owner-intro','manager-owner-approve','manager-owner-rename','manager-owner-xp','owner-rename-dialog']){
  assert.ok(html.includes('id="'+id+'"'),id);
 }
 assert.match(ui,/staff-daily-card/);
 assert.match(ui,/daily\.hidden=true/);
});
test('Manager APK is scoped to owner without creating a privileged account from user agent',()=>{
 assert.match(gate,/managerApk&&identity\.employeeId!==ownerId/);
 assert.match(gate,/identity\.employeeId===ownerId/);
 assert.match(gate,/lock\(null\);panel\('link'\)/);
 assert.doesNotMatch(gate,/approveRegistration\('DOL-0001'\)/);
 assert.doesNotMatch(gate,/identity=\{employeeId:'DOL-0001'/);
});
test('unlimited owner rename is server-verified and maintains aliases and linked UIDs',()=>{
 assert.match(server,/exports\.staffRenameOwnerProfile=onCall/);
 assert.match(server,/const uid=await requireAccessManager\(req\)/);
 assert.match(server,/nameAliases:aliases\.slice\(-20\)/);
 assert.match(server,/value\?\.employeeId==='DOL-0001'/);
 assert.match(server,/profileVersion:/);
 assert.match(client,/renameOwner:name=>call\('staffRenameOwnerProfile'/);
});
test('staff interface, daily tasks and approval functions remain mounted',()=>{
 assert.match(html,/id="staff-daily-card"/);
 assert.match(html,/class="quick-actions"/);
 assert.match(html,/id="crew-approval-open"/);
 assert.match(html,/id="crew-recovery-list"/);
 assert.match(html,/id="crew-admin-sandbox"/);
 assert.match(ui,/approveRegistration\(p\.employeeId\)/);
 assert.match(ui,/rejectRegistration\(p\.employeeId\)/);
 assert.match(ui,/approveNameRecovery\(request\.requestId\)/);
 assert.match(ui,/staffSetOwnRankingVisibility/);
});
test('only owner-manager UI styles hide missions with reduced motion support',()=>{
 const css=read('staff-profile.css');
 assert.match(css,/\.manager-owner-mode #staff-daily-card/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
 assert.doesNotMatch(css,/\.daily-missions\s*\{display:none/);
});
