'use strict';
/*
 * XP follows the same completed-order / table revenue rules as the live ranking.
 * This callable reads the already-saved Firestore document. It NEVER writes an
 * operational table or order, and never accepts XP amounts or staff names from
 * the caller. Operational saving must not depend on the XP service.
 *
 * Source Firestore documents are still client-writable. Consequently XP is a
 * gamification metric, not a tamper-proof accounting or payroll measure.
 */
const crypto=require('node:crypto');
const {onCall,HttpsError}=require('firebase-functions/v2/https');
const {getDatabase}=require('firebase-admin/database');
const {getFirestore}=require('firebase-admin/firestore');
const rules=require('./staff-xp-live-engine.cjs');
const engine=require('./staff-xp-engine.cjs');
const prestige=require('./staff-prestige');
const opts={region:'asia-southeast1',maxInstances:5,timeoutSeconds:60};
const TYPES=new Set(['lounge_tables','bun_tables','show_tables','lounge_orders','bun_orders','res_orders']);
const norm=x=>String(x||'').normalize('NFC').trim().replace(/\s+/g,' ').toLocaleLowerCase('vi-VN');
function hashed(...parts){return crypto.createHash('sha256').update(parts.join('|')).digest('hex').slice(0,40);}
function day(){return new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Ho_Chi_Minh'});}
function bad(code,message){throw new HttpsError(code,message);}
function directory(registry){
 const all=new Map();
 for(const p of Object.values(registry||{})){
  if(!p?.active||!p.employeeId||!/^DOL-(?:[0-9]{4,6}|[A-F0-9]{10})$/.test(p.employeeId))continue;
  for(const name of [p.name,...(Array.isArray(p.nameAliases)?p.nameAliases:[])]){
   const k=norm(name);if(!k)continue;
   if(!all.has(k))all.set(k,new Set());
   all.get(k).add(p.employeeId);
  }
 }
 return all;
}
function resolve(map,name){
 const ids=map.get(norm(name));
 return ids?.size===1?[...ids][0]:null;
}
function resolvedForActor(map,name,stamped,who){
 const aliases=[who.profile.name,...(Array.isArray(who.profile.nameAliases)?who.profile.nameAliases:[])];
 if(stamped===who.id&&aliases.some(n=>norm(n)===norm(name)))return who.id;
 return resolve(map,name);
}
async function actor(req,db){
 const uid=req.auth?.uid;
 if(!uid)bad('unauthenticated','Cần đăng nhập Staff ID');
 const ident=(await db.ref('staffIdentity/'+uid).once('value')).val();
 if(!ident?.employeeId)bad('permission-denied','Thiết bị chưa liên kết hồ sơ');
 const p=(await db.ref('staffRegistry/'+ident.employeeId).once('value')).val();
 if(!p?.active||p.employeeId!==ident.employeeId)bad('permission-denied','Hồ sơ nhân viên không hoạt động');
 return {uid,id:ident.employeeId,profile:p,manager:new Set(String(process.env.STAFF_ADMIN_UIDS||'').split(',').map(x=>x.trim())).has(uid)};
}
async function grant(db,employeeId,eventId,source,amount){
 if(amount<=0)return false;
 const receipt=(await db.ref('staffXpLedger/'+employeeId+'/'+eventId).once('value')).val();
 if(receipt)return false;
 const r=await prestige._awardTrustedLiveXP({employeeId,eventId,source,amount},{skipRebuild:true});
 return !r.duplicate;
}
async function sync(kind,id,req){
 const db=getDatabase(),who=await actor(req,db);
 const registry=(await db.ref('staffRegistry').once('value')).val()||{};
 const byName=directory(registry);
 const doc=(await getFirestore().collection(kind).doc(id).get());
 if(!doc.exists)bad('not-found','Bản ghi đã bị xóa hoặc chưa được lưu');
 const v=doc.data()||{},isTable=kind.endsWith('_tables');
 const names=isTable?[kind==='show_tables'?v.seller:v.openedByStaff]:[...rules.names(v.preparedBy),...rules.names(v.completedBy)];
 const participants=new Set(names.map(n=>resolvedForActor(byName,n,
 isTable?(kind==='show_tables'?v.sellerStaffId:v.openedByStaffId):
  (norm(n)===norm(v.completedBy)?v.completedByStaffId:v.preparedByStaffId),who)).filter(Boolean));
 if(!participants.has(who.id)&&!who.manager)bad('permission-denied','Không nhận diện được Staff ID từ tên nhân viên trên bàn/đơn. Hãy kiểm tra tên đã đăng ký trong Hồ sơ nhân viên và lưu lại.');
 let added=0,awardCount=0;
 if(isTable){
  const employeeId=resolvedForActor(byName,names[0],kind==='show_tables'?v.sellerStaffId:v.openedByStaffId,who);
  const revenue=rules.tableValue(kind,v);
  const amount=engine.revenueXP(revenue);
  if(employeeId&&amount>0){
   const claim=db.ref('staffXpSaleClaims/'+kind+'/'+day()+'/'+hashed(kind,id));
   // Compatible with old staffRecordLiveAction sale claims and ledger keys.
   const tx=await claim.transaction(prev=>prev&&prev.employeeId!==employeeId?undefined:
    prev||{employeeId,table:id,createdAt:Date.now()},undefined,false);
   if(!tx.committed)bad('failed-precondition','Bàn đã được ghi nhận doanh thu cho nhân viên khác');
   const eventId='live:'+hashed('sale',kind,id,day(),employeeId);
   if(await grant(db,employeeId,eventId,'revenue',amount)){awardCount++;if(employeeId===who.id)added+=amount;}
  }
 }else if(v.status==='completed'){
  const prep=new Set(rules.names(v.preparedBy).map(norm));
  const done=new Set(rules.names(v.completedBy).map(norm));
  const keys=new Map([...rules.names(v.preparedBy),...rules.names(v.completedBy)].map(n=>[norm(n),n]));
  for(const [nameKey,name] of keys){
   const employeeId=resolvedForActor(byName,name,done.has(nameKey)?v.completedByStaffId:v.preparedByStaffId,who);
   if(!employeeId)continue;
   const isLounge=kind==='lounge_orders';
   const base=done.has(nameKey)?(isLounge?0.25:1):prep.has(nameKey)?(isLounge?0.1:0.5):0;
   const total=engine.workXP(base);
   const oldPrepId='live:'+hashed('work',kind,id,'preparing',employeeId);
   const oldPrep=(await db.ref('staffXpLedger/'+employeeId+'/'+oldPrepId).once('value')).val();
   // Existing employees may already have received preparation XP from v1.1.26.
   const amount=Number(Math.max(0,total-Math.max(0,Number(oldPrep?.amount)||0)).toFixed(2));
   const completeId='live:'+hashed('work',kind,id,'completed',employeeId);
   if(await grant(db,employeeId,completeId,'work',amount)){awardCount++;if(employeeId===who.id)added+=amount;}
  }
 }
 if(awardCount)try{await prestige._rebuildPrestige();}catch(e){console.error('[XP sync] board refresh error:',e);}
 return {saved:true,employeeId:who.id,addedXP:Number(added.toFixed(2)),awards:awardCount,
  status:awardCount?'credited':'already-current-or-ineligible'};
}
exports.staffSyncSavedActivityXP=onCall(opts,async req=>{
 const kind=String(req.data?.kind||''),id=String(req.data?.id||'');
 if(!TYPES.has(kind)||!id||id.length>128||id.includes('/'))bad('invalid-argument','Bàn hoặc order không hợp lệ');
 return sync(kind,id,req);
});
module.exports._directory=directory;
module.exports._resolve=resolve;


module.exports._resolvedForActor=resolvedForActor;
