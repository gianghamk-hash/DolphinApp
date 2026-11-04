'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=file=>fs.readFileSync(path.join(__dirname,'..',file),'utf8');
const pages={
 Bungalow:'dolphin-bungalow.html',
 Lounge:'dolphin-lounge.html',
 Show:'dolphin-show.html',
 Restaurant:'dolphin-restaurant.html'
};
test('entry gate grants access only to a server-verified, named Staff ID',()=>{
 const gate=read('staff-access.js');
 const backend=read('functions/index.js');
 assert.match(gate,/identity\?\.verified===true&&identity\?\.employeeId/);
 assert.match(gate,/identity\?\.requiresNameChange/);
 assert.match(backend,/profile\.approved===true/);
 assert.match(backend,/requiresNameChange/);
});
test('each staff outlet uses the same current identity client version',()=>{
 const files=['index.html','dolphin-profile.html','staff-access.js','service-worker.js',...Object.values(pages)];
 for(const file of files){
  assert.match(read(file),/staff-id\.js\?v=crew-operational-auth-v1/,file);
 }
});
test('staff-operated bookings and transitions never fall back to unaudited Firestore writes',()=>{
 for(const [area,file] of Object.entries(pages)){
  const src=read(file);
  assert.match(src,/DolphinStaffId\?\.performLiveAction/,area+' must check authenticated callable');
  assert.match(src,/DolphinStaffId\.performLiveAction/,area+' must perform signed operation');
  assert.doesNotMatch(src,/identity\?\.verified===true&&typeof window\.DolphinStaffId\?\.performLiveAction/,area+' must not gate XP on stale local identity');
  assert.doesNotMatch(src,/if\(!verified\)await (setDoc|runTransaction)/,area+' must not silently skip backend');
  assert.doesNotMatch(src,/Staff ID chưa xác minh nên không cấp XP/,area+' must not report successful non-XP staff write');
 }
});
test('all four operational routes and approved-account check remain enabled on server',()=>{
 const src=read('functions/staff-xp-actions.js');
 for(const kind of ['lounge_tables','bun_tables','show_tables','lounge_orders','bun_orders','res_orders']){
  assert.ok(src.includes("'"+kind+"'"),kind+' missing');
 }
 assert.match(src,/const verified=identity\.verified===true\|\|p\.approved===true/);
 assert.match(src,/p\.registrationSource==='self'&&p\.approved!==true/);
 assert.match(src,/staffXpLedger/);
 assert.match(src,/onceSale\(/);
});
test('Show booking proof and anti-double-XP checks are preserved',()=>{
 const backend=read('functions/staff-xp-actions.js');
 const client=read('dolphin-show.html');
 assert.match(backend,/requiresVerifiedBooking:true/);
 assert.match(client,/reward\.requiresVerifiedBooking/);
 assert.match(backend,/return \{saved:true,xpAwarded:grant\.amount,duplicate:grant\.duplicate\}/);
});
test('restaurant opening a table does not invent revenue XP; staff order transitions do accrue',()=>{
 const backend=read('functions/staff-xp-actions.js');
 const rules=read('docs/STAFF_XP_RULES_CURRENT_VI.md');
 assert.match(rules,/Restaurant không có XP doanh thu/);
 assert.match(backend,/res_orders/);
 assert.match(backend,/'res_tables'/);
 assert.match(read('dolphin-restaurant.html'),/kind:'res_tables',id:t,action:'booking'/);
});
