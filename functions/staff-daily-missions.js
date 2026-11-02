'use strict';
/* Only trusted server mutations may award business missions. The only
 * user-callable mission action is check-in, verified against Staff ID. */
const crypto=require('node:crypto');
const {getDatabase}=require('firebase-admin/database');
const {onCall,HttpsError}=require('firebase-functions/v2/https');
const core=require('./staff-daily-core.cjs');
const opts={region:'asia-southeast1',maxInstances:8,timeoutSeconds:30};
const idPattern=/^DOL-(?:[0-9]{4,6}|[A-F0-9]{10})$/;
async function verifiedStaff(req){
 const uid=req.auth?.uid;
 if(!uid)throw new HttpsError('unauthenticated','Hãy kết nối Staff ID.');
 const db=getDatabase(),identity=(await db.ref('staffIdentity/'+uid).once('value')).val();
 const id=identity?.employeeId;
 if(!identity?.verified||!idPattern.test(id||''))
  throw new HttpsError('permission-denied','Cần Staff ID được quản lý xác minh.');
 const profile=(await db.ref('staffRegistry/'+id).once('value')).val();
 if(!profile?.active||(profile.registrationSource==='self'&&profile.approved!==true))
  throw new HttpsError('permission-denied','Hồ sơ chưa được quản lý xác minh.');
 return {employeeId:id};
}
async function award(employeeId,taskId){
 if(!core.TASKS.some(task=>task.id===taskId))
  throw new HttpsError('invalid-argument','Nhiệm vụ không hợp lệ.');
 if(!idPattern.test(String(employeeId||'')))
  throw new HttpsError('invalid-argument','Staff ID không hợp lệ.');
 const ref=getDatabase().ref('staffRegistry/'+employeeId);
 const timestamp=Date.now(),receipt=crypto.randomBytes(12).toString('hex');
 const result=await ref.transaction(current=>{
  // Firebase RTDB cold cache can initially invoke the callback with null.
  // Proposing null forces a retry against the existing server record.
  if(current===null)return null;
  const next=core.apply(current,taskId,timestamp,receipt);
  return next.changed?next.profile:undefined;
 },undefined,false);
 const updated=result.snapshot?.val();
 const record=updated?.dailyMissions?.completed?.[taskId];
 const awarded=!!result.committed&&record?.receipt===receipt;
 const addedXP=awarded?Number(record.xp)||0:0;
 if(awarded){
  try{await require('./staff-prestige')._rebuildPrestige();}
  catch(e){console.warn('[Crew Daily] Profile saved, leaderboard refresh pending:',e?.message||e);}
 }
 return {awarded,addedXP,missions:core.view(updated||null)};
}
exports.staffCheckInDaily=onCall(opts,async req=>{
 const {employeeId}=await verifiedStaff(req);
 const result=await award(employeeId,'checkin');
 if(!result.awarded){
  const profile=(await getDatabase().ref('staffRegistry/'+employeeId).once('value')).val();
  if(!profile?.active)throw new HttpsError('permission-denied','Hồ sơ không hoạt động.');
  return {awarded:false,addedXP:0,missions:core.view(profile)};
 }
 return result;
});
// Internal-only function (never exported through functions/index.js).
module.exports._award=award;
module.exports._verifiedStaff=verifiedStaff;
