'use strict';
/*
 * Deprecated XP-from-saved-Firestore endpoints. Retained only so older APKs
 * do not fail to call a missing Cloud Function. Operational Firestore records
 * are client-writable and must never become XP awards by reading them back.
 * Verified employee actions earn XP exclusively via staffRecordLiveAction.
 */
const {onCall,HttpsError}=require('firebase-functions/v2/https');
const {getDatabase}=require('firebase-admin/database');
const opts={region:'asia-southeast1',maxInstances:5,timeoutSeconds:30};
async function verifiedStaff(req){
 const uid=req.auth?.uid;
 if(!uid)throw new HttpsError('unauthenticated','Cần đăng nhập Staff ID');
 const db=getDatabase(),ident=(await db.ref('staffIdentity/'+uid).once('value')).val();
 if(ident?.verified!==true||!/^DOL-(?:[0-9]{4,6}|[A-F0-9]{10})$/.test(ident.employeeId||''))
  throw new HttpsError('permission-denied','Cần Staff ID đã được quản lý xác minh');
 const profile=(await db.ref('staffRegistry/'+ident.employeeId).once('value')).val();
 if(!profile?.active||(profile.registrationSource==='self'&&profile.approved!==true))
  throw new HttpsError('permission-denied','Hồ sơ đang chờ phê duyệt');
 return profile.employeeId;
}
function disabled(employeeId){
 return {saved:false,employeeId,addedXP:0,awards:0,processed:0,checked:0,
  unmatched:0,disabled:true,status:'secure-action-required'};
}
exports.staffSyncSavedActivityXP=onCall(opts,async req=>disabled(await verifiedStaff(req)));
exports.staffSyncMyRecentXP=onCall(opts,async req=>disabled(await verifiedStaff(req)));
