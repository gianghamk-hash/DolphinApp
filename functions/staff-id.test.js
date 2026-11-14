'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const crypto=require('node:crypto');
const source=fs.readFileSync(__dirname+'/index.js','utf8');
function harness(admins='manager',{cold=false,removeOnRetry=false}={}){
 const state=new Map();
 const ref=p=>({child:k=>ref(p+'/'+k),once:async()=>({val:()=>{
  if(state.has(p))return state.get(p);
  const children=[...state].filter(([key])=>key.startsWith(p+'/')&&!key.slice(p.length+1).includes('/')).map(([key,value])=>[key.slice(p.length+1),value]);
  return children.length?Object.fromEntries(children):null;
 }}),set:async v=>{state.set(p,v);},transaction:async fn=>{
  const server=p==='staffRegistry'
   ?Object.fromEntries([...state].filter(([key])=>key.startsWith('staffRegistry/')&&!key.slice(14).includes('/')).map(([key,value])=>[key.slice(14),value]))
   :state.get(p)??null;
  const cached=cold&&(p.startsWith('staffEnrollmentCodes/')||p.startsWith('staffRegistry/')||p.startsWith('staffIdentity/'))?null:server;
  let v=fn(cached);
  if(v===undefined)return {committed:false};
  if(JSON.stringify(cached)!==JSON.stringify(server))v=fn(server);
  if(v===undefined)return {committed:false};
  if(removeOnRetry&&p.startsWith('staffEnrollmentCodes/')&&v){state.delete(p);v=fn(null);}
  if(v===undefined)return {committed:false};
  if(p==='staffRegistry'){
   for(const key of [...state.keys()])if(key.startsWith('staffRegistry/'))state.delete(key);
   for(const [id,profile] of Object.entries(v||{}))state.set('staffRegistry/'+id,profile);
  }else if(v===null)state.delete(p);else state.set(p,v);
  return {committed:true,snapshot:{val:()=>v}};
 }});
 class HttpsError extends Error{constructor(code,message){super(message);this.code=code;}}
 const context={exports:{},process:{env:{STAFF_ADMIN_UIDS:admins}},console,Date,Set,require:n=>{
  if(n==='node:crypto')return crypto;
  if(n==='firebase-admin/app')return {initializeApp(){}};
  if(n==='firebase-admin/database')return {getDatabase:()=>({ref})};
  if(n==='firebase-functions/v2/https')return {onCall:(_,fn)=>fn,HttpsError};
  if(n==='firebase-functions/v2/scheduler')return {onSchedule:(_,fn)=>fn};
  if(n==='./tactics/engine')return {};
  if(n==='./push')return {};
  if(n==='./guest-note-summary')return {}; // Independently tested.
  if(n==='./guest-sheet-bridge')return {}; // Tested independently.

  if(n==='./guest-table-sheet')return {guestAssignTable:async()=>{throw Error('Guest Sheets callable is tested in guest-table-sheet.test.cjs');}};
  if(n==='./staff-prestige')return {};
  if(n==='./staff-daily-missions')return {_award:async()=>({addedXP:0}),staffCheckInDaily:async()=>({})};
  if(n==='./staff-xp-reconcile')return {};
  if(n==='./staff-xp-live')return {};
  if(n==='./staff-xp-actions')return {};
  if(n==='./staff-xp-rank-sync')return {}; // Cloud triggers are independently tested.
  if(n==='./staff-manager-adjustments')return {}; // Independently tested.
  if(n==='./staff-xp-engine.cjs')return require('./staff-xp-engine.cjs'); // Independently tested staff progression callables. // Ignore independent push exports while unit-testing legacy Staff ID.
  if(n==='./staff-profile'){const sub={...context,exports:{}};vm.runInNewContext(fs.readFileSync(__dirname+'/staff-profile.js','utf8'),sub);return sub.exports;}
  if(n==='./staff-avatar-catalog.json')return require('./staff-avatar-catalog.json');
  if(n==='./staff-name-policy.cjs')return require('./staff-name-policy.cjs');
  throw Error(n);
 }};
 vm.runInNewContext(source,context);
 return {api:context.exports,state};
}
const req=(uid,data={})=>({...(uid?{auth:{uid}}:{}),data});
const rejects=(fn,code)=>assert.rejects(fn,e=>e.code===code);

test('Manager code claim rejects another Staff ID without consuming its code; Staff keeps normal linking',async()=>{
 const {api,state}=harness('manager',{cold:true});
 await api.staffCreateProfile(req('manager',{employeeId:'DOL-0002',name:'Nguyễn Nhân Viên'}));
 const issued=await api.staffIssueLinkCode(req('manager',{employeeId:'DOL-0002'}));
 await rejects(()=>api.staffClaimLinkCode(req('manager-device',{code:issued.code,managerSession:true})),'failed-precondition');
 assert.ok(!state.has('staffIdentity/manager-device'));
 assert.equal((await api.staffClaimLinkCode(req('staff-device',{code:issued.code}))).employeeId,'DOL-0002');
});
test('Manager code creates a verified UID binding; the session endpoint rechecks the protected mapping',async()=>{
 const {api}=harness('manager',{cold:true});
 await api.staffCreateProfile(req('manager',{employeeId:'DOL-0001',name:'Nguyễn Quản Lý'}));
 const issued=await api.staffIssueLinkCode(req('manager',{employeeId:'DOL-0001'}));
 await api.staffClaimLinkCode(req('owner-device',{code:issued.code,managerSession:true}));
 assert.equal((await api.staffGetManagerIdentity(req('owner-device'))).managerSession,true);
 await rejects(()=>api.staffClaimLinkCode(req('second-device',{code:issued.code,managerSession:true})),'failed-precondition');
});
test('all four Staff callable endpoints reject unauthenticated requests',async()=>{
 const {api,state}=harness();
 for(const name of ['staffCreateProfile','staffIssueLinkCode','staffClaimLinkCode','staffGetIdentity'])await rejects(()=>api[name](req(null)),'unauthenticated');
 assert.equal(state.size,0);
});
test('ordinary UID cannot create profiles or issue link codes',async()=>{
 const {api,state}=harness();
 for(const name of ['staffCreateProfile','staffIssueLinkCode'])await rejects(()=>api[name](req('ordinary',{employeeId:'DOL-0001',name:'Alice Nguyen'})),'permission-denied');
 assert.equal(state.size,0);
});
test('empty admin configuration denies even manager',async()=>{
 const {api}=harness('');
 await rejects(()=>api.staffCreateProfile(req('manager',{employeeId:'DOL-0001',name:'Alice Nguyen'})),'permission-denied');
});
test('profiles validate IDs and cannot overwrite an existing profile',async()=>{
 const {api,state}=harness();
 await rejects(()=>api.staffCreateProfile(req('manager',{employeeId:'../x',name:'Alice Nguyen'})),'invalid-argument');
 await api.staffCreateProfile(req('manager',{employeeId:'DOL-0001',name:'Alice Nguyen'}));
 await rejects(()=>api.staffCreateProfile(req('manager',{employeeId:'DOL-0001',name:'Mallory'})),'already-exists');
 assert.equal(state.get('staffRegistry/DOL-0001').name,'Alice Nguyen');
});
test('link code is hashed, lasts ten minutes, verifies only claimant and cannot be reused',async()=>{
 const {api,state}=harness();
 await api.staffCreateProfile(req('manager',{employeeId:'DOL-0001',name:'Alice Nguyen'}));
 const link=await api.staffIssueLinkCode(req('manager',{employeeId:'DOL-0001'}));
 assert.match(link.code,/^[A-F0-9]{36}$/);
 const hash=crypto.createHash('sha256').update(link.code).digest('hex');
 const stored=state.get('staffEnrollmentCodes/'+hash);
 assert.ok(stored.expiresAt-stored.issuedAt>=600000&&stored.expiresAt-stored.issuedAt<601000);
 assert.ok(!JSON.stringify(stored).includes(link.code));
 const result=await api.staffClaimLinkCode(req('device1',{code:link.code}));
 assert.equal(result.verified,true);
 assert.equal(state.get('staffIdentity/device1').employeeId,'DOL-0001');
 await rejects(()=>api.staffClaimLinkCode(req('device2',{code:link.code})),'failed-precondition');
 assert.ok(!state.has('staffIdentity/device2'));
 assert.equal((await api.staffGetIdentity(req('device1'))).name,'Alice Nguyen');
 assert.equal((await api.staffGetIdentity(req('device2'))).verified,false);
});
test('unknown, expired and malformed codes cannot create identity',async()=>{
 const {api,state}=harness();
 await rejects(()=>api.staffClaimLinkCode(req('bad-format',{code:'DOL-0001'})),'invalid-argument');
 await rejects(()=>api.staffClaimLinkCode(req('unknown',{code:'A'.repeat(36)})),'failed-precondition');
 const code='B'.repeat(36),hash=crypto.createHash('sha256').update(code).digest('hex');
 state.set('staffEnrollmentCodes/'+hash,{employeeId:'DOL-0001',expiresAt:Date.now()-1});
 await rejects(()=>api.staffClaimLinkCode(req('expired',{code})),'failed-precondition');
 assert.ok(!Array.from(state.keys()).some(k=>k.startsWith('staffIdentity/')));
});
test('inactive profiles cannot issue codes or verify an identity',async()=>{
 const {api,state}=harness();
 state.set('staffRegistry/DOL-0001',{employeeId:'DOL-0001',name:'Alice Nguyen',active:false});
 state.set('staffIdentity/device1',{employeeId:'DOL-0001',name:'Alice Nguyen',verified:true});
 await rejects(()=>api.staffIssueLinkCode(req('manager',{employeeId:'DOL-0001'})),'not-found');
 assert.equal((await api.staffGetIdentity(req('device1'))).verified,false);
});
test('cold instance retries initial null and accepts an existing unused token',async()=>{
 const {api,state}=harness('manager',{cold:true});
 await api.staffCreateProfile(req('manager',{employeeId:'DOL-0001',name:'Alice Nguyen'}));
 const link=await api.staffIssueLinkCode(req('manager',{employeeId:'DOL-0001'}));
 const result=await api.staffClaimLinkCode(req('cold-device',{code:link.code}));
 assert.equal(result.verified,true);
 assert.equal(state.get('staffIdentity/cold-device').employeeId,'DOL-0001');
 await rejects(()=>api.staffClaimLinkCode(req('other-device',{code:link.code})),'failed-precondition');
});
test('transaction retry cannot reuse token data removed by another writer',async()=>{
 const {api,state}=harness('manager',{removeOnRetry:true});
 await api.staffCreateProfile(req('manager',{employeeId:'DOL-0001',name:'Alice Nguyen'}));
 const link=await api.staffIssueLinkCode(req('manager',{employeeId:'DOL-0001'}));
 await rejects(()=>api.staffClaimLinkCode(req('device',{code:link.code})),'failed-precondition');
 assert.ok(!state.has('staffIdentity/device'));
});
test('two cold claimants cannot both consume the same code',async()=>{
 const {api,state}=harness('manager',{cold:true});
 await api.staffCreateProfile(req('manager',{employeeId:'DOL-0001',name:'Alice Nguyen'}));
 const link=await api.staffIssueLinkCode(req('manager',{employeeId:'DOL-0001'}));
 const results=await Promise.allSettled(['device-a','device-b'].map(uid=>api.staffClaimLinkCode(req(uid,{code:link.code}))));
 assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
 assert.equal(results.filter(r=>r.status==='rejected'&&r.reason.code==='failed-precondition').length,1);
 assert.equal([...state.keys()].filter(k=>k.startsWith('staffIdentity/')).length,1);
});

test('self-service endpoints require authentication and validate all editable fields',async()=>{
 const {api}=harness();
 for(const name of ['staffRegisterSelfProfile','staffUpdateMyProfile','staffIssueOwnLinkCode'])await rejects(()=>api[name](req(null)),'unauthenticated');
 for(const data of [{name:'A'},{name:'<script>'},{name:'Alice Nguyen',avatar:'<img>'}])
  await rejects(()=>api.staffRegisterSelfProfile(req('user',data)),'invalid-argument');
});

test('self-registration assigns a stable ID and cannot grant verified employee or Manager privileges',async()=>{
 const {api,state}=harness();
 const result=await api.staffRegisterSelfProfile(req('user',{name:' Alice  Nguyen ',avatar:'🐬',department:'Show',verified:true,role:'manager',employeeId:'DOL-0001'}));
 assert.match(result.employeeId,/^DOL-[A-F0-9]{10}$/);assert.equal(result.name,'Alice Nguyen');
 assert.equal(result.linked,true);assert.equal(result.verified,false);
 assert.equal(state.get('staffIdentity/user').verified,false);
 assert.equal(state.get('staffRegistry/'+result.employeeId).role,undefined);
 assert.equal((await api.staffGetIdentity(req('user'))).linked,true);
 await rejects(()=>api.staffCreateProfile(req('user',{name:'Mallory',employeeId:'DOL-0001'})),'permission-denied');
 state.delete('staffProfileRate/user');
 const repeated=await api.staffRegisterSelfProfile(req('user',{name:'Different',avatar:'🐯'}));
 assert.equal(repeated.employeeId,result.employeeId);assert.equal(repeated.name,'Alice Nguyen');
 assert.equal([...state.keys()].filter(k=>k.startsWith('staffRegistry/')).length,1);
});

test('profile updates only affect the current employee and reject inactive/unlinked sessions',async()=>{
 const {api,state}=harness();
 const original=await api.staffRegisterSelfProfile(req('owner',{name:'Alice Nguyen',avatar:'🐬'}));
 state.delete('staffProfileRate/owner');
 await rejects(()=>api.staffUpdateMyProfile(req('owner',{name:'New name',avatar:'🐯',employeeId:'DOL-OTHER',verified:true})),'permission-denied');
  state.delete('staffProfileRate/owner');
  const saved=await api.staffUpdateMyProfile(req('owner',{avatar:'🐯',employeeId:'DOL-OTHER',verified:true}));
 assert.equal(saved.employeeId,original.employeeId);assert.equal(saved.avatar,'🐯');assert.equal(saved.verified,false);
 assert.equal((await api.staffGetIdentity(req('owner'))).name,'Alice Nguyen');
 await rejects(()=>api.staffUpdateMyProfile(req('stranger',{name:'Hijack',avatar:'🐯',employeeId:original.employeeId})),'failed-precondition');
 state.get('staffRegistry/'+original.employeeId).active=false;state.delete('staffProfileRate/owner');
 await rejects(()=>api.staffUpdateMyProfile(req('owner',{name:'Retry'})),'permission-denied');
});

test('an employee can link a second device without a manager; both see the latest profile',async()=>{
 const {api,state}=harness('manager',{cold:true});
 const first=await api.staffRegisterSelfProfile(req('first',{name:'Alice Nguyen',avatar:'🐬'}));
 state.delete('staffProfileRate/first');
 state.set('staffRegistry/'+first.employeeId,{...state.get('staffRegistry/'+first.employeeId),approved:true});
 state.set('staffIdentity/first',{...state.get('staffIdentity/first'),verified:true});
 const code=await api.staffIssueOwnLinkCode(req('first'));
 assert.equal(code.expiresInMinutes,10);
 const linked=await api.staffClaimLinkCode(req('second',{code:code.code}));
 assert.equal(linked.employeeId,first.employeeId);assert.equal(linked.verified,true);
 assert.equal((await api.staffGetIdentity(req('second'))).avatar,'🐬');
 state.delete('staffProfileRate/first');
 await api.staffUpdateMyProfile(req('first',{name:'Alice Nguyen',avatar:'🐠'}));
 assert.equal((await api.staffGetIdentity(req('second'))).name,'Alice Nguyen');
 assert.equal((await api.staffGetIdentity(req('second'))).avatar,'🐠');
 await rejects(()=>api.staffClaimLinkCode(req('third',{code:code.code})),'failed-precondition');
});

test('profile edits retry an empty RTDB cache instead of falsely reporting an inactive employee',async()=>{
 const {api,state}=harness('manager',{cold:true});
 await api.staffRegisterSelfProfile(req('cold-editor',{name:'Original'}));state.delete('staffProfileRate/cold-editor');
 const result=await api.staffUpdateMyProfile(req('cold-editor',{name:'Original',avatar:'🐯'}));
 assert.equal(result.name,'Original');assert.equal(result.avatar,'🐯');
 assert.equal((await api.staffGetIdentity(req('cold-editor'))).name,'Original');
});

test('linked devices cannot switch identity and concurrent claims cannot overwrite a device identity',async()=>{
 const {api,state}=harness();
 const a=await api.staffRegisterSelfProfile(req('a',{name:'Alice Nguyen'}));
 const b=await api.staffRegisterSelfProfile(req('b',{name:'Bob Nguyen'}));
 state.delete('staffProfileRate/a');state.delete('staffProfileRate/b');
 for(const [who,p] of [['a',a],['b',b]]){
  state.set('staffRegistry/'+p.employeeId,{...state.get('staffRegistry/'+p.employeeId),approved:true});
  state.set('staffIdentity/'+who,{...state.get('staffIdentity/'+who),verified:true});
 }
 const ca=await api.staffIssueOwnLinkCode(req('a')),cb=await api.staffIssueOwnLinkCode(req('b'));
 await rejects(()=>api.staffClaimLinkCode(req('a',{code:cb.code})),'failed-precondition');
 const results=await Promise.allSettled([api.staffClaimLinkCode(req('new',{code:ca.code})),api.staffClaimLinkCode(req('new',{code:cb.code}))]);
 assert.equal(results.filter(x=>x.status==='fulfilled').length,1);
 assert.ok([a.employeeId,b.employeeId].includes(state.get('staffIdentity/new').employeeId));
});

test('switching a registered device requires explicit consent and the expected old ID; preserves both profiles',async()=>{
 const {api,state}=harness('manager',{cold:true});
 const a=await api.staffRegisterSelfProfile(req('a',{name:'Alice Nguyen',avatar:'🐯'}));
 const b=await api.staffRegisterSelfProfile(req('b',{name:'Bob Nguyen'}));state.delete('staffProfileRate/a');
 for(const [who,p] of [['a',a],['b',b]]){
  state.set('staffRegistry/'+p.employeeId,{...state.get('staffRegistry/'+p.employeeId),approved:true});
  state.set('staffIdentity/'+who,{...state.get('staffIdentity/'+who),verified:true});
 }
 const link=await api.staffIssueOwnLinkCode(req('a'));
 await rejects(()=>api.staffClaimLinkCode(req('b',{code:link.code,replaceCurrent:true,expectedEmployeeId:a.employeeId})),'failed-precondition');
 const switched=await api.staffClaimLinkCode(req('b',{code:link.code,replaceCurrent:true,expectedEmployeeId:b.employeeId}));
 assert.equal(switched.employeeId,a.employeeId);
 assert.equal((await api.staffGetIdentity(req('b'))).avatar,'🐯');
 assert.equal(state.get('staffRegistry/'+b.employeeId).active,true);
 assert.equal([...state.keys()].filter(k=>k.startsWith('staffRegistry/')).length,2);
});

test('avatar directory returns public display fields only, omits inactive staff and retains old-name aliases',async()=>{
 const {api,state}=harness('manager',{cold:true});
 await rejects(()=>api.staffGetAvatarDirectory(req(null)),'unauthenticated');
 const a=await api.staffRegisterSelfProfile(req('a',{name:'Old name',avatar:'🐬'}));state.delete('staffProfileRate/a');
 await api.staffUpdateMyProfile(req('a',{name:'Old name',avatar:'🐯'}));
 state.set('staffRegistry/DOL-0001',{employeeId:'DOL-0001',name:'Inactive',active:false});
 const pendingDirectory=await api.staffGetAvatarDirectory(req('reader'));assert.equal(pendingDirectory.profiles.length,0,'Pending profiles must stay private');
 state.set('staffRegistry/'+a.employeeId,{...state.get('staffRegistry/'+a.employeeId),approved:true});
 const directory=await api.staffGetAvatarDirectory(req('reader'));assert.equal(directory.profiles.length,1);
 assert.equal(directory.profiles[0].employeeId,a.employeeId);assert.equal(directory.profiles[0].avatar,'🐯');
 assert.equal(directory.profiles[0].name,'Old name');
 assert.equal(directory.profiles[0].nameAliases.length,0);
 assert.equal(directory.profiles[0].profileVersion,1);
 assert.deepEqual(Object.keys(directory.profiles[0]).sort(),['avatar','employeeId','name','nameAliases','personalTheme','profileVersion','selectedAura','selectedAvatarMotion','selectedBanner','selectedCardFx','selectedFrame','selectedNameFx','selectedTitle','selectedTrail']);
 assert.ok(!JSON.stringify(directory).includes('ownerUid'));
});


test('DOL-0001 approves registered staff and unlocks their linked device',async()=>{
 const {api,state}=harness();
 const employee=await api.staffRegisterSelfProfile(req('worker',{name:'New Crew',avatar:'🐯'}));
 assert.equal(employee.verified,false);assert.equal(employee.approved,false);
 await rejects(()=>api.staffListPendingApprovals(req('worker')),'permission-denied');
 await rejects(()=>api.staffApproveRegistration(req('worker',{employeeId:employee.employeeId})),'permission-denied');
 state.set('staffRegistry/DOL-0001',{employeeId:'DOL-0001',name:'Head Manager',active:true});
 state.set('staffIdentity/manager-device',{employeeId:'DOL-0001',name:'Head Manager',verified:true});
 const pending=await api.staffListPendingApprovals(req('manager-device'));
 assert.equal(pending.profiles.length,1);assert.equal(pending.profiles[0].name,'New Crew');
 assert.equal(pending.profiles[0].ownerUid,undefined);
 const approved=await api.staffApproveRegistration(req('manager-device',{employeeId:employee.employeeId}));
 assert.equal(approved.approved,true);
 assert.equal(state.get('staffRegistry/'+employee.employeeId).approved,true);
 assert.equal(state.get('staffIdentity/worker').verified,true);
 assert.equal((await api.staffGetIdentity(req('worker'))).verified,true);
 assert.equal((await api.staffListPendingApprovals(req('manager-device'))).profiles.length,0);
});
test('Manager ID DOL-0001 cannot be spoofed by registration or unverified identity',async()=>{
 const {api,state}=harness();
 await api.staffRegisterSelfProfile(req('attacker',{name:'Fake Manager',employeeId:'DOL-0001'}));
 await rejects(()=>api.staffListPendingApprovals(req('attacker')),'permission-denied');
 state.set('staffIdentity/attacker',{employeeId:'DOL-0001',verified:false,name:'Fake Manager'});
 state.set('staffRegistry/DOL-0001',{employeeId:'DOL-0001',name:'Head Manager',active:true});
 await rejects(()=>api.staffListPendingApprovals(req('attacker')),'permission-denied');
});


test('manager can reject a pending employee, revoke every linked device, then issue a fresh Staff ID',async()=>{
 const {api,state}=harness('manager',{cold:true});
 const first=await api.staffRegisterSelfProfile(req('worker',{name:'Initial Name',avatar:'🐬'}));
 state.delete('staffProfileRate/worker');
 // Simulate a legacy second device linked before pending accounts were locked.
 state.set('staffIdentity/second-device',{employeeId:first.employeeId,name:first.name,verified:false});
 state.set('staffRegistry/DOL-0001',{employeeId:'DOL-0001',name:'Owner Manager',active:true,registrationSource:'manager'});
 state.set('staffIdentity/manager-device',{employeeId:'DOL-0001',name:'Owner Manager',verified:true});
 assert.equal((await api.staffListPendingApprovals(req('manager-device'))).profiles.length,1);
 const result=await api.staffRejectRegistration(req('manager-device',{employeeId:first.employeeId}));
 assert.equal(result.rejected,true);assert.equal(result.canRegisterAgain,true);
 const prior=state.get('staffRegistry/'+first.employeeId);
 assert.equal(prior.active,false);assert.equal(prior.rejected,true);
 assert.equal(prior.rejectedBy,'DOL-0001');
 assert.equal((await api.staffListPendingApprovals(req('manager-device'))).profiles.length,0);
 for(const linked of ['worker','second-device']){
  const identity=await api.staffGetIdentity(req(linked));
  assert.equal(identity.verified,false);assert.equal(identity.rejected,true);
 }
 state.delete('staffProfileRate/worker');
 await rejects(()=>api.staffUpdateMyProfile(req('worker',{avatar:'🐠'})),'permission-denied');
 state.delete('staffProfileRate/worker');
 await rejects(()=>api.staffIssueOwnLinkCode(req('worker')),'permission-denied');
 state.delete('staffProfileRate/worker');
 const next=await api.staffRegisterSelfProfile(req('worker',{name:'Corrected Name',avatar:'🐯'}));
 assert.notEqual(next.employeeId,first.employeeId);
 assert.match(next.employeeId,/^DOL-[A-F0-9]{10}$/);
 assert.equal(next.verified,false);
 assert.equal((await api.staffGetIdentity(req('worker'))).employeeId,next.employeeId);
 assert.equal(state.get('staffRegistry/'+first.employeeId).active,false);
 assert.equal(state.get('staffRegistry/'+next.employeeId).name,'Corrected Name');
 state.delete('staffProfileRate/worker');
 const repeated=await api.staffRegisterSelfProfile(req('worker',{name:'Another Name',avatar:'🐬'}));
 assert.equal(repeated.employeeId,next.employeeId);
 assert.equal(repeated.name,'Corrected Name');
 assert.equal((await api.staffListPendingApprovals(req('manager-device'))).profiles.length,1);
});
test('a rejected linked device cannot enter and must register a new independent application',async()=>{
 const {api,state}=harness();
 const user=await api.staffRegisterSelfProfile(req('first',{name:'Crew One'}));
 state.delete('staffProfileRate/first');
 // Existing pending device link from an older app version.
 state.set('staffIdentity/second',{employeeId:user.employeeId,name:user.name,verified:false});
 state.set('staffRegistry/DOL-0001',{employeeId:'DOL-0001',name:'Owner Manager',active:true});
 state.set('staffIdentity/owner',{employeeId:'DOL-0001',verified:true});
 await api.staffRejectRegistration(req('owner',{employeeId:user.employeeId}));
 const second=await api.staffRegisterSelfProfile(req('second',{name:'Crew Two'}));
 assert.notEqual(second.employeeId,user.employeeId);
 assert.equal((await api.staffGetIdentity(req('second'))).verified,false);
 assert.equal((await api.staffGetIdentity(req('first'))).rejected,true);
});
test('rejection rejects unauthorized callers, forged ID and already approved applicants',async()=>{
 const {api,state}=harness();
 const crew=await api.staffRegisterSelfProfile(req('crew',{name:'Valid Crew'}));
 await rejects(()=>api.staffRejectRegistration(req(null,{employeeId:crew.employeeId})),'unauthenticated');
 await rejects(()=>api.staffRejectRegistration(req('crew',{employeeId:crew.employeeId})),'permission-denied');
 state.set('staffRegistry/DOL-0001',{employeeId:'DOL-0001',name:'Owner Manager',active:true,registrationSource:'manager'});
 state.set('staffIdentity/owner',{employeeId:'DOL-0001',verified:true});
 await rejects(()=>api.staffRejectRegistration(req('owner',{employeeId:'DOL-0001'})),'invalid-argument');
 await rejects(()=>api.staffRejectRegistration(req('owner',{employeeId:'../../escape'})),'invalid-argument');
 await api.staffApproveRegistration(req('owner',{employeeId:crew.employeeId}));
 await rejects(()=>api.staffRejectRegistration(req('owner',{employeeId:crew.employeeId})),'failed-precondition');
 assert.equal((await api.staffGetIdentity(req('crew'))).verified,true);
});
test('rejected applications cannot be reactivated by approve or old link codes',async()=>{
 const {api,state}=harness();
 const crew=await api.staffRegisterSelfProfile(req('crew',{name:'Crew Member'}));
 state.delete('staffProfileRate/crew');
 const code='C'.repeat(36),tokenHash=crypto.createHash('sha256').update(code).digest('hex');
 state.set('staffEnrollmentCodes/'+tokenHash,{employeeId:crew.employeeId,expiresAt:Date.now()+600000});
 state.set('staffRegistry/DOL-0001',{employeeId:'DOL-0001',name:'Owner Manager',active:true});
 state.set('staffIdentity/owner',{employeeId:'DOL-0001',verified:true});
 await api.staffRejectRegistration(req('owner',{employeeId:crew.employeeId}));
 await rejects(()=>api.staffClaimLinkCode(req('crew',{code,replaceCurrent:true,expectedEmployeeId:crew.employeeId})),'permission-denied');
 await rejects(()=>api.staffApproveRegistration(req('owner',{employeeId:crew.employeeId})),'failed-precondition');
 await rejects(()=>api.staffClaimLinkCode(req('new-phone',{code})),'failed-precondition');
 await rejects(()=>api.staffRejectRegistration(req('owner',{employeeId:crew.employeeId})),'failed-precondition');
});

test('duplicate registration is rejected without issuing a second Staff ID',async()=>{
 const {api,state}=harness();
 const a=await api.staffRegisterSelfProfile(req('first',{name:'Nguyen Van Nam'}));
 await rejects(()=>api.staffRegisterSelfProfile(req('second',{name:' NGUYEN   VAN NAM '})),'already-exists');
 assert.equal(state.get('staffIdentity/second'),undefined);
 assert.equal([...state.keys()].filter(k=>k.startsWith('staffRegistry/')).length,1);
 assert.equal((await api.staffGetIdentity(req('first'))).employeeId,a.employeeId);
});
test('legacy short-name repair keeps XP, level, Staff ID and historical aliases',async()=>{
 const {api,state}=harness();
 state.set('staffRegistry/DOL-0008',{employeeId:'DOL-0008',name:'Minh',active:true,approved:true,registrationSource:'manager',xp:123450,levelPeak:15,workPoints:28,revenue:5000000});
 state.set('staffIdentity/legacy',{employeeId:'DOL-0008',name:'Minh',verified:true});
 const before=await api.staffGetIdentity(req('legacy'));
 assert.equal(before.verified,false);
 assert.equal(before.requiresNameChange,true);
 const fixed=await api.staffRepairMyName(req('legacy',{name:'Nguyen Van Minh'}));
 assert.equal(fixed.employeeId,'DOL-0008');
 const after=state.get('staffRegistry/DOL-0008');
 assert.equal(after.xp,123450);
 assert.equal(after.levelPeak,15);
 assert.equal(after.workPoints,28);
 assert.equal(after.revenue,5000000);
 assert.ok(after.nameAliases.includes('Minh'));
 assert.equal((await api.staffGetIdentity(req('legacy'))).verified,true);
});
