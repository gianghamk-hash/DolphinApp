/* Authoritative Firebase callable API for Dolphin Tactics 3D.
   Client cannot write /rooms. Advance is deadline-driven and server-validated. */
'use strict';
const crypto=require('node:crypto');
const {initializeApp}=require('firebase-admin/app');
const {getDatabase}=require('firebase-admin/database');
const {onCall,HttpsError}=require('firebase-functions/v2/https');
const {onSchedule}=require('firebase-functions/v2/scheduler');
const E=require('./tactics/engine');
initializeApp();
const rooms=()=>getDatabase().ref('rooms');
const codeRegex=/^[A-HJ-NP-Z2-9]{6}$/;
const opts={region:'asia-southeast1',maxInstances:20,timeoutSeconds:35};
const requireUid=req=>{if(!req.auth||!req.auth.uid)throw new HttpsError('unauthenticated','Đăng nhập trước khi vào trận');return req.auth.uid;};
const nameOf=v=>typeof v==='string'?v.trim().slice(0,32):'';
const roomIdOf=v=>{if(typeof v!=='string'||!codeRegex.test(v.toUpperCase()))throw new HttpsError('invalid-argument','Mã phòng không hợp lệ');return v.toUpperCase();};
const roomCode=()=>Array.from(crypto.randomBytes(6),b=>'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[b%32]).join('');
async function transact(ref,update){
 let issue=null;
 const result=await ref.transaction(value=>{issue=null;try{return update(value);}catch(e){issue=e;return;}},undefined,false);
 if(!result.committed)throw new HttpsError('failed-precondition',issue?issue.message:'Trạng thái phòng đã thay đổi');
 return result.snapshot.val();
}
async function throttle(uid,wait){
 const ref=getDatabase().ref('tacticsRate/'+uid),now=Date.now();
 const x=await ref.transaction(v=>!v||now-(v.last||0)>=wait?{last:now}:undefined,undefined,false);
 if(!x.committed)throw new HttpsError('resource-exhausted','Thao tác quá nhanh');
}
exports.tacticsCreateRoom=onCall(opts,async req=>{
 const uid=requireUid(req),name=nameOf(req.data&&req.data.name);
 await throttle(uid,1500);
 for(let tries=0;tries<8;tries++){
  const code=roomCode(),now=Date.now(),seed=crypto.randomBytes(4).readUInt32BE(0)||1;
  const x=await rooms().child(code).transaction(v=>v===null?E.roomNew(uid,name,now,seed):undefined,undefined,false);
  if(x.committed)return {roomId:code,uid};
 }
 throw new HttpsError('unavailable','Không tạo được phòng');
});
exports.tacticsJoinRoom=onCall(opts,async req=>{
 const uid=requireUid(req),name=nameOf(req.data&&req.data.name),id=roomIdOf(req.data&&req.data.roomId);
 const state=await transact(rooms().child(id),s=>{
  E.assert(s&&s.status==='waiting','Phòng không tồn tại hoặc đã bắt đầu');
  if(s.players[uid])return s;
  E.assert(s.playerOrder.length<4,'Phòng đã đủ bốn người');
  s.playerOrder.push(uid);s.players[uid]=E.freshPlayer(uid,name,s);s.updatedAt=Date.now();return s;
 });
 return {roomId:id,players:state.playerOrder.length};
});
exports.tacticsStartRoom=onCall(opts,async req=>{
 const uid=requireUid(req),id=roomIdOf(req.data&&req.data.roomId);
 const state=await transact(rooms().child(id),s=>{
  E.assert(s&&s.status==='waiting'&&s.hostId===uid,'Chỉ chủ phòng được bắt đầu');
  E.assert(s.playerOrder.length===4,'Cần đủ 4 người');
  const now=Date.now();s.status='in_game';s.round=1;s.roundPhase='PREPARATION';s.phaseStartedAt=now;
  s.phaseEndsAt=now+E.PHASES.PREPARATION;s.updatedAt=now;return s;
 });
 return {round:state.round,phase:state.roundPhase};
});
exports.tacticsAction=onCall(opts,async req=>{
 const uid=requireUid(req),id=roomIdOf(req.data&&req.data.roomId),a=req.data&&req.data.action;
 if(!a||typeof a!=='object'||Array.isArray(a))throw new HttpsError('invalid-argument','Thiếu action');
 await throttle(uid,150);
 const state=await transact(rooms().child(id),s=>{
  E.assert(s&&s.players[uid],'Không thuộc phòng');return E.action(s,uid,a,Date.now());
 });
 return {round:state.round,phase:state.roundPhase,gold:state.players[uid].gold};
});
async function advanceById(id,caller){
 return transact(rooms().child(id),s=>{
  E.assert(s&&s.status==='in_game','Phòng chưa chạy');
  if(caller)E.assert(s.players[caller],'Không thuộc phòng');
  return E.advance(s,Date.now());
 });
}
exports.tacticsAdvanceRoom=onCall(opts,async req=>{
 const uid=requireUid(req),id=roomIdOf(req.data&&req.data.roomId);
 const room=await advanceById(id,uid);return {round:room.round,phase:room.roundPhase,status:room.status};
});
/* Best effort fallback if all players close browsers; cloud scheduler runs once per minute.
   Client calls advance when deadline fires to maintain 30/40/5 second phases. */
exports.tacticsRoomSweep=onSchedule({schedule:'every 1 minutes',region:'asia-southeast1',timeoutSeconds:120},async()=>{
 const snap=await rooms().orderByChild('status').equalTo('in_game').limitToFirst(100).once('value');
 const entries=snap.val()||{};
 for(const id of Object.keys(entries)){
  if(entries[id].phaseEndsAt>Date.now())continue;
  try{await advanceById(id,null);}catch(e){console.warn('sweep',id,e.message);}
 }
});
