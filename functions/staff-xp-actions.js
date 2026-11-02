'use strict';
/*
 * Secure staff XP: a verified employee must perform the business mutation
 * through this callable. Do not award XP from client-writable Firestore
 * snapshots. Legacy UI writes remain operational, but are NOT rewarded.
 */
const crypto=require('node:crypto');
const {onCall,HttpsError}=require('firebase-functions/v2/https');
const {getFirestore}=require('firebase-admin/firestore');
const {getDatabase}=require('firebase-admin/database');
const prestige=require('./staff-prestige');
const live=require('./staff-xp-live-engine.cjs');
const xp=require('./staff-xp-engine.cjs');
const daily=require('./staff-daily-missions');
const opts={region:'asia-southeast1',maxInstances:8,timeoutSeconds:60};
const KINDS=new Set(['lounge_tables','bun_tables','show_tables','lounge_orders','bun_orders','res_orders']);
const SHOW=new Set(['combo1','combo2','combo3','singer1','singer2','singer3']);
const EXCLUDED=new Set(['FOC','TA_UNPAID','KTOUR']);
function fail(msg){throw new HttpsError('invalid-argument',msg);}
function str(x,n=100){if(typeof x!=='string')return '';return x.normalize('NFC').trim().replace(/\s+/g,' ').slice(0,n);}
function uid(req){if(!req.auth?.uid)throw new HttpsError('unauthenticated','Cần xác thực nhân viên');return req.auth.uid;}
function idOf(value){const id=str(value,70);if(!id||id.length>64||id.includes('/')||/[#?[\]\u0000-\u001f]/.test(id))fail('Mã bàn/đơn không hợp lệ');return id;}
function hash(...a){return crypto.createHash('sha256').update(a.join('|')).digest('hex').slice(0,40);}
function vnDay(){return new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Ho_Chi_Minh'});}
function dateTime(){return new Date().toLocaleTimeString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});}
async function staff(req){
 const u=uid(req),db=getDatabase();
 const identity=(await db.ref('staffIdentity/'+u).once('value')).val();
 if(identity?.verified!==true||!identity.employeeId)throw new HttpsError('permission-denied','Cần Staff ID do quản lý xác minh. Hồ sơ tự đăng ký chưa được cấp XP.');
 const p=(await db.ref('staffRegistry/'+identity.employeeId).once('value')).val();
 if(!p?.active||(p.registrationSource==='self'&&p.approved!==true))throw new HttpsError('permission-denied','Hồ sơ chưa được quản lý duyệt');
 if(!/^DOL-(?:[0-9]{4,6}|[A-F0-9]{10})$/.test(p.employeeId))throw new HttpsError('permission-denied','Staff ID không hợp lệ');
 const managers=new Set(String(process.env.STAFF_ADMIN_UIDS||'').split(',').map(x=>x.trim()));
 return {id:p.employeeId,name:p.name,uid:u,admin:managers.has(u)};
}
async function credit(employeeId,eventId,source,amount){
 if(amount<=0)return {duplicate:true};
 const result=await prestige._awardTrustedLiveXP({employeeId,eventId,source,amount});
 return {duplicate:!!result.duplicate,amount:result.duplicate?0:amount};
}
async function onceSale(kind,id,who,amount){
 if(amount<=0)return {amount:0,duplicate:false};
 // Single claim per live table per VN day, even across different staff IDs.
 const day=vnDay(),token=hash(kind,id),ref=getDatabase().ref('staffXpSaleClaims/'+kind+'/'+day+'/'+token);
 const claimed=await ref.transaction(v=>{
  if(v&&v.employeeId!==who.id)return;
  return v||{employeeId:who.id,table:id,createdAt:Date.now()};
 },undefined,false);
 if(!claimed.committed)throw new HttpsError('failed-precondition','Bàn đã được tính XP cho nhân viên khác trong ngày');
 return credit(who.id,'live:'+hash('sale',kind,id,day,who.id),'revenue',amount);
}
async function dailyBonus(employeeId,mission){
 try{return (await daily._award(employeeId,mission)).addedXP||0;}
 catch(e){console.warn('[Crew Daily] Action saved, mission deferred:',mission,e?.message||e);return 0;}
}
function payment(v){const s=str(v,40);if(!s)fail('Thiếu phương thức thanh toán');return s;}
function stringMap(m){
 if(!m||typeof m!=='object'||Array.isArray(m))return {};
 const out={};
 for(const [key,v] of Object.entries(m)){
  if(!/^[\w -]{1,72}$/.test(key)||!Number.isSafeInteger(v)||v<0||v>100)fail('Số lượng đồ ăn/đồ uống không hợp lệ');
  if(v)out[key]=v;
 }
 return out;
}
async function booking(kind,id,data,who){
 const db=getFirestore(),ref=db.collection(kind).doc(id);
 const pay=payment(data.paymentMethod||data.payment);
 const existing=await db.runTransaction(async tx=>{
  const old=await tx.get(ref),v=old.exists?old.data():null;
  const owner=str(kind==='show_tables'?v?.seller:v?.openedByStaff);
  if(owner&&owner!==who.name&&!who.admin)throw new HttpsError('permission-denied','Bàn đang được mở bởi nhân viên khác');
  const preserveOwner=!!(owner&&owner!==who.name&&who.admin);
  let update;
  if(kind==='lounge_tables'){
   const pax=Number(data.pax);
   if(!Number.isSafeInteger(pax)||pax<1||pax>200)fail('Pax phải trong khoảng 1–200');
   if(!str(data.customerName))fail('Thiếu tên khách');
   update={customerName:str(data.customerName,100),pax,restaurantTable:str(data.restaurantTable,30),paymentMethod:pay,openedByStaff:preserveOwner?owner:who.name,...(preserveOwner?{}:{openedByStaffId:who.id}),updatedBy:who.name,updatedAt:Date.now(),focReason:str(data.focReason||'',200)};
  }else if(kind==='bun_tables'){
   if(!str(data.customerName)||!str(data.restaurantTable))fail('Thiếu tên khách hoặc bàn nhà hàng');
   update={customerName:str(data.customerName,100),restaurantTable:str(data.restaurantTable,30),paymentMethod:pay,openedByStaff:preserveOwner?owner:who.name,...(preserveOwner?{}:{openedByStaffId:who.id}),updatedBy:who.name,updatedAt:Date.now(),focReason:str(data.focReason||'',200)};
  }else{
   const guests=Number(data.guests);
   if(!Number.isSafeInteger(guests)||guests<1||guests>300)fail('Số khách không hợp lệ');
   if(!str(data.leader)||!str(data.dining))fail('Thiếu trưởng đoàn hoặc bàn nhà hàng');
   update={label:str(data.label||id,70),leader:str(data.leader),dining:str(data.dining,50),guests,payment:pay,focNote:str(data.focNote||'',200),seller:preserveOwner?owner:who.name,...(preserveOwner?{}:{sellerStaffId:who.id}),updatedAt:Date.now()};
  }
  tx.set(ref,update,{merge:true});
  return {before:v,after:{...v,...update},payment:pay,preserveOwner};
 });
 if(kind==='show_tables'){
  if(existing.preserveOwner)return {saved:true,xpAwarded:0,managerOverride:true};
  // Proof of an actual verified booking, independent of client-writable show_tables.
  await getDatabase().ref('staffXpShowProofs/'+hash(id)).set({employeeId:who.id,payment:pay,day:vnDay(),updatedAt:Date.now()});
  return {saved:true,xpAwarded:0};
 }
 if(existing.preserveOwner)return {saved:true,xpAwarded:0,managerOverride:true};
 const amount=live.tableValue(kind,existing.after);
 const grant=await onceSale(kind,id,who,xp.revenueXP(amount));
 const missionXP=!existing.before&&['bun_tables','lounge_tables'].includes(kind)
  ?await dailyBonus(who.id,kind==='bun_tables'?'bungalow_opened':'lounge_opened'):0;
 return {saved:true,xpAwarded:grant.amount,missionXP,duplicate:grant.duplicate};
}
async function combo(id,data,who){
 const code=str(data.combo,24);
 if(!SHOW.has(code))fail('Combo không được hỗ trợ');
 const db=getFirestore(),ref=db.collection('show_tables').doc(id);
 const proof=(await getDatabase().ref('staffXpShowProofs/'+hash(id)).once('value')).val();
 if((!proof||proof.employeeId!==who.id||proof.day!==vnDay())&&!who.admin)throw new HttpsError('failed-precondition','Cần lưu đặt bàn bằng Staff ID đã xác minh trước khi tính doanh thu Show.');
 const service={combo:code,package:str(data.package||'',50),drinks:stringMap(data.drinks),foods:stringMap(data.foods),status:'pending',savedAt:Date.now()};
 if(!Object.keys(service.drinks).length&&!Object.keys(service.foods).length)fail('Combo phải có món');
 await db.runTransaction(async tx=>{
  const snap=await tx.get(ref);
  if(!snap.exists)throw new HttpsError('not-found','Không tìm thấy bàn Show');
  if(str(snap.data()?.seller)!==who.name&&!who.admin)throw new HttpsError('permission-denied','Bàn thuộc nhân viên khác');
  tx.update(ref,{service});
 });
 if(who.admin&&(!proof||proof.employeeId!==who.id))return {saved:true,xpAwarded:0,managerOverride:true};
 const amount=proof.payment.toUpperCase()==='FOC'?0:xp.revenueXP(live.tableValue('show_tables',{seller:who.name,payment:proof.payment,service}));
 const grant=await onceSale('show_tables',id,who,amount);
 return {saved:true,xpAwarded:grant.amount,duplicate:grant.duplicate};
}
async function work(kind,id,action,who){
 if(!['preparing','completed'].includes(action))fail('Trạng thái công việc không hợp lệ');
 const ref=getFirestore().collection(kind).doc(id),now=Date.now();
 const transition=await getFirestore().runTransaction(async tx=>{
  const snap=await tx.get(ref);
  if(!snap.exists)throw new HttpsError('not-found','Không tìm thấy đơn');
  const old=snap.data()||{};
  if(old.status==='cancelled'||old.status==='completed'&&(action!=='completed'||old.completedBy!==who.name))throw new HttpsError('failed-precondition','Đơn đã hoàn thành hoặc bị hủy');
  if(action==='completed'){
   if(!['preparing','pending','completed'].includes(old.status))throw new HttpsError('failed-precondition','Trạng thái đơn không hợp lệ');
   if(old.status!=='completed')tx.update(ref,{status:'completed',completedBy:who.name,completedByStaffId:who.id,completedAt:now,completedTime:dateTime()});
  }else{
   const names=live.names(old.preparedBy);
   if(!names.some(n=>n===who.name))names.push(who.name);
   tx.update(ref,{status:'preparing',preparedBy:names.join(' & '),...(old.status==='pending'?{preparedByStaffId:who.id}:{}),preparedAt:now});
  }
  return {accepted:action==='preparing'&&old.status==='pending',finished:action==='completed'&&old.status!=='completed'};
 });
 const evt='live:'+hash('work',kind,id,action,who.id);
 const preparedBefore=action==='completed'?(await getDatabase().ref('staffXpLedger/'+who.id+'/live:'+hash('work',kind,id,'preparing',who.id)).once('value')).exists():false;
 const lounge=kind==='lounge_orders';
 const amount=action==='preparing'?(lounge?1:5):preparedBefore?(lounge?1.5:5):(lounge?2.5:10);
 const grant=await credit(who.id,evt,'work',amount);
 const missionXP=transition.accepted?await dailyBonus(who.id,'order_received'):
  transition.finished?await dailyBonus(who.id,'order_completed'):0;
 return {saved:true,xpAwarded:grant.amount,missionXP,duplicate:grant.duplicate};
}
exports.staffRecordLiveAction=onCall(opts,async req=>{
 const who=await staff(req),data=req.data||{},kind=str(data.kind,32),id=idOf(data.id);
 if(!KINDS.has(kind))fail('Phân hệ không hợp lệ');
 if(kind.endsWith('_orders'))return work(kind,id,str(data.action,24),who);
 if(kind==='show_tables'&&data.action==='combo')return combo(id,data.data||{},who);
 if(data.action!=='booking')fail('Thao tác không hợp lệ');
 return booking(kind,id,data.data||{},who);
});

