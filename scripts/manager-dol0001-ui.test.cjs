'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const read=x=>fs.readFileSync(path.join(__dirname,'..',x),'utf8');
const html=read('dolphin-profile.html'),gate=read('staff-access.js'),profile=read('staff-profile.js'),admin=read('staff-admin-profile.js'),css=read('staff-profile.css');
test('Manager APK targets DOL-0001 but never derives admin rights from user agent',()=>{
 assert.match(gate,/managerApk&&identity\?\.employeeId!=='DOL-0001'/);
 assert.match(gate,/managerApk\|\|identity\.employeeId==='DOL-0001'/);
 assert.match(gate,/identity\?\.verified!==true/);
 assert.match(gate,/cài APK không tự cấp quyền quản lý/);
 assert.match(admin,/manager=verifiedOwner\(\)/);
 assert.match(admin,/button\.disabled=!manager/);
 const backend=read('functions/staff-profile.js');
 assert.match(backend,/ident\?\.employeeId!=='DOL-0001'/);
 assert.match(backend,/ident\.verified!==true/);
});
test('Manager APK hides daily mission card only in Manager presentation',()=>{
 assert.match(css,/html\[data-app="manager"\] #staff-daily-card\{display:none!important\}/);
 assert.match(html,/id="staff-daily-card"/);
 assert.match(profile,/dataset\.verifiedManager=String\(managerApk&&profile\?\.employeeId==='DOL-0001'&&profile\.verified===true\)/);
});
test('manager controls remain mounted and securely wired to original actions',()=>{
 for(const id of ['crew-manager-approvals','crew-approval-open','crew-recovery-open','crew-approval-dialog','crew-approval-list','crew-recovery-list','crew-recovery-section','crew-manager-ranking-toggle','crew-admin-sandbox','prestige-admin-launch','admin-dialog','profile-edit-dialog','style-dialog','rewards-dialog','devices-dialog']){
  assert.equal(html.split('id="'+id+'"').length-1,1,id+' must be unique');
 }
 assert.match(admin,/approveRegistration\(p\.employeeId\)/);
 assert.match(admin,/rejectRegistration\(p\.employeeId\)/);
 assert.match(admin,/approveNameRecovery\(request\.requestId\)/);
 assert.match(admin,/staffSetOwnRankingVisibility/);
 assert.match(admin,/\$\('crew-recovery-open'\)\.addEventListener/);
 assert.match(html,/id="prestige-admin-launch"[^>]*data-open-dialog="admin-dialog"/);
});
test('DOL-0001 has its own reduced-motion-friendly gold identity styling',()=>{
 assert.match(css,/data-verified-manager="true"/);
 assert.match(css,/@keyframes dolphinManagerHalo/);
 assert.match(css,/@keyframes dolphinManagerShine/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
});
test('Manager APK changes do not alter Staff ID or XP storage',()=>{
 const client=read('staff-id.js');
 assert.match(client,/staffGetIdentity/);
 assert.match(client,/performLiveAction/);
 assert.doesNotMatch(admin,/staffIdentity\/.*set\(/);
 assert.doesNotMatch(gate,/identity\.employeeId\s*=\s*'DOL-0001'/);
});
