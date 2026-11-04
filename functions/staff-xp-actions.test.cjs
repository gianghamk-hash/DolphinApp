'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const vm=require('node:vm'),fs=require('node:fs');
function harness(){
 const data=new Map([['staffIdentity/verified',{verified:true,employeeId:'DOL-0001'}],['staffRegistry/DOL-0001',{employeeId:'DOL-0001',name:'Lan',active:true,registrationSource:'manager'}],['staffIdentity/self',{verified:false,employeeId:'DOL-0002'}],['staffRegistry/DOL-0002',{employeeId:'DOL-0002',name:'Self Pending',active:true,registrationSource:'self',approved:false}],['staffIdentity/approvedSelf',{verified:false,employeeId:'DOL-0006'}],['staffRegistry/DOL-0006',{employeeId:'DOL-0006',name:'Nguyễn Tiến Nam',active:true,registrationSource:'self',approved:true}],['staffIdentity/manager',{verified:true,employeeId:'DOL-0003'}],['staffRegistry/DOL-0003',{employeeId:'DOL-0003',name:'Manager',active:true,registrationSource:'manager'}],['staffIdentity/owner',{verified:true,employeeId:'DOL-0004'}],['staffRegistry/DOL-0004',{employeeId:'DOL-0004',name:'Đỗ Thành Đạt',nameAliases:['Dat G'],active:true,registrationSource:'manager'}],['staffIdentity/intruder',{verified:true,employeeId:'DOL-0005'}],['staffRegistry/DOL-0005',{employeeId:'DOL-0005',name:'Another Employee',active:true,registrationSource:'manager'}]]);
 const docs=new Map(),awards=[],missionAwards=[];
 const ref=p=>({once:async()=>({val:()=>data.get(p)||null,exists:()=>data.has(p)}),set:async v=>{data.set(p,v)},transaction:async fn=>{const v=fn(data.get(p)||null);if(v===undefined)return {committed:false};data.set(p,v);return {committed:true,snapshot:{val:()=>v}};}});
 const db={collection:k=>({doc:id=>({key:k+'/'+id})}),runTransaction:async fn=>fn({get:async r=>({exists:docs.has(r.key),data:()=>docs.get(r.key)}),set:(r,v)=>docs.set(r.key,{...(docs.get(r.key)||{}),...v}),update:(r,v)=>docs.set(r.key,{...(docs.get(r.key)||{}),...v})})};
 class HttpsError extends Error{constructor(code,msg){super(msg);this.code=code}}
 const exp={},ctx={exports:exp,process:{env:{STAFF_ADMIN_UIDS:'manager'}},console,Date,Set,Map};ctx.require=n=>{
  if(n==='node:crypto')return require(n);
  if(n==='firebase-admin/database')return {getDatabase:()=>({ref})};
  if(n==='firebase-admin/firestore')return {getFirestore:()=>db};
  if(n==='firebase-functions/v2/https')return {onCall:(_,f)=>f,HttpsError};
  if(n==='./staff-xp-live-engine.cjs')return require('./staff-xp-live-engine.cjs');
  if(n==='./staff-daily-core.cjs')return require('./staff-daily-core.cjs');
  if(n==='./staff-xp-engine.cjs')return require('./staff-xp-engine.cjs');
  if(n==='./staff-daily-missions')return {_award:async(employeeId,taskId)=>{missionAwards.push({employeeId,taskId});return {addedXP:{lounge_opened:250,bungalow_opened:300,order_received:150,order_completed:400}[taskId]||0,awarded:true};}};
  if(n==='./staff-prestige')return {_awardTrustedLiveXP:async d=>{const k='staffXpLedger/'+d.employeeId+'/'+d.eventId;if(data.has(k))return {duplicate:true};data.set(k,d);awards.push(d);return {duplicate:false}}};
  if(n==='./staff-name-policy.cjs')return require('./staff-name-policy.cjs');
  throw Error(n);
 };
 vm.runInNewContext(fs.readFileSync(__dirname+'/staff-xp-actions.js','utf8'),ctx);
 return {call:(u,d)=>exp.staffRecordLiveAction({auth:u?{uid:u}:null,data:d}),docs,awards,missionAwards};
}
test('only manager verified staff can open revenue sessions, no duplicate XP',async()=>{
 const h=harness(),input={kind:'lounge_tables',id:'LOUNGE 1',action:'booking',data:{customerName:'Guest',pax:3,paymentMethod:'TM',openedByStaff:'spoof'}};
 await assert.rejects(()=>h.call('self',input),e=>e.code==='permission-denied');
 await assert.rejects(()=>h.call(null,input),e=>e.code==='unauthenticated');
 assert.equal((await h.call('verified',input)).xpAwarded,750);
 assert.equal(h.docs.get('lounge_tables/LOUNGE 1').openedByStaff,'Lan');
 assert.equal((await h.call('verified',input)).xpAwarded,0);assert.equal(h.awards.length,1);
});
test('approved self-registered staff may book even if device verified flag is stale',async()=>{
 const h=harness(),input={kind:'show_tables',id:'BGL 301',action:'booking',
  data:{leader:'Anh Long',dining:'A1',guests:10,payment:'Chuyển khoản'}};
 const saved=await h.call('approvedSelf',input);
 assert.equal(saved.saved,true);
 assert.equal(h.docs.get('show_tables/BGL 301').sellerStaffId,'DOL-0006');
 assert.equal(h.docs.get('show_tables/BGL 301').seller,'Nguyễn Tiến Nam');
});
test('unapproved self registration remains blocked with or without a verified device flag',async()=>{
 const h=harness(),input={kind:'show_tables',id:'BGL 302',action:'booking',
  data:{leader:'Guest',dining:'A2',guests:3,payment:'Tiền mặt'}};
 await assert.rejects(()=>h.call('self',input),e=>e.code==='permission-denied');
});
test('Restaurant table is opened with verified Staff ID, with no revenue XP',async()=>{
 const h=harness();
 const action={kind:'res_tables',id:'A1',action:'booking',data:{customerName:'Anh Long'}};
 const saved=await h.call('approvedSelf',action);
 assert.equal(saved.saved,true);
 assert.equal(saved.xpAwarded,0);
 assert.equal(saved.missionXP,0);
 assert.equal(h.docs.get('res_tables/A1').customerName,'Anh Long');
 assert.equal(h.docs.get('res_tables/A1').updatedBy,'Nguyễn Tiến Nam');
 assert.equal(h.docs.get('res_tables/A1').updatedByStaffId,'DOL-0006');
 assert.equal(h.awards.length,0);
 await assert.rejects(()=>h.call('self',{...action,id:'A2'}),e=>e.code==='permission-denied');
 assert.equal(h.docs.get('res_tables/A2'),undefined);
});
test('Show needs verified booking; same combo is not counted twice',async()=>{
 const h=harness(),combo={kind:'show_tables',id:'S1',action:'combo',data:{combo:'combo2',foods:{set:1}}};
 await assert.rejects(()=>h.call('owner',combo),e=>e.code==='not-found');
 await h.call('owner',{kind:'show_tables',id:'S1',action:'booking',data:{leader:'L',dining:'J1',guests:2,payment:'Tiền mặt'}});
 assert.equal((await h.call('owner',combo)).xpAwarded,790);
 assert.equal((await h.call('owner',combo)).xpAwarded,0);
});
test('legacy Show booking can save combo with no invented XP, then verified booking earns once',async()=>{
 const h=harness();
 h.docs.set('show_tables/BGL 301',{label:'BGL 301',seller:'Lan',
  leader:'Anh Long',dining:'A1',guests:10,payment:'Chuyển khoản'});
 const combo={kind:'show_tables',id:'BGL 301',action:'combo',
  data:{combo:'combo1',drinks:{Coke:3},foods:{'Đồ ăn đi kèm':1}}};
 const pending=await h.call('verified',combo);
 assert.equal(pending.saved,true);
 assert.equal(pending.requiresVerifiedBooking,true);
 assert.equal(pending.xpAwarded,0);
 assert.equal(h.awards.length,0);
 assert.equal(h.docs.get('show_tables/BGL 301').service.combo,'combo1');
 await h.call('verified',{kind:'show_tables',id:'BGL 301',action:'booking',
  data:{leader:'Anh Long',dining:'A1',guests:10,payment:'Chuyển khoản'}});
 const earned=await h.call('verified',combo);
 assert.equal(earned.saved,true);
 assert.ok(earned.xpAwarded>0);
 assert.equal((await h.call('verified',combo)).xpAwarded,0);
});
test('legacy Show combo cannot be saved by a different verified employee',async()=>{
 const h=harness();
 h.docs.set('show_tables/S-legacy',{label:'S-legacy',seller:'Another Employee',
  sellerStaffId:'DOL-0005',leader:'X',dining:'A1',guests:3,payment:'TM'});
 await assert.rejects(()=>h.call('owner',{kind:'show_tables',id:'S-legacy',
  action:'combo',data:{combo:'combo1',foods:{set:1}}}),e=>e.code==='permission-denied');
 assert.equal(h.docs.get('show_tables/S-legacy').service,undefined);
});
test('Work credits verified prepare and remaining completion XP once',async()=>{
 const h=harness();h.docs.set('lounge_orders/o1',{status:'pending'});
 const a={kind:'lounge_orders',id:'o1',action:'preparing'},b={...a,action:'completed'};
 assert.equal((await h.call('verified',a)).xpAwarded,100);
 assert.equal((await h.call('verified',b)).xpAwarded,150);
 assert.equal((await h.call('verified',b)).xpAwarded,0);
 assert.equal(h.awards.reduce((n,x)=>n+x.amount,0),250);
});
test('completed client-writable legacy source cannot retroactively grant XP',async()=>{
 const h=harness();h.docs.set('res_orders/o2',{status:'completed',completedBy:'Guest'});
 await assert.rejects(()=>h.call('verified',{kind:'res_orders',id:'o2',action:'completed'}),e=>e.code==='failed-precondition');assert.equal(h.awards.length,0);
});


test('authorized manager edits another employee table without stealing their revenue',async()=>{
 const h=harness(),first={kind:'lounge_tables',id:'L3',action:'booking',data:{customerName:'Guest',pax:2,paymentMethod:'TM'}};
 assert.equal((await h.call('verified',first)).xpAwarded,500);
 const changed=await h.call('manager',{...first,data:{customerName:'Guest 2',pax:3,paymentMethod:'TM'}});
 assert.equal(changed.xpAwarded,0);assert.equal(h.docs.get('lounge_tables/L3').openedByStaff,'Lan');assert.equal(h.awards.length,1);
});
test('authorized manager edits Show combo without receiving XP for another seller',async()=>{
 const h=harness();
 await h.call('verified',{kind:'show_tables',id:'S9',action:'booking',data:{leader:'Team',dining:'J1',guests:4,payment:'Tiền mặt'}});
 await h.call('verified',{kind:'show_tables',id:'S9',action:'combo',data:{combo:'combo1',foods:{set:1}}});
 const changed=await h.call('manager',{kind:'show_tables',id:'S9',action:'combo',data:{combo:'combo2',foods:{set:1}}});
 assert.equal(changed.xpAwarded,0);assert.equal(h.docs.get('show_tables/S9').seller,'Lan');
});

test('daily rewards are tied to actual first server-side booking and order transitions',async()=>{
 const h=harness(),lounge={kind:'lounge_tables',id:'L9',action:'booking',data:{customerName:'Guest',pax:2,paymentMethod:'TM'}};
 const first=await h.call('verified',lounge);
 assert.equal(first.missionXP,250);
 const repeat=await h.call('verified',lounge);
 assert.equal(repeat.missionXP,0);
 h.docs.set('bun_orders/b1',{status:'pending'});
 assert.equal((await h.call('verified',{kind:'bun_orders',id:'b1',action:'preparing'})).missionXP,150);
 assert.equal((await h.call('verified',{kind:'bun_orders',id:'b1',action:'preparing'})).missionXP,0);
 assert.equal((await h.call('verified',{kind:'bun_orders',id:'b1',action:'completed'})).missionXP,400);
 assert.equal((await h.call('verified',{kind:'bun_orders',id:'b1',action:'completed'})).missionXP,0);
 assert.deepEqual(h.missionAwards.map(x=>x.taskId),['lounge_opened','order_received','order_completed']);
});

test('DOL-0001 verified Bungalow booking receives revenue XP and first-open mission',async()=>{
 const h=harness();
 const input={kind:'bun_tables',id:'BGL 201',action:'booking',data:{customerName:'Customer',restaurantTable:'A1',paymentMethod:'TM',openedByStaff:'untrusted client'}};
 const first=await h.call('verified',input);
 assert.equal(first.saved,true);
 assert.equal(first.xpAwarded,2000);
 assert.equal(first.missionXP,300);
 assert.equal(h.docs.get('bun_tables/BGL 201').openedByStaff,'Lan');
 assert.equal(h.docs.get('bun_tables/BGL 201').openedByStaffId,'DOL-0001');
 const again=await h.call('verified',input);
 assert.equal(again.xpAwarded,0);
 assert.equal(again.missionXP,0);
 assert.equal(h.awards.filter(x=>x.employeeId==='DOL-0001'&&x.amount===2000).length,1);
});
test('Lounge booking retained from a previous day awards new tour revenue and mission once',async()=>{
 const h=harness();
 h.docs.set('lounge_tables/LOUNGE 15',{
  customerName:'Yesterday',pax:2,paymentMethod:'TM',
  openedByStaff:'Lan',openedByStaffId:'DOL-0001',updatedAt:Date.now()-2*86400000
 });
 const input={kind:'lounge_tables',id:'LOUNGE 15',action:'booking',
  data:{customerName:'Today',pax:3,paymentMethod:'TM'}};
 const first=await h.call('verified',input);
 assert.equal(first.saved,true);
 assert.equal(first.xpAwarded,750);
 assert.equal(first.missionXP,250);
 const second=await h.call('verified',input);
 assert.equal(second.xpAwarded,0);
 assert.equal(second.missionXP,0);
});
test('verified new employee can reopen a prior-day Bungalow without stealing same-day revenue',async()=>{
 const h=harness();
 const prior={customerName:'Yesterday',restaurantTable:'A1',paymentMethod:'TM',
  openedByStaff:'Lan',openedByStaffId:'DOL-0001',updatedAt:Date.now()-2*86400000};
 h.docs.set('bun_tables/BGL 301',prior);
 const action={kind:'bun_tables',id:'BGL 301',action:'booking',
  data:{customerName:'Today',restaurantTable:'A2',paymentMethod:'TM'}};
 const now=await h.call('owner',action);
 assert.equal(now.saved,true);
 assert.equal(now.xpAwarded,2000);
 assert.equal(h.docs.get('bun_tables/BGL 301').openedByStaffId,'DOL-0004');
 assert.equal((await h.call('owner',action)).xpAwarded,0);
 await assert.rejects(()=>h.call('intruder',action),e=>e.code==='permission-denied');
});
test('reopening a Bungalow saved on a previous VN day qualifies for a new daily mission',async()=>{
 const h=harness();
 h.docs.set('bun_tables/BGL 202',{
  customerName:'Yesterday',restaurantTable:'A2',paymentMethod:'TM',
  openedByStaff:'Lan',openedByStaffId:'DOL-0001',updatedAt:Date.now()-2*86400000
 });
 const input={kind:'bun_tables',id:'BGL 202',action:'booking',data:{customerName:'Today',restaurantTable:'A2',paymentMethod:'TM'}};
 const renewed=await h.call('verified',input);
 assert.equal(renewed.missionXP,300);
 assert.equal(renewed.xpAwarded,2000);
 const repeat=await h.call('verified',input);
 assert.equal(repeat.missionXP,0);
});

test('already completed, client-attributed orders never earn XP from secure callable',async()=>{
 const h=harness();
 h.docs.set('res_orders/forged',{status:'completed',completedBy:'Lan'});
 const result=await h.call('verified',{kind:'res_orders',id:'forged',action:'completed'});
 assert.equal(result.xpAwarded,0);
 assert.equal(result.duplicate,true);
 assert.equal(h.awards.length,0);
 await assert.rejects(()=>h.call('verified',{kind:'res_orders',id:'forged',action:'preparing'}),e=>e.code==='failed-precondition');
});
test('pre-existing prepared-by name is not a server-verified preparation award',async()=>{
 const h=harness();
 h.docs.set('bun_orders/attributed',{status:'preparing',preparedBy:'Lan'});
 const result=await h.call('verified',{kind:'bun_orders',id:'attributed',action:'preparing'});
 assert.equal(result.xpAwarded,0);
 assert.equal(h.awards.length,0);
});
test('Show accepts Vietnamese display item labels and awards fixed combo XP once',async()=>{
 const h=harness();
 await h.call('verified',{kind:'show_tables',id:'D2',action:'booking',data:{leader:'Guest',dining:'A1',guests:4,payment:'Tiền mặt'}});
 const combo={kind:'show_tables',id:'D2',action:'combo',data:{combo:'combo1',foods:{'Khô bò cay':1,'Đồ ăn đi kèm (01 set)':1},drinks:{'Nước ép dứa':1}}};
 assert.equal((await h.call('verified',combo)).xpAwarded,1390);
 assert.equal((await h.call('verified',combo)).xpAwarded,0);
});

test('Restaurant operation XP is 500 for prepare and 500 more for completing',async()=>{
 const h=harness();h.docs.set('res_orders/restaurant1',{status:'pending'});
 const first=await h.call('verified',{kind:'res_orders',id:'restaurant1',action:'preparing'});
 const second=await h.call('verified',{kind:'res_orders',id:'restaurant1',action:'completed'});
 assert.equal(first.xpAwarded,500);
 assert.equal(second.xpAwarded,500);
 assert.equal(h.awards.reduce((sum,a)=>sum+a.amount,0),1000);
 assert.equal((await h.call('verified',{kind:'res_orders',id:'restaurant1',action:'completed'})).xpAwarded,0);
});
test('Bungalow completed without preparing receives 1000 work XP; daily reward remains 400',async()=>{
 const h=harness();h.docs.set('bun_orders/bglTest',{status:'pending'});
 const done=await h.call('verified',{kind:'bun_orders',id:'bglTest',action:'completed'});
 assert.equal(done.xpAwarded,1000);
 assert.equal(done.missionXP,400);
 assert.equal((await h.call('verified',{kind:'bun_orders',id:'bglTest',action:'completed'})).xpAwarded,0);
});
test('Lounge completed directly receives 250 work XP plus unchanged daily mission XP',async()=>{
 const h=harness();h.docs.set('lounge_orders/lnTest',{status:'pending'});
 const done=await h.call('verified',{kind:'lounge_orders',id:'lnTest',action:'completed'});
 assert.equal(done.xpAwarded,250);
 assert.equal(done.missionXP,400);
});


test('opening an FOC Lounge table can grant first daily mission XP but not revenue XP',async()=>{
 const h=harness();
 const res=await h.call('verified',{kind:'lounge_tables',id:'FOC-L1',action:'booking',
  data:{customerName:'Guest',pax:5,paymentMethod:'FOC'}});
 assert.equal(res.saved,true);
 assert.equal(res.xpAwarded,0);
 assert.equal(res.missionXP,250);
 assert.equal(h.awards.filter(x=>x.source==='revenue').length,0);
});


test('verified DOL-0001 manager can update other staff Lounge PAX, preserving original seller and XP',async()=>{
 const h=harness();
 h.docs.set('lounge_tables/LOUNGE 3',{customerName:'Chị Uyên',pax:3,paymentMethod:'TM',openedByStaff:'Dat G',openedByStaffId:'DOL-0004'});
 const before=h.awards.length;
 const update=await h.call('verified',{kind:'lounge_tables',id:'LOUNGE 3',action:'update',data:{
  customerName:'Chị Uyên',pax:4,paymentMethod:'TM',openedByStaff:'forged manager',openedByStaffId:'DOL-0001'
 }});
 assert.equal(update.saved,true);assert.equal(update.xpAwarded,0);assert.equal(update.missionXP,0);
 const saved=h.docs.get('lounge_tables/LOUNGE 3');
 assert.equal(saved.pax,4);assert.equal(saved.openedByStaff,'Dat G');
 assert.equal(saved.openedByStaffId,'DOL-0004');assert.equal(saved.updatedBy,'Lan');
 assert.equal(saved.updatedByStaffId,'DOL-0001');assert.equal(h.awards.length,before);
});
test('same verified employee can edit renamed/legacy Lounge table using Staff ID or server nameAliases',async()=>{
 const h=harness(),req=(id)=>({kind:'lounge_tables',id,action:'update',
  data:{customerName:'Chị Uyên',pax:4,paymentMethod:'TM'}});
 h.docs.set('lounge_tables/with-id',{customerName:'Chị Uyên',pax:3,paymentMethod:'TM',openedByStaff:'Dat G',openedByStaffId:'DOL-0004'});
 h.docs.set('lounge_tables/legacy',{customerName:'Chị Uyên',pax:3,paymentMethod:'TM',openedByStaff:'Dat G'});
 const a=await h.call('owner',req('with-id')),b=await h.call('owner',req('legacy'));
 assert.equal(a.xpAwarded,0);assert.equal(b.xpAwarded,0);
 assert.equal(h.docs.get('lounge_tables/with-id').openedByStaff,'Dat G');
 assert.equal(h.docs.get('lounge_tables/with-id').openedByStaffId,'DOL-0004');
 assert.equal(h.docs.get('lounge_tables/legacy').openedByStaff,'Dat G');
 assert.equal(h.docs.get('lounge_tables/with-id').pax,4);
 assert.equal(h.awards.length,0);
});
test('ordinary employee and forged client opener cannot edit another Staff ID Lounge table',async()=>{
 const h=harness();h.docs.set('lounge_tables/LOUNGE 3',{
  customerName:'Chị Uyên',pax:3,paymentMethod:'TM',openedByStaff:'Dat G',openedByStaffId:'DOL-0004'
 });
 const input={kind:'lounge_tables',id:'LOUNGE 3',action:'update',data:{
  customerName:'Chị Uyên',pax:5,paymentMethod:'TM',openedByStaff:'Another Employee',openedByStaffId:'DOL-0005'
 }};
 await assert.rejects(()=>h.call('intruder',input),e=>e.code==='permission-denied');
 assert.equal(h.docs.get('lounge_tables/LOUNGE 3').pax,3);
 assert.equal(h.awards.length,0);
});
test('Lounge update of nonexistent table fails instead of booking/awarding new XP',async()=>{
 const h=harness();
 await assert.rejects(()=>h.call('verified',{kind:'lounge_tables',id:'deleted',action:'update',data:{
  customerName:'Guest',pax:2,paymentMethod:'TM'
 }}),e=>e.code==='failed-precondition');
 assert.equal(h.awards.length,0);
});

test('Lounge form edits occupied tables through no-XP server-side update while master PIN stays UI-only',()=>{
 const html=fs.readFileSync(__dirname+'/../dolphin-lounge.html','utf8');
 assert.match(html,/const editExisting=hasOpener&&sameTourDay/);
 assert.match(html,/timeZone:'Asia\/Ho_Chi_Minh'/);
 assert.match(html,/action:editExisting\?'update':'booking'/);
 assert.match(html,/if\(origPax>0 && pax!==origPax\)/);
 assert.match(html,/window\.promptManagerAuth\('save'/);
 assert.match(html,/performLiveAction/);
});
