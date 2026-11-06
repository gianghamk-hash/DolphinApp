'use strict';
/*
 * Secure staff XP: a verified employee must perform the business mutation
 * through this callable. Do not award XP from client-writable Firestore
 * snapshots. Legacy UI writes remain operational, but are NOT rewarded.
 */
const crypto=require('node:crypto');
const {onDocumentCreated}=require('firebase-functions/v2/firestore');
const {onCall,HttpsError}=require('firebase-functions/v2/https');
const {getFirestore}=require('firebase-admin/firestore');
const {getDatabase}=require('firebase-admin/database');
const prestige=require('./staff-prestige');
const live=require('./staff-xp-live-engine.cjs');
const xp=require('./staff-xp-engine.cjs');
const namePolicy=require('./staff-name-policy.cjs');
const daily=require('./staff-daily-missions');
const dayCore=require('./staff-daily-core.cjs');
const opts={region:'asia-southeast1',maxInstances:8,timeoutSeconds:60};
const KINDS=new Set(['lounge_tables','bun_tables','show_tables','res_tables','lounge_orders','bun_orders','res_orders']);
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
 if(!identity?.employeeId)throw new HttpsError('permission-denied','Thiết bị chưa liên kết Staff ID. Vui lòng liên kết hồ sơ đã có.');
 const p=(await db.ref('staffRegistry/'+identity.employeeId).once('value')).val();
 if(!p?.active)throw new HttpsError('permission-denied','Hồ sơ nhân viên không còn hoạt động.');
 if(p.registrationSource==='self'&&p.approved!==true)throw new HttpsError('permission-denied','Hồ sơ chưa được quản lý duyệt');
 // Match staffGetIdentity: the authoritative registry approval grants verified
 // access even if one linked device still has a stale identity.verified=false.
 // A self-registered but UNAPPROVED profile can never pass this check.
 const verified=identity.verified===true||p.approved===true;
 if(!verified)throw new HttpsError('permission-denied','Cần Staff ID do quản lý xác minh. Hồ sơ tự đăng ký chưa được cấp XP.');
 const registry=(await db.ref('staffRegistry').once('value')).val()||{};
 if(namePolicy.needsRename(registry,p.employeeId))throw new HttpsError('permission-denied','Hãy cập nhật họ tên Staff ID trước khi tiếp tục nghiệp vụ.');
 if(!/^DOL-(?:[0-9]{4,6}|[A-F0-9]{10})$/.test(p.employeeId))throw new HttpsError('permission-denied','Staff ID không hợp lệ');
 const managers=new Set(String(process.env.STAFF_ADMIN_UIDS||'').split(',').map(x=>x.trim()));
 // DOL-0001 is an existing verified manager account; a Manager APK or
 // client-side Master PIN is not proof of server-side authorization.
 const masterVerified=p.employeeId==='DOL-0001'&&p.registrationSource!=='self'&&identity.verified===true;
 return {id:p.employeeId,name:p.name,nameAliases:Array.isArray(p.nameAliases)?p.nameAliases.filter(x=>typeof x==='string'):[],uid:u,admin:managers.has(u)||masterVerified};
}
async function credit(employeeId,eventId,source,amount){
 if(amount<=0)return {duplicate:true};
 const result=await prestige._awardTrustedLiveXP({employeeId,eventId,source,amount});
 return {duplicate:!!result.duplicate,amount:result.duplicate?0:amount};
}
async function onceSale(kind,id,who,amount,day=vnDay()){
 if(amount<=0)return {amount:0,duplicate:false};
 // Single claim per live table per VN day, even across different staff IDs.
 const token=hash(kind,id),ref=getDatabase().ref('staffXpSaleClaims/'+kind+'/'+day+'/'+token);
 const claimed=await ref.transaction(v=>{
  if(v&&v.employeeId!==who.id)return;
  return v||{employeeId:who.id,table:id,createdAt:Date.now()};
 },undefined,false);
 if(!claimed.committed)throw new HttpsError('failed-precondition','Bàn đã được tính XP cho nhân viên khác trong ngày');
 return credit(who.id,'live:'+hash('sale',kind,id,day,who.id),'revenue',amount);
}
// This collection is server-only. The business write and its XP obligation
// commit in ONE Firestore transaction; retries never infer trust from an order.
const OUTBOX='dolphin_push_crew_xp_outbox';
function obligationKey(kind,id,action,who,day=vnDay()){
 return hash(kind,id,action,who.id,action==='sale'?day:'');
}
async function deliver(ref){
 const snap=await getFirestore().runTransaction(tx=>tx.get(ref));
 if(!snap.exists)return {amount:0,duplicate:true};
 const e=snap.data();
 if(e.state==='done')return {amount:0,duplicate:true};
 const profile=(await getDatabase().ref('staffRegistry/'+e.employeeId).once('value')).val();
 if(!profile?.active){
  await getFirestore().runTransaction(async tx=>{await tx.get(ref);tx.update(ref,{state:'inactive',deliveredAt:Date.now()});});
  return {amount:0,duplicate:true};
 }
 const grant=e.action==='sale'
  ?await onceSale(e.kind,e.id,{id:e.employeeId},e.amount,e.day)
  :await credit(e.employeeId,e.eventId,'work',e.amount);
 const missionXP=e.mission?(await daily._award(e.employeeId,e.mission,e.createdAt)).addedXP||0:0;
 await getFirestore().runTransaction(async tx=>{const current=(await tx.get(ref)).data();if(current?.amount===e.amount&&current?.createdAt===e.createdAt)tx.update(ref,{state:'done',deliveredAt:Date.now()});});
 return {...grant,missionXP};
}
function obligation(tx,ref,old,data){
 if(!old.exists||(!old.data().amount&&data.amount>0))tx.set(ref,{...data,state:'pending',createdAt:Date.now()});
}
exports.staffDeliverPendingXP=onDocumentCreated({region:opts.region,document:OUTBOX+'/{event}',retry:true},event=>deliver(event.data.ref));
// Internal, scoped to the identity resolved by staffGetMyProgress. Eventarc
// retries remain active while the app is closed; profile refresh also repairs
// obligations that predate worker creation or outlive the event retry window.
exports._retryPendingForEmployee=async employeeId=>{
 const page=await getFirestore().collection(OUTBOX).where('employeeId','==',employeeId).where('state','==','pending').limit(20).get();
 const results=await Promise.allSettled(page.docs.map(doc=>deliver(doc.ref)));
 const failed=results.filter(result=>result.status==='rejected').length;
 if(failed)console.warn('[Crew XP] Some personal obligations remain pending:',failed);
 return {processed:page.docs.length,failed};
};

function payment(v){const s=str(v,40);if(!s)fail('Thiếu phương thức thanh toán');return s;}
function stringMap(m){
 if(!m||typeof m!=='object'||Array.isArray(m))return {};
 const out={};
 for(const [key,v] of Object.entries(m)){
  if(!key.trim()||key.length>100||/[\u0000-\u001f]/.test(key)||['__proto__','constructor','prototype'].includes(key)||!Number.isSafeInteger(v)||v<0||v>100)fail('Số lượng đồ ăn/đồ uống không hợp lệ');
  if(v)out[key]=v;
 }
 return out;
}
async function booking(kind,id,data,who,{editOnly=false}={}){
 const db=getFirestore(),ref=db.collection(kind).doc(id);
 const pay=payment(data.paymentMethod||data.payment),day=vnDay();
 const queue=db.collection(OUTBOX).doc(obligationKey(kind,id,'sale',who,day));
 const existing=await db.runTransaction(async tx=>{
  const old=await tx.get(ref),v=old.exists?old.data():null;
  const queued=await tx.get(queue);
  if(editOnly&&!v)throw new HttpsError('failed-precondition','Bàn không còn tồn tại. Hãy tải lại trước khi cập nhật.');
  const owner=str(kind==='show_tables'?v?.seller:v?.openedByStaff);
  const ownerId=str(kind==='show_tables'?v?.sellerStaffId:v?.openedByStaffId,70);
  // A stable Staff ID is authoritative when present. Legacy name-only tables
  // can match the same verified staff member's server-side name aliases.
  const sameOwner=ownerId?ownerId===who.id
   :!!owner&&[who.name,...who.nameAliases].some(n=>namePolicy.key(n)===namePolicy.key(owner));
  const differentOwner=!!(ownerId||owner)&&!sameOwner;
  const previousAt=Number(v?.updatedAt);
  const previousTour=Number.isFinite(previousAt)&&previousAt>0&&
   dayCore.vietnamDay(previousAt)!==dayCore.vietnamDay(Date.now());
  // Bungalow/Lounge tables are reused by different staff on a new tour day.
  // Never let a new user take over an occupied table within the same day.
  const newTourOpening=!editOnly&&previousTour&&
   (kind==='bun_tables'||kind==='lounge_tables');
  if(differentOwner&&!who.admin&&!newTourOpening)throw new HttpsError('permission-denied','Bàn do nhân viên khác mở. Chỉ người mở bàn hoặc quản lý đã xác minh mới được cập nhật.');
  // Manager correction updates current-day customer/PAX/payment without stealing seller XP.
  if(editOnly&&!owner&&!ownerId&&!who.admin)throw new HttpsError('permission-denied','Bàn chưa có nhân viên mở. Cần quản lý xác minh để chỉnh sửa.');
  const preserveOwner=editOnly||(differentOwner&&who.admin&&!newTourOpening);
  let update;
  if(kind==='lounge_tables'){
   const pax=Number(data.pax);
   if(!Number.isSafeInteger(pax)||pax<1||pax>200)fail('Pax phải trong khoảng 1–200');
   if(!str(data.customerName))fail('Thiếu tên khách');
   update={customerName:str(data.customerName,100),pax,restaurantTable:str(data.restaurantTable,30),paymentMethod:pay,openedByStaff:preserveOwner?owner:who.name,...(preserveOwner?{}:{openedByStaffId:who.id}),updatedBy:who.name,updatedByStaffId:who.id,updatedAt:Date.now(),focReason:str(data.focReason||'',200)};
  }else if(kind==='bun_tables'){
   if(!str(data.customerName)||!str(data.restaurantTable))fail('Thiếu tên khách hoặc bàn nhà hàng');
   update={customerName:str(data.customerName,100),restaurantTable:str(data.restaurantTable,30),paymentMethod:pay,openedByStaff:preserveOwner?owner:who.name,...(preserveOwner?{}:{openedByStaffId:who.id}),updatedBy:who.name,updatedByStaffId:who.id,updatedAt:Date.now(),focReason:str(data.focReason||'',200)};
  }else{
   const guests=Number(data.guests);
   if(!Number.isSafeInteger(guests)||guests<1||guests>300)fail('Số khách không hợp lệ');
   if(!str(data.leader)||!str(data.dining))fail('Thiếu trưởng đoàn hoặc bàn nhà hàng');
   update={label:str(data.label||id,70),leader:str(data.leader),dining:str(data.dining,50),guests,payment:pay,focNote:str(data.focNote||'',200),seller:preserveOwner?owner:who.name,...(preserveOwner?{}:{sellerStaffId:who.id}),updatedAt:Date.now()};
  }
  tx.set(ref,update,{merge:true});
  if(kind!=='show_tables'&&!editOnly&&!preserveOwner){
   const previousAt=Number(v?.updatedAt),newDaily=!v||!Number.isFinite(previousAt)||previousAt<=0||dayCore.vietnamDay(previousAt)!==day;
   obligation(tx,queue,queued,{kind,id,day,action:'sale',employeeId:who.id,amount:xp.revenueXP(live.tableValue(kind,{...v,...update})),
    mission:newDaily?(kind==='bun_tables'?'bungalow_opened':'lounge_opened'):null});
  }
  return {before:v,after:{...v,...update},payment:pay,preserveOwner};
 });
 if(kind==='show_tables'){
  if(existing.preserveOwner)return {saved:true,xpAwarded:0,managerOverride:true};
  // Proof of an actual verified booking, independent of client-writable show_tables.
  await getDatabase().ref('staffXpShowProofs/'+hash(id)).set({employeeId:who.id,payment:pay,day:vnDay(),updatedAt:Date.now()});
  return {saved:true,xpAwarded:0};
 }
 if(editOnly)return {saved:true,xpAwarded:0,missionXP:0,edited:true,managerOverride:existing.preserveOwner};
 if(existing.preserveOwner)return {saved:true,xpAwarded:0,managerOverride:true};
 const grant=await deliver(queue);
 return {saved:true,xpAwarded:grant.amount,missionXP:grant.missionXP||0,duplicate:grant.duplicate};
}
async function restaurantTable(id,data,who){
 // Restaurant tables carry no revenue XP under the current Crew Club rules.
 // The verified UID still owns the operational mutation and audit fields.
 const name=str(data.customerName,100);
 if(!name)fail('Thiếu tên khách của bàn Restaurant');
 const ref=getFirestore().collection('res_tables').doc(id);
 await getFirestore().runTransaction(async tx=>{
  const old=await tx.get(ref);
  tx.set(ref,{customerName:name,updatedBy:who.name,updatedByStaffId:who.id,updatedAt:Date.now()},{merge:true});
 });
 return {saved:true,xpAwarded:0,missionXP:0};
}
async function combo(id,data,who){
 const code=str(data.combo,24);
 if(!SHOW.has(code))fail('Combo không được hỗ trợ');
 const db=getFirestore(),ref=db.collection('show_tables').doc(id),day=vnDay();
 const queue=db.collection(OUTBOX).doc(obligationKey('show_tables',id,'sale',who,day));
 const proof=(await getDatabase().ref('staffXpShowProofs/'+hash(id)).once('value')).val();
 const currentProof=!!proof&&proof.employeeId===who.id&&proof.day===vnDay();
 const service={combo:code,package:str(data.package||'',50),drinks:stringMap(data.drinks),foods:stringMap(data.foods),status:'pending',savedAt:Date.now()};
 if(!Object.keys(service.drinks).length&&!Object.keys(service.foods).length)fail('Combo phải có món');
 await db.runTransaction(async tx=>{
  const snap=await tx.get(ref),queued=await tx.get(queue);
  if(!snap.exists)throw new HttpsError('not-found','Không tìm thấy bàn Show');
  const table=snap.data()||{};
  const ownerId=str(table.sellerStaffId,70);
  // Stable Staff ID is authoritative. For old name-only bookings use only
  // aliases provided by the authenticated employee's server-side profile.
  const matches=ownerId?ownerId===who.id:
   [who.name,...who.nameAliases].some(n=>namePolicy.key(n)===namePolicy.key(str(table.seller)));
  if(!matches&&!who.admin)throw new HttpsError('permission-denied','Bàn thuộc nhân viên khác');
  tx.update(ref,{service});
  if(currentProof)obligation(tx,queue,queued,{kind:'show_tables',id,day,action:'sale',employeeId:who.id,
   amount:proof.payment.toUpperCase()==='FOC'?0:xp.revenueXP(live.tableValue('show_tables',{seller:who.name,payment:proof.payment,service})),mission:null});
 });
 // Legacy client-written bookings have no trusted XP proof. Save the actual
 // service operation, but never mint revenue XP from an untrusted booking.
 // The UI can offer to re-save this booking via the verified staff callable.
 if(!currentProof)return {saved:true,xpAwarded:0,requiresVerifiedBooking:true,managerOverride:who.admin};
 const amount=proof.payment.toUpperCase()==='FOC'?0:xp.revenueXP(live.tableValue('show_tables',{seller:who.name,payment:proof.payment,service}));
 const grant=await deliver(queue);
 return {saved:true,xpAwarded:grant.amount,duplicate:grant.duplicate};
}
async function work(kind,id,action,who){
 if(!['preparing','completed'].includes(action))fail('Trạng thái công việc không hợp lệ');
 const ref=getFirestore().collection(kind).doc(id),now=Date.now();
 const evt='live:'+hash('work',kind,id,action,who.id);
 const queue=getFirestore().collection(OUTBOX).doc(obligationKey(kind,id,action,who));
 const prep=getFirestore().collection(OUTBOX).doc(obligationKey(kind,id,'preparing',who));
 const oldPrepared=action==='completed'&&(await getDatabase().ref('staffXpLedger/'+who.id+'/live:'+hash('work',kind,id,'preparing',who.id)).once('value')).exists();
 const transition=await getFirestore().runTransaction(async tx=>{
  const snap=await tx.get(ref),queued=await tx.get(queue),preparation=await tx.get(prep);
  if(!snap.exists)throw new HttpsError('not-found','Không tìm thấy đơn');
  const old=snap.data()||{};
  if(old.status==='cancelled')throw new HttpsError('failed-precondition','Đơn đã bị hủy');
  if(old.status==='completed'){
   if(action==='completed'&&(old.completedByStaffId===who.id||(!old.completedByStaffId&&old.completedBy===who.name)))return {accepted:false,finished:false};
   throw new HttpsError('failed-precondition','Đơn đã hoàn thành');
  }
  if(!['pending','preparing'].includes(old.status))throw new HttpsError('failed-precondition','Trạng thái đơn không hợp lệ');
  if(action==='completed')tx.update(ref,{status:'completed',completedBy:who.name,completedByStaffId:who.id,completedAt:now,completedTime:dateTime()});
  else{
   const names=live.names(old.preparedBy);
   // A client-written attribution is not proof of a verified server action.
   if(names.some(n=>n===who.name))return {accepted:false,finished:false,prepared:false};
   names.push(who.name);
   tx.update(ref,{status:'preparing',preparedBy:names.join(' & '),...(old.status==='pending'?{preparedByStaffId:who.id}:{}),preparedAt:now});
  }
  const lounge=kind==='lounge_orders',prepared=oldPrepared||preparation.exists;
  const points=action==='preparing'?(lounge?0.2:0.5):prepared?(lounge?0.3:0.5):(lounge?0.5:1);
  obligation(tx,queue,queued,{kind,id,action,employeeId:who.id,eventId:evt,amount:xp.workXP(points),
   mission:action==='completed'?'order_completed':old.status==='pending'?'order_received':null});
  return {accepted:action==='preparing'&&old.status==='pending',prepared:action==='preparing',finished:action==='completed'};
 });
 // Only the server-only obligation is deliverable, including on an otherwise
 // no-op retry of an already completed order. A forged client order has none.
 const grant=await deliver(queue);
 return {saved:true,xpAwarded:grant.amount,missionXP:grant.missionXP||0,duplicate:grant.duplicate};
}
exports.staffRecordLiveAction=onCall(opts,async req=>{
 const who=await staff(req),data=req.data||{},kind=str(data.kind,32),id=idOf(data.id);
 if(!KINDS.has(kind))fail('Phân hệ không hợp lệ');
 if(kind.endsWith('_orders'))return work(kind,id,str(data.action,24),who);
 if(kind==='res_tables'){
  if(data.action!=='booking')fail('Thao tác Restaurant không hợp lệ');
  return restaurantTable(id,data.data||{},who);
 }
 if(kind==='show_tables'&&data.action==='combo')return combo(id,data.data||{},who);
 const editOnly=kind==='lounge_tables'&&data.action==='update';
 if(data.action!=='booking'&&!editOnly)fail('Thao tác không hợp lệ');
 return booking(kind,id,data.data||{},who,{editOnly});
});

