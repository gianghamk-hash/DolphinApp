'use strict';
/* Manager-approved XP accrual from archived order sessions.
 * Firestore currently contains legacy client-writable order records: a human
 * manager must review proposed values before they become permanent rewards.
 */
const crypto=require('node:crypto');
const {getDatabase}=require('firebase-admin/database');
const {getFirestore}=require('firebase-admin/firestore');
const {onCall,HttpsError}=require('firebase-functions/v2/https');
const engine=require('./staff-xp-engine.cjs');
const prestige=require('./staff-prestige');
const opts={region:'asia-southeast1',maxInstances:4,timeoutSeconds:120};
const sources={
 lounge_history_sessions:{outlet:'lounge',sales:250000},
 bun_history:{outlet:'bungalow',sales:2000000},
 res_history:{outlet:'restaurant',sales:0},
 show_history:{outlet:'show',sales:0}
};
const showPrices=Object.freeze({combo1:1390000,combo2:790000,combo3:2000000,singer1:2290000,singer2:2290000,singer3:3290000});
function assertManager(req){
 const uid=req.auth?.uid;
 if(!uid)throw new HttpsError('unauthenticated','Chưa đăng nhập');
 const ids=new Set(String(process.env.STAFF_ADMIN_UIDS||'').split(',').map(x=>x.trim()).filter(Boolean));
 if(!ids.has(uid))throw new HttpsError('permission-denied','Chỉ quản lý được duyệt doanh thu');
 return uid;
}
function key(n){return String(n||'').normalize('NFC').trim().replace(/\s+/g,' ').toLocaleLowerCase('vi-VN');}
function names(text){
 const x=String(text||'').split('&').map(x=>x.trim()).filter(Boolean);
 return [...new Map(x.map(name=>[key(name),name])).values()];
}
function nameDirectory(registry){
 const map=new Map();
 for(const profile of Object.values(registry||{})){
  if(!profile?.active||profile.registrationSource==='self'||!profile.employeeId)continue;
  for(const name of [profile.name,...(Array.isArray(profile.nameAliases)?profile.nameAliases:[])]){
   const k=key(name);if(!k)continue;
   if(!map.has(k))map.set(k,new Set());
   map.get(k).add(profile.employeeId);
  }
 }
 return map;
}
function staffId(map,name){
 const ids=map.get(key(name));
 return ids?.size===1?[...ids][0]:null;
}
function paymentExcluded(t,show=false){
 const method=String(t?.paymentMethod||t?.payment||'').trim().toUpperCase();
 return show?method==='FOC':['FOC','TA_UNPAID','KTOUR'].includes(method);
}
function pointsForOrder(order,outlet){
 if(order?.status!=='completed')return [];
 const preparers=new Map(names(order.preparedBy).map(n=>[key(n),n]));
 const finishers=new Map(names(order.completedBy).map(n=>[key(n),n]));
 const acc=new Map([...preparers,...finishers]);
 const lounge=outlet==='lounge';
 return [...acc].map(([k,name])=>{
  const prepared=preparers.has(k),completed=finishers.has(k);
  return {name,points:completed?(lounge?0.25:1):(prepared?(lounge?0.1:0.5):0)};
 }).filter(x=>x.points>0);
}
function moneyForTable(source,table){
 if(paymentExcluded(table,source==='show'))return 0;
 if(source==='lounge')return Math.max(0,Math.min(999,Math.floor(Number(table.pax)||0)))*250000;
 if(source==='bungalow')return 2000000;
 if(source==='show')return showPrices[table?.service?.combo]||0;
 return 0;
}
function eventId(source,sessionId,type,index,employeeId){
 return 'arc:'+crypto.createHash('sha256').update([source,sessionId,type,index,employeeId].join('|')).digest('hex').slice(0,40);
}
function fromSession(source,docId,session,map){
 const category=sources[source],outlet=category.outlet;
 const date=String(session.date||'');
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date))return [];
 const cutoff=Date.now()-90*86400000;
 if(Date.parse(date+'T00:00:00+07:00')<cutoff)return [];
 const events=[];
 function add(type,index,name,amount,info){
  const employeeId=staffId(map,name);
  if(!employeeId||!Number.isFinite(amount)||amount<=0)return;
  const xp=type==='revenue'?engine.revenueXP(amount):engine.workXP(amount);
  if(xp<=0)return;
  events.push({eventId:eventId(source,docId,type,index,employeeId),employeeId,staffName:name,
   source:type,amount:xp,originalValue:amount,date,outlet,description:info});
 }
 if(outlet==='show'){
  for(const [index,table] of (Array.isArray(session.bookings)?session.bookings:[]).entries()){
   const amount=moneyForTable('show',table);
   if(amount)add('revenue',String(index),table.seller,amount,(table.label||'')+' · '+(table.service?.combo||''));
  }
 }else if(outlet!=='restaurant'){
  for(const [tableId,table] of Object.entries(session.tables||{})){
   const amount=moneyForTable(outlet,table);
   if(amount)add('revenue',tableId,table.openedByStaff,amount,tableId);
  }
 }
 if(outlet!=='show'){
  const orders=Array.isArray(session.orders)?session.orders:[];
  orders.forEach((order,i)=>{
   for(const item of pointsForOrder(order,outlet))add('work',String(i),item.name,item.points,order.name||order.itemName||'Order #'+(i+1));
  });
 }
 return events;
}
async function proposals(){
 const [registry, ...snapshots]=await Promise.all([
  getDatabase().ref('staffRegistry').once('value'),
  ...Object.keys(sources).map(c=>getFirestore().collection(c).orderBy('date','desc').limit(120).get())
 ]);
 const directory=nameDirectory(registry.val());
 const all=[];
 for(const [i,source] of Object.keys(sources).entries()){
  for(const doc of snapshots[i].docs)all.push(...fromSession(source,doc.id,doc.data(),directory));
 }
 return all.sort((a,b)=>b.date.localeCompare(a.date));
}
exports.staffIsPrestigeAdmin=onCall(opts,async req=>({admin:(()=>{try{return !!assertManager(req);}catch(_){return false;}})()}));
exports.staffPreviewArchiveXP=onCall(opts,async req=>{
 assertManager(req);
 const events=await proposals(),ledger=getDatabase();
 const pending=[];
 // Parallel bounded reads; do not load historical ledgers of unrelated staff.
 const candidates=events.slice(0,120);
 const states=await Promise.all(candidates.map(e=>ledger.ref('staffXpLedger/'+e.employeeId+'/'+e.eventId).once('value')));
 for(let i=0;i<candidates.length;i++)if(!states[i].exists())pending.push(candidates[i]);
 const totals={revenueXP:0,workXP:0};
 for(const e of pending)totals[e.source==='revenue'?'revenueXP':'workXP']+=e.amount;
 return {pending,pendingCount:pending.length,scanned:events.length,totals};
});
exports.staffApproveArchiveXP=onCall(opts,async req=>{
 assertManager(req);
 const ids=req.data?.eventIds;
 if(!Array.isArray(ids)||ids.length<1||ids.length>50||ids.some(x=>typeof x!=='string'||!/^[a-zA-Z0-9_.:-]{8,120}$/.test(x))||new Set(ids).size!==ids.length)
  throw new HttpsError('invalid-argument','Chọn từ 1 đến 50 sự kiện hợp lệ');
 // Recompute on server: client cannot change staff, source or amount.
 const approved=new Map((await proposals()).map(e=>[e.eventId,e]));
 const result=[];
 for(const id of ids){
  const e=approved.get(id);
  if(!e)throw new HttpsError('failed-precondition','Sự kiện không còn tồn tại: '+id);
  result.push(await prestige._awardVerifiedXP(req,{employeeId:e.employeeId,eventId:e.eventId,source:e.source,amount:e.amount},{skipRebuild:true}));
 }
 await prestige._rebuildPrestige();
 return {processed:result.length,credited:result.filter(r=>!r.duplicate).length,duplicates:result.filter(r=>r.duplicate).length};
});
module.exports._fromSession=fromSession;
module.exports._nameDirectory=nameDirectory;
module.exports._pointsForOrder=pointsForOrder;
