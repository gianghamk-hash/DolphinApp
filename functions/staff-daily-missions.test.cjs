'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const core=require('./staff-daily-core.cjs');
function fixture(options={}){
 const employeeId='DOL-0002',path='staffRegistry/'+employeeId;
 const data=new Map([
  ['staffIdentity/worker',{employeeId,verified:true}],
  [path,{employeeId,name:'Crew',active:true,registrationSource:'manager',xp:0}],
  ['staffIdentity/pending',{employeeId:'DOL-0003',verified:false}],
  ['staffRegistry/DOL-0003',{employeeId:'DOL-0003',active:true,registrationSource:'self',approved:false,xp:0}]
 ]);
 let rebuilds=0;
 const ref=p=>({
  once:async()=>({val:()=>data.get(p)||null}),
  transaction:async fn=>{
   let current=data.get(p)||null;
   if(options.cold&&p===path)fn(null);
   const next=fn(current);
   if(next===undefined)return {committed:false,snapshot:{val:()=>current}};
   if(next===null)data.delete(p);else data.set(p,next);
   return {committed:true,snapshot:{val:()=>next}};
  }
 });
 class HttpsError extends Error{constructor(code,message){super(message);this.code=code}}
 const mod={exports:{},module:{exports:{}},process:{env:{}},console,Date,Intl};
 mod.module.exports=mod.exports;
 mod.require=name=>{
  if(name==='node:crypto')return require('node:crypto');
  if(name==='firebase-admin/database')return {getDatabase:()=>({ref})};
  if(name==='firebase-functions/v2/https')return {onCall:(_,callback)=>callback,HttpsError};
  if(name==='./staff-xp-engine.cjs')return require('./staff-xp-engine.cjs');
  if(name==='./staff-daily-core.cjs')return core;
  if(name==='./crew-arcade-proof.cjs')return require('../crew-arcade-proof.js');
  if(name==='./staff-prestige')return {_rebuildPrestige:async()=>{rebuilds++}};
  if(name==='./staff-name-policy.cjs')return require('./staff-name-policy.cjs');
  throw Error(name);
 };
 vm.runInNewContext(fs.readFileSync(__dirname+'/staff-daily-missions.js','utf8'),mod);
 return {api:mod.module.exports,data,employeeId,rebuilds:()=>rebuilds};
}
const req=(uid,data={})=>({auth:uid?{uid}:null,data});
test('check-in callable requires manager-approved Staff ID, not arbitrary client name',async()=>{
 const h=fixture();
 await assert.rejects(()=>h.api.staffCheckInDaily(req(null)),e=>e.code==='unauthenticated');
 await assert.rejects(()=>h.api.staffCheckInDaily(req('pending')),e=>e.code==='permission-denied');
 await assert.rejects(()=>h.api.staffCheckInDaily(req('unknown')),e=>e.code==='permission-denied');
 const result=await h.api.staffCheckInDaily(req('worker',{employeeId:'DOL-9999',amount:1000000}));
 assert.equal(result.awarded,true);assert.equal(result.addedXP,600);
 assert.equal(h.data.get('staffRegistry/DOL-0002').xp,600);
});
test('multiple devices cannot claim the same daily task twice',async()=>{
 const h=fixture({cold:true});
 h.data.set('staffIdentity/second',{employeeId:'DOL-0002',verified:true});
 const results=await Promise.all([h.api.staffCheckInDaily(req('worker')),h.api.staffCheckInDaily(req('second'))]);
 assert.equal(results.filter(v=>v.awarded).length,1);
 assert.equal(h.data.get('staffRegistry/DOL-0002').xp,600);
 assert.equal(h.rebuilds(),1);
});
test('business missions are internal-only, idempotent and update profile level',async()=>{
 const h=fixture();
 assert.equal(typeof h.api.staffClaimAnyDailyXP,'undefined');
 const p=h.data.get('staffRegistry/DOL-0002');
 h.data.set('staffRegistry/DOL-0002',{...p,xp:3490});
 const first=await h.api._award(h.employeeId,'order_completed');
 const second=await h.api._award(h.employeeId,'order_completed');
 assert.equal(first.addedXP,1200);
 assert.equal(second.addedXP,0);
 assert.equal(h.data.get('staffRegistry/DOL-0002').xp,4690);
 assert.equal(h.data.get('staffRegistry/DOL-0002').levelPeak,2);
 await assert.rejects(()=>h.api._award(h.employeeId,'unknown_mission'),e=>e.code==='invalid-argument');
});

test('delayed business mission credits its original VN day once without resetting today',async()=>{
 const h=fixture(),path='staffRegistry/'+h.employeeId;
 const old=Date.now()-86400000;
 await h.api._award(h.employeeId,'order_completed',old);
 assert.equal(h.data.get(path).xp,1200);
 await h.api.staffCheckInDaily(req('worker'));
 await h.api._award(h.employeeId,'order_completed',old);
 assert.equal(h.data.get(path).xp,1800);
 assert.equal(h.data.get(path).dailyMissions.date,core.vietnamDay());
 const today=await h.api._award(h.employeeId,'order_completed');
 assert.equal(today.addedXP,1200);assert.equal(h.data.get(path).xp,3000);
});

test('delayed business XP automatically equips the new level even though its original day has ended',async()=>{
 const h=fixture(),path='staffRegistry/'+h.employeeId,engine=require('./staff-xp-engine.cjs');
 h.data.set(path,{...h.data.get(path),xp:engine.xpForLevel(3)-400,levelPeak:2});
 await h.api._award(h.employeeId,'order_completed',Date.now()-86400000);
 assert.equal(h.data.get(path).selectedNameFx,'ember');assert.equal(h.data.get(path).autoStyleLevel,3);
});
