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
async function verifiedName(uid){
 const snap=await getDatabase().ref('staffIdentity/'+uid).once('value');
 const value=snap.val();
 if(!value||value.verified!==true||!value.employeeId||!value.name)
   throw new HttpsError('permission-denied','Tài khoản chưa được quản lý xác minh nhân viên');
 return String(value.name).trim().slice(0,32);
}
// Casual rooms accept a synchronized display name but remain unranked.
// Competitive ranking independently requires verified staffIdentity on the server.
async function casualRoomName(uid,name){
 const snap=await getDatabase().ref('staffIdentity/'+uid).once('value');
 const identity=safeStaffIdentity(snap.val());
 if(identity)return {name:identity.name.slice(0,32),verified:true};
 const label=nameOf(name);
 if(!label||label.length<2)throw new HttpsError('invalid-argument','Hãy thiết lập tên nhân viên trước khi tạo phòng');
 return {name:label,verified:false};
}
exports.tacticsCreateRoom=onCall(opts,async req=>{
 const uid=requireUid(req),identity=await casualRoomName(uid,req.data?.name),name=identity.name;
 await throttle(uid,1500);
 for(let tries=0;tries<8;tries++){
  const code=roomCode(),now=Date.now(),seed=crypto.randomBytes(4).readUInt32BE(0)||1;
  const x=await rooms().child(code).transaction(v=>v===null?Object.assign(E.roomNew(uid,name,now,seed),{rankingEligible:identity.verified}):undefined,undefined,false);
  if(x.committed){await getDatabase().ref('roomPresence/'+code+'/'+uid).set(true);return {roomId:code,uid};}
 }
 throw new HttpsError('unavailable','Không tạo được phòng');
});
exports.tacticsJoinRoom=onCall(opts,async req=>{
 const uid=requireUid(req),identity=await casualRoomName(uid,req.data?.name),name=identity.name,id=roomIdOf(req.data&&req.data.roomId);
 const state=await transact(rooms().child(id),s=>{
  E.assert(s&&s.players,'Phòng không tồn tại');
  if(s.players[uid])return s; // Reconnect existing member to active room.
  E.assert(s.status==='waiting','Phòng đã bắt đầu, không thể tham gia mới');
  E.assert(s.playerOrder.length<4,'Phòng đã đủ bốn người');
  s.playerOrder.push(uid);s.players[uid]=E.freshPlayer(uid,name,s);s.rankingEligible=!!s.rankingEligible&&identity.verified;s.updatedAt=Date.now();return s;
 });
 await getDatabase().ref('roomPresence/'+id+'/'+uid).set(true);
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


/* Package E — verified TFT rankings.
 * Only server-side authoritative RTDB rooms are eligible. This intentionally
 * does not accept user-submitted placement, score, display name or match ID.
 * Staff identities must be provisioned by a trusted administrator at
 * /staffIdentity/<Firebase Auth UID> with {verified:true,employeeId,name}.
 * RTDB security rules MUST deny client writes to staffIdentity,
 * tacticsRankVerified and rooms; see tactics/ranking-security.md.
 */
const rankRef=()=>getDatabase().ref('tacticsRankVerified');
function safeStaffIdentity(value){
 if(!value||value.verified!==true||typeof value.employeeId!=='string'||!value.employeeId.trim()||
    typeof value.name!=='string'||!value.name.trim())return null;
 return {employeeId:value.employeeId.trim().slice(0,96),name:value.name.trim().slice(0,64)};
}
function placementFromVerifiedRoom(room,uid){
 if(!room||room.status!=='finished'||!Array.isArray(room.playerOrder)||room.playerOrder.length!==4||
    !room.playerOrder.includes(uid)||!room.winnerId||!room.playerOrder.includes(room.winnerId))return null;
 // Placements recorded by authoritative engine. Never infer loser order from
 // final HP; eliminated users all finish at 0 HP.
 const order=room.finalPlacements;
 if(!order||typeof order!=='object')return null;
 const values=room.playerOrder.map(id=>order[id]);
 if(new Set(values).size!==4||values.some(v=>!Number.isInteger(v)||v<1||v>4))return null;
 if(order[room.winnerId]!==1)return null;
 return order[uid];
}
exports.tacticsSubmitVerifiedResult=onCall(opts,async req=>{
 const uid=requireUid(req),id=roomIdOf(req.data?.roomId);
 await throttle(uid,400);
 const [staffSnap,roomSnap]=await Promise.all([
  getDatabase().ref('staffIdentity/'+uid).once('value'),
  rooms().child(id).once('value')
 ]);
 const identity=safeStaffIdentity(staffSnap.val());
 if(!identity)throw new HttpsError('permission-denied','Nhân viên chưa được xác thực trên máy chủ');
 const room=roomSnap.val();
 if(!room?.rankingEligible)throw new HttpsError('failed-precondition','Trận thường không được tính điểm KING OF TFT');
 const placement=placementFromVerifiedRoom(room,uid);
 if(!placement)throw new HttpsError('failed-precondition','Chưa có thứ hạng được máy chủ xác thực');
 const matchId=id+':'+String(room.seed),score=[0,25,18,12,6][placement];
 const ref=rankRef().child(uid);
 let alreadyCounted=false;
 const result=await ref.transaction(previous=>{
  const v=previous||{};
  const matches=v.matches||{};
  if(matches[matchId]){alreadyCounted=true;return;}
  // The receipt set is never truncated, including after 100+ matches.
  matches[matchId]={placement,score};
  return {employeeId:identity.employeeId,player:identity.name,matches,
   totalScore:(v.totalScore||0)+score,totalGames:(v.totalGames||0)+1,
   wins:(v.wins||0)+(placement===1?1:0),losses:(v.losses||0)+(placement!==1?1:0),
   totalPlacement:(v.totalPlacement||0)+placement,lastPlayed:Date.now()};
 },undefined,false);
 if(!result.committed&&!alreadyCounted)
  throw new HttpsError('aborted','Không thể xác nhận kết quả');
 return {accepted:result.committed,alreadyCounted,placement,score};
});
exports.tacticsLeaderboard=onCall(opts,async req=>{
 requireUid(req);
 const limit=Math.max(1,Math.min(30,Number(req.data?.limit)||30));
 const snap=await rankRef().once('value');
 const rows=Object.entries(snap.val()||{}).map(([uid,x])=>({
   uid,player:String(x.player||'').slice(0,64),totalScore:Number(x.totalScore)||0,
   totalGames:Number(x.totalGames)||0,wins:Number(x.wins)||0,
   totalPlacement:Number(x.totalPlacement)||0,lastPlayed:Number(x.lastPlayed)||0
 })).filter(x=>x.totalGames>0)
 .sort((a,b)=>b.totalScore-a.totalScore||b.wins-a.wins||a.lastPlayed-b.lastPlayed)
 .slice(0,limit);
 return {rows,verified:true};
});

exports.tacticsGetRoom=onCall(opts,async req=>{
 const uid=requireUid(req),id=roomIdOf(req.data?.roomId);
 const state=(await rooms().child(id).once('value')).val();
 if(!state||!state.players?.[uid])throw new HttpsError('permission-denied','Không thuộc phòng');
 return {state};
});

/* Staff ID issuance / device enrolment — server enforced.
 * Deployment prerequisite: set STAFF_ADMIN_UIDS in Cloud Functions environment
 * to comma-separated Firebase Authentication UIDs of authorized managers.
 * Client-side Master flags / APK user-agent are NEVER authority here.
 */
const staffAdminIds=()=>new Set(String(process.env.STAFF_ADMIN_UIDS||'').split(',').map(x=>x.trim()).filter(Boolean));
function requireStaffAdmin(req){
 const uid=requireUid(req);
 if(!staffAdminIds().has(uid))throw new HttpsError('permission-denied','UID chưa được cấp quyền quản trị nhân sự');
 return uid;
}
const staffCodePattern=/^DOL-[0-9]{4,6}$/;
const staffRoot=()=>getDatabase().ref('staffRegistry');
const staffTokenRoot=()=>getDatabase().ref('staffEnrollmentCodes');
exports.staffCreateProfile=onCall(opts,async req=>{
 requireStaffAdmin(req);
 const employeeId=String(req.data?.employeeId||'').trim().toUpperCase();
 const name=String(req.data?.name||'').trim().replace(/\s+/g,' ').slice(0,64);
 if(!staffCodePattern.test(employeeId)||name.length<2)throw new HttpsError('invalid-argument','Mã DOL-0001 và tên nhân viên hợp lệ là bắt buộc');
 const ref=staffRoot().child(employeeId);
 const created=await ref.transaction(v=>v?undefined:{employeeId,name,active:true,createdAt:Date.now()},undefined,false);
 if(!created.committed)throw new HttpsError('already-exists','Mã nhân viên đã được cấp');
 return {employeeId,name};
});
exports.staffIssueLinkCode=onCall(opts,async req=>{
 requireStaffAdmin(req);
 const employeeId=String(req.data?.employeeId||'').trim().toUpperCase();
 if(!staffCodePattern.test(employeeId))throw new HttpsError('invalid-argument','Mã nhân viên không hợp lệ');
 const snap=await staffRoot().child(employeeId).once('value'),profile=snap.val();
 if(!profile||!profile.active)throw new HttpsError('not-found','Không tìm thấy nhân viên đang hoạt động');
 const code=crypto.randomBytes(18).toString('hex').toUpperCase();
 const tokenHash=crypto.createHash('sha256').update(code).digest('hex');
 await staffTokenRoot().child(tokenHash).set({employeeId,issuedAt:Date.now(),expiresAt:Date.now()+10*60*1000});
 return {employeeId,name:profile.name,code,expiresInMinutes:10};
});
exports.staffClaimLinkCode=onCall(opts,async req=>{
 const uid=requireUid(req);
 const code=String(req.data?.code||'').trim().toUpperCase();
 if(!/^[0-9A-F]{36}$/.test(code))throw new HttpsError('invalid-argument','Mã liên kết không hợp lệ');
 await throttle(uid,2500);
 const tokenHash=crypto.createHash('sha256').update(code).digest('hex');
 const ref=staffTokenRoot().child(tokenHash);
 const result=await ref.transaction(v=>{
  // An uncached transaction starts with null even when the token exists.
  // Submit the null proposal so RTDB can retry against the server value.
  if(v===null)return null;
  if(v.usedAt||!Number.isFinite(v.expiresAt)||v.expiresAt<=Date.now())return;
  return {...v,usedAt:Date.now(),claimedUid:uid};
 },undefined,false);
 const issued=result.committed?result.snapshot.val():null;
 if(!issued||issued.claimedUid!==uid)throw new HttpsError('failed-precondition','Mã hết hạn hoặc đã được sử dụng');
 const snap=await staffRoot().child(issued.employeeId).once('value'),profile=snap.val();
 if(!profile||!profile.active)throw new HttpsError('failed-precondition','Nhân viên không còn hoạt động');
 await getDatabase().ref('staffIdentity/'+uid).set({employeeId:profile.employeeId,name:profile.name,verified:true,updatedAt:Date.now()});
 return {employeeId:profile.employeeId,name:profile.name,verified:true};
});
exports.staffGetIdentity=onCall(opts,async req=>{
 const uid=requireUid(req);
 const snap=await getDatabase().ref('staffIdentity/'+uid).once('value'),v=snap.val();
 if(!v||v.verified!==true)return {verified:false};
 const profile=(await staffRoot().child(v.employeeId).once('value')).val();
 if(!profile||!profile.active)return {verified:false};
 return {verified:true,employeeId:profile.employeeId,name:profile.name};
});
