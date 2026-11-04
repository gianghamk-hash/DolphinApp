'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const gate=read('staff-access.js');
const css=read('staff-access.css');
const home=read('index.html');
const profile=read('staff-profile.js');
const backend=read('functions/staff-profile.js');
const identity=read('functions/index.js');
const nav=read('dolphin-navigation.js');
const staffClient=read('staff-id.js');
const staffProfilePage=read('dolphin-profile.html');
const sw=read('service-worker.js');
test('home access is closed by default and linked verification is checked on startup',()=>{
 assert.match(home,/document\.documentElement\.classList\.add\('dolphin-access-pending'\)/);
 assert.match(home,/staff-access\.js\?v=crew-name-policy-v1/);
 assert.match(home,/staff-access\.css\?v=crew-name-policy-v1/);
 assert.match(gate,/identity\?\.verified===true&&identity\?\.employeeId/);
 assert.match(gate,/await api\.ready\(\)/);
 assert.match(css,/html\.dolphin-access-pending #landing/);
 assert.match(gate,/root\.openApp=function\(area\)/);
});
test('only name and initial avatar are submitted; department is absent',()=>{
 assert.match(gate,/id="dag-name"/);
 assert.match(gate,/id="dag-avatar-list"/);
 assert.match(gate,/api\.register\(\{name,avatar:state\.avatar\}\)/);
 assert.doesNotMatch(gate,/id="dag-department"/);
 assert.doesNotMatch(backend,/const departments=new Set/);
 assert.match(backend,/approved:false/);
});
test('registration name cannot be self-edited in UI or API',()=>{
 assert.match(profile,/id==='profile-name-input'&&!!profile/);
 assert.match(profile,/api\.update\(\{avatar\}\)/);
 assert.match(backend,/Họ tên đã đăng ký không thể thay đổi/);
 assert.match(backend,/return \{\.\.\.v,avatar:data\.avatar/);
});
test('manager DOL-0001 approval uses trusted server-side identity',()=>{
 assert.match(backend,/ident\?\.employeeId!=='DOL-0001'/);
 assert.match(backend,/ident\.verified!==true/);
 assert.match(backend,/master\.registrationSource==='self'/);
 assert.match(backend,/exports\.staffListPendingApprovals=/);
 assert.match(backend,/exports\.staffApproveRegistration=/);
 assert.match(gate,/api\.approveRegistration\(p\.employeeId\)/);
 assert.match(identity,/profile\.approved===true/);
});
test('direct staff-entry navigation and linked devices cannot bypass approval',()=>{
 assert.match(nav,/staff-access\.js\?v=crew-name-policy-v1/);
 assert.match(gate,/root\.parent!==root/);
 assert.match(gate,/panel\('pending'\)/);
 assert.match(gate,/api\.link\(\$\('dag-code'\)\.value\.trim\(\)/);
 assert.match(gate,/state\.busy/);
});

test('pending approval cannot access registration, recovery or device linking',()=>{
 assert.match(gate,/state\.pending/);
 assert.match(gate,/state\.pending&&name!=='pending'/);
 assert.match(gate,/state\.busy\|\|state\.pending\|\|state\.needsRename/);
 assert.doesNotMatch(gate,/data-action="switch"/);
 assert.match(identity,/Đang chờ quản lý duyệt/);
});
test('legacy invalid or duplicate names require remediation while keeping Staff ID',()=>{
 assert.match(gate,/data-panel="rename"/);
 assert.match(gate,/api\.repairName\(name\)/);
 assert.match(identity,/requiresNameChange/);
 assert.match(backend,/exports\.staffRepairMyName/);
 assert.match(backend,/nameAliases:aliases\.slice/);
});

test('production Staff ID client exposes repairName and all entry points load matching asset version',()=>{
 assert.match(staffClient,/repairName:name=>call\('staffRepairMyName',\{name\}\)/);
 assert.match(gate,/api\.repairName\(name\)/);
 assert.match(home,/staff-id\.js\?v=crew-operational-auth-v1/);
 assert.match(staffProfilePage,/staff-id\.js\?v=crew-operational-auth-v1/);
 assert.match(gate,/staff-id\.js\?v=crew-operational-auth-v1/);
 assert.match(sw,/staff-id\.js\?v=crew-operational-auth-v1/);
});
