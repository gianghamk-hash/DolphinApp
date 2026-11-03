'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const read=p=>fs.readFileSync(path.resolve(__dirname,'..',p),'utf8');
test('pending count changes only text label, never destroys badge DOM',()=>{
 const ui=read('staff-admin-profile.js'),html=read('dolphin-profile.html');
 assert.match(html,/id="crew-approval-open-label"/);
 assert.match(html,/id="crew-approval-badge"/);
 assert.match(ui,/crew-approval-open-label'\)\.textContent/);
 assert.doesNotMatch(ui,/crew-approval-open'\)\.textContent/);
 assert.match(ui,/renderRequested/);
 assert.match(ui,/if\(polling\)return/);
});
test('rejection has confirmation, server authority and fresh registration requirement',()=>{
 const ui=read('staff-admin-profile.js'),backend=read('functions/staff-profile.js'),id=read('functions/index.js');
 assert.match(ui,/rejectRegistration\(p\.employeeId\)/);
 assert.match(ui,/bắt buộc|phải đăng ký lại|đăng ký lại/i);
 assert.match(backend,/exports\.staffRejectRegistration=onCall/);
 assert.match(backend,/await requireAccessManager\(req\)/);
 assert.match(backend,/active:false,approved:false,rejected:true/);
 assert.match(backend,/uid\+':reregister:'\+rejectedId/);
 assert.match(id,/verified:false,linked:false,rejected:/);
 assert.match(id,/oldProfile\?\.rejected===true/);
});
test('manager notifications remain in-app after dismissal of one pending request',()=>{
 const ui=read('staff-admin-profile.js'),client=read('staff-id.js');
 assert.match(ui,/lastProfiles=profiles/);
 assert.match(ui,/displayPeople\(profiles\)/);
 assert.match(ui,/profiles.length\+' chờ duyệt'/);
 assert.match(client,/rejectRegistration:employeeId=>call\('staffRejectRegistration'/);
 assert.match(client,/wasRejected:\(\)=>rejection/);
});

test('verified DOL-0001 manages approved directory and grouped actions',()=>{
 const ui=read('staff-admin-profile.js'),html=read('dolphin-profile.html');
 const api=read('staff-id.js'),backend=read('functions/staff-profile.js');
 const workflow=read('.github/workflows/staff-access-production.yml');
 assert.match(html,/id="crew-approved-dialog"/);
 assert.match(html,/id="crew-approved-search"/);
 assert.match(html,/id="crew-approved-sort"/);
 assert.match(html,/id="crew-recovery-open"/);
 assert.match(html,/Cài đặt cá nhân/);
 assert.match(html,/Trung tâm nhân sự/);
 assert.match(ui,/listApproved\(\)/);
 assert.match(ui,/function renderApproved/);
 assert.match(api,/listApproved:\(\)=>call\('staffListApprovedProfiles'\)/);
 assert.match(backend,/exports\.staffListApprovedProfiles=onCall/);
 assert.match(backend,/await requireAccessManager\(req\)/);
 assert.match(backend,/deviceCount/);
 assert.match(workflow,/functions:staffListApprovedProfiles/);
});

test('DOL-0001 management controls remain discoverable when identity refresh is incomplete',()=>{
 const ui=read('staff-admin-profile.js'),html=read('dolphin-profile.html');
 assert.match(html,/id="crew-manager-access-status"/);
 assert.match(html,/id="crew-manager-verify-retry"/);
 assert.match(ui,/const showShell=owner\|\|managerDevice/);
 assert.match(ui,/\$\('crew-manager-approvals'\)\.hidden=!showShell/);
 assert.match(ui,/\$\(id\)\.disabled=!manager/);
 assert.match(ui,/await window\.DolphinStaffId\.refresh\(\)/);
 assert.match(ui,/manager=verifiedOwner\(\)/);
 assert.match(ui,/if\(!verifiedOwner\(\)\)return/);
});
