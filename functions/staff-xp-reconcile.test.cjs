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
 assert.equal(bgl.find(x=>x.source==='work').amount,1000);
 const lounge=api._fromSession('lounge_history_sessions','session-lounge',{date,tables:{'LOUNGE 1':{openedByStaff:'Lan',pax:8},'LOUNGE 2':{openedByStaff:'Minh',pax:4,payment:'FOC'}},orders:[{status:'completed',preparedBy:'Lan',completedBy:'Minh'}]},map);
 assert.equal(lounge.find(x=>x.source==='revenue').amount,2000);
 assert.equal(lounge.find(x=>x.source==='work'&&x.staffName==='Lan').amount,100);
 assert.equal(lounge.find(x=>x.source==='work'&&x.staffName==='Minh').amount,250);
});
test('ambiguous employee aliases never automatically receive XP',()=>{
 const map=api._nameDirectory({
 a:{employeeId:'DOL-0001',name:'Lan',active:true,registrationSource:'manager'},
 b:{employeeId:'DOL-0002',name:'LAN',active:true,registrationSource:'manager'}
 });
 const events=api._fromSession('bun_history','duplicate',{date:new Date().toISOString().slice(0,10),tables:{'201':{openedByStaff:'Lan'}}},map);
 assert.equal(events.length,0);
});

test('approved renamed employee retains historical work attribution by name alias',()=>{
 const registry={
  'DOL-0010':{employeeId:'DOL-0010',name:'Nguyen Van Minh',nameAliases:['Minh'],active:true,approved:true,registrationSource:'self'}
 };
 const map=api._nameDirectory(registry);
 const date=new Date().toISOString().slice(0,10);
 const events=api._fromSession('bun_history','old-name-session',{date,tables:{'201':{openedByStaff:'Minh',paymentMethod:'TM'}},orders:[{status:'completed',completedBy:'Minh'}]},map);
 assert.equal(events.filter(x=>x.source==='revenue').length,1);
 assert.equal(events.find(x=>x.source==='work').amount,1000);
 assert.ok(events.every(x=>x.employeeId==='DOL-0010'));
});

function auditFixture(sessions,initialLedger={}){
 const data=new Map(Object.entries(initialLedger));
 const registry={'DOL-0002':{employeeId:'DOL-0002',name:'Minh',active:true,registrationSource:'manager'}};
 const read=p=>p==='staffRegistry'?registry:p.startsWith('staffXpLedger/')&&p.split('/').length===2?
  Object.fromEntries([...data].filter(([k])=>k.startsWith(p+'/')).map(([k,v])=>[k.slice(p.length+1),v])):data.get(p)||null;
 const ref=p=>({once:async()=>({val:()=>read(p),exists:()=>!!read(p)}),set:async v=>data.set(p,v),transaction:async fn=>{const next=fn(read(p));if(next===undefined)return {committed:false};data.set(p,next);return {committed:true};}});
 const collection=c=>({orderBy:()=>({limit:()=>({get:async()=>({docs:(sessions[c]||[]).map((v,i)=>({id:'session-'+i,data:()=>v}))})})})});
 const exp={},ctx={exports:exp,module:{exports:exp},process:{env:{STAFF_ADMIN_UIDS:'manager',STAFF_SECURE_AUTO_XP_ENABLED:'true'}},console,Date,Math,Number,String,Set,Map,Object,Array};
 ctx.require=n=>{
  if(n==='node:crypto')return crypto;
  if(n==='firebase-admin/database')return {getDatabase:()=>({ref})};
  if(n==='firebase-admin/firestore')return {getFirestore:()=>({collection})};
  if(n==='firebase-functions/v2/https')return {onCall:(_,fn)=>fn,HttpsError:class extends Error{}};
  if(n==='./staff-xp-engine.cjs')return engine;
  if(n==='./staff-prestige')return {_awardTrustedLiveXP:async e=>{const path='staffXpLedger/'+e.employeeId+'/'+e.eventId;if(data.has(path))return {duplicate:true};data.set(path,e);return {duplicate:false};},_rebuildPrestige:async()=>{}};
  throw Error(n);
 };
 vm.runInNewContext(file,ctx);
 const req={auth:{uid:'manager'}};
 return {preview:()=>exp.staffPreviewArchiveXP(req),approve:ids=>exp.staffApproveArchiveXP({...req,data:{eventIds:ids}}),data};
}
const liveId=(...parts)=>'live:'+crypto.createHash('sha256').update(parts.join('|')).digest('hex').slice(0,40);
test('archive audit stays available with automatic XP and excludes already paid live sales and duplicate archives',async()=>{
 const date=new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Ho_Chi_Minh'}),session={date,tables:{'LOUNGE 1':{openedByStaff:'Minh',openedByStaffId:'DOL-0002',pax:2}}};
 const h=auditFixture({lounge_history_sessions:[session,session]});
 let result=await h.preview();assert.equal(result.pendingCount,1);assert.equal(result.pending[0].amount,500);
 await h.approve(result.pending.map(e=>e.eventId));
 result=await h.preview();assert.equal(result.pendingCount,0);
 const awards=[...h.data].filter(([k])=>k.startsWith('staffXpLedger/'));assert.equal(awards.length,1);
 assert.ok(awards[0][0].endsWith(liveId('sale','lounge_tables','LOUNGE 1',date,'DOL-0002')));
});
test('work repair shares canonical live action receipts, subtracting partial XP and ignoring archive copies',async()=>{
 const date=new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Ho_Chi_Minh'}),session={date,orders:[{id:'order1',status:'completed',preparedBy:'Minh',completedBy:'Minh'}]};
 const prep=liveId('work','lounge_orders','order1','preparing','DOL-0002');
 const h=auditFixture({lounge_history_sessions:[session,session]},{['staffXpLedger/DOL-0002/'+prep]:{amount:100}});
 const result=await h.preview();assert.equal(result.pendingCount,1);assert.equal(result.pending[0].amount,150);
 await h.approve(result.pending.map(e=>e.eventId));assert.equal((await h.preview()).pendingCount,0);
 const complete=liveId('work','lounge_orders','order1','completed','DOL-0002');
 assert.equal(h.data.get('staffXpLedger/DOL-0002/'+complete).amount,150);
});
test('old archive manager receipt is not paid again and old work retains its historical rate',async()=>{
 const date=new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Ho_Chi_Minh'}),session={date,orders:[{id:'o1',status:'completed',completedBy:'Minh'}]};
 const legacy='arc:'+crypto.createHash('sha256').update(['lounge_history_sessions','session-0','work','0','DOL-0002'].join('|')).digest('hex').slice(0,40);
 const h=auditFixture({lounge_history_sessions:[session]},{['staffXpLedger/DOL-0002/'+legacy]:{amount:250}});
 assert.equal((await h.preview()).pendingCount,0);
 const old=api._fromSession('bun_history','old',{date:'2026-10-30',orders:[{id:'old',status:'completed',completedBy:'Minh'}]},directory());
 assert.equal(old[0].amount,10);
});
