'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),crypto=require('node:crypto');
const hash=(...v)=>crypto.createHash('sha256').update(v.join('|')).digest('hex').slice(0,40);
function fixture(){
 const reg={'DOL-0001':{employeeId:'DOL-0001',name:'Lan',active:true},'DOL-0002':{employeeId:'DOL-0002',name:'Binh',active:true,registrationSource:'self'}};
 const data=new Map([['staffRegistry',reg],...Object.entries(reg).map(([id,p])=>['staffRegistry/'+id,p]),['staffIdentity/u1',{employeeId:'DOL-0001',verified:true}],['staffIdentity/u2',{employeeId:'DOL-0002',verified:false}]]),docs=new Map(),awards=[];
 class HttpsError extends Error{constructor(code,message){super(message);this.code=code}}
 const ref=key=>({once:async()=>({val:()=>data.get(key)||null}),transaction:async fn=>{const current=data.get(key)||null,next=fn(current);if(next===undefined)return {committed:false};data.set(key,next);return {committed:true}}});
 const mod={exports:{},Date,Map,Set,Object,Number,String,Math,console,process:{env:{}}};mod.module={exports:mod.exports};
 mod.require=n=>{
  if(n==='node:crypto')return crypto;
  if(n==='firebase-functions/v2/https')return {onCall:(_,f)=>f,HttpsError};
  if(n==='firebase-admin/database')return {getDatabase:()=>({ref})};
  if(n==='firebase-admin/firestore')return {getFirestore:()=>({collection:k=>({doc:id=>({get:async()=>({exists:docs.has(k+'/'+id),data:()=>docs.get(k+'/'+id)})})})})};
  if(n==='./staff-xp-live-engine.cjs')return require('./staff-xp-live-engine.cjs');
  if(n==='./staff-xp-engine.cjs')return require('./staff-xp-engine.cjs');
  if(n==='./staff-prestige')return {_awardTrustedLiveXP:async v=>{const k='staffXpLedger/'+v.employeeId+'/'+v.eventId;if(data.has(k))return {duplicate:true};data.set(k,v);awards.push(v);return {duplicate:false}},_rebuildPrestige:async()=>{}};
  throw Error(n);
 };
 vm.runInNewContext(fs.readFileSync(__dirname+'/staff-xp-rank-sync.js','utf8'),mod);
 return {docs,data,awards,call:(uid,kind,id)=>mod.exports.staffSyncSavedActivityXP({auth:uid?{uid}:null,data:{kind,id}})};
}
test('Lounge sale matches ranking once, ignores FOC',async()=>{
 const h=fixture();h.docs.set('lounge_tables/L20',{openedByStaff:'Lan',pax:1,paymentMethod:'TM'});
 assert.equal((await h.call('u1','lounge_tables','L20')).addedXP,250);
 assert.equal((await h.call('u1','lounge_tables','L20')).addedXP,0);
 h.docs.set('lounge_tables/L21',{openedByStaff:'Lan',pax:3,paymentMethod:'FOC'});
 assert.equal((await h.call('u1','lounge_tables','L21')).addedXP,0);assert.equal(h.awards.length,1);
});
test('linked self-registration earns XP and Show uses selected package',async()=>{
 const h=fixture();h.docs.set('bun_tables/201',{openedByStaff:'Binh',paymentMethod:'Tiền mặt'});
 assert.equal((await h.call('u2','bun_tables','201')).addedXP,2000);
 h.docs.set('show_tables/S1',{seller:'Lan',payment:'Tiền mặt',service:{combo:'combo2'}});
 assert.equal((await h.call('u1','show_tables','S1')).addedXP,790);
});
test('completed order awards all participants once based on ranking work rules',async()=>{
 const h=fixture();h.docs.set('lounge_orders/o1',{status:'completed',preparedBy:'Lan & Binh',completedBy:'Binh'});
 assert.equal((await h.call('u2','lounge_orders','o1')).addedXP,2.5);
 assert.equal(h.awards.find(v=>v.employeeId==='DOL-0001').amount,1);
 assert.equal((await h.call('u1','lounge_orders','o1')).addedXP,0);
});
test('previous preparation receipt reduces final award without duplicate XP',async()=>{
 const h=fixture(),id='live:'+hash('work','res_orders','o2','preparing','DOL-0001');
 h.data.set('staffXpLedger/DOL-0001/'+id,{amount:5});
 h.docs.set('res_orders/o2',{status:'completed',preparedBy:'Lan',completedBy:'Lan'});
 assert.equal((await h.call('u1','res_orders','o2')).addedXP,5);
});
test('unrelated or anonymous caller cannot award someone else XP',async()=>{
 const h=fixture();h.docs.set('lounge_tables/L20',{openedByStaff:'Lan',pax:3,paymentMethod:'TM'});
 await assert.rejects(()=>h.call('u2','lounge_tables','L20'),e=>e.code==='permission-denied');
 await assert.rejects(()=>h.call(null,'lounge_tables','L20'),e=>e.code==='unauthenticated');
 assert.equal(h.awards.length,0);
});

