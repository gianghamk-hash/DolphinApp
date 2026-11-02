'use strict';
/* Private registration alerts for the verified DOL-0001 owner only.
   Queue-once prevents duplicate notifications on registration retries.
   Push is optional; in-app pending list always remains authoritative. */
const {getFirestore}=require('firebase-admin/firestore');
const {getMessaging}=require('firebase-admin/messaging');
async function notifyRegistration(profile,db){
 if(!profile?.employeeId||profile.approved===true)return;
 const identity=(await db.ref('staffIdentity').once('value')).val()||{};
 const managers=Object.entries(identity).filter(([,v])=>v?.employeeId==='DOL-0001'&&v.verified===true).map(([uid])=>uid);
 if(!managers.length)return;
 const firestore=getFirestore();
 const alert=firestore.collection('staff_approval_alerts').doc(profile.employeeId);
 const once=await firestore.runTransaction(async tx=>{
  const record=await tx.get(alert);
  if(record.exists)return false;
  tx.create(alert,{employeeId:profile.employeeId,name:profile.name,createdAt:Date.now(),type:'staff-registration',targetEmployeeId:'DOL-0001'});
  return true;
 });
 if(!once)return;
 const deviceSnaps=await Promise.all(managers.map(uid=>firestore.collection('dolphin_push_devices').where('uid','==',uid).where('active','==',true).get()));
 const tokens=[...new Set(deviceSnaps.flatMap(s=>s.docs.map(d=>d.data().token).filter(Boolean)))].slice(0,100);
 if(!tokens.length)return;
 await getMessaging().sendEachForMulticast({
  tokens,
  notification:{title:'🐬 Nhân viên mới chờ duyệt',body:profile.name+' · '+profile.employeeId},
  data:{type:'staff-registration',employeeId:profile.employeeId,route:'profile'}
 });
}
module.exports={notifyRegistration};
