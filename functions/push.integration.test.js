'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');

function fixture({transientFailures=0}={}){
  const maps=new Map(),sent=[];
  let failCalls=transientFailures;
  const map=name=>{if(!maps.has(name))maps.set(name,new Map());return maps.get(name);};
  function ref(name,id){
    const m=map(name);
    return {
      id,
      async get(){return{exists:m.has(id),data:()=>m.get(id)};},
      async create(data){if(m.has(id)){const e=Error('Exists');e.code=6;throw e;}m.set(id,data);},
      async set(data,opts){m.set(id,opts?.merge?{...m.get(id),...data}:data);},
      async update(data){m.set(id,{...m.get(id),...data});},
      async delete(){m.delete(id);}
    };
  }
  function query(name,checks=[],last=null,max=Infinity){
    return{
      where(field,op,value){return query(name,[...checks,[field,op,value]],last,max);},
      orderBy(){return query(name,checks,last,max);},
      count(){return {get:async()=>{const snap=await query(name,checks,last,max).get();return{data:()=>({count:snap.size})};}};},
      limit(n){return query(name,checks,last,n);},
      startAfter(snapshot){return query(name,checks,snapshot.id,max);},
      async get(){
        const m=map(name);
        const ids=[...m.keys()].sort().filter(id=>(!last||id>last)&&checks.every(([f,op,val])=>op==='=='&&m.get(id)?.[f]===val));
        const docs=ids.slice(0,max).map(id=>({id,ref:ref(name,id),data:()=>m.get(id)}));
        return{docs,size:docs.length,empty:docs.length===0};
      }
    };
  }
  const firestore={
    collection(name){return{doc(id){return ref(name,id);},where(field,op,val){return query(name).where(field,op,val);},orderBy(...args){return query(name).orderBy(...args);}};},
    batch(){const tasks=[];return{
      create(doc,data){tasks.push(()=>doc.create(data));},
      update(doc,data){tasks.push(()=>doc.update(data));},
      async commit(){for(const job of tasks)await job();}
    };},
    async runTransaction(callback){
      const tasks=[];
      const tx={
        get:doc=>doc.get(),
        update(doc,data){tasks.push(()=>doc.update(data));},
        set(doc,data,opts){tasks.push(()=>doc.set(data,opts));}
      };
      const result=await callback(tx);
      for(const job of tasks)await job();
      return result;
    }
  };
  class HttpsError extends Error {
    constructor(code,message){super(message);this.code=code;}
  }
  const modules={
    'node:crypto':crypto,
    'firebase-admin/firestore':{getFirestore:()=>firestore,FieldPath:{documentId:()=>null}},
    'firebase-admin/messaging':{getMessaging:()=>({async sendEachForMulticast(payload){
      sent.push(payload);
      if(failCalls-- > 0)
        return{responses:payload.tokens.map(()=>({success:false,error:{code:'messaging/internal-error'}}))};
      return{responses:payload.tokens.map(()=>({success:true}))};
    }})},
    'firebase-functions/v2/https':{onCall:(opts,fn)=>fn,HttpsError},
    'firebase-functions/v2/firestore':{onDocumentWritten:(opts,fn)=>fn},
    'firebase-functions/v2/scheduler':{onSchedule:(opts,fn)=>fn}
  };
  const env={PUSH_ENABLED:'true',PUSH_MANAGER_UIDS:'manager-uid'};
  const context={
    require:name=>{if(!modules[name])throw Error('Unmocked module '+name);return modules[name];},
    exports:{},process:{env},URLSearchParams,console,Date
  };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,'push.js'),'utf8'),context);
  return{handlers:context.exports,sent,maps,map};
}
const request=(uid,data)=>({auth:{uid},data});
const event=(id,timestamp)=>({params:{id},data:{
  before:{exists:false},
  after:{exists:true,data:()=>({status:'pending',timestamp,table:id})}
}});

test('public opt-in registers linked/unlinked staff and Manager without a device code',async()=>{
  const f=fixture(),h=f.handlers;
  assert.equal((await h.pushGetMyAccess(request('employee-a',{}))).authorized,true);
  await h.pushRegisterDevice(request('employee-a',{token:'A-12345678901234567890',platform:'web',consent:true}));
  await h.pushRegisterDevice(request('employee-b',{token:'B-12345678901234567890',platform:'web',consent:true}));
  await h.pushRegisterDevice(request('manager-uid',{token:'M-12345678901234567890',platform:'manager-android',consent:true}));
  await h.push_bun_orders(event('BGL201',100));
  await h.push_lounge_calls(event('LNG01',200));
  assert.equal(f.sent.length,2);
  for(const batch of f.sent){
    assert.equal(batch.tokens.length,3);
    assert(batch.tokens.includes('A-12345678901234567890'));
    assert(batch.tokens.includes('B-12345678901234567890'));
    assert(batch.tokens.includes('M-12345678901234567890'));
  }
  assert.equal(f.sent[0].data.outlet,'bungalow');
  assert.equal(f.sent[1].data.outlet,'lounge');
  assert.equal(f.map('dolphin_push_enrollments').size,3);
  assert.equal(f.map('dolphin_push_invites').size,0);
  assert.equal(f.map('staffIdentity').size,0); // Staff ID is not accessed at all
});

test('one-time code cannot be reused to reactivate a revoked device',async()=>{
  const f=fixture(),h=f.handlers;
  const issued=await h.pushIssueDeviceCodes(request('manager-uid',{count:1}));
  const code=issued.codes[0];
  await h.pushClaimDeviceCode(request('worker-id',{code}));
  await h.pushRegisterDevice(request('worker-id',{token:'W-12345678901234567890',platform:'web',consent:true}));
  const result=await h.pushRevokeDeviceAccess(request('manager-uid',{uid:'worker-id'}));
  assert.equal(result.devicesDisabled,1);
  await assert.rejects(h.pushClaimDeviceCode(request('worker-id',{code})),
    err=>err.code==='failed-precondition');
  await h.push_res_orders(event('R101',300));
  assert.equal(f.sent.length,0);
});

test('delivery reaches device 401 and beyond via pagination',async()=>{
  const f=fixture(),h=f.handlers;
  for(let i=0;i<425;i++){
    const id='device-'+String(i).padStart(4,'0');
    f.map('dolphin_push_devices').set(id,{
      uid:'worker-'+i,token:'token-'+i,role:'staff',active:true
    });
  }
  await h.push_bun_orders(event('BGL202',400));
  assert.equal(f.sent.length,2);
  assert.equal(f.sent.reduce((sum,x)=>sum+x.tokens.length,0),425);
  assert.equal(f.sent[0].tokens.length,400);
  assert.equal(f.sent[1].tokens.length,25);
});

test('a transient FCM failure is retried by scheduler without recreating the guest order',async()=>{
  const f=fixture({transientFailures:1}),h=f.handlers;
  const token='PWA-FCM-123456789012345';
  f.map('dolphin_push_devices').set('device', {uid:'worker',token,role:'staff',active:true});
  await h.push_bun_orders(event('BGL300',123));
  assert.equal(f.sent.length,1);
  const dispatch=[...f.map('dolphin_push_dispatches').values()][0];
  assert.equal(dispatch.status,'retry');
  assert.equal(dispatch.attempts,1);
  assert(dispatch.nextAttemptAt>Date.now());
  // Simulate next eligible scheduler tick without actually waiting.
  dispatch.nextAttemptAt=0;
  await h.pushRetryDeliveries();
  assert.equal(f.sent.length,2);
  const afterRetry=[...f.map('dolphin_push_dispatches').values()][0];
  assert.equal(afterRetry.status,'sent');
  assert.equal(afterRetry.attempts,2);
  assert.equal(f.sent[0].data.eventId,f.sent[1].data.eventId);
});

test('expired processing lease is recovered when a Function dies mid-send',async()=>{
  const f=fixture(),h=f.handlers;
  const token='PWA-FCM-234567890123456';
  f.map('dolphin_push_devices').set('device',{uid:'worker',token,role:'staff',active:true});
  await h.push_res_orders(event('R301',130));
  const dispatch=[...f.map('dolphin_push_dispatches').values()][0];
  dispatch.status='processing';
  dispatch.leaseUntil=Date.now()-1000;
  await h.pushRetryDeliveries();
  assert.equal(f.sent.length,2);
  assert.equal([...f.map('dolphin_push_dispatches').values()][0].status,'sent');
});

test('Manager-only delivery health reports active devices and FCM acceptance',async()=>{
  const f=fixture(),h=f.handlers;
  f.map('dolphin_push_devices').set('abc',{uid:'staff',token:'token-1',role:'staff',active:true});
  await h.push_bun_orders(event('BGL901',901));
  await assert.rejects(h.pushGetDeliveryHealth(request('ordinary',{})),
    err=>err.code==='permission-denied');
  const result=await h.pushGetDeliveryHealth(request('manager-uid',{}));
  assert.equal(result.enabled,true);
  assert.equal(result.activeDevices,1);
  assert.equal(result.recent.length,1);
  assert.equal(result.recent[0].status,'sent');
  assert.equal(result.recent[0].acceptedByFcm,1);
});

test('FCM device tokens with iOS opaque base64 characters are accepted',async()=>{
  const f=fixture(),h=f.handlers;
  const result=await h.pushRegisterDevice(request('worker-id',{
    token:'token+/abc/def=1234567890',platform:'web',consent:true
  }));
  assert.equal(result.registered,true);
  assert.equal(f.map('dolphin_push_devices').size,1);
});

test('opt-in requires Auth and consent, but cannot grant Manager rights through platform or role',async()=>{
  const f=fixture(),h=f.handlers;
  const data={token:'public-device-token-1234567890',platform:'manager-android',role:'manager',consent:true};
  await assert.rejects(h.pushRegisterDevice({data}),e=>e.code==='unauthenticated');
  await assert.rejects(h.pushRegisterDevice(request('public-user',{...data,consent:false})),e=>e.code==='invalid-argument');
  const registered=await h.pushRegisterDevice(request('public-user',data));
  assert.equal(registered.role,'staff');
  await assert.rejects(h.pushIssueDeviceCodes(request('public-user',{})),e=>e.code==='permission-denied');
  await assert.rejects(h.pushGetDeliveryHealth(request('public-user',{})),e=>e.code==='permission-denied');
});

test('Staff APK opt-in and unsubscribe work; admin-revoked users cannot opt themselves back in',async()=>{
  const f=fixture(),h=f.handlers;
  const data={token:'staff-apk-device-token-1234567890',platform:'staff-android',consent:true};
  await h.pushRegisterDevice(request('staff-user',data));
  await h.push_bun_orders(event('test-order',400));
  assert.equal(f.sent.length,1);
  await h.pushUnregisterDevice(request('staff-user',data));
  assert.equal(f.map('dolphin_push_devices').size,0);
  await h.pushRegisterDevice(request('staff-user',data));
  await h.pushRevokeDeviceAccess(request('manager-uid',{uid:'staff-user'}));
  await assert.rejects(h.pushRegisterDevice(request('staff-user',data)),e=>e.code==='permission-denied');
  assert.equal((await h.pushGetMyAccess(request('staff-user',{}))).authorized,false);
});
