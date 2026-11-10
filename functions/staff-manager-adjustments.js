'use strict';
/* Manager-only corrections. Operational orders, source revenue and XP receipts are immutable.
 * Human corrections are separate, idempotent records bound to verified DOL-0001. */
const {getDatabase}=require('firebase-admin/database');
const {onCall,HttpsError}=require('firebase-functions/v2/https');
const engine=require('./staff-xp-engine.cjs');
const opts={region:'asia-southeast1',maxInstances:5,timeoutSeconds:30};
const ID=/^DOL-(?:[0-9]{4,6}|[A-F0-9]{10})$/;
const RECEIPT=/^[A-Za-z0-9_-]{16,80}$/;
const MAX_XP_CHANGE=1000000,MAX_REVENUE_CHANGE=100000000;

function mondayVN(now=Date.now()){
 const pieces=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{
  timeZone:'Asia/Ho_Chi_Minh',year:'numeric',month:'2-digit',day:'2-digit'
 }).formatToParts(new Date(now)).filter(p=>p.type!=='literal').map(p=>[p.type,p.value]));
 const day=Date.UTC(Number(pieces.year),Number(pieces.month)-1,Number(pieces.day));
 const weekday=new Date(day).getUTCDay();
 const monday=day-(weekday===0?6:weekday-1)*86400000;
 return {week:new Date(monday).toISOString().slice(0,10),weekStart:monday-7*3600000};
}
function approved(v){return !!v?.active&&(v.registrationSource!=='self'||v.approved===true);}
function input(data){
 const employeeId=String(data?.employeeId||'').trim().toUpperCase();
 const kind=String(data?.kind||'');
 const requestId=String(data?.requestId||'');
 const reason=String(data?.reason||'').normalize('NFC').trim().replace(/\s+/g,' ');
 const amount=data?.amount;
 if(!ID.test(employeeId)||employeeId==='DOL-0001')
  throw new HttpsError('invalid-argument','Chỉ điều chỉnh Staff ID nhân viên hợp lệ, không áp dụng DOL-0001.');
 if(!['xp_add','xp_deduct','revenue_deduct'].includes(kind))
  throw new HttpsError('invalid-argument','Loại điều chỉnh không hợp lệ.');
 if(!RECEIPT.test(requestId))
  throw new HttpsError('invalid-argument','Mã giao dịch không hợp lệ.');
 if(reason.length<5||reason.length>240||/[\u0000-\u001f]/.test(reason))
  throw new HttpsError('invalid-argument','Cần ghi rõ lý do từ 5 đến 240 ký tự.');
 const limit=kind==='revenue_deduct'?MAX_REVENUE_CHANGE:MAX_XP_CHANGE;
 if(!Number.isSafeInteger(amount)||amount<1||amount>limit)
  throw new HttpsError('invalid-argument','Số điểm phải là số nguyên dương trong giới hạn cho phép.');
 return {employeeId,kind,requestId,reason,amount};
}
async function requireOwner(req){
 // Reuse the server-side UID -> Staff ID manager gate. An APK user agent
 // and client-provided employeeId never grant authority.
 return require('./staff-profile')._requireAccessManager(req);
}
async function employee(db,id){
 const profile=(await db.ref('staffRegistry/'+id).once('value')).val();
 if(!approved(profile)||profile.employeeId!==id)
  throw new HttpsError('failed-precondition','Nhân viên không tồn tại, không hoạt động hoặc chưa được duyệt.');
 return profile;
}
function receiptMatches(entry,args){
 return entry?.kind===args.kind&&entry.amount===args.amount&&entry.reason===args.reason;
}
exports.staffManagerAdjustEmployee=onCall(opts,async req=>{
 const byUid=await requireOwner(req),args=input(req.data);
 const db=getDatabase(),initial=await employee(db,args.employeeId),now=Date.now();
 const event={requestId:args.requestId,kind:args.kind,amount:args.amount,reason:args.reason,at:now,byUid};
 if(args.kind==='revenue_deduct'){
  const {week,weekStart}=mondayVN(now),ref=db.ref('staffRevenueScoreAdjustments/'+week+'/'+args.employeeId);
  const result=await ref.transaction(current=>{
   const old=current||{totalDeducted:0,events:{}};
   if(old.events?.[args.requestId])return;
   const before=Number(old.totalDeducted)||0,after=before+args.amount;
   if(!Number.isSafeInteger(after))return;
   return {...old,totalDeducted:after,
    events:{...old.events,[args.requestId]:{...event,week,before,after}}};
  },undefined,false);
  const saved=result.committed?result.snapshot.val():(await ref.once('value')).val();
  const existing=saved?.events?.[args.requestId];
  if(!existing||!receiptMatches(existing,args))
   throw new HttpsError('failed-precondition','Không lưu được điều chỉnh doanh thu.');
  return {saved:true,duplicate:!result.committed,employeeId:args.employeeId,
   kind:args.kind,amount:args.amount,week,weekStart,
   totalDeducted:saved.totalDeducted,requestId:args.requestId};
 }
 const ref=db.ref('staffRegistry/'+args.employeeId);
 const result=await ref.transaction(current=>{
  if(current===null)return null; // Force Firebase to fetch server state on cold cache.
  if(!approved(current)||current.employeeId!==args.employeeId)return;
  if(current.managerScoreCorrections?.[args.requestId])return;
  const before=Number(current.xp)||0;
  if(!Number.isFinite(before)||before<0)return;
  const after=Number((before+(args.kind==='xp_add'?args.amount:-args.amount)).toFixed(2));
  if(after<0||after>engine.xpForLevel(60)||!Number.isFinite(after))return;
  const next={...current,xp:after,updatedAt:now,
   managerScoreCorrections:{...current.managerScoreCorrections,
    [args.requestId]:{...event,before,after}}};
  // Retain historical levelPeak for audit only. Usable effects follow live XP.
  next.levelPeak=Math.max(Number(current.levelPeak)||1,engine.levelForXP(after));
  return engine.equipOnLevelUp(current,next);
 },undefined,false);
 const saved=result.committed?result.snapshot.val():(await ref.once('value')).val();
 const existing=saved?.managerScoreCorrections?.[args.requestId];
 if(!existing||!receiptMatches(existing,args))
  throw new HttpsError('failed-precondition','Không lưu được XP. Kiểm tra số XP hiện có và hạn mức.');
 try{await require('./staff-prestige')._rebuildPrestige();}
 catch(e){console.warn('[Manager corrections] XP saved; public ranking refresh pending:',e.message);}
 return {saved:true,duplicate:!result.committed,employeeId:args.employeeId,
  kind:args.kind,amount:args.amount,before:existing.before,after:existing.after,
  currentLevel:engine.levelForXP(existing.after),
  highestLevel:Math.max(engine.levelForXP(existing.after),Number(saved.levelPeak)||1),
  requestId:args.requestId};
});
exports.staffManagerGetEmployeeAdjustments=onCall(opts,async req=>{
 await requireOwner(req);
 const employeeId=String(req.data?.employeeId||'').trim().toUpperCase();
 if(!ID.test(employeeId)||employeeId==='DOL-0001')throw new HttpsError('invalid-argument','Staff ID không hợp lệ.');
 const db=getDatabase(),profile=await employee(db,employeeId),{week}=mondayVN();
 const rev=(await db.ref('staffRevenueScoreAdjustments/'+week+'/'+employeeId).once('value')).val()||{};
 const entries=v=>Object.values(v||{}).sort((a,b)=>b.at-a.at).slice(0,25)
  .map(x=>({kind:x.kind,amount:x.amount,reason:x.reason,at:x.at,requestId:x.requestId,before:x.before,after:x.after}));
 return {employeeId,name:profile.name,xp:Number(profile.xp)||0,
  currentLevel:engine.levelForXP(Math.max(0,Number(profile.xp)||0)),
  highestLevel:Math.max(engine.levelForXP(Math.max(0,Number(profile.xp)||0)),Number(profile.levelPeak)||1),week,
  totalDeducted:Number(rev.totalDeducted)||0,
  xpHistory:entries(profile.managerScoreCorrections),revenueHistory:entries(rev.events)};
});
exports.staffGetPublicRevenueDeductions=onCall(opts,async req=>{
 if(!req.auth?.uid)throw new HttpsError('unauthenticated','Cần phiên Firebase Auth.');
 const db=getDatabase(),{week,weekStart}=mondayVN();
 if(req.data?.weekStart!==undefined&&req.data.weekStart!==weekStart)
  return {week,weekStart,deductions:{}};
 const rows=(await db.ref('staffRevenueScoreAdjustments/'+week).once('value')).val()||{};
 const deductions={};
 for(const [id,row] of Object.entries(rows)){
  const total=Number(row?.totalDeducted);
  if(ID.test(id)&&id!=='DOL-0001'&&Number.isSafeInteger(total)&&total>0)
   deductions[id]=total;
 }
 // Do not publish names, reasons or manager identity to ranking viewers.
 return {week,weekStart,deductions};
});
module.exports._mondayVN=mondayVN;
module.exports._validateAdjustment=input;
