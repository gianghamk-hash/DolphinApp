'use strict';
/* Manager-approved XP accrual from current orders and archived sessions.
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
const liveSources={lounge_orders:'lounge_history_sessions',bun_orders:'bun_history',res_orders:'res_history',lounge_tables:'lounge_history_sessions',bun_tables:'bun_history',show_tables:'show_history'};
function timestampMillis(value){
 if(typeof value==='number'&&Number.isFinite(value)&&value>0)return value;
 if(value&&typeof value.toMillis==='function')return value.toMillis();
 if(value&&Number.isFinite(value.seconds))return value.seconds*1000+Math.floor((value.nanoseconds||0)/1e6);
 return 0;
}
function actionDay(row,kind){
 const at=kind.endsWith('_orders')?timestampMillis(row.status==='completed'?row.completedAt:row.preparedAt):timestampMillis(row.updatedAt);
 return at?new Date(at).toLocaleDateString('en-CA',{timeZone:'Asia/Ho_Chi_Minh'}):null;
}
// Verified production rollout: secure XP run 41557307380. The parallel
// style deployment may have switched the callable during this interval.
const WORK_RATE_ROLLOUT_START=Date.parse('2026-11-03T01:04:41Z');
const WORK_RATE_ROLLOUT_END=Date.parse('2026-11-03T01:08:19Z');
function workRate(at,date){
 const time=timestampMillis(at);
 if(time)return {factor:time<WORK_RATE_ROLLOUT_START?0.01:1,uncertain:time>=WORK_RATE_ROLLOUT_START&&time<WORK_RATE_ROLLOUT_END};
 return {factor:date<'2026-11-03'?0.01:1,uncertain:date==='2026-11-03'};
}
const showPrices=Object.freeze({combo1:1390000,combo2:790000,combo3:2000000,singer1:2290000,singer2:2290000,singer3:3290000});
async function assertManager(req){
 const uid=req.auth?.uid;
 if(!uid)throw new HttpsError('unauthenticated','Chưa đăng nhập');
 const ids=new Set(String(process.env.STAFF_ADMIN_UIDS||'').split(',').map(x=>x.trim()).filter(Boolean));
 if(!ids.has(uid)){
  const db=getDatabase(),ident=(await db.ref('staffIdentity/'+uid).once('value')).val();
  const master=(await db.ref('staffRegistry/DOL-0001').once('value')).val();
  if(ident?.employeeId!=='DOL-0001'||ident.verified!==true||!master?.active||master.registrationSource==='self')
   throw new HttpsError('permission-denied','Chỉ quản lý được duyệt doanh thu');
 }
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
  if(!profile?.active||(profile.registrationSource==='self'&&profile.approved!==true)||!profile.employeeId)continue;
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
 if(!['preparing','completed'].includes(order?.status))return [];
 const preparers=new Map(names(order.preparedBy).map(n=>[key(n),n]));
 const finishers=new Map((order.status==='completed'?names(order.completedBy):[]).map(n=>[key(n),n]));
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
 if(date>new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Ho_Chi_Minh'}))return [];
 const events=[];
 function add(type,index,name,amount,info,stableId){
  // Stable IDs take precedence. Never silently redirect an unknown ID by name.
  const employeeId=stableId?([...map.values()].some(ids=>ids.has(stableId))?stableId:null):staffId(map,name);
  if(!employeeId||!Number.isFinite(amount)||amount<=0)return;
  const xp=type==='revenue'?engine.revenueXP(amount):Number((engine.workXP(amount)*(date<'2026-11-03'?0.01:1)).toFixed(2));
  if(xp<=0)return;
  events.push({eventId:eventId(source,docId,type,index,employeeId),employeeId,staffName:name,
   source:type,amount:xp,originalValue:amount,date,outlet,index,archiveId:docId,description:info});
 }
 if(outlet==='show'){
  for(const [index,table] of (Array.isArray(session.bookings)?session.bookings:[]).entries()){
   const amount=moneyForTable('show',table);
   if(amount){
    const count=events.length;
    add('revenue',String(table.id||table.label||index),table.seller,amount,(table.label||'')+' · '+(table.service?.combo||''),table.sellerStaffId);
    if(events.length>count)events[events.length-1].legacyIndex=String(index);
   }
  }
 }else if(outlet!=='restaurant'){
  for(const [tableId,table] of Object.entries(session.tables||{})){
   const amount=moneyForTable(outlet,table);
   if(amount)add('revenue',tableId,table.openedByStaff,amount,tableId,table.openedByStaffId);
  }
 }
 if(outlet!=='show'){
  const orders=Array.isArray(session.orders)?session.orders:[];
  orders.forEach((order,i)=>{
   for(const item of pointsForOrder(order,outlet)){
    const stable=key(item.name)===key(order.completedBy)?order.completedByStaffId:
     names(order.preparedBy).length===1?order.preparedByStaffId:null;
    const count=events.length;
    add('work',String(order.id||docId+':'+i),item.name,item.points,order.name||order.itemName||'Order #'+(i+1),stable);
    const ev=events[events.length-1];
    if(events.length>count&&ev&&ev.source==='work'&&ev.index===String(order.id||docId+':'+i)){
     ev.orderId=order.id||null;ev.legacyIndex=String(i);
     const prepared=names(order.preparedBy).some(n=>key(n)===key(item.name));
     const completed=order.status==='completed'&&names(order.completedBy).some(n=>key(n)===key(item.name));
     const prepRate=workRate(order.preparedAt,date),doneRate=workRate(order.completedAt,date);
     ev.workParts=[];
     if(prepared)ev.workParts.push({action:'preparing',amount:engine.workXP(outlet==='lounge'?0.1:0.5)*prepRate.factor});
     if(completed)ev.workParts.push({action:'completed',amount:engine.workXP(prepared?(outlet==='lounge'?0.15:0.5):(outlet==='lounge'?0.25:1))*doneRate.factor});
     ev.amount=Number(ev.workParts.reduce((sum,part)=>sum+part.amount,0).toFixed(2));
     ev.rateUncertain=!!((prepared&&prepRate.uncertain)||(completed&&doneRate.uncertain));
    }
   }
  });
 }
 return events;
}
async function readAll(collection,orderField){
 const docs=[];let cursor;
 for(;;){
  let q=getFirestore().collection(collection).orderBy(orderField).limit(200);
  if(cursor)q=q.startAfter(cursor);
  const page=await q.get();docs.push(...page.docs);
  if(page.docs.length<200)break;
  cursor=page.docs[page.docs.length-1];
 }
 return {docs};
}
async function proposals(){
 const [registry, ...snapshots]=await Promise.all([
  getDatabase().ref('staffRegistry').once('value'),
  ...Object.keys(sources).map(c=>readAll(c,'date')),
  ...Object.keys(liveSources).map(c=>readAll(c,'__name__'))
 ]);
 const directory=nameDirectory(registry.val());
 const all=[];
 for(const [i,source] of Object.keys(sources).entries()){
  for(const doc of snapshots[i].docs)all.push(...fromSession(source,doc.id,doc.data(),directory));
 }
const liveOffset=Object.keys(sources).length;
 for(const [i,kind] of Object.keys(liveSources).entries()){
  for(const doc of snapshots[liveOffset+i].docs){
   const row={...doc.data(),id:doc.id},date=actionDay(row,kind);
   if(!date)continue; // Do not invent a day for undated legacy live records.
   const session={date};
   if(kind.endsWith('_orders'))session.orders=[row];
   else if(kind==='show_tables')session.bookings=[row];
   else session.tables={[doc.id]:row};
   const events=fromSession(liveSources[kind],'live-source:'+kind+':'+doc.id,session,directory);
   for(const e of events)e.origin='current';
   all.push(...events);
  }
 }
 return {events:all.sort((a,b)=>b.date.localeCompare(a.date)),registry:registry.val()||{}};
}
function autoXP(){return process.env.STAFF_AUTO_XP_ENABLED==='true'||process.env.STAFF_SECURE_AUTO_XP_ENABLED==='true';}
function hash(...a){return crypto.createHash('sha256').update(a.join('|')).digest('hex').slice(0,40);}
function liveKind(e){return ({lounge:'lounge',bungalow:'bun',restaurant:'res',show:'show'})[e.outlet]+(e.source==='work'?'_orders':'_tables');}
function canonical(e){return [liveKind(e),e.date,e.index,e.employeeId,e.source].join('|');}
async function pendingProposals(scope){
 if(process.env.STAFF_AUTO_XP_ENABLED==='true')throw new HttpsError('failed-precondition','Cần tắt trigger XP cũ trước khi đối chiếu lịch sử.');
 const {events,registry}=await proposals(),db=getDatabase(),groups=new Map(),ledgers=new Map(),staffTotals=new Map();
 const today=new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Ho_Chi_Minh'}),monday=new Date(today+'T00:00:00Z');
 monday.setUTCDate(monday.getUTCDate()-(monday.getUTCDay()+6)%7);
 const fromDate=scope==='week'?monday.toISOString().slice(0,10):null;
 for(const e of events){if(fromDate&&e.date<fromDate)continue;const k=canonical(e);if(!groups.has(k))groups.set(k,[]);groups.get(k).push(e);}
 await Promise.all([...new Set(events.map(e=>e.employeeId))].map(async id=>ledgers.set(id,(await db.ref('staffXpLedger/'+id).once('value')).val()||{})));
 const pending=[];
 for(const copies of groups.values()){
  const certain=copies.filter(c=>!c.rateUncertain);
  const e=(certain.length?certain:copies).reduce((a,b)=>a.amount>=b.amount?a:b),ledger=ledgers.get(e.employeeId);
  const kind=liveKind(e);
  const liveIds=e.source==='revenue'?['live:'+hash('sale',kind,e.index,e.date,e.employeeId)]:
   e.orderId?['preparing','completed'].map(a=>'live:'+hash('work',kind,e.orderId,a,e.employeeId)):[];
  // Check original archive receipt IDs too, so the new repair never pays again
  // for an earlier manager approval. Keep the greatest archive copy amount.
  const legacy=Math.max(0,...copies.map(c=>Number(ledger[c.eventId]?.amount)||0),...copies.map(c=>{
   const source=Object.keys(sources).find(k=>sources[k].outlet===c.outlet);
   return Number(ledger[eventId(source,c.archiveId,c.source,c.legacyIndex??c.index,c.employeeId)]?.amount)||0;
  }));
  const recoveryId='repair:'+hash(canonical(e));
  const already=liveIds.reduce((n,id)=>n+(Number(ledger[id]?.amount)||0),0)+(Number(ledger[recoveryId]?.amount)||0)+legacy;
  const amount=Number(Math.max(0,e.amount-already).toFixed(2));
const summary=staffTotals.get(e.employeeId)||{employeeId:e.employeeId,name:registry[e.employeeId]?.name||e.staffName,totalXP:Number(registry[e.employeeId]?.xp)||0,
   workPoints:0,expectedWorkXP:0,creditedWorkXP:0,missingWorkXP:0,expectedRevenueXP:0,creditedRevenueXP:0,missingRevenueXP:0};
  if(e.source==='work'){
   summary.workPoints=Number((summary.workPoints+e.originalValue).toFixed(2));summary.expectedWorkXP+=e.amount;summary.creditedWorkXP+=Math.min(e.amount,already);summary.missingWorkXP+=amount;
  }else{summary.expectedRevenueXP+=e.amount;summary.creditedRevenueXP+=Math.min(e.amount,already);summary.missingRevenueXP+=amount;}
  staffTotals.set(e.employeeId,summary);
  if(!amount)continue;
  // If there is no original order ID, a manager must review the legacy entry;
  // archive IDs still make retrying the same proposal idempotent.
  let remaining=amount;
  const workAwards=e.orderId?(e.workParts||[]).flatMap(part=>{
   const id='live:'+hash('work',kind,e.orderId,part.action,e.employeeId);
   if(ledger[id]||remaining<=0)return [];
   const value=Math.min(remaining,part.amount);remaining-=value;
   return [{eventId:id,amount:value}];
  }):null;
  pending.push({...e,eventId:recoveryId,amount,expectedXP:e.amount,creditedXP:already,liveIds,kind,workAwards,needsReview:e.source==='work'&&(!e.orderId||e.rateUncertain||remaining>0)});
 }
 return {pending,scanned:events.length,staffTotals:[...staffTotals.values()].sort((a,b)=>a.name.localeCompare(b.name,'vi')),fromDate,toDate:today};
}
exports.staffIsPrestigeAdmin=onCall(opts,async req=>{
 let admin=false;try{await assertManager(req);admin=true;}catch(_){}
 return {admin,autoXP:autoXP()};
});
exports.staffPreviewArchiveXP=onCall(opts,async req=>{
 await assertManager(req);
 const {pending,scanned,staffTotals,fromDate,toDate}=await pendingProposals(req.data?.scope),totals={revenueXP:0,workXP:0};
 for(const e of pending)totals[e.source==='revenue'?'revenueXP':'workXP']+=e.amount;
 // UI pages through pending entries by approving batches; always re-evaluate
 // the entire history so already-paid first pages cannot starve later staff.
 return {pending:pending.slice(0,100),pendingCount:pending.length,scanned,totals,staffTotals,fromDate,toDate,autoXP:autoXP()};
});
exports.staffApproveArchiveXP=onCall(opts,async req=>{
 const manager=await assertManager(req),ids=req.data?.eventIds;
 if(!Array.isArray(ids)||ids.length<1||ids.length>50||ids.some(x=>typeof x!=='string'||!/^repair:[a-f0-9]{40}$/.test(x))||new Set(ids).size!==ids.length)
  throw new HttpsError('invalid-argument','Chọn từ 1 đến 50 sự kiện hợp lệ');
 const approved=new Map((await pendingProposals()).pending.map(e=>[e.eventId,e])),result=[];
 for(const id of ids){
  const e=approved.get(id);
  if(!e){result.push({duplicate:true});continue;}
  if(e.needsReview)throw new HttpsError('failed-precondition','Sự kiện chưa đủ ID nguồn hoặc bằng chứng mức XP; cần đối chiếu thủ công trước khi cấp XP.');
  if(e.source==='revenue'){
   const claim=getDatabase().ref('staffXpSaleClaims/'+e.kind+'/'+e.date+'/'+hash(e.kind,e.index));
   const tx=await claim.transaction(v=>v&&v.employeeId!==e.employeeId?undefined:v||{employeeId:e.employeeId,table:e.index,createdAt:Date.now()},undefined,false);
   if(!tx.committed)throw new HttpsError('failed-precondition','Bàn đã ghi nhận cho Staff ID khác: '+e.index);
  }
  // A repair uses the live revenue ID when no prior receipts exist, sharing
  // idempotency with live retries for the same table/day/person.
  const awardId=e.source==='revenue'&&e.creditedXP===0?e.liveIds[0]:e.eventId;
  if(e.workAwards){
   const grants=[];
   for(const grant of e.workAwards)grants.push(await prestige._awardTrustedLiveXP({employeeId:e.employeeId,eventId:grant.eventId,source:'work',amount:grant.amount},{skipRebuild:true}));
   result.push({duplicate:grants.every(g=>g.duplicate)});
  }else result.push(await prestige._awardTrustedLiveXP({employeeId:e.employeeId,eventId:awardId,source:e.source,amount:e.amount},{skipRebuild:true}));
  await getDatabase().ref('staffXpRepairAudit/'+id).set({employeeId:e.employeeId,amount:e.amount,approvedBy:manager,at:Date.now(),date:e.date});
 }
 await prestige._rebuildPrestige();
 return {processed:result.length,credited:result.filter(r=>!r.duplicate).length,duplicates:result.filter(r=>r.duplicate).length};
});
module.exports._fromSession=fromSession;
module.exports._nameDirectory=nameDirectory;
module.exports._staffId=staffId;
module.exports._pointsForOrder=pointsForOrder;
