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
  if(n==='./push')return {}; // Ignore independent push exports while unit-testing legacy Staff ID.
  if(n==='./staff-profile'){const sub={...context,exports:{}};vm.runInNewContext(fs.readFileSync(__dirname+'/staff-profile.js','utf8'),sub);return sub.exports;}
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
 for(const name of ['staffCreateProfile','staffIssueLinkCode'])await rejects(()=>api[name](req('ordinary',{employeeId:'DOL-0001',name:'Alice'})),'permission-denied');
 assert.equal(state.size,0);
});
test('empty admin configuration denies even manager',async()=>{
 const {api}=harness('');
 await rejects(()=>api.staffCreateProfile(req('manager',{employeeId:'DOL-0001',name:'Alice'})),'permission-denied');
});
test('profiles validate IDs and cannot overwrite an existing profile',async()=>{
 const {api,state}=harness();
 await rejects(()=>api.staffCreateProfile(req('manager',{employeeId:'../x',name:'Alice'})),'invalid-argument');
 await api.staffCreateProfile(req('manager',{employeeId:'DOL-0001',name:'Alice'}));
 await rejects(()=>api.staffCreateProfile(req('manager',{employeeId:'DOL-0001',name:'Mallory'})),'already-exists');
 assert.equal(state.get('staffRegistry/DOL-0001').name,'Alice');
});
test('link code is hashed, lasts ten minutes, verifies only claimant and cannot be reused',async()=>{
 const {api,state}=harness();
 await api.staffCreateProfile(req('manager',{employeeId:'DOL-0001',name:'Alice'}));
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
 assert.equal((await api.staffGetIdentity(req('device1'))).name,'Alice');
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
 state.set('staffRegistry/DOL-0001',{employeeId:'DOL-0001',name:'Alice',active:false});
 state.set('staffIdentity/device1',{employeeId:'DOL-0001',name:'Alice',verified:true});
 await rejects(()=>api.staffIssueLinkCode(req('manager',{employeeId:'DOL-0001'})),'not-found');
 assert.equal((await api.staffGetIdentity(req('device1'))).verified,false);
});
test('cold instance retries initial null and accepts an existing unused token',async()=>{
 const {api,state}=harness('manager',{cold:true});
 await api.staffCreateProfile(req('manager',{employeeId:'DOL-0001',name:'Alice'}));
 const link=await api.staffIssueLinkCode(req('manager',{employeeId:'DOL-0001'}));
 const result=await api.staffClaimLinkCode(req('cold-device',{code:link.code}));
 assert.equal(result.verified,true);
 assert.equal(state.get('staffIdentity/cold-device').employeeId,'DOL-0001');
 await rejects(()=>api.staffClaimLinkCode(req('other-device',{code:link.code})),'failed-precondition');
});
test('transaction retry cannot reuse token data removed by another writer',async()=>{
 const {api,state}=harness('manager',{removeOnRetry:true});
 await api.staffCreateProfile(req('manager',{employeeId:'DOL-0001',name:'Alice'}));
 const link=await api.staffIssueLinkCode(req('manager',{employeeId:'DOL-0001'}));
 await rejects(()=>api.staffClaimLinkCode(req('device',{code:link.code})),'failed-precondition');
 assert.ok(!state.has('staffIdentity/device'));
});
test('two cold claimants cannot both consume the same code',async()=>{
 const {api,state}=harness('manager',{cold:true});
 await api.staffCreateProfile(req('manager',{employeeId:'DOL-0001',name:'Alice'}));
 const link=await api.staffIssueLinkCode(req('manager',{employeeId:'DOL-0001'}));
 const results=await Promise.allSettled(['device-a','device-b'].map(uid=>api.staffClaimLinkCode(req(uid,{code:link.code}))));
 assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
 assert.equal(results.filter(r=>r.status==='rejected'&&r.reason.code==='failed-precondition').length,1);
 assert.equal([...state.keys()].filter(k=>k.startsWith('staffIdentity/')).length,1);
});

test('self-service endpoints require authentication and validate all editable fields',async()=>{
 const {api}=harness();
 for(const name of ['staffRegisterSelfProfile','staffUpdateMyProfile','staffIssueOwnLinkCode'])await rejects(()=>api[name](req(null)),'unauthenticated');
 for(const data of [{name:'A'},{name:'<script>'},{name:'Alice',avatar:'<img>'},{name:'Alice',department:'Manager'}])
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
 const original=await api.staffRegisterSelfProfile(req('owner',{name:'Alice',avatar:'🐬'}));
 state.delete('staffProfileRate/owner');
 const saved=await api.staffUpdateMyProfile(req('owner',{name:'New name',avatar:'🐯',department:'Lounge',employeeId:'DOL-OTHER',verified:true}));
 assert.equal(saved.employeeId,original.employeeId);assert.equal(saved.avatar,'🐯');assert.equal(saved.verified,false);
 assert.equal((await api.staffGetIdentity(req('owner'))).name,'New name');
 await rejects(()=>api.staffUpdateMyProfile(req('stranger',{name:'Hijack',avatar:'🐯',employeeId:original.employeeId})),'failed-precondition');
 state.get('staffRegistry/'+original.employeeId).active=false;state.delete('staffProfileRate/owner');
 await rejects(()=>api.staffUpdateMyProfile(req('owner',{name:'Retry'})),'permission-denied');
});

test('an employee can link a second device without a manager; both see the latest profile',async()=>{
 const {api,state}=harness('manager',{cold:true});
 const first=await api.staffRegisterSelfProfile(req('first',{name:'Alice',avatar:'🐬'}));
 state.delete('staffProfileRate/first');
 const code=await api.staffIssueOwnLinkCode(req('first'));
 assert.equal(code.expiresInMinutes,10);
 const linked=await api.staffClaimLinkCode(req('second',{code:code.code}));
 assert.equal(linked.employeeId,first.employeeId);assert.equal(linked.verified,false);
 assert.equal((await api.staffGetIdentity(req('second'))).avatar,'🐬');
 state.delete('staffProfileRate/first');
 await api.staffUpdateMyProfile(req('first',{name:'Updated',avatar:'🐠',department:'Show'}));
 assert.equal((await api.staffGetIdentity(req('second'))).name,'Updated');
 assert.equal((await api.staffGetIdentity(req('second'))).avatar,'🐠');
 await rejects(()=>api.staffClaimLinkCode(req('third',{code:code.code})),'failed-precondition');
});

test('profile edits retry an empty RTDB cache instead of falsely reporting an inactive employee',async()=>{
 const {api,state}=harness('manager',{cold:true});
 await api.staffRegisterSelfProfile(req('cold-editor',{name:'Original'}));state.delete('staffProfileRate/cold-editor');
 const result=await api.staffUpdateMyProfile(req('cold-editor',{name:'Updated',avatar:'🐯',department:'Show'}));
 assert.equal(result.name,'Updated');assert.equal(result.avatar,'🐯');
 assert.equal((await api.staffGetIdentity(req('cold-editor'))).name,'Updated');
});

test('linked devices cannot switch identity and concurrent claims cannot overwrite a device identity',async()=>{
 const {api,state}=harness();
 const a=await api.staffRegisterSelfProfile(req('a',{name:'Alice'}));
 const b=await api.staffRegisterSelfProfile(req('b',{name:'Bob'}));
 state.delete('staffProfileRate/a');state.delete('staffProfileRate/b');
 const ca=await api.staffIssueOwnLinkCode(req('a')),cb=await api.staffIssueOwnLinkCode(req('b'));
 await rejects(()=>api.staffClaimLinkCode(req('a',{code:cb.code})),'failed-precondition');
 const results=await Promise.allSettled([api.staffClaimLinkCode(req('new',{code:ca.code})),api.staffClaimLinkCode(req('new',{code:cb.code}))]);
 assert.equal(results.filter(x=>x.status==='fulfilled').length,1);
 assert.ok([a.employeeId,b.employeeId].includes(state.get('staffIdentity/new').employeeId));
});

test('switching a registered device requires explicit consent and the expected old ID; preserves both profiles',async()=>{
 const {api,state}=harness('manager',{cold:true});
 const a=await api.staffRegisterSelfProfile(req('a',{name:'Alice',avatar:'🐯'}));
 const b=await api.staffRegisterSelfProfile(req('b',{name:'Bob'}));state.delete('staffProfileRate/a');
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
 await api.staffUpdateMyProfile(req('a',{name:'New name',avatar:'🐯'}));
 state.set('staffRegistry/DOL-0001',{employeeId:'DOL-0001',name:'Inactive',active:false});
 const directory=await api.staffGetAvatarDirectory(req('reader'));assert.equal(directory.profiles.length,1);
 assert.equal(directory.profiles[0].employeeId,a.employeeId);assert.equal(directory.profiles[0].avatar,'🐯');
 assert.equal(directory.profiles[0].nameAliases[0],'Old name');
 assert.equal(directory.profiles[0].profileVersion,2);
 assert.deepEqual(Object.keys(directory.profiles[0]).sort(),['avatar','employeeId','name','nameAliases','profileVersion']);
 assert.ok(!JSON.stringify(directory).includes('ownerUid'));
});

