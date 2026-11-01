'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),crypto=require('node:crypto');
const path=require('node:path');
const file=fs.readFileSync(path.join(__dirname,'staff-xp-reconcile.js'),'utf8');
const engine=require('./staff-xp-engine.cjs');
function load(){
 const ctx={module:{exports:{}},exports:{},console,Date,Math,Number,String,Set,Map,Object,Array};
 ctx.exports=ctx.module.exports;
 ctx.require=name=>{
  if(name==='node:crypto')return crypto;
  if(name==='firebase-admin/database')return {getDatabase:()=>({})};
  if(name==='firebase-admin/firestore')return {getFirestore:()=>({})};
  if(name==='firebase-functions/v2/https')return {onCall:(_,fn)=>fn,HttpsError:class extends Error{}};
  if(name==='./staff-xp-engine.cjs')return engine;
  if(name==='./staff-prestige')return {_awardVerifiedXP:()=>{},_rebuildPrestige:()=>{}};
  throw Error(name);
 };
 vm.runInNewContext(file,ctx);
 return ctx.module.exports;
}
const api=load();
const directory=()=>api._nameDirectory({
 'DOL-0001':{employeeId:'DOL-0001',name:'Lan',active:true,registrationSource:'manager'},
 'DOL-0002':{employeeId:'DOL-0002',name:'Minh',active:true,registrationSource:'manager'},
 'DOL-0003':{employeeId:'DOL-0003',name:'Fake',active:true,registrationSource:'self'}
});
test('archive Show paid combos credited once per archive id, FOC skipped and self-reg profiles excluded',()=>{
 const map=directory();
 const session={date:new Date().toISOString().slice(0,10),bookings:[
  {seller:'Lan',label:'BGL 201',payment:'Visa',service:{combo:'singer1'}},
  {seller:'Lan',label:'VPS 1',payment:'FOC',service:{combo:'combo2'}},
  {seller:'Minh',label:'BAR VIEW 1',payment:'TA_UNPAID',service:{combo:'singer3'}},
  {seller:'Fake',label:'BGL 202',payment:'Visa',service:{combo:'combo1'}},
  {seller:'Lan',label:'BGL 203',payment:'Visa'}
 ]};
 const events=api._fromSession('show_history','archive-001',session,map);
 assert.equal(events.length,2);
 assert.equal(events[0].employeeId,'DOL-0001');
 assert.equal(events[0].amount,2290);
 assert.equal(events[1].amount,3290);
 assert.equal(api._fromSession('show_history','archive-001',session,map)[0].eventId,events[0].eventId);
 assert.notEqual(api._fromSession('show_history','archive-002',session,map)[0].eventId,events[0].eventId);
});
test('Bungalow and Lounge archive revenue and completed work score',()=>{
 const map=directory(),date=new Date().toISOString().slice(0,10);
 const bgl=api._fromSession('bun_history','session-bgl',{date,tables:{'201':{openedByStaff:'Lan',paymentMethod:'CASH'},'202':{openedByStaff:'Lan',paymentMethod:'FOC'}},orders:[{status:'completed',preparedBy:'Lan',completedBy:'Lan'}]},map);
 assert.equal(bgl.filter(x=>x.source==='revenue').length,1);
 assert.equal(bgl.find(x=>x.source==='revenue').amount,2000);
 assert.equal(bgl.find(x=>x.source==='work').amount,10);
 const lounge=api._fromSession('lounge_history_sessions','session-lounge',{date,tables:{'LOUNGE 1':{openedByStaff:'Lan',pax:8},'LOUNGE 2':{openedByStaff:'Minh',pax:4,payment:'FOC'}},orders:[{status:'completed',preparedBy:'Lan',completedBy:'Minh'}]},map);
 assert.equal(lounge.find(x=>x.source==='revenue').amount,2000);
 assert.equal(lounge.find(x=>x.source==='work'&&x.staffName==='Lan').amount,1);
 assert.equal(lounge.find(x=>x.source==='work'&&x.staffName==='Minh').amount,2.5);
});
test('ambiguous employee aliases never automatically receive XP',()=>{
 const map=api._nameDirectory({
 a:{employeeId:'DOL-0001',name:'Lan',active:true,registrationSource:'manager'},
 b:{employeeId:'DOL-0002',name:'LAN',active:true,registrationSource:'manager'}
 });
 const events=api._fromSession('bun_history','duplicate',{date:new Date().toISOString().slice(0,10),tables:{'201':{openedByStaff:'Lan'}}},map);
 assert.equal(events.length,0);
});
