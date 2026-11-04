'use strict';
/* Only trusted server mutations may award business missions. The only
 * user-callable mission action is check-in, verified against Staff ID. */
const crypto=require('node:crypto');
const {getDatabase}=require('firebase-admin/database');
const {onCall,HttpsError}=require('firebase-functions/v2/https');
const core=require('./staff-daily-core.cjs');
const namePolicy=require('./staff-name-policy.cjs');
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
 const registry=(await db.ref('staffRegistry').once('value')).val()||{};
 if(namePolicy.needsRename(registry,id))throw new HttpsError('permission-denied','Cần đổi họ tên hợp lệ trước khi nhận XP.');
 return {employeeId:id};
}
async function award(employeeId,taskId,eventTime){
 if(!core.TASKS.some(task=>task.id===taskId))
  throw new HttpsError('invalid-argument','Nhiệm vụ không hợp lệ.');
 if(!idPattern.test(String(employeeId||'')))
  throw new HttpsError('invalid-argument','Staff ID không hợp lệ.');
 const ref=getDatabase().ref('staffRegistry/'+employeeId);
 const timestamp=Number.isFinite(eventTime)?eventTime:Date.now(),receipt=crypto.randomBytes(12).toString('hex');
 const result=await ref.transaction(current=>{
  // Firebase RTDB cold cache can initially invoke the callback with null.
  // Proposing null forces a retry against the existing server record.
  if(current===null)return null;
  const day=core.vietnamDay(timestamp),business=['order_completed','order_received','bungalow_opened','lounge_opened'].includes(taskId);
  if(business&&current.businessMissionReceipts?.[day]?.[taskId])return;
  const prior=current.dailyMissions?.date===day&&current.dailyMissions?.completed?.[taskId];
  if(business&&prior)return;
  let next;
  if(business&&day<core.vietnamDay()){
   if(!current.active||(current.registrationSource==='self'&&current.approved!==true))return;
   const amount=core.TASKS.find(t=>t.id===taskId).xp,xp=(Number(current.xp)||0)+amount;
   next={changed:true,profile:require('./staff-xp-engine.cjs').equipOnLevelUp(current,{...current,xp,levelPeak:Math.max(Number(current.levelPeak)||1,require('./staff-xp-engine.cjs').levelForXP(xp))})};
  }else next=core.apply(current,taskId,timestamp,receipt);
  if(!next.changed)return;
  if(business)next.profile.businessMissionReceipts={...current.businessMissionReceipts,[day]:{...current.businessMissionReceipts?.[day],[taskId]:{receipt,xp:core.TASKS.find(t=>t.id===taskId).xp,at:timestamp}}};
  return next.profile;
 },undefined,false);
 const updated=result.snapshot?.val();
 const record=updated?.businessMissionReceipts?.[core.vietnamDay(timestamp)]?.[taskId]||updated?.dailyMissions?.completed?.[taskId];
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
/*
 * Arcade missions use an issued, single-session seed, then replay all recorded
 * moves on the server. Raw client scores never grant XP. It is still a local
 * game: input automation cannot be completely prevented.
 */
const arcade=require('./crew-arcade-proof.cjs');
const arcadeRules=Object.freeze({
 snake:{task:'snake_100',threshold:100,minMs:9000},
 '2048':{task:'game2048_1000',threshold:1000,minMs:15000}
});
exports.staffStartArcadeMission=onCall(opts,async req=>{
 const {employeeId}=await verifiedStaff(req);
 const game=String(req.data?.game||'');
 const rule=arcadeRules[game];
 if(!rule)throw new HttpsError('invalid-argument','Game không hợp lệ.');
 const startedAt=Date.now(),challengeId=crypto.randomBytes(16).toString('hex');
 const seed=crypto.randomBytes(4).readUInt32LE(0)||1;
 const ref=getDatabase().ref('staffDailyGameChallenges/'+req.auth.uid+'/'+game);
 await ref.set({employeeId,challengeId,seed,startedAt,expiresAt:startedAt+45*60000,used:false});
 return {game,challengeId,seed,expiresAt:startedAt+45*60000};
});
exports.staffFinishArcadeMission=onCall(opts,async req=>{
 const {employeeId}=await verifiedStaff(req);
 const game=String(req.data?.game||''),rule=arcadeRules[game];
 const id=String(req.data?.challengeId||'');
 const score=Number(req.data?.score);
 const moves=req.data?.moves;
 if(!rule||!(/^[a-f0-9]{32}$/.test(id))||
    !Number.isSafeInteger(score)||score<rule.threshold||
    typeof moves!=='string'||moves.length>5000||moves.length<1)
  throw new HttpsError('invalid-argument','Kết quả trò chơi không hợp lệ.');
 const ref=getDatabase().ref('staffDailyGameChallenges/'+req.auth.uid+'/'+game);
 const challenge=(await ref.once('value')).val();
 const now=Date.now();
 if(!challenge||challenge.employeeId!==employeeId||challenge.challengeId!==id||
    challenge.used||challenge.expiresAt<now||now-challenge.startedAt<rule.minMs)
  throw new HttpsError('failed-precondition','Ván chơi chưa hợp lệ hoặc đã kết thúc.');
 const result=arcade.replay(game,challenge.seed,moves);
 if(!result.valid||result.score!==score||score<rule.threshold)
  throw new HttpsError('permission-denied','Điểm số không khớp diễn biến ván chơi.');
 const claimed=await ref.transaction(v=>{
  if(v===null)return null; // Retry on cold-cache snapshot before validating challenge.
  return v.challengeId===id&&v.employeeId===employeeId&&!v.used&&v.expiresAt>=now
   ?{...v,used:true,usedAt:now}:undefined;
 },undefined,false);
 if(!claimed.committed||claimed.snapshot?.val()?.challengeId!==id||
    claimed.snapshot?.val()?.used!==true)
  throw new HttpsError('already-exists','Ván chơi đã được gửi.');
 const bonus=await award(employeeId,rule.task);
 return {...bonus,game,score,verified:true};
});
// Internal-only function (never exported through functions/index.js).
module.exports._award=award;
module.exports._verifiedStaff=verifiedStaff;
