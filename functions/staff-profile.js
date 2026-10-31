'use strict';
const crypto=require('node:crypto');
const {getDatabase}=require('firebase-admin/database');
const {onCall,HttpsError}=require('firebase-functions/v2/https');
const catalog=require('./staff-avatar-catalog.json');
const avatars=new Set(Object.values(catalog).flat());
const departments=new Set(['','Lễ tân','Restaurant','Lounge','Bungalow','Show','Khác']);
const opts={region:'asia-southeast1',maxInstances:5,timeoutSeconds:30};
function uidOf(req){if(!req.auth?.uid)throw new HttpsError('unauthenticated','Vui lòng kết nối trước.');return req.auth.uid;}
function validate(data){
 const name=String(data?.name||'').normalize('NFC').trim().replace(/\s+/g,' ');
 const avatar=data?.avatar||'🐬',department=data?.department||'';
 if(name.length<2||name.length>64||/[\u0000-\u001f<>]/.test(name))throw new HttpsError('invalid-argument','Tên cần từ 2–64 ký tự, không chứa ký tự đặc biệt.');
 if(!avatars.has(avatar)||!departments.has(department))throw new HttpsError('invalid-argument','Avatar hoặc bộ phận không hợp lệ.');
 return {name,avatar,department};
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
function response(profile){return {linked:true,verified:profile.registrationSource!=='self',employeeId:profile.employeeId,name:profile.name,
 avatar:profile.avatar||'🐬',department:profile.department||'',createdAt:profile.createdAt||null,registrationSource:profile.registrationSource||'manager'};}
exports.staffRegisterSelfProfile=onCall(opts,async req=>{
 const uid=uidOf(req),data=validate(req.data);await throttle(uid);
 const db=getDatabase(),current=(await db.ref('staffIdentity/'+uid).once('value')).val();
 if(current?.employeeId)return response(await ownProfile(uid));
 // Stable per Firebase UID: retries/concurrent registrations cannot mint extra IDs.
 const employeeId='DOL-'+crypto.createHash('sha256').update(uid).digest('hex').slice(0,10).toUpperCase();
 const ref=db.ref('staffRegistry/'+employeeId);
 const result=await ref.transaction(v=>v?(v.ownerUid===uid?v:undefined):{employeeId,...data,active:true,registrationSource:'self',ownerUid:uid,createdAt:Date.now(),updatedAt:Date.now()});
 if(!result.committed)throw new HttpsError('already-exists','Không cấp được ID. Vui lòng liên hệ quản lý.');
 const profile=result.snapshot.val();
 if(!profile.active)throw new HttpsError('permission-denied','Hồ sơ đã ngừng hoạt động.');
 const linked=await db.ref('staffIdentity/'+uid).transaction(v=>v?.employeeId?(v.employeeId===employeeId?v:undefined):{employeeId,name:profile.name,verified:false,updatedAt:Date.now()});
 if(!linked.committed)throw new HttpsError('failed-precondition','Thiết bị vừa liên kết hồ sơ khác. Hãy tải lại.');
 return response(profile);
});
exports.staffUpdateMyProfile=onCall(opts,async req=>{
 const uid=uidOf(req),data=validate(req.data);await throttle(uid);
 const profile=await ownProfile(uid);
 const result=await getDatabase().ref('staffRegistry/'+profile.employeeId).transaction(v=>v?.active?{...v,...data,updatedAt:Date.now(),updatedBy:uid}:undefined);
 if(!result.committed)throw new HttpsError('permission-denied','Hồ sơ không còn hoạt động.');
 return response(result.snapshot.val());
});
exports.staffIssueOwnLinkCode=onCall(opts,async req=>{
 const uid=uidOf(req);await throttle(uid);const profile=await ownProfile(uid);
 const code=crypto.randomBytes(18).toString('hex').toUpperCase(),hash=crypto.createHash('sha256').update(code).digest('hex');
 await getDatabase().ref('staffEnrollmentCodes/'+hash).set({employeeId:profile.employeeId,issuedAt:Date.now(),expiresAt:Date.now()+600000,issuedBy:uid});
 return {code,expiresInMinutes:10,employeeId:profile.employeeId};
});
