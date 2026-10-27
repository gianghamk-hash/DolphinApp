/* Authoritative Firebase callable API for Dolphin Tactics 3D.
   Client cannot write /rooms. Advance is deadline-driven and server-validated. */
'use strict';
const crypto=require('node:crypto');
const {initializeApp}=require('firebase-admin/app');
const {getAuth: getAdminAuth}=require('firebase-admin/auth');
const {getFirestore: getAdminFirestore, FieldValue}=require('firebase-admin/firestore');
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
// Remove a waiting-room participant without touching live combat rosters.
// If the host leaves, the next existing player becomes the host.
exports.tacticsLeaveRoom=onCall(opts,async req=>{
 const uid=requireUid(req),id=roomIdOf(req.data&&req.data.roomId);
 const roomRef=rooms().child(id);
 const snapshot=await roomRef.once('value');
 if(!snapshot.exists()||!snapshot.val().players?.[uid])return {left:true};
 const res=await roomRef.transaction(s=>{
  if(!s||!s.players||!s.players[uid])return;
  if(s.status!=='waiting')return s; // Active games retain player slots for reconnection.
  delete s.players[uid];s.playerOrder=(s.playerOrder||[]).filter(x=>x!==uid);
  if(!s.playerOrder.length)return null;
  if(s.hostId===uid)s.hostId=s.playerOrder[0];
  s.updatedAt=Date.now();return s;
 },undefined,false);
 if(!res.committed)throw new HttpsError('aborted','Phòng vừa thay đổi. Thử lại.');
 await getDatabase().ref('roomPresence/'+id+'/'+uid).set(false);
 return {left:true};
});

exports.tacticsStartRoom=onCall(opts,async req=>{
 const uid=requireUid(req),id=roomIdOf(req.data&&req.data.roomId);
 const online=(await getDatabase().ref('roomPresence/'+id).once('value')).val()||{};
 const state=await transact(rooms().child(id),s=>{
  E.assert(s&&s.status==='waiting'&&s.hostId===uid,'Chỉ chủ phòng được bắt đầu');
  E.assert(s.playerOrder.length===4,'Cần đủ 4 người');
  E.assert(s.playerOrder.every(id=>online[id]===true),'Cần cả 4 người đang trực tuyến để bắt đầu');
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

/* Staff identity phase 1: only a separately provisioned, trusted Auth custom
   claim can manage employee identities. Manager UI or anonymous Auth never grant it. */
const staffOptions={region:'asia-southeast1',maxInstances:10,timeoutSeconds:30};
function staffAdmin(req){
 if(!req.auth||req.auth.token.staffAdmin!==true)throw new HttpsError('permission-denied','Tài khoản chưa được cấp quyền quản lý nhân viên');
}
function staffValue(v,max=100){return typeof v==='string'?v.trim().slice(0,max):'';}
exports.staffAdminCreate=onCall(staffOptions,async req=>{
 staffAdmin(req);
 const v=req.data||{},email=staffValue(v.email,160).toLowerCase(),displayName=staffValue(v.displayName,80),department=staffValue(v.department,50),position=staffValue(v.position,50);
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||!displayName)throw new HttpsError('invalid-argument','Cần email hợp lệ và tên nhân viên');
 const auth=getAdminAuth(),fs=getAdminFirestore();
 const exists=await auth.getUserByEmail(email).catch(e=>{if(e.code==='auth/user-not-found')return null;throw e;});
 if(exists)throw new HttpsError('already-exists','Email đã có tài khoản. Không thể tự liên kết tài khoản khác.');
 const bytes=crypto.randomBytes(18).toString('base64url');
 let user;
 try{
  user=await auth.createUser({email,password:bytes,displayName,emailVerified:false,disabled:false});
  // A fixed internal staff ID is allocated transactionally, never derived from a mutable name.
  const counter=fs.doc('staff_identity_meta/counter');
  const staffId=await fs.runTransaction(async tx=>{
   const snap=await tx.get(counter);
   const next=(snap.exists?snap.data().next:1);
   if(!Number.isSafeInteger(next)||next<1||next>9999999)throw new Error('Staff counter exhausted');
   tx.set(counter,{next:next+1},{merge:true});
   return 'DLP-'+String(next).padStart(4,'0');
  });
  const profile={staffId,authUid:user.uid,email,displayName,department,position,status:'active',createdAt:FieldValue.serverTimestamp(),updatedAt:FieldValue.serverTimestamp(),createdBy:req.auth.uid};
  await fs.doc('staff_identities/'+staffId).create(profile);
  await fs.doc('staff_uid_index/'+user.uid).create({staffId});
  return {staffId,uid:user.uid,email,temporaryPassword:bytes};
 }catch(e){
  if(user)await auth.deleteUser(user.uid).catch(err=>console.warn('Failed cleanup staff',user.uid,err));
  if(e instanceof HttpsError)throw e;
  console.error('staffAdminCreate',e);throw new HttpsError('internal','Không tạo được nhân viên');
 }
});
exports.staffAdminList=onCall(staffOptions,async req=>{
 staffAdmin(req);
 const snap=await getAdminFirestore().collection('staff_identities').orderBy('staffId').limit(500).get();
 return {staff:snap.docs.map(d=>{const v=d.data();return {staffId:v.staffId,displayName:v.displayName,email:v.email,department:v.department,position:v.position,status:v.status,authUid:v.authUid};})};
});
exports.staffAdminUpdate=onCall(staffOptions,async req=>{
 staffAdmin(req);
 const v=req.data||{},staffId=staffValue(v.staffId,20);
 if(!/^DLP-\d{4,7}$/.test(staffId))throw new HttpsError('invalid-argument','ID không hợp lệ');
 const fs=getAdminFirestore(),ref=fs.doc('staff_identities/'+staffId),snap=await ref.get();
 if(!snap.exists)throw new HttpsError('not-found','Không tìm thấy nhân viên');
 const patch={updatedAt:FieldValue.serverTimestamp()};
 for(const field of ['displayName','department','position'])if(Object.prototype.hasOwnProperty.call(v,field))patch[field]=staffValue(v[field],80);
 if(v.status!==undefined){
  if(!['active','inactive'].includes(v.status))throw new HttpsError('invalid-argument','Trạng thái không hợp lệ');
  await getAdminAuth().updateUser(snap.data().authUid,{disabled:v.status==='inactive'});
  patch.status=v.status;
 }
 await ref.update(patch);return {ok:true,staffId};
});
exports.staffMyIdentity=onCall(staffOptions,async req=>{
 const uid=requireUid(req),fs=getAdminFirestore(),idx=await fs.doc('staff_uid_index/'+uid).get();
 if(!idx.exists)return {linked:false};
 const profile=await fs.doc('staff_identities/'+idx.data().staffId).get();
 if(!profile.exists||profile.data().authUid!==uid)return {linked:false};
 const v=profile.data();
 return {linked:true,staffId:v.staffId,displayName:v.displayName,department:v.department,position:v.position,status:v.status};
});
