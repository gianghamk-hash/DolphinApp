'use strict';
const crypto=require('node:crypto');
const {HttpsError}=require('firebase-functions/v2/https');
/* The name is display-only, never a login secret. Staff ID remains permanent.
 * NFKD + case folding + whitespace removes deceptive visual duplicates,
 * including Vietnamese accent variants. */
function displayName(value){
 return String(value||'').normalize('NFC').trim().replace(/\s+/gu,' ');
}
function canonicalName(value){
 return displayName(value).normalize('NFKD').replace(/\p{M}/gu,'')
  .replace(/đ/gi,'d').toLocaleLowerCase('vi-VN');
}
function validateName(value){
 const name=displayName(value);
 if(Array.from(name).length<=6||Array.from(name).length>64||/[\u0000-\u001f<>]/u.test(name))
  throw new HttpsError('invalid-argument','Họ và tên phải trên 6 ký tự (7–64 ký tự), không chứa ký tự cấm.');
 return name;
}
function conflict(registry,name,employeeId){
 const key=canonicalName(name);
 return Object.values(registry||{}).some(p=>
  p?.employeeId&&p.employeeId!==employeeId&&
  [p.name,...(Array.isArray(p.nameAliases)?p.nameAliases:[])].some(alias=>canonicalName(alias)===key));
}
function reason(registry,profile){
 if(!profile?.name||Array.from(displayName(profile.name)).length<=6||Array.from(displayName(profile.name)).length>64||
    /[\u0000-\u001f<>]/u.test(profile.name))
  return 'Tên nhân viên phải dài hơn 6 ký tự. Vui lòng đổi tên để tiếp tục.';
 if(conflict(registry,profile.name,profile.employeeId))
  return 'Tên nhân viên đang trùng một tài khoản khác. Vui lòng đổi tên để tiếp tục.';
 return '';
}
async function check(db,profile){
 const registry=(await db.ref('staffRegistry').once('value')).val()||{};
 return reason(registry,profile);
}
/* One atomic lock per normalized name. All manager/self registrations and
 * legacy corrections share this reservation; the full legacy registry is
 * still scanned so pre-index accounts cannot collide with a new claim. */
async function reserve(db,name,employeeId){
 const normalized=validateName(name);
 const path='staffNameClaims/'+crypto.createHash('sha256').update(canonicalName(normalized)).digest('hex');
 const ref=db.ref(path);
 const reg=(await db.ref('staffRegistry').once('value')).val()||{};
 if(conflict(reg,normalized,employeeId))throw new HttpsError('already-exists','Tên đã được một tài khoản khác đăng ký.');
 const now=Date.now();
 const result=await ref.transaction(v=>{
  if(v===null)return {employeeId,createdAt:now};
  return v.employeeId===employeeId?v:undefined;
 },undefined,false);
 if(!result.committed||result.snapshot.val()?.employeeId!==employeeId)
  throw new HttpsError('already-exists','Tên đã được đăng ký. Vui lòng chọn tên khác.');
 // If legacy data was added concurrently under another ID, refuse to publish.
 const latest=(await db.ref('staffRegistry').once('value')).val()||{};
 if(conflict(latest,normalized,employeeId))
  throw new HttpsError('already-exists','Tên đang trùng tài khoản đã tồn tại.');
 return normalized;
}
module.exports={displayName,canonicalName,validateName,reason,check,reserve,conflict};
