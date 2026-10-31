'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const crypto=require('node:crypto');
const source=fs.readFileSync(__dirname+'/index.js','utf8');
function harness(admins='manager',{cold=false,removeOnRetry=false}={}){
 const state=new Map();
 const ref=p=>({child:k=>ref(p+'/'+k),once:async()=>({val:()=>state.get(p)??null}),set:async v=>{state.set(p,v);},transaction:async fn=>{
  const cached=cold&&p.startsWith('staffEnrollmentCodes/')?null:state.get(p)??null;
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

