'use strict';
const crypto=require('node:crypto');
const {getDatabase}=require('firebase-admin/database');
const {onCall,HttpsError}=require('firebase-functions/v2/https');
const catalog=require('./staff-avatar-catalog.json');
const avatars=new Set(Object.values(catalog).flat());
const avatarThreshold=new Map();
for(const [group,items] of Object.entries(catalog))for(const item of items){const required=Number((group.match(/Lv\.(\d+)/)||[])[1])||1;avatarThreshold.set(item,Math.min(required,avatarThreshold.get(item)??Infinity));}
const opts={region:'asia-southeast1',maxInstances:5,timeoutSeconds:30};
function uidOf(req){if(!req.auth?.uid)throw new HttpsError('unauthenticated','Vui lòng kết nối trước.');return req.auth.uid;}
function validate(data){
 const name=String(data?.name||'').normalize('NFC').trim().replace(/\s+/g,' ');
 const avatar=data?.avatar||'🐬';
 if(name.length<2||name.length>64||/[\u0000-\u001f<>]/.test(name))throw new HttpsError('invalid-argument','Tên cần từ 2–64 ký tự, không chứa ký tự đặc biệt.');
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
 if(current?.employeeId)return response(await ownProfile(uid));
 // Stable per Firebase UID: retries/concurrent registrations cannot mint extra IDs.
 const employeeId='DOL-'+crypto.createHash('sha256').update(uid).digest('hex').slice(0,10).toUpperCase();
 const ref=db.ref('staffRegistry/'+employeeId);
 const result=await ref.transaction(v=>v?(v.ownerUid===uid?v:undefined):{employeeId,...data,active:true,registrationSource:'self',approved:false,ownerUid:uid,createdAt:Date.now(),updatedAt:Date.now()});
 if(!result.committed)throw new HttpsError('already-exists','Không cấp được ID. Vui lòng liên hệ quản lý.');
 const profile=result.snapshot.val();
 if(!profile.active)throw new HttpsError('permission-denied','Hồ sơ đã ngừng hoạt động.');
 const linked=await db.ref('staffIdentity/'+uid).transaction(v=>v?.employeeId?(v.employeeId===employeeId?v:undefined):{employeeId,name:profile.name,verified:false,updatedAt:Date.now()});
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
 const result=await getDatabase().ref('staffRegistry/'+profile.employeeId).transaction(v=>{
  if(v===null)return null; // Allow RTDB cold-instance retry.
  if(!v.active)return;
  if(data.avatar!==v.avatar&&(avatarThreshold.get(data.avatar)||1)>Math.max(Number(v.levelPeak)||1,require('./staff-xp-engine.cjs').levelForXP(Number(v.xp)||0)))return;
  return {...v,avatar:data.avatar,profileVersion:(v.profileVersion||0)+1,updatedAt:Date.now(),updatedBy:uid};
 });
 if(!result.committed||!result.snapshot.val()?.active)throw new HttpsError('permission-denied','Hồ sơ không còn hoạt động.');
 return response(result.snapshot.val());
});
exports.staffIssueOwnLinkCode=onCall(opts,async req=>{
 const uid=uidOf(req);await throttle(uid);const profile=await ownProfile(uid);
 const code=crypto.randomBytes(18).toString('hex').toUpperCase(),hash=crypto.createHash('sha256').update(code).digest('hex');
 await getDatabase().ref('staffEnrollmentCodes/'+hash).set({employeeId:profile.employeeId,issuedAt:Date.now(),expiresAt:Date.now()+600000,issuedBy:uid});
 return {code,expiresInMinutes:10,employeeId:profile.employeeId};
});
exports.staffGetAvatarDirectory=onCall(opts,async req=>{
 uidOf(req);
 const profiles=(await getDatabase().ref('staffRegistry').once('value')).val()||{};
 return {profiles:Object.values(profiles).filter(p=>p?.active&&p.employeeId&&p.name).map(p=>({
  employeeId:p.employeeId,name:p.name,avatar:avatars.has(p.avatar)?p.avatar:'🐬',profileVersion:p.profileVersion||0,
  selectedFrame:['bronze','silver','gold','mythic'].includes(p.selectedFrame)?p.selectedFrame:'none',
  selectedTitle:['rookie','wave','legend'].includes(p.selectedTitle)?p.selectedTitle:'none',
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
 return {employeeId,approved:true};
});
