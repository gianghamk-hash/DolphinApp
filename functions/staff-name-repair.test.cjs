'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const names=require('./staff-name-policy.cjs');

function fixture({coldAborts=0}={}){
 const registry={
  'DOL-0006':{employeeId:'DOL-0006',name:'Đạt G',active:true,createdAt:2,xp:16302.5,levelPeak:4,revenue:900000},
  'DOL-0001':{employeeId:'DOL-0001',name:'Nguyễn Văn An',active:true,createdAt:1}
 };
 const identities={uid6:{employeeId:'DOL-0006',name:'Đạt G'}};
 const snap=v=>({val:()=>structuredClone(v)});
 let rateAccess=0,transactionAttempts=0;
 const db={ref(path){
  if(path.startsWith('staffProfileRate/')){rateAccess++;throw Error('Unexpected profile throttle');}
  if(path==='staffRegistry')return {
   once:async()=>snap(registry),
   child:id=>({once:async()=>snap(registry[id])}),
   transaction:async updater=>{
    transactionAttempts++;
    if(coldAborts-->0){updater({});return {committed:false,snapshot:snap(registry)};}
    const next=updater(structuredClone(registry));
    if(next===undefined)return {committed:false,snapshot:snap(registry)};
    Object.keys(registry).forEach(k=>delete registry[k]);
    Object.assign(registry,next);
    return {committed:true,snapshot:snap(registry)};
   }
  };
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
 return {repair:exported.staffRepairMyName,registry,identities,getRateAccess:()=>rateAccess,getTransactionAttempts:()=>transactionAttempts};
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

test('retry cold transaction abort while server still requires a mandatory rename',async()=>{
 const f=fixture({coldAborts:2});
 const r=await f.repair({auth:{uid:'uid6'},data:{name:'Đỗ Thành Đạt'}});
 assert.equal(r.employeeId,'DOL-0006');
 assert.equal(r.name,'Đỗ Thành Đạt');
 assert.equal(f.getTransactionAttempts(),3);
 assert.equal(f.registry['DOL-0006'].xp,16302.5);
 assert.equal(f.identities.uid6.name,'Đỗ Thành Đạt');
});
test('cold abort exhaustion never misreports legacy short name as ineligible',async()=>{
 const f=fixture({coldAborts:5});
 await assert.rejects(()=>f.repair({auth:{uid:'uid6'},data:{name:'Đỗ Thành Đạt'}}),e=>e.code==='unavailable');
 assert.equal(f.registry['DOL-0006'].name,'Đạt G');
});
