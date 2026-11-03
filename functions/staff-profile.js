'use strict';
const crypto=require('node:crypto');
const names=require('./staff-name-policy.cjs');
const {getDatabase}=require('firebase-admin/database');
const {onCall,HttpsError}=require('firebase-functions/v2/https');
const catalog=require('./staff-avatar-catalog.json');
const avatars=new Set(Object.values(catalog).flat());
const avatarThreshold=new Map();
for(const [group,items] of Object.entries(catalog))for(const item of items){const required=Number((group.match(/Lv\.(\d+)/)||[])[1])||1;avatarThreshold.set(item,Math.min(required,avatarThreshold.get(item)??Infinity));}
const opts={region:'asia-southeast1',maxInstances:5,timeoutSeconds:30};
function uidOf(req){if(!req.auth?.uid)throw new HttpsError('unauthenticated','Vui lòng kết nối trước.');return req.auth.uid;}
function validate(data){
 const name=names.normalize(data?.name);
 const avatar=data?.avatar||'🐬';
 if(!names.valid(name))throw new HttpsError('invalid-argument','Họ tên phải dài hơn 6 ký tự (7–64), không chứa ký tự không hợp lệ.');
 if(!avatars.has(avatar))throw new HttpsError('invalid-argument','Avatar không hợp lệ.');
 return {name,avatar};
}
async function throttle(uid){
 const ref=getDatabase().ref('staffProfileRate/'+uid),now=Date.now();
 const result=await ref.transaction(v=>!v||now-(v.last||0)>=1500?{last:now}:undefined);
 if(!result.committed)throw new HttpsError('resource-exhausted','Vui lòng chờ một chút rồi thử lại.');
}
async function ownProfile(uid){
 const db=getDatabase(),identity=(await db.ref('staffIdentity/'+uid).once('value')).val();
 if(!identity?.employeeId)throw new HttpsError('failed-precondition','Thiết bị chưa đăng ký hồ sơ.');
 const profile=(await db.ref('staffRegistry/'+identity.employeeId).once('value')).val();
 if(!profile?.active)throw new HttpsError('permission-denied','Hồ sơ không còn hoạt động.');
 return profile;
}
function response(profile){return {linked:true,verified:profile.registrationSource!=='self'||profile.approved===true,approved:profile.registrationSource!=='self'||profile.approved===true,employeeId:profile.employeeId,name:profile.name,
 avatar:profile.avatar||'🐬',profileVersion:profile.profileVersion||0,department:profile.department||'',createdAt:profile.createdAt||null,registrationSource:profile.registrationSource||'manager'};}
exports.staffRegisterSelfProfile=onCall(opts,async req=>{
 const uid=uidOf(req),data=validate(req.data);await throttle(uid);
  if((avatarThreshold.get(data.avatar)||1)>1)throw new HttpsError('permission-denied','Avatar này cần đạt Level tương ứng');
 const db=getDatabase(),current=(await db.ref('staffIdentity/'+uid).once('value')).val();
 let rejectedId=null;
 if(current?.employeeId){
  const prior=(await db.ref('staffRegistry/'+current.employeeId).once('value')).val();
  if(prior?.active)return response(await ownProfile(uid));
  // Only a specifically rejected, self-registered application may be replaced.
  // Other inactive accounts cannot bypass their deactivation by re-registering.
  if(!prior||prior.registrationSource!=='self'||prior.rejected!==true)
   throw new HttpsError('permission-denied','Hồ sơ đã ngừng hoạt động. Vui lòng liên hệ quản lý.');
  rejectedId=current.employeeId;
 }
 // Every rejection creates a different stable Staff ID, even on the same
 // Firebase anonymous UID. Deterministic retries never create extra profiles.
 const seed=rejectedId?uid+':reregister:'+rejectedId:uid;
 const employeeId='DOL-'+crypto.createHash('sha256').update(seed).digest('hex').slice(0,10).toUpperCase();
 const ref=db.ref('staffRegistry');
 let conflict=false;
 const result=await ref.transaction(registry=>{
  registry=registry||{}; // RTDB retries against the server snapshot.
  const v=registry[employeeId];
  if(v)return v.ownerUid===uid?registry:undefined;
  if(names.nameConflict(registry,data.name,rejectedId||'')){conflict=true;return;}
  return {...registry,[employeeId]:{employeeId,...data,active:true,registrationSource:'self',approved:false,ownerUid:uid,createdAt:Date.now(),updatedAt:Date.now()}};
 },undefined,false);
 if(!result.committed)throw new HttpsError('already-exists',conflict?'Họ tên này đã có tài khoản. Hãy dùng tên khác hoặc khôi phục Staff ID cũ.':'Không cấp được ID. Vui lòng liên hệ quản lý.');
 const profile=result.snapshot.val()[employeeId];
 if(!profile.active)throw new HttpsError('permission-denied','Hồ sơ đã ngừng hoạt động.');
 const linked=await db.ref('staffIdentity/'+uid).transaction(v=>{
  // RTDB may first invoke a transaction with null cache. Do not silently
  // unlink another Staff ID or resurrect a rejected identity.
  if(v===null&&current?.employeeId)return null;
  if((v?.employeeId||'')!==(rejectedId||''))return;
  return {employeeId,name:profile.name,verified:false,updatedAt:Date.now()};
 },undefined,false);
 if(!linked.committed)throw new HttpsError('failed-precondition','Thiết bị vừa liên kết hồ sơ khác. Hãy tải lại.');
 // Queue a private notification; FCM delivery is best effort, registration
 // is never rolled back if no manager device opted in to push.
 if(profile.registrationSource==='self'&&profile.approved!==true)
  try{await require('./staff-approval-push').notifyRegistration(profile,db);}
  catch(e){console.warn('[Staff Approval] Push unavailable:',e.message);}
 return response(profile);
});
exports.staffUpdateMyProfile=onCall(opts,async req=>{
 const uid=uidOf(req);await throttle(uid);
 const profile=await ownProfile(uid);
 // Registration name is immutable. A forged client request cannot rename staff.
 if(req.data?.name!==undefined){
  const submitted=String(req.data.name).normalize('NFC').trim().replace(/\s+/g,' ');
  if(submitted!==profile.name)throw new HttpsError('permission-denied','Họ tên đã đăng ký không thể thay đổi.');
 }
 const data=validate({name:profile.name,avatar:req.data?.avatar||profile.avatar});
 let avatarReallyChanged=false;
 const result=await getDatabase().ref('staffRegistry/'+profile.employeeId).transaction(v=>{
  if(v===null)return null; // Allow RTDB cold-instance retry.
  if(!v.active)return;
  if(data.avatar!==v.avatar&&(avatarThreshold.get(data.avatar)||1)>Math.max(Number(v.levelPeak)||1,require('./staff-xp-engine.cjs').levelForXP(Number(v.xp)||0)))return;
  avatarReallyChanged=data.avatar!==v.avatar;
  return {...v,avatar:data.avatar,profileVersion:(v.profileVersion||0)+1,updatedAt:Date.now(),updatedBy:uid};
 });
 if(!result.committed||!result.snapshot.val()?.active)throw new HttpsError('permission-denied','Hồ sơ không còn hoạt động.');
 if(avatarReallyChanged){
  try{await require('./staff-daily-missions')._award(profile.employeeId,'avatar_changed');}
  catch(e){console.warn('[Crew Daily] Avatar saved; mission award unavailable:',e?.message||e);}
 }
 return response(result.snapshot.val());
});
/* One-time mandatory remediation for pre-existing invalid/duplicate names.
 * Keep employeeId and all XP, sales, scores, cosmetics and history unchanged. */
exports.staffRepairMyName=onCall(opts,async req=>{
 const uid=uidOf(req),name=names.normalize(req.data?.name);
 if(!names.valid(name))throw new HttpsError('invalid-argument','Tên mới phải trên 6 ký tự (7–64).');
 // Mandatory legacy-name repair is already restricted to the linked Staff ID,
 // to a valid unique name, and to one successful change. Do not share the
 // 1.5-second profile-action throttle with registration or gate refreshes:
 // the user must be able to repair an invalid name immediately.
 const db=getDatabase(),ident=(await db.ref('staffIdentity/'+uid).once('value')).val();
 if(!ident?.employeeId)throw new HttpsError('failed-precondition','Thiết bị chưa liên kết Staff ID.');
 const id=ident.employeeId,registryRef=db.ref('staffRegistry');
 // A transaction at staffRegistry root conflicts with every XP/profile update
 // anywhere in the directory. The older implementation repeatedly aborted
 // without ever saving this simple name change. Read the directory to enforce
 // uniqueness, then update ONLY the target employee's name fields.
 const initial=(await registryRef.once('value')).val()||{};
 const oldProfile=initial[id];
 if(!oldProfile?.active)throw new HttpsError('permission-denied','Hồ sơ không còn hoạt động.');
 if(!names.needsRename(initial,id)){
  if(names.key(oldProfile.name)!==names.key(name))
   throw new HttpsError('failed-precondition','Hồ sơ đã có tên hợp lệ. Hãy tải lại để cập nhật.');
 }
 if(names.nameConflict(initial,name,id))
  throw new HttpsError('already-exists','Tên đã được nhân viên khác sử dụng.');
 const profileRef=registryRef.child(id);
 // A per-employee transaction avoids unrelated staff updates invalidating
 // the compare-and-swap. On an empty local cache, use the freshly read profile
 // as the proposed value; Firebase compares with server state and retries with
 // the actual profile if it has changed.
 const result=await profileRef.transaction(current=>{
  const profile=current===null?oldProfile:current;
  if(!profile?.active)return;
  if(names.key(profile.name)===names.key(name))return profile;
  if(names.key(profile.name)!==names.key(oldProfile.name))return;
  const previous=names.normalize(profile.name);
  const aliases=Array.isArray(profile.nameAliases)?profile.nameAliases.filter(x=>typeof x==='string'):[];
  if(previous&&!aliases.includes(previous))aliases.push(previous);
  return {...profile,name,nameAliases:aliases.slice(-20),
   profileVersion:(Number(profile.profileVersion)||0)+1,
   nameRepairedAt:Date.now(),updatedAt:Date.now()};
 },undefined,false);
 // Always check the stored profile, including after an aborted transaction.
 const updated=(await profileRef.once('value')).val();
 if(!updated?.active)throw new HttpsError('permission-denied','Hồ sơ không còn hoạt động.');
 if(names.key(updated.name)!==names.key(name)){
  if(!result.committed)throw new HttpsError('unavailable','Không thể cập nhật tên lúc này. Vui lòng thử lại.');
  throw new HttpsError('failed-precondition','Tên nhân viên đã thay đổi. Hãy tải lại.');
 }
 // Never change Staff ID; preserve the immutable XP ledger and level peak.
 const identities=(await db.ref('staffIdentity').once('value')).val()||{};
 await Promise.all(Object.entries(identities).filter(([,v])=>v?.employeeId===id).map(async ([device])=>{
  await db.ref('staffIdentity/'+device).transaction(v=>v?.employeeId===id?{...v,name:updated.name,updatedAt:Date.now()}:undefined,undefined,false);
 }));
 try{await require('./staff-prestige')._rebuildPrestige();}catch(e){console.warn('[Staff Name] Ranking refresh deferred:',e.message);}
 return {...response(updated),requiresNameChange:false};
});
exports.staffIssueOwnLinkCode=onCall(opts,async req=>{
 const uid=uidOf(req);await throttle(uid);const profile=await ownProfile(uid);
 if(profile.registrationSource==='self'&&profile.approved!==true)
  throw new HttpsError('permission-denied','Hồ sơ đang chờ duyệt, chưa được liên kết thiết bị khác.');
 const code=crypto.randomBytes(18).toString('hex').toUpperCase(),hash=crypto.createHash('sha256').update(code).digest('hex');
 await getDatabase().ref('staffEnrollmentCodes/'+hash).set({employeeId:profile.employeeId,issuedAt:Date.now(),expiresAt:Date.now()+600000,issuedBy:uid});
 return {code,expiresInMinutes:10,employeeId:profile.employeeId};
});
exports.staffGetAvatarDirectory=onCall(opts,async req=>{
 uidOf(req);
 const profiles=(await getDatabase().ref('staffRegistry').once('value')).val()||{};
 return {profiles:Object.values(profiles).filter(p=>p?.active&&(p.registrationSource!=='self'||p.approved===true)&&p.employeeId&&p.name).map(p=>({
  employeeId:p.employeeId,name:p.name,avatar:avatars.has(p.avatar)?p.avatar:'🐬',profileVersion:p.profileVersion||0,
  selectedFrame:['bronze','silver','gold','mythic'].includes(p.selectedFrame)?p.selectedFrame:'none',
  selectedAvatarMotion:['none','pulse','float','wave','orbit','prism','ascension'].includes(p.selectedAvatarMotion)?p.selectedAvatarMotion:'none',
  selectedTitle:['rookie','wave','legend'].includes(p.selectedTitle)?p.selectedTitle:'none',
  selectedBanner:['default','wave','gold','mythic'].includes(p.selectedBanner)?p.selectedBanner:'default',
  personalTheme:typeof p.personalTheme==='string'&&p.personalTheme.length<=32?p.personalTheme:'dark',
  selectedNameFx:['none','ember','inferno','prism','celestial'].includes(p.selectedNameFx)?p.selectedNameFx:'none',
  selectedAura:['none','spark','dual','celestial'].includes(p.selectedAura)?p.selectedAura:'none',
  selectedTrail:['none','wave','comet','nova'].includes(p.selectedTrail)?p.selectedTrail:'none',
  selectedCardFx:['none','soft','energy','mythic'].includes(p.selectedCardFx)?p.selectedCardFx:'none',
  nameAliases:Array.isArray(p.nameAliases)?p.nameAliases.filter(n=>typeof n==='string').slice(-10):[]
 }))};
});

/* Only the backend-verified owner of DOL-0001 may approve registrations.
 * A display name, URL parameter, and self-declared Staff ID never confer access. */
async function requireAccessManager(req){
 const uid=uidOf(req),db=getDatabase();
 const ident=(await db.ref('staffIdentity/'+uid).once('value')).val();
 if(ident?.employeeId!=='DOL-0001'||ident.verified!==true)
  throw new HttpsError('permission-denied','Chỉ quản lý DOL-0001 có quyền duyệt nhân viên.');
 const master=(await db.ref('staffRegistry/DOL-0001').once('value')).val();
 if(!master?.active||master.registrationSource==='self')
  throw new HttpsError('permission-denied','Chưa xác thực quản lý DOL-0001.');
 return uid;
}
exports.staffListPendingApprovals=onCall(opts,async req=>{
 await requireAccessManager(req);
 const entries=(await getDatabase().ref('staffRegistry').once('value')).val()||{};
 return {profiles:Object.values(entries).filter(p=>p?.active&&p.registrationSource==='self'&&p.approved!==true)
  .map(p=>({employeeId:p.employeeId,name:p.name,avatar:p.avatar||'🐬',createdAt:p.createdAt||0}))
  .sort((a,b)=>a.createdAt-b.createdAt).slice(0,100)};
});
exports.staffApproveRegistration=onCall(opts,async req=>{
 await requireAccessManager(req);
 const employeeId=String(req.data?.employeeId||'').trim().toUpperCase();
 if(!/^DOL-[A-F0-9]{10}$/.test(employeeId))
  throw new HttpsError('invalid-argument','Staff ID chờ duyệt không hợp lệ.');
 const db=getDatabase(),ref=db.ref('staffRegistry/'+employeeId);
 const result=await ref.transaction(v=>{
  if(v===null)return null; // RTDB cold read can retry.
  if(!v.active||v.registrationSource!=='self')return;
  if(v.approved===true)return v;
  return {...v,approved:true,approvedAt:Date.now(),approvedBy:'DOL-0001'};
 },undefined,false);
 if(!result.committed||!result.snapshot.val()?.approved)
  throw new HttpsError('failed-precondition','Hồ sơ không còn ở trạng thái chờ duyệt.');
 // Upgrade every *already linked* device, never another employee's UID.
 const identities=(await db.ref('staffIdentity').once('value')).val()||{};
 await Promise.all(Object.entries(identities).filter(([,v])=>v?.employeeId===employeeId).map(async ([uid])=>{
  await db.ref('staffIdentity/'+uid).transaction(v=>v?.employeeId===employeeId?
   {...v,verified:true,updatedAt:Date.now()}:undefined,undefined,false);
 }));
 try{await require('./staff-prestige')._rebuildPrestige();}
 catch(error){console.warn('[Staff approval] Ranking refresh deferred:',error?.message||error);}
 return {employeeId,approved:true};
});

/* Manager rejection revokes the pending profile server-side, including ALL
 * linked devices. Retain the rejected record for an audit trail. The former
 * Staff ID never becomes active again; re-registration issues a new ID. */
exports.staffRejectRegistration=onCall(opts,async req=>{
 await requireAccessManager(req);
 const employeeId=String(req.data?.employeeId||'').trim().toUpperCase();
 if(!/^DOL-[A-F0-9]{10}$/.test(employeeId))
  throw new HttpsError('invalid-argument','Staff ID chờ duyệt không hợp lệ.');
 const db=getDatabase(),ref=db.ref('staffRegistry/'+employeeId);
 const result=await ref.transaction(v=>{
  if(v===null)return null; // cold-instance retry against server snapshot
  if(!v.active||v.registrationSource!=='self'||v.approved===true||v.rejected===true)return;
  return {...v,active:false,approved:false,rejected:true,rejectedAt:Date.now(),
   rejectedBy:'DOL-0001',updatedAt:Date.now()};
 },undefined,false);
 if(!result.committed||result.snapshot.val()?.rejected!==true)
  throw new HttpsError('failed-precondition','Chỉ được từ chối hồ sơ tự đăng ký đang chờ duyệt.');
 // staffGetIdentity and every protected callable check active=false. Preserve
 // existing linked identities so each device can create a NEW registration.
 // No order history, Staff ID event log or active staff record is deleted.
 try{await require('./staff-prestige')._rebuildPrestige();}
 catch(error){console.warn('[Staff rejection] Ranking refresh deferred:',error?.message||error);}
 return {employeeId,rejected:true,canRegisterAgain:true};
});

/* Name-only recovery request: locating a public name never grants a login token.
 * The verified DOL-0001 manager issues the 10-minute link code out of band. */
function normalizedRecoveryName(value){
 return String(value||'').normalize('NFC').trim().replace(/\s+/g,' ').toLocaleLowerCase('vi-VN');
}
exports.staffRequestNameRecovery=onCall(opts,async req=>{
 const uid=uidOf(req),name=normalizedRecoveryName(req.data?.name);
 const current=(await getDatabase().ref('staffIdentity/'+uid).once('value')).val();
 if(current?.employeeId){
  const own=(await getDatabase().ref('staffRegistry/'+current.employeeId).once('value')).val();
  if(own?.active&&own.registrationSource==='self'&&own.approved!==true)
   throw new HttpsError('permission-denied','Đang chờ duyệt. Không thể yêu cầu quên tài khoản.');
 }
 if(name.length<2||name.length>64)throw new HttpsError('invalid-argument','Nhập họ và tên đã đăng ký (2–64 ký tự).');
 const db=getDatabase(),now=Date.now();
 // UID throttle limits repeated anonymous account recovery requests.
 const rate=db.ref('staffRecoveryRate/'+uid);
 const limit=await rate.transaction(v=>!v||now-(v.last||0)>60000?{last:now}:undefined,undefined,false);
 if(!limit.committed)throw new HttpsError('resource-exhausted','Vui lòng thử lại sau 1 phút.');
 const all=(await db.ref('staffRegistry').once('value')).val()||{};
 const matches=Object.values(all).filter(p=>p?.active&&
   (p.registrationSource!=='self'||p.approved===true)&&
   normalizedRecoveryName(p.name)===name);
 // Generic response avoids exposing whether a name is present in the registry.
 if(matches.length===1){
  const employeeId=matches[0].employeeId;
  const gate=crypto.createHash('sha256').update('staff-recovery:'+name).digest('hex');
  const nameRate=db.ref('staffRecoveryNameRate/'+gate);
  const nameLimit=await nameRate.transaction(v=>!v||now-(v.last||0)>300000?{last:now}:undefined,undefined,false);
  if(nameLimit.committed){
   const id=crypto.randomBytes(12).toString('hex');
   await db.ref('staffRecoveryRequests/'+id).set({
    requestId:id,employeeId,name:matches[0].name,requestedBy:uid,createdAt:now,
    expiresAt:now+24*3600000,status:'pending'
   });
  }
 }
 return {submitted:true,message:'Nếu hồ sơ hợp lệ và tên không trùng, yêu cầu sẽ được chuyển cho DOL-0001. Hãy nhận mã liên kết trực tiếp từ quản lý.'};
});
exports.staffListRecoveryRequests=onCall(opts,async req=>{
 await requireAccessManager(req);
 const rows=(await getDatabase().ref('staffRecoveryRequests').once('value')).val()||{};
 const now=Date.now();
 return {requests:Object.values(rows).filter(v=>v?.status==='pending'&&v.expiresAt>now)
 .sort((a,b)=>a.createdAt-b.createdAt).slice(0,50)
 .map(v=>({requestId:v.requestId,employeeId:v.employeeId,name:v.name,createdAt:v.createdAt}))};
});
exports.staffApproveNameRecovery=onCall(opts,async req=>{
 const managerUid=await requireAccessManager(req);
 const requestId=String(req.data?.requestId||'').trim();
 if(!/^[a-f0-9]{24}$/.test(requestId))throw new HttpsError('invalid-argument','Mã yêu cầu không hợp lệ.');
 const db=getDatabase(),ref=db.ref('staffRecoveryRequests/'+requestId),now=Date.now();
 const checked=(await ref.once('value')).val();
 if(!checked||checked.status!=='pending'||checked.expiresAt<=now)
  throw new HttpsError('failed-precondition','Yêu cầu đã hết hạn hoặc được xử lý.');
 const staff=(await db.ref('staffRegistry/'+checked.employeeId).once('value')).val();
 if(!staff?.active||(staff.registrationSource==='self'&&staff.approved!==true))
  throw new HttpsError('permission-denied','Hồ sơ không còn được xác minh.');
 const locked=await ref.transaction(v=>
  v?.status==='pending'&&v.expiresAt>Date.now()&&v.employeeId===checked.employeeId
   ?{...v,status:'issued',approvedBy:'DOL-0001',approvedAt:Date.now()}:undefined,
  undefined,false);
 if(!locked.committed)throw new HttpsError('failed-precondition','Yêu cầu đã được xử lý.');
 const code=crypto.randomBytes(18).toString('hex').toUpperCase();
 const hash=crypto.createHash('sha256').update(code).digest('hex');
 await db.ref('staffEnrollmentCodes/'+hash).set({
  employeeId:checked.employeeId,issuedAt:Date.now(),expiresAt:Date.now()+600000,issuedBy:managerUid,recoveryRequestId:requestId
 });
 return {code,employeeId:checked.employeeId,name:staff.name,expiresInMinutes:10};
});
