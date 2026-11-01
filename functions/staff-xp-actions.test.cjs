'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const vm=require('node:vm'),fs=require('node:fs');
function harness(){
 const data=new Map([['staffIdentity/verified',{verified:true,employeeId:'DOL-0001'}],['staffRegistry/DOL-0001',{employeeId:'DOL-0001',name:'Lan',active:true,registrationSource:'manager'}],['staffIdentity/self',{verified:false,employeeId:'DOL-0002'}],['staffIdentity/manager',{verified:true,employeeId:'DOL-0003'}],['staffRegistry/DOL-0003',{employeeId:'DOL-0003',name:'Manager',active:true,registrationSource:'manager'}]]);
 const docs=new Map(),awards=[];
 const ref=p=>({once:async()=>({val:()=>data.get(p)||null,exists:()=>data.has(p)}),set:async v=>{data.set(p,v)},transaction:async fn=>{const v=fn(data.get(p)||null);if(v===undefined)return {committed:false};data.set(p,v);return {committed:true,snapshot:{val:()=>v}};}});
 const db={collection:k=>({doc:id=>({key:k+'/'+id})}),runTransaction:async fn=>fn({get:async r=>({exists:docs.has(r.key),data:()=>docs.get(r.key)}),set:(r,v)=>docs.set(r.key,{...(docs.get(r.key)||{}),...v}),update:(r,v)=>docs.set(r.key,{...(docs.get(r.key)||{}),...v})})};
 class HttpsError extends Error{constructor(code,msg){super(msg);this.code=code}}
 const exp={},ctx={exports:exp,process:{env:{STAFF_ADMIN_UIDS:'manager'}},console,Date,Set,Map};ctx.require=n=>{
  if(n==='node:crypto')return require(n);
  if(n==='firebase-admin/database')return {getDatabase:()=>({ref})};
  if(n==='firebase-admin/firestore')return {getFirestore:()=>db};
  if(n==='firebase-functions/v2/https')return {onCall:(_,f)=>f,HttpsError};
  if(n==='./staff-xp-live-engine.cjs')return require('./staff-xp-live-engine.cjs');
  if(n==='./staff-xp-engine.cjs')return require('./staff-xp-engine.cjs');
  if(n==='./staff-prestige')return {_awardTrustedLiveXP:async d=>{const k='staffXpLedger/'+d.employeeId+'/'+d.eventId;if(data.has(k))return {duplicate:true};data.set(k,d);awards.push(d);return {duplicate:false}}};
  throw Error(n);
 };
 vm.runInNewContext(fs.readFileSync(__dirname+'/staff-xp-actions.js','utf8'),ctx);
 return {call:(u,d)=>exp.staffRecordLiveAction({auth:u?{uid:u}:null,data:d}),docs,awards};
}
test('only manager verified staff can open revenue sessions, no duplicate XP',async()=>{
 const h=harness(),input={kind:'lounge_tables',id:'LOUNGE 1',action:'booking',data:{customerName:'Guest',pax:3,paymentMethod:'TM',openedByStaff:'spoof'}};
 await assert.rejects(()=>h.call('self',input),e=>e.code==='permission-denied');
 await assert.rejects(()=>h.call(null,input),e=>e.code==='unauthenticated');
 assert.equal((await h.call('verified',input)).xpAwarded,750);
 assert.equal(h.docs.get('lounge_tables/LOUNGE 1').openedByStaff,'Lan');
 assert.equal((await h.call('verified',input)).xpAwarded,0);assert.equal(h.awards.length,1);
});
test('Show needs verified booking; same combo is not counted twice',async()=>{
 const h=harness(),combo={kind:'show_tables',id:'S1',action:'combo',data:{combo:'combo2',foods:{set:1}}};
 await assert.rejects(()=>h.call('verified',combo),e=>e.code==='failed-precondition');
 await h.call('verified',{kind:'show_tables',id:'S1',action:'booking',data:{leader:'L',dining:'J1',guests:2,payment:'Tiền mặt'}});
 assert.equal((await h.call('verified',combo)).xpAwarded,790);
 assert.equal((await h.call('verified',combo)).xpAwarded,0);
});
test('Work credits verified prepare and remaining completion XP once',async()=>{
 const h=harness();h.docs.set('lounge_orders/o1',{status:'pending'});
 const a={kind:'lounge_orders',id:'o1',action:'preparing'},b={...a,action:'completed'};
 assert.equal((await h.call('verified',a)).xpAwarded,1);
 assert.equal((await h.call('verified',b)).xpAwarded,1.5);
 assert.equal((await h.call('verified',b)).xpAwarded,0);
 assert.equal(h.awards.reduce((n,x)=>n+x.amount,0),2.5);
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
