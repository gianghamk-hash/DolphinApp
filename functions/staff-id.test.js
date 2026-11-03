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
  const cached=cold&&(p.startsWith('staffEnrollmentCodes/')||p.startsWith('staffRegistry/')||p.startsWith('staffIdentity/'))?null:state.get(p)??null;
  let v=fn(cached);
  if(v===undefined)return {committed:false};
  if(JSON.stringify(cached)!==JSON.stringify(state.get(p)??null))v=fn(state.get(p)??null);
  if(v===undefined)return {committed:false};
  if(removeOnRetry&&p.startsWith('staffEnrollmentCodes/')&&v){state.delete(p);v=fn(null);}
  if(v===undefined)return {committed:false};
  if(v===null)state.delete(p);else state.set(p,v);
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
  if(n==='./staff-prestige')return {};
  if(n==='./staff-daily-missions')return {_award:async()=>({addedXP:0}),staffCheckInDaily:async()=>({})};
  if(n==='./staff-xp-reconcile')return {};
  if(n==='./staff-xp-live')return {};
  if(n==='./staff-xp-actions')return {};
  if(n==='./staff-xp-rank-sync')return {}; // Cloud triggers are independently tested.
  if(n==='./staff-xp-engine.cjs')return require('./staff-xp-engine.cjs'); // Independently tested staff progression callables. // Ignore independent push exports while unit-testing legacy Staff ID.
  if(n==='./staff-profile'){const sub={...context,exports:{}};vm.runInNewContext(fs.readFileSync(__dirname+'/staff-profile.js','utf8'),sub);return sub.exports;}
  if(n==='./staff-name-policy.cjs'){
   const sub={module:{exports:{}},exports:{},require:context.require,console,Date,Set,Object,Array};
   sub.exports=sub.module.exports;
   vm.runInNewContext(fs.readFileSync(__dirname+'/staff-name-policy.cjs','utf8'),sub);
   return sub.module.exports;
  }
  if(n==='./staff-avatar-catalog.json')return require('./staff-avatar-catalog.json');
  throw Error(n);
 }};
 vm.runInNewContext(source,context);
 return {api:context.exports,state};
}
const req=(uid,data={})=>({...(uid?{auth:{uid}}:{}),data});
const rejects=(fn,code)=>assert.rejects(fn,e=>e.code===code);
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
 for(const [i,data] of [{name:'A'},{name:'<script>'},{name:'Alice Nguyen',avatar:'<img>'}].entries())
  await rejects(()=>api.staffRegisterSelfProfile(req('user-'+i,data)),'invalid-argument');
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
 state.get('staffRegistry/'+first.employeeId).approved=true;
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
 const b=await api.staffRegisterSelfProfile(req('b',{name:'Bob Wilson'}));
 state.delete('staffProfileRate/a');state.delete('staffProfileRate/b');
 state.get('staffRegistry/'+a.employeeId).approved=true;
 state.get('staffRegistry/'+b.employeeId).approved=true;
 const ca=await api.staffIssueOwnLinkCode(req('a')),cb=await api.staffIssueOwnLinkCode(req('b'));
 await rejects(()=>api.staffClaimLinkCode(req('a',{code:cb.code})),'failed-precondition');
 const results=await Promise.allSettled([api.staffClaimLinkCode(req('new',{code:ca.code})),api.staffClaimLinkCode(req('new',{code:cb.code}))]);
 assert.equal(results.filter(x=>x.status==='fulfilled').length,1);
 assert.ok([a.employeeId,b.employeeId].includes(state.get('staffIdentity/new').employeeId));
});

test('switching a registered device requires explicit consent and the expected old ID; preserves both profiles',async()=>{
 const {api,state}=harness('manager',{cold:true});
 const a=await api.staffRegisterSelfProfile(req('a',{name:'Alice Nguyen',avatar:'🐯'}));
 const b=await api.staffRegisterSelfProfile(req('b',{name:'Bob Wilson'}));state.delete('staffProfileRate/a');
 state.get('staffRegistry/'+a.employeeId).approved=true;
 state.get('staffRegistry/'+b.employeeId).approved=true;
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
 await rejects(()=>api.staffIssueOwnLinkCode(req('worker')),'permission-denied');
 state.set('staffRegistry/DOL-0001',{employeeId:'DOL-0001',name:'Owner Manager',active:true,registrationSource:'manager'});
 state.set('staffIdentity/manager-device',{employeeId:'DOL-0001',name:'Owner Manager',verified:true});
 assert.equal((await api.staffListPendingApprovals(req('manager-device'))).profiles.length,1);
 const result=await api.staffRejectRegistration(req('manager-device',{employeeId:first.employeeId}));
 assert.equal(result.rejected,true);assert.equal(result.canRegisterAgain,true);
 const prior=state.get('staffRegistry/'+first.employeeId);
 assert.equal(prior.active,false);assert.equal(prior.rejected,true);
 assert.equal(prior.rejectedBy,'DOL-0001');
 assert.equal((await api.staffListPendingApprovals(req('manager-device'))).profiles.length,0);
 for(const linked of ['worker']){
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
test('pending employees cannot issue, claim or switch device before approval',async()=>{
 const {api,state}=harness();
 const crew=await api.staffRegisterSelfProfile(req('first',{name:'Crew One'}));
 state.delete('staffProfileRate/first');
 await rejects(()=>api.staffIssueOwnLinkCode(req('first')),'permission-denied');
 state.set('staffEnrollmentCodes/'+crypto.createHash('sha256').update('D'.repeat(36)).digest('hex'),{
  employeeId:crew.employeeId,expiresAt:Date.now()+600000
 });
 await rejects(()=>api.staffClaimLinkCode(req('other',{code:'D'.repeat(36)})),'failed-precondition');
 await rejects(()=>api.staffClaimLinkCode(req('first',{code:'D'.repeat(36),replaceCurrent:true,expectedEmployeeId:crew.employeeId})),'permission-denied');
 assert.equal(state.get('staffIdentity/first').employeeId,crew.employeeId);
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
test('rejected application cannot reactivate by manager approval or forged old link',async()=>{
 const {api,state}=harness();
 const crew=await api.staffRegisterSelfProfile(req('crew',{name:'Crew Member'}));
 state.set('staffRegistry/DOL-0001',{employeeId:'DOL-0001',name:'Owner Manager',active:true});
 state.set('staffIdentity/owner',{employeeId:'DOL-0001',verified:true});
 await api.staffRejectRegistration(req('owner',{employeeId:crew.employeeId}));
 await rejects(()=>api.staffApproveRegistration(req('owner',{employeeId:crew.employeeId})),'failed-precondition');
 assert.equal((await api.staffGetIdentity(req('crew'))).rejected,true);
});


test('registration rejects short names, accent/case/whitespace duplicates and pending re-registration',async()=>{
 const {api,state}=harness();
 await rejects(()=>api.staffRegisterSelfProfile(req('short',{name:'An Le'})),'invalid-argument');
 const first=await api.staffRegisterSelfProfile(req('first',{name:'Nguyễn Văn An'}));
 assert.equal(first.verified,false);
 await rejects(()=>api.staffRegisterSelfProfile(req('second',{name:'  NGUYEN   VAN AN  '})),'already-exists');
 state.delete('staffProfileRate/first');
 const copy=await api.staffRegisterSelfProfile(req('first',{name:'Different Employee'}));
 assert.equal(copy.employeeId,first.employeeId);
 assert.equal([...state.keys()].filter(k=>k.startsWith('staffRegistry/')).length,1);
 await rejects(()=>api.staffRequestNameRecovery(req('first',{name:'Nguyễn Văn An'})),'permission-denied');
 await rejects(()=>api.staffIssueOwnLinkCode(req('first')),'permission-denied');
});
test('manager-issued profiles cannot reuse existing pending names',async()=>{
 const {api}=harness();
 await api.staffRegisterSelfProfile(req('worker',{name:'Trần Hoàng Anh'}));
 await rejects(()=>api.staffCreateProfile(req('manager',{employeeId:'DOL-0004',name:'tran hoang anh'})),'already-exists');
 await rejects(()=>api.staffCreateProfile(req('manager',{employeeId:'DOL-0004',name:'Hai'})),'invalid-argument');
});
test('legacy short-name account must rename and keeps ID, XP, work, level and history',async()=>{
 const {api,state}=harness();
 const id='DOL-0008',prior={employeeId:id,name:'Lan',active:true,registrationSource:'manager',
  xp:213745,levelPeak:14,history:{orderA:{amount:250}},revenueXP:6800,workScore:95,avatar:'🐬'};
 state.set('staffRegistry/'+id,prior);
 state.set('staffIdentity/old-phone',{employeeId:id,name:'Lan',verified:true});
 state.set('staffIdentity/new-phone',{employeeId:id,name:'Lan',verified:true});
 const invalid=await api.staffGetIdentity(req('old-phone'));
 assert.equal(invalid.verified,true);assert.equal(invalid.requiresNameChange,true);
 assert.match(invalid.nameIssue,/6 ký tự/);
 const changed=await api.staffCorrectMyName(req('old-phone',{name:'Nguyễn Thị Lan'}));
 assert.equal(changed.employeeId,id);assert.equal(changed.requiresNameChange,false);
 const after=state.get('staffRegistry/'+id);
 assert.equal(after.name,'Nguyễn Thị Lan');assert.deepEqual(Array.from(after.nameAliases),['Lan']);
 for(const key of ['xp','levelPeak','revenueXP','workScore'])assert.equal(after[key],prior[key]);
 assert.deepEqual(after.history,prior.history);
 assert.equal(state.get('staffIdentity/new-phone').name,'Nguyễn Thị Lan');
 assert.equal((await api.staffGetIdentity(req('new-phone'))).requiresNameChange,false);
 state.delete('staffProfileRate/old-phone');
 await rejects(()=>api.staffCorrectMyName(req('old-phone',{name:'Another Valid Name'})),'failed-precondition');
});
test('historical duplicate approved IDs must independently correct names before entrance',async()=>{
 const {api,state}=harness();
 for(const id of ['DOL-0002','DOL-0003']){
  state.set('staffRegistry/'+id,{employeeId:id,name:'Trần Thanh Bình',active:true,xp:id==='DOL-0002'?72000:43000,registrationSource:'manager'});
  state.set('staffIdentity/phone-'+id,{employeeId:id,name:'Trần Thanh Bình',verified:true});
 }
 assert.equal((await api.staffGetIdentity(req('phone-DOL-0002'))).requiresNameChange,true);
 assert.equal((await api.staffGetIdentity(req('phone-DOL-0003'))).requiresNameChange,true);
 await api.staffCorrectMyName(req('phone-DOL-0002',{name:'Bình Trần Hải'}));
 assert.equal(state.get('staffRegistry/DOL-0002').xp,72000);
 assert.equal((await api.staffGetIdentity(req('phone-DOL-0002'))).requiresNameChange,false);
 // Old name remains a preserved alias, so it cannot be newly registered.
 await rejects(()=>api.staffRegisterSelfProfile(req('new',{name:'Trần Thanh Bình'})),'already-exists');
 assert.equal((await api.staffGetIdentity(req('phone-DOL-0003'))).requiresNameChange,true);
 await api.staffCorrectMyName(req('phone-DOL-0003',{name:'Bình Nguyễn Hải'}));
 assert.equal(state.get('staffRegistry/DOL-0003').xp,43000);
 assert.equal((await api.staffGetIdentity(req('phone-DOL-0003'))).requiresNameChange,false);
});
test('pending legacy name can be corrected but not approved until compliant',async()=>{
 const {api,state}=harness();
 const id='DOL-1111111111';
 state.set('staffRegistry/'+id,{employeeId:id,name:'Test 1',ownerUid:'pending',active:true,registrationSource:'self',approved:false,xp:900});
 state.set('staffIdentity/pending',{employeeId:id,name:'Test 1',verified:false});
 state.set('staffRegistry/DOL-0001',{employeeId:'DOL-0001',name:'Manager Dolphin',active:true,registrationSource:'manager'});
 state.set('staffIdentity/manager-device',{employeeId:'DOL-0001',name:'Manager Dolphin',verified:true});
 await rejects(()=>api.staffApproveRegistration(req('manager-device',{employeeId:id})),'failed-precondition');
 assert.equal((await api.staffGetIdentity(req('pending'))).requiresNameChange,true);
 const renamed=await api.staffCorrectMyName(req('pending',{name:'Phạm Văn Phúc'}));
 assert.equal(renamed.verified,false);
 assert.equal(state.get('staffRegistry/'+id).xp,900);
 const confirmed=await api.staffApproveRegistration(req('manager-device',{employeeId:id}));
 assert.equal(confirmed.approved,true);
 const after=await api.staffGetIdentity(req('pending'));
 assert.equal(after.verified,true);assert.equal(after.requiresNameChange,false);
});
