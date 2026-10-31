'use strict';
/* Dolphin FCM: identical background notifications for all approved devices.
   Push enrollment is INDEPENDENT of Staff ID, local employee names and outlet roles.
   A one-time Manager-issued DEVICE code prevents public guest pages from subscribing. */
const crypto = require('node:crypto');
const {getFirestore, FieldPath} = require('firebase-admin/firestore');
const {getMessaging} = require('firebase-admin/messaging');
const {onCall, HttpsError} = require('firebase-functions/v2/https');
const {onDocumentWritten} = require('firebase-functions/v2/firestore');
const {onSchedule} = require('firebase-functions/v2/scheduler');

const REGION = 'asia-southeast1';
const DEVICES = 'dolphin_push_devices';
const ENROLLMENTS = 'dolphin_push_enrollments';
const INVITES = 'dolphin_push_invites';
const DISPATCHES = 'dolphin_push_dispatches';
const FEEDS = [
  ['bun_orders', 'Bungalow', 'order', 'bungalow'],
  ['lounge_orders', 'Lounge', 'order', 'lounge'],
  ['res_orders', 'Restaurant', 'order', 'restaurant'],
  ['bun_calls', 'Bungalow', 'call', 'bungalow'],
  ['lounge_calls', 'Lounge', 'call', 'lounge'],
  ['res_calls', 'Restaurant', 'call', 'restaurant'],
  ['show_tables', 'Show', 'order', 'show']
];
const digest = value => crypto.createHash('sha256').update(value).digest('hex');
const enabled = () => process.env.PUSH_ENABLED === 'true';
const callableOpts = {region:REGION,maxInstances:5};
const triggerOpts = (collection) => ({region:REGION,maxInstances:5,timeoutSeconds:300,document:collection+'/{id}'});
function managerIds() {
  return new Set(String(process.env.PUSH_MANAGER_UIDS || process.env.STAFF_ADMIN_UIDS || '')
    .split(',').map(s=>s.trim()).filter(Boolean));
}
const isManager = uid => Boolean(uid && managerIds().has(uid));
function requireUid(request) {
  const uid=request.auth?.uid;
  if (!uid) throw new HttpsError('unauthenticated','Cần đăng nhập Firebase để dùng thông báo.');
  return uid;
}
function requireManager(request) {
  const uid=requireUid(request);
  if(!isManager(uid)) throw new HttpsError('permission-denied','Tài khoản chưa được cấp quyền Manager.');
  return uid;
}
function tokenOf(value) {
  const token=typeof value==='string' ? value.trim() : '';
  if(!/^[A-Za-z0-9_:.-]{20,4096}$/.test(token))
    throw new HttpsError('invalid-argument','FCM token không hợp lệ.');
  return token;
}
function cleanUid(uid) {
  if(typeof uid!=='string' || !/^[A-Za-z0-9_-]{8,128}$/.test(uid))
    throw new HttpsError('invalid-argument','Firebase UID không hợp lệ.');
  return uid;
}
async function accessForUid(uid) {
  if(isManager(uid)) return {role:'manager'};
  const snap=await getFirestore().collection(ENROLLMENTS).doc(uid).get();
  return snap.exists && snap.data().active===true ? {role:'staff'} : null;
}

// Public to a signed-in device, but only returns its OWN authorization state.
// Staff ID is deliberately not accessed, checked or modified.
exports.pushGetMyAccess=onCall(callableOpts,async request=>{
  const uid=requireUid(request);
  const access=await accessForUid(uid);
  return {uid,role:access?.role||'unregistered',authorized:!!access};
});

// Codes are NOT Staff IDs. One 128-bit code activates one iPhone/PWA/browser
// Firebase Auth session. Up to 20 independent codes can be issued at once.
exports.pushIssueDeviceCodes=onCall(callableOpts,async request=>{
  const issuedBy=requireManager(request);
  const count=Number(request.data?.count||1);
  if(!Number.isInteger(count)||count<1||count>20)
    throw new HttpsError('invalid-argument','Số mã phải từ 1 đến 20.');
  const now=Date.now(),expiresAt=now+24*60*60*1000;
  const batch=getFirestore().batch(),codes=[];
  for(let i=0;i<count;i++){
    const code=crypto.randomBytes(16).toString('hex').toUpperCase();
    batch.create(getFirestore().collection(INVITES).doc(digest(code)),{
      issuedBy,createdAt:now,expiresAt,usedAt:null,usedBy:null
    });
    codes.push(code);
  }
  await batch.commit();
  return {codes,expiresAt,validForHours:24};
});
exports.pushClaimDeviceCode=onCall(callableOpts,async request=>{
  const uid=requireUid(request);
  const code=String(request.data?.code||'').trim().toUpperCase();
  if(!/^[0-9A-F]{32}$/.test(code))
    throw new HttpsError('invalid-argument','Mã kích hoạt thiết bị không hợp lệ.');
  const firestore=getFirestore();
  const ref=firestore.collection(INVITES).doc(digest(code));
  const enrolment=firestore.collection(ENROLLMENTS).doc(uid);
  const now=Date.now();
  await firestore.runTransaction(async tx=>{
    const claim=await tx.get(ref);
    const current=await tx.get(enrolment);
    const value=claim.exists?claim.data():null;
    if(!value||!(value.expiresAt>now))
      throw new HttpsError('failed-precondition','Mã đã hết hạn hoặc không tồn tại.');
    if(value.usedAt) {
      // A consumed code may be retried only while access is still active.
      // It MUST NOT allow a revoked employee to reactivate themselves.
      if(value.usedBy!==uid || current.data()?.active!==true)
        throw new HttpsError('failed-precondition','Mã đã sử dụng. Cần mã mới do Manager cấp.');
      return;
    }
    tx.update(ref,{usedAt:now,usedBy:uid});
    tx.set(enrolment,{active:true,enrolledAt:now,deviceAuth:'push-code'},{merge:true});
  });
  return {authorized:true,role:isManager(uid)?'manager':'staff'};
});
exports.pushRevokeDeviceAccess=onCall(callableOpts,async request=>{
  const revokedBy=requireManager(request);
  const targetUid=cleanUid(request.data?.uid);
  if(isManager(targetUid))throw new HttpsError('failed-precondition','Không thu hồi Manager bằng lệnh nhân viên.');
  const firestore=getFirestore();
  await firestore.collection(ENROLLMENTS).doc(targetUid).set({
    active:false,revokedAt:Date.now(),revokedBy
  },{merge:true});
  // Immediately disable all tokens for this enrollment (including sleeping PWAs).
  const devices=await firestore.collection(DEVICES).where('uid','==',targetUid).get();
  for(let i=0;i<devices.docs.length;i+=400){
    const batch=firestore.batch();
    for(const doc of devices.docs.slice(i,i+400))batch.update(doc.ref,{active:false});
    await batch.commit();
  }
  return {revoked:true,devicesDisabled:devices.size};
});
exports.pushGetDeliveryHealth=onCall(callableOpts,async request=>{
  requireManager(request);
  const db=getFirestore();
  const [deviceTotal,recent]=await Promise.all([
    db.collection(DEVICES).where('active','==',true).count().get(),
    db.collection(DISPATCHES).orderBy('createdAt','desc').limit(20).get()
  ]);
  return {
    enabled:enabled(),activeDevices:deviceTotal.data().count,
    recent:recent.docs.map(doc=>{
      const item=doc.data();
      return {
        eventId:doc.id,createdAt:item.createdAt||0,
        outlet:item.payload?.outlet||'',status:item.status||'unknown',
        attempts:item.attempts||0,lastError:item.lastError||null,
        acceptedByFcm:item.deliveredCount||0
      };
    })
  };
});
exports.pushRegisterDevice=onCall(callableOpts,async request=>{
  const uid=requireUid(request),token=tokenOf(request.data?.token);
  const platform=request.data?.platform;
  if(!['web','manager-android'].includes(platform))
    throw new HttpsError('invalid-argument','Nền tảng không hợp lệ.');
  if(!enabled())throw new HttpsError('failed-precondition','Firebase Push chưa được bật phía máy chủ.');
  const access=await accessForUid(uid);
  if(!access)throw new HttpsError('permission-denied','Cần nhập mã kích hoạt Push một lần do Manager cấp. Không cần Staff ID.');
  if(platform==='manager-android' && access.role!=='manager')
    throw new HttpsError('permission-denied','Chỉ Manager mới được đăng ký Android Manager APK.');
  await getFirestore().collection(DEVICES).doc(digest(token)).set({
    uid,token,platform,role:access.role,active:true,updatedAt:Date.now()
  },{merge:true});
  return {registered:true,role:access.role,broadcast:'all-outlets'};
});
exports.pushUnregisterDevice=onCall(callableOpts,async request=>{
  const uid=requireUid(request),token=tokenOf(request.data?.token);
  const ref=getFirestore().collection(DEVICES).doc(digest(token));
  const snap=await ref.get();
  if(snap.exists && snap.data().uid===uid)await ref.delete();
  return {unregistered:true};
});

function stamp(data) {
  if(!data)return 0;
  const value=data.timestamp||data.createdAt;
  if(value&&typeof value.toMillis==='function')return value.toMillis();
  return Number(value)||0;
}
function needsAlert(before,after) {
  if(!after||after.status!=='pending')return false;
  if(!before||before.status!=='pending')return true;
  return Boolean(stamp(after)&&stamp(after)!==stamp(before));
}
function safeTable(data) {
  const raw=data.table||data.tableName||data.bungalow||data.room||data.label||'';
  return String(raw).replace(/[^\p{L}\p{N} ._-]/gu,'').slice(0,40);
}
function notificationPayload(collection,label,kind,id,data,outlet) {
  const table=safeTable(data);
  const eventId=digest(collection+'/'+id+'/'+kind+'/'+stamp(data));
  const search=new URLSearchParams({pushOutlet:outlet,pushId:id,pushKind:kind});
  return {
    title:'Dolphin '+label+': '+(kind==='call'?'Yêu cầu phục vụ':'Order mới'),
    body:(table?'Bàn '+table+' · ':'')+'Mở Dolphin để xử lý.',
    tag:eventId,url:'https://dolphinfb.store/index.html?'+search.toString(),
    kind,outlet,eventId,type:'dolphin-order'
  };
}
function showService(booking) {
  if(!booking?.service)return null;
  return {status:booking.service.status||'pending',
    timestamp:booking.service.savedAt||0,table:booking.label||''};
}
function eligibleDevice(v) {
  // Do not silently stop push after 30 days without reopening a locked PWA.
  // Invalid tokens are removed when FCM rejects them; Manager can revoke access.
  return typeof v?.token==='string' && v.active===true &&
    (v.role==='staff' || (v.role==='manager' && isManager(v.uid)));
}
const MAX_DELIVERY_ATTEMPTS = 5;
const DELIVERY_LEASE_MS = 2*60*1000;
async function acquireDispatch(ref) {
  const db=getFirestore(),now=Date.now();
  return db.runTransaction(async tx=>{
    const snap=await tx.get(ref);
    if(!snap.exists)return null;
    const record=snap.data();
    if(record.status==='sent'||record.status==='failed')return null;
    if(record.status==='processing' && Number(record.leaseUntil)>now)return null;
    if(record.status==='retry' && Number(record.nextAttemptAt)>now)return null;
    const attempts=Number(record.attempts)||0;
    if(attempts>=MAX_DELIVERY_ATTEMPTS){
      tx.update(ref,{status:'failed',leaseUntil:0,finishedAt:now});
      return null;
    }
    tx.update(ref,{status:'processing',attempts:attempts+1,leaseUntil:now+DELIVERY_LEASE_MS});
    return {payload:record.payload,attempts:attempts+1};
  });
}
function retryDelay(attempts) {
  return Math.min(30*60*1000,Math.pow(2,Math.min(5,attempts))*60*1000);
}
async function deliverDispatch(ref) {
  const claim=await acquireDispatch(ref);
  if(!claim)return;
  const info=claim.payload;
  const firestore=getFirestore(),errors=[];
  let deliveredCount=0,recipientCount=0;
  try {
    // Paginate all approved devices; Staff ID and outlet are NOT consulted.
    let last=null;
    for(;;) {
      let q=firestore.collection(DEVICES).where('active','==',true)
        .orderBy(FieldPath.documentId()).limit(400);
      if(last)q=q.startAfter(last);
      const snapshot=await q.get();
      if(snapshot.empty)break;
      last=snapshot.docs[snapshot.docs.length-1];
      const approved=snapshot.docs.filter(doc=>eligibleDevice(doc.data()));
      if(approved.length){
        recipientCount+=approved.length;
        const result=await getMessaging().sendEachForMulticast({
          tokens:approved.map(doc=>doc.data().token),
          data:Object.fromEntries(Object.entries(info).map(([k,v])=>[k,String(v)])),
          android:{priority:'high'},
          webpush:{headers:{Urgency:'high',TTL:'3600'}}
        });
        const stale=[];
        result.responses.forEach((reply,i)=>{
          if(reply.success){deliveredCount++;return;}
          const code=reply.error?.code||'unknown';
          if(code==='messaging/registration-token-not-registered'||
             code==='messaging/invalid-registration-token'){
            stale.push(approved[i].ref.delete());
          }else{
            errors.push(code);
            console.error('[Dolphin Push delivery]',code);
          }
        });
        await Promise.allSettled(stale);
      }
      if(snapshot.size<400)break;
    }
  }catch(err){
    errors.push(err?.code||err?.message||'send-error');
    console.error('[Dolphin Push retryable failure]',err);
  }
  const now=Date.now();
  await ref.update({
    status:errors.length===0?'sent':(claim.attempts>=MAX_DELIVERY_ATTEMPTS?'failed':'retry'),
    nextAttemptAt:errors.length ? now+retryDelay(claim.attempts) : null,
    leaseUntil:0,finishedAt:errors.length===0?now:null,
    deliveredCount,recipientCount,
    lastError:errors.length?String(errors[0]).slice(0,180):null,
    updatedAt:now
  });
  // The same notification tag/eventId deduplicates a transient repeat in
  // Safari and Android. Successful tokens may be resent on a partial retry.
}
async function sendAlert(event,collection,label,kind,outlet) {
  const rawBefore=event.data?.before.exists?event.data.before.data():null;
  const rawAfter=event.data?.after.exists?event.data.after.data():null;
  const before=collection==='show_tables'?showService(rawBefore):rawBefore;
  const after=collection==='show_tables'?showService(rawAfter):rawAfter;
  if(!needsAlert(before,after)||!enabled())return;
  const info=notificationPayload(collection,label,kind,event.params.id,after,outlet);
  const dispatch=getFirestore().collection(DISPATCHES).doc(info.eventId);
  try {
    await dispatch.create({
      collection,orderId:event.params.id,payload:info,createdAt:Date.now(),
      status:'retry',attempts:0,nextAttemptAt:Date.now(),leaseUntil:0
    });
  }catch(err){
    if(err.code!==6&&err.code!=='already-exists')throw err;
  }
  // Never fail the guest order transaction because an FCM device is offline.
  // Durable retry is performed by pushRetryDeliveries below.
  await deliverDispatch(dispatch);
}
exports.pushRetryDeliveries=onSchedule({
  schedule:'every 5 minutes',timeZone:'Asia/Ho_Chi_Minh',
  region:REGION,maxInstances:1,timeoutSeconds:300
},async()=>{
  if(!enabled())return;
  // Both retryable FCM failures and expired leases (crashed Functions) recover.
  const collection=getFirestore().collection(DISPATCHES);
  for(const status of ['retry','processing']){
    const snap=await collection.where('status','==',status).limit(100).get();
    for(const entry of snap.docs){
      try{await deliverDispatch(entry.ref);}
      catch(err){console.error('[Dolphin Push retry job]',entry.id,err);}
    }
  }
});
for(const [collection,label,kind,outlet] of FEEDS)
  exports['push_'+collection]=onDocumentWritten(triggerOpts(collection),
    event=>sendAlert(event,collection,label,kind,outlet));

exports._pushTest={needsAlert,stamp,safeTable,showService,eligibleDevice,notificationPayload,retryDelay};
