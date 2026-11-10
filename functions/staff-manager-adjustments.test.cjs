'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const vm=require('node:vm'),fs=require('node:fs');
function fixture(){
 const data={
  staffRegistry:{
   'DOL-0001':{employeeId:'DOL-0001',name:'Owner',active:true,xp:1200},
   'DOL-0002':{employeeId:'DOL-0002',name:'Crew',active:true,xp:4000,levelPeak:5},
   'DOL-0003':{employeeId:'DOL-0003',name:'Other',active:true,xp:600},
   'DOL-0004':{employeeId:'DOL-0004',name:'Pending',active:true,registrationSource:'self',approved:false,xp:300}
  },
  staffRevenueScoreAdjustments:{},
  lounge_tables:{'LOUNGE 1':{pax:4,openedByStaffId:'DOL-0002'}},
  staffIdentity:{manager:{employeeId:'DOL-0001',verified:true},staff:{employeeId:'DOL-0002',verified:true},forged:{employeeId:'DOL-0001',verified:false}}
 };
 const clone=v=>v===undefined?null:structuredClone(v);
 const get=p=>p.split('/').reduce((v,k)=>v?.[k],data);
 const set=(p,v)=>{const parts=p.split('/'),last=parts.pop();let node=data;for(const k of parts)node=node[k]??={};node[last]=clone(v);};
 const snap=v=>({val:()=>clone(v)});
 const ref=p=>({once:async()=>snap(get(p)),transaction:async fn=>{
  const current=clone(get(p)),next=fn(current);
  if(next===undefined)return {committed:false,snapshot:snap(current)};
  set(p,next);return {committed:true,snapshot:snap(next)};
 }});
 class HttpsError extends Error{constructor(code,message){super(message);this.code=code}}
 const api={};let rebuilds=0;
 const ctx={exports:api,module:{exports:api},console,Date,Intl,Number,Object};
 ctx.require=name=>{
  if(name==='firebase-admin/database')return {getDatabase:()=>({ref})};
  if(name==='firebase-functions/v2/https')return {onCall:(_,fn)=>fn,HttpsError};
  if(name==='./staff-xp-engine.cjs')return require('./staff-xp-engine.cjs');
  if(name==='./staff-profile')return {_requireAccessManager:async req=>{
   const uid=req.auth?.uid;if(!uid)throw new HttpsError('unauthenticated','Authentication required');
   const ident=get('staffIdentity/'+uid),owner=get('staffRegistry/DOL-0001');
   if(ident?.verified!==true||ident.employeeId!=='DOL-0001'||!owner?.active||owner.registrationSource==='self')
    throw new HttpsError('permission-denied','Manager only');
   return uid;
  }};
  if(name==='./staff-prestige')return {_rebuildPrestige:async()=>{rebuilds++}};
  throw Error('unexpected dependency '+name);
 };
 vm.runInNewContext(fs.readFileSync(__dirname+'/staff-manager-adjustments.js','utf8'),ctx);
 return {api,data,get,rebuilds:()=>rebuilds};
}
const request=(uid,data={})=>({auth:uid?{uid}:null,data});
const input=(kind,amount,requestId='adjustment0000000001')=>({employeeId:'DOL-0002',kind,amount,reason:'Đối soát nghiệp vụ',requestId});
test('only verified DOL-0001 can adjust employee XP or weekly revenue score',async()=>{
 const f=fixture();
 for(const who of [null,'staff','forged','unknown']){
  await assert.rejects(()=>f.api.staffManagerAdjustEmployee(request(who,input('xp_add',100))),e=>['permission-denied','unauthenticated'].includes(e.code));
  await assert.rejects(()=>f.api.staffManagerGetEmployeeAdjustments(request(who,{employeeId:'DOL-0002'})));
 }
 assert.equal(f.data.staffRegistry['DOL-0002'].xp,4000);
 assert.equal(f.rebuilds(),0);
});
test('XP add/deduct is atomic, idempotent, and leaves historical levelPeak untouched',async()=>{
 const f=fixture(),first=input('xp_add',400,'adjustment0000000002');
 const add=await f.api.staffManagerAdjustEmployee(request('manager',first));
 assert.equal(add.before,4000);assert.equal(add.after,4400);
 assert.equal((await f.api.staffManagerAdjustEmployee(request('manager',first))).duplicate,true);
 assert.equal(f.data.staffRegistry['DOL-0002'].xp,4400);
 const debit=await f.api.staffManagerAdjustEmployee(request('manager',input('xp_deduct',1500,'adjustment0000000003')));
 assert.equal(debit.after,2900);
 assert.equal(f.data.staffRegistry['DOL-0002'].levelPeak,5);
 assert.equal(f.rebuilds(),3);
 const audit=await f.api.staffManagerGetEmployeeAdjustments(request('manager',{employeeId:'DOL-0002'}));
 assert.equal(audit.xp,2900);
 assert.equal(audit.xpHistory.length,2);
 assert.ok(audit.xpHistory.every(x=>x.reason==='Đối soát nghiệp vụ'));
});
test('negative XP and mismatched replay payloads fail without modifying balance',async()=>{
 const f=fixture();
 await assert.rejects(()=>f.api.staffManagerAdjustEmployee(request('manager',input('xp_deduct',5000))),e=>e.code==='failed-precondition');
 await f.api.staffManagerAdjustEmployee(request('manager',input('xp_add',100)));
 await assert.rejects(()=>f.api.staffManagerAdjustEmployee(request('manager',input('xp_add',200))),e=>e.code==='failed-precondition');
 assert.equal(f.data.staffRegistry['DOL-0002'].xp,4100);
});
test('weekly revenue deduction is published by Staff ID, without mutating actual sale',async()=>{
 const f=fixture(),original=structuredClone(f.data.lounge_tables);
 const result=await f.api.staffManagerAdjustEmployee(request('manager',input('revenue_deduct',250000)));
 assert.equal(result.totalDeducted,250000);
 assert.equal((await f.api.staffManagerAdjustEmployee(request('manager',input('revenue_deduct',250000)))).duplicate,true);
 const publicView=await f.api.staffGetPublicRevenueDeductions(request('guest',{weekStart:result.weekStart}));
 assert.equal(publicView.deductions['DOL-0002'],250000);
 assert.equal(publicView.deductions['DOL-0003'],undefined);
 assert.equal(JSON.stringify(publicView).includes('Đối soát'),false);
 assert.deepEqual(f.data.lounge_tables,original);
 assert.equal(f.data.staffRegistry['DOL-0002'].xp,4000);
 const audit=await f.api.staffManagerGetEmployeeAdjustments(request('manager',{employeeId:'DOL-0002'}));
 assert.equal(audit.revenueHistory.length,1);
 assert.equal(audit.totalDeducted,250000);
});
test('invalid employee, pending staff, invalid request or reason are rejected',async()=>{
 const f=fixture();
 const variants=[
  {...input('xp_add',50),employeeId:'DOL-0001'},
  {...input('xp_add',50),employeeId:'DOL-0004'},
  {...input('xp_add',50),employeeId:'DOL-abc'},
  {...input('xp_add',50),requestId:'short'},
  {...input('xp_add',50),reason:'ok'},
  {...input('xp_add',50),amount:0},
  {...input('revenue_deduct',50),amount:100000001},
  {...input('xp_add',50),kind:'work_add'}
 ];
 for(const variant of variants)await assert.rejects(()=>f.api.staffManagerAdjustEmployee(request('manager',variant)));
 assert.equal(f.data.staffRegistry['DOL-0002'].xp,4000);
});

test('Manager deduction to exactly zero produces Level 1 without creating a clone or losing levelPeak',async()=>{
 const f=fixture();
 f.data.staffRegistry['DOL-0002']={...f.data.staffRegistry['DOL-0002'],name:'Linh hihi',xp:750000,levelPeak:54,selectedFrame:'gold'};
 const first=await f.api.staffManagerAdjustEmployee(request('manager',input('xp_deduct',750000,'deduction-full-0001')));
 assert.equal(first.after,0);assert.equal(first.currentLevel,1);assert.equal(first.highestLevel,54);
 assert.equal(f.data.staffRegistry['DOL-0002'].levelPeak,54);
 assert.equal(f.data.staffRegistry['DOL-0002'].selectedFrame,'none');
 assert.equal(f.data.staffRegistry['DOL-0002'].autoStyleLevel,1);
 assert.equal(Object.keys(f.data.staffRegistry).length,4);
 const copy=await f.api.staffManagerAdjustEmployee(request('manager',input('xp_deduct',750000,'deduction-full-0001')));
 assert.equal(copy.duplicate,true);assert.equal(copy.currentLevel,1);
 assert.equal(f.data.staffRegistry['DOL-0002'].xp,0);
 const details=await f.api.staffManagerGetEmployeeAdjustments(request('manager',{employeeId:'DOL-0002'}));
 assert.equal(details.currentLevel,1);assert.equal(details.highestLevel,54);
});

test('Manager -XP locks Guardian and FX and subsequent +XP restores eligible automatic effects',async()=>{
 const f=fixture(),employee=f.data.staffRegistry['DOL-0002'];
 const e=require('./staff-xp-engine.cjs');
 Object.assign(employee,{
  xp:e.xpForLevel(20)+0.5,levelPeak:54,
  selectedTitle:'guardian',selectedFrame:'emerald',selectedAura:'ripple',
  selectedNameFx:'tide',nameFlame:true,selectedBanner:'abyss',personalTheme:'aurora',
  autoStyleLevel:54
 });
 const deduction=e.xpForLevel(20)-4102; // Manager amounts are integers; fractional XP balance remains
 const debit=await f.api.staffManagerAdjustEmployee(request('manager',input('xp_deduct',deduction,'manager-downcase-01')));
 assert.equal(debit.after,4102.5);assert.equal(debit.currentLevel,2);
 let updated=f.data.staffRegistry['DOL-0002'];
 assert.equal(updated.selectedTitle,'none');assert.equal(updated.selectedFrame,'none');
 assert.equal(updated.selectedAura,'none');assert.equal(updated.selectedNameFx,'none');
 assert.equal(updated.personalTheme,'dark');assert.equal(updated.nameFlame,false);
 assert.equal(updated.autoStyleLevel,2);
 const restore=await f.api.staffManagerAdjustEmployee(request('manager',input('xp_add',deduction,'manager-relevel-02')));
 assert.equal(restore.currentLevel,20);
 updated=f.data.staffRegistry['DOL-0002'];
 assert.equal(updated.selectedTitle,'guardian');
 assert.equal(updated.selectedFrame,'emerald');
 assert.equal(updated.autoStyleLevel,20);
});
