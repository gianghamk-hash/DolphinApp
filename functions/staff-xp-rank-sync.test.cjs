'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
function harness(){
 const reg={
  'DOL-0001':{employeeId:'DOL-0001',name:'Lan',active:true,registrationSource:'manager',approved:true},
  'DOL-0002':{employeeId:'DOL-0002',name:'Binh',active:true,registrationSource:'self',approved:false}
 };
 const data=new Map([
  ['staffIdentity/verified',{verified:true,employeeId:'DOL-0001'}],
  ['staffIdentity/pending',{verified:false,employeeId:'DOL-0002'}],
  ['staffIdentity/forged',{verified:true,employeeId:'DOL-0002'}],
  ...Object.entries(reg).map(([id,p])=>['staffRegistry/'+id,p])
 ]);
 class HttpsError extends Error{constructor(code,message){super(message);this.code=code;}}
 const ctx={module:{exports:{}},console,process,RegExp};
 ctx.exports=ctx.module.exports;
 ctx.require=name=>{
  if(name==='firebase-functions/v2/https')return {onCall:(_,fn)=>fn,HttpsError};
  if(name==='firebase-admin/database')return {getDatabase:()=>({ref:path=>({once:async()=>({val:()=>data.get(path)||null})})})};
  throw Error(name);
 };
 vm.runInNewContext(fs.readFileSync(__dirname+'/staff-xp-rank-sync.js','utf8'),ctx);
 const req=uid=>({auth:uid?{uid}:null,data:{kind:'bun_tables',id:'201'}});
 return {api:ctx.exports,data,req};
}
test('legacy sync and recovery never credit client-writable sales or work',async()=>{
 const {api,req}=harness();
 for(const endpoint of ['staffSyncSavedActivityXP','staffSyncMyRecentXP']){
  const res=await api[endpoint](req('verified'));
  assert.equal(res.addedXP,0);
  assert.equal(res.disabled,true);
  assert.equal(res.status,'secure-action-required');
 }
});
test('pending, spoofed and anonymous identities cannot invoke legacy sync',async()=>{
 const {api,req}=harness();
 for(const endpoint of ['staffSyncSavedActivityXP','staffSyncMyRecentXP']){
  await assert.rejects(()=>api[endpoint](req(null)),e=>e.code==='unauthenticated');
  await assert.rejects(()=>api[endpoint](req('pending')),e=>e.code==='permission-denied');
  await assert.rejects(()=>api[endpoint](req('forged')),e=>e.code==='permission-denied');
 }
});
test('approved self-registration may query status but receives no legacy XP',async()=>{
 const {api,req,data}=harness();
 data.set('staffIdentity/pending',{verified:true,employeeId:'DOL-0002'});
 data.set('staffRegistry/DOL-0002',{...data.get('staffRegistry/DOL-0002'),approved:true});
 const res=await api.staffSyncSavedActivityXP(req('pending'));
 assert.equal(res.addedXP,0);
 assert.equal(res.employeeId,'DOL-0002');
});
