'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const names=require('./staff-name-policy.cjs');

function fixture({coldAborts=0}={}){
 const registry={
  'DOL-0006':{employeeId:'DOL-0006',name:'Đạt G',active:true,createdAt:2,xp:16302.5,levelPeak:4,revenue:900000},
  'DOL-0001':{employeeId:'DOL-0001',name:'Nguyễn Văn An',active:true,createdAt:1,registrationSource:'manager',xp:50800,revenue:1500000,levelPeak:5}
 };
 const identities={uid6:{employeeId:'DOL-0006',name:'Đạt G'},uidOwner:{employeeId:'DOL-0001',name:'Nguyễn Văn An',verified:true},uidSecondOwner:{employeeId:'DOL-0001',name:'Nguyễn Văn An',verified:true}};
 const snap=v=>({val:()=>structuredClone(v)});
 let rateAccess=0,transactionAttempts=0,rootTransactions=0;
 const db={ref(path){
  if(path.startsWith('staffProfileRate/')){rateAccess++;throw Error('Unexpected profile throttle');}
  if(path==='staffRegistry')return {
   once:async()=>snap(registry),
   transaction:async()=>{rootTransactions++;throw Error('Root registry transaction forbidden for rename');},
   child:id=>({
    once:async()=>snap(registry[id]),
    transaction:async updater=>{
     transactionAttempts++;
     // Firebase may first call updater with a cold null local cache.
     const first=updater(null);
     if(coldAborts-->0)return {committed:false,snapshot:snap(registry[id])};
     const next=updater(structuredClone(registry[id]));
     if(next===undefined)return {committed:false,snapshot:snap(registry[id])};
     registry[id]=next;
     return {committed:true,snapshot:snap(next)};
    }
   })
  };
  if(path==='staffRegistry/DOL-0001')return {once:async()=>snap(registry['DOL-0001'])};
  if(path==='staffIdentity')return {once:async()=>snap(identities)};
  if(path.startsWith('staffIdentity/')){
   const id=path.slice('staffIdentity/'.length);
   return {once:async()=>snap(identities[id]),transaction:async updater=>{
    const next=updater(structuredClone(identities[id]));
    if(next!==undefined)identities[id]=next;
    return {committed:next!==undefined,snapshot:snap(identities[id])};
   }};
  }
  throw Error('Unexpected path: '+path);
 }};
 const exported={};
 const code=fs.readFileSync(require.resolve('./staff-profile.js'),'utf8');
 const fakeRequire=id=>{
  if(id==='node:crypto')return require('node:crypto');
  if(id==='./staff-name-policy.cjs')return names;
  if(id==='firebase-admin/database')return {getDatabase:()=>db};
  if(id==='firebase-functions/v2/https')return {onCall:(_opts,fn)=>fn,HttpsError:class HttpsError extends Error{constructor(code,message){super(message);this.code=code;}}};
  if(id==='./staff-avatar-catalog.json')return {'Lv.1':['🐬']};
  if(id==='./staff-prestige')return {_rebuildPrestige:async()=>{}};
  throw Error('Unexpected import: '+id);
 };
 vm.runInNewContext(code,{module:{exports:exported},exports:exported,require:fakeRequire,console,Date,Buffer,setTimeout,clearTimeout});
 return {repair:exported.staffRepairMyName,renameOwner:exported.staffRenameOwnerProfile,registry,identities,getRateAccess:()=>rateAccess,getTransactionAttempts:()=>transactionAttempts,getRootTransactions:()=>rootTransactions};
}

test('mandatory repair bypasses unrelated 1.5-second profile throttle and retains Staff ID and XP',async()=>{
 const f=fixture();
 const r=await f.repair({auth:{uid:'uid6'},data:{name:'Đỗ Thành Đạt'}});
 assert.equal(r.employeeId,'DOL-0006');
 assert.equal(r.name,'Đỗ Thành Đạt');
 assert.equal(f.getRateAccess(),0);
 assert.equal(f.registry['DOL-0006'].xp,16302.5);
 assert.equal(f.registry['DOL-0006'].revenue,900000);
 assert.equal(f.registry['DOL-0006'].levelPeak,4);
 assert.deepEqual(Array.from(f.registry['DOL-0006'].nameAliases),['Đạt G']);
 assert.equal(f.identities.uid6.name,'Đỗ Thành Đạt');
});
test('repeated repair after successful commit is idempotent',async()=>{
 const f=fixture(), req={auth:{uid:'uid6'},data:{name:'Đỗ Thành Đạt'}};
 await f.repair(req);
 const version=f.registry['DOL-0006'].profileVersion;
 const repeat=await f.repair(req);
 assert.equal(repeat.name,'Đỗ Thành Đạt');
 assert.equal(f.registry['DOL-0006'].profileVersion,version);
});
test('reject duplicate and arbitrary rename while preserving stored identity',async()=>{
 const f=fixture();
 await assert.rejects(()=>f.repair({auth:{uid:'uid6'},data:{name:'Nguyen Van An'}}),e=>e.code==='already-exists');
 assert.equal(f.registry['DOL-0006'].name,'Đạt G');
 await f.repair({auth:{uid:'uid6'},data:{name:'Đỗ Thành Đạt'}});
 await assert.rejects(()=>f.repair({auth:{uid:'uid6'},data:{name:'Đỗ Thành Đạt Mới'}}),e=>e.code==='failed-precondition');
 assert.equal(f.registry['DOL-0006'].name,'Đỗ Thành Đạt');
});

test('employee-only transaction avoids directory-wide contention and safely handles a cold cache',async()=>{
 const f=fixture();
 const r=await f.repair({auth:{uid:'uid6'},data:{name:'Đỗ Thành Đạt'}});
 assert.equal(r.employeeId,'DOL-0006');
 assert.equal(f.getTransactionAttempts(),1);
 assert.equal(f.getRootTransactions(),0);
 assert.equal(f.registry['DOL-0006'].xp,16302.5);
 assert.equal(f.registry['DOL-0006'].revenue,900000);
});
test('aborted employee transaction reports retry instead of false success',async()=>{
 const f=fixture({coldAborts:1});
 await assert.rejects(()=>f.repair({auth:{uid:'uid6'},data:{name:'Đỗ Thành Đạt'}}),e=>e.code==='unavailable');
 assert.equal(f.registry['DOL-0006'].name,'Đạt G');
});

test('DOL-0001 can rename repeatedly, preserving Staff ID, XP, revenue and linked UID names',async()=>{
 const f=fixture();
 const req=name=>({auth:{uid:'uidOwner'},data:{name}});
 const first=await f.renameOwner(req('Giang Dolphin'));
 const second=await f.renameOwner(req('Hoàng Thượng Dolphin'));
 assert.equal(first.employeeId,'DOL-0001');
 assert.equal(second.name,'Hoàng Thượng Dolphin');
 assert.equal(f.registry['DOL-0001'].xp,50800);
 assert.equal(f.registry['DOL-0001'].revenue,1500000);
 assert.equal(f.registry['DOL-0001'].levelPeak,5);
 assert.equal(f.identities.uidOwner.name,'Hoàng Thượng Dolphin');
 assert.equal(f.identities.uidSecondOwner.name,'Hoàng Thượng Dolphin');
 assert.deepEqual(Array.from(f.registry['DOL-0001'].nameAliases),['Nguyễn Văn An','Giang Dolphin']);
 assert.equal(f.getRootTransactions(),0);
});
test('owner rename rejects unverified, ordinary employees and duplicate names',async()=>{
 const f=fixture();
 await assert.rejects(()=>f.renameOwner({auth:{uid:'uid6'},data:{name:'Giang Dolphin'}}),e=>e.code==='permission-denied');
 await assert.rejects(()=>f.renameOwner({auth:{uid:'uidOwner'},data:{name:'Đạt G'}}),e=>e.code==='invalid-argument'||e.code==='already-exists');
 assert.equal(f.registry['DOL-0001'].name,'Nguyễn Văn An');
});
test('repeat identical owner rename is idempotent and does not reset XP',async()=>{
 const f=fixture(),req={auth:{uid:'uidOwner'},data:{name:'Nguyễn Văn An'}};
 const value=await f.renameOwner(req);
 assert.equal(value.employeeId,'DOL-0001');
 assert.equal(f.registry['DOL-0001'].profileVersion||0,0);
 assert.equal(f.registry['DOL-0001'].xp,50800);
});
