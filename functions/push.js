'use strict';
// Dolphin Push: server-authorized Manager and verified Staff PWA devices.
// Never infer role/outlet from User-Agent, localStorage, PIN screens or client-supplied labels.
const crypto = require('node:crypto');
const {getDatabase} = require('firebase-admin/database');
const {getFirestore} = require('firebase-admin/firestore');
const {getMessaging} = require('firebase-admin/messaging');
const {onCall, HttpsError} = require('firebase-functions/v2/https');
const {onDocumentWritten} = require('firebase-functions/v2/firestore');

const REGION = 'asia-southeast1';
const DEVICES = 'dolphin_push_devices';
const DISPATCHES = 'dolphin_push_dispatches';
const OUTLETS = ['bungalow','lounge','restaurant','show'];
const FEEDS = [
  ['bun_orders', 'Bungalow', 'order', 'bungalow'],
  ['lounge_orders', 'Lounge', 'order', 'lounge'],
  ['res_orders', 'Restaurant', 'order', 'restaurant'],
  ['bun_calls', 'Bungalow', 'call', 'bungalow'],
  ['lounge_calls', 'Lounge', 'call', 'lounge'],
  ['res_calls', 'Restaurant', 'call', 'restaurant'],
  ['show_tables', 'Show', 'order', 'show']
];
const digest = str => crypto.createHash('sha256').update(str).digest('hex');
const staffCodePattern = /^DOL-[0-9]{4,6}$/;

function managerIds() {
  return new Set(String(process.env.PUSH_MANAGER_UIDS || process.env.STAFF_ADMIN_UIDS || '')
    .split(',').map(s => s.trim()).filter(Boolean));
}
function isManager(uid) { return Boolean(uid && managerIds().has(uid)); }
function requireUid(request) {
  const uid = request.auth && request.auth.uid;
  if (!uid) throw new HttpsError('unauthenticated','Vui lòng xác minh tài khoản Dolphin.');
  return uid;
}
function requireManager(request) {
  const uid = requireUid(request);
  if (!isManager(uid)) throw new HttpsError('permission-denied','UID chưa được cấp quyền Manager trên máy chủ.');
  return uid;
}
function validateToken(value) {
  const token = typeof value === 'string' ? value.trim() : '';
  if (token.length < 20 || token.length > 4096 || !/^[A-Za-z0-9_:.-]+$/.test(token))
    throw new HttpsError('invalid-argument','FCM token không hợp lệ.');
  return token;
}
function normalizeOutlets(value) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter(x => OUTLETS.includes(x)))];
}
function configuredOutlets(value) {
  if (!Array.isArray(value) || value.some(x => !OUTLETS.includes(x)))
    throw new HttpsError('invalid-argument','Các outlet hợp lệ: bungalow, lounge, restaurant, show.');
  return normalizeOutlets(value);
}

// Re-validate staff Registry (not just the current token's cached role) so
// a revoked/deactivated employee does not continue to receive guest notifications.
async function accessForUid(uid) {
  if (isManager(uid)) return {role:'manager',outlets:OUTLETS.slice()};
  const identity=(await getDatabase().ref('staffIdentity/'+uid).once('value')).val();
  if (!identity || identity.verified !== true || !staffCodePattern.test(identity.employeeId || ''))
    return null;
  const profile=(await getDatabase().ref('staffRegistry/'+identity.employeeId).once('value')).val();
  if (!profile || profile.active !== true) return null;
  const outlets=normalizeOutlets(profile.pushOutlets);
  if (!outlets.length) return null;
  return {role:'staff',employeeId:identity.employeeId,outlets};
}
exports.pushGetMyAccess=onCall({region:REGION,maxInstances:5},async request=>{
  const uid=requireUid(request);
  const access=await accessForUid(uid);
  return access ? {...access,uid} : {role:'unassigned',outlets:[],uid};
});

exports.pushSetStaffOutlets=onCall({region:REGION,maxInstances:5},async request=>{
  const managerUid=requireManager(request);
  const employeeId=String(request.data?.employeeId||'').trim().toUpperCase();
  if (!staffCodePattern.test(employeeId))
    throw new HttpsError('invalid-argument','Mã Staff ID không hợp lệ.');
  const outlets=configuredOutlets(request.data?.outlets);
  const ref=getDatabase().ref('staffRegistry/'+employeeId);
  const snap=await ref.once('value');
  if (!snap.exists() || snap.val().active !== true)
    throw new HttpsError('not-found','Không tìm thấy nhân viên đang hoạt động.');
  await ref.update({pushOutlets:outlets,pushOutletsUpdatedBy:managerUid,pushOutletsUpdatedAt:Date.now()});
  // Runtime fanout also validates the live staff Registry every time.
  return {employeeId,outlets};
});

exports.pushRegisterDevice=onCall({region:REGION,maxInstances:5},async request=>{
  const uid=requireUid(request);
  const token=validateToken(request.data?.token);
  const platform=request.data?.platform;
  if (!['web','manager-android'].includes(platform))
    throw new HttpsError('invalid-argument','Nền tảng không hợp lệ.');
  if(process.env.PUSH_ENABLED!=='true')
    throw new HttpsError('failed-precondition','Thông báo đẩy chưa được bật từ phía máy chủ.');
  const access=await accessForUid(uid);
  if(!access)
    throw new HttpsError('permission-denied','Cần xác minh Staff ID và được Manager phân công outlet.');
  if(platform==='manager-android' && access.role!=='manager')
    throw new HttpsError('permission-denied','APK Manager chỉ dành cho tài khoản được cấp quyền Manager.');
  const id=digest(token);
  await getFirestore().collection(DEVICES).doc(id).set({
    uid, token, platform, role:access.role, employeeId:access.employeeId||null,
    outlets:access.outlets, active:true,updatedAt:Date.now()
  },{merge:true});
  return {registered:true,role:access.role,outlets:access.outlets};
});
exports.pushUnregisterDevice=onCall({region:REGION,maxInstances:5},async request=>{
  const uid=requireUid(request);
  const token=validateToken(request.data?.token);
  const ref=getFirestore().collection(DEVICES).doc(digest(token));
  const snap=await ref.get();
  if(snap.exists && snap.data().uid===uid) await ref.delete();
  return {unregistered:true};
});

function stamp(data) {
  if (!data) return 0;
  const v=data.timestamp || data.createdAt;
  if(v && typeof v.toMillis==='function') return v.toMillis();
  return Number(v)||0;
}
function needsAlert(before,after) {
  if(!after || after.status!=='pending') return false;
  if(!before || before.status!=='pending') return true;
  return Boolean(stamp(after) && stamp(after)!==stamp(before));
}
function safeTable(data) {
  const raw=data.table || data.tableName || data.bungalow || data.room || data.label || '';
  return String(raw).replace(/[^\p{L}\p{N} ._-]/gu,'').slice(0,40);
}
function notificationPayload(collection,label,kind,id,data,outlet) {
  const table=safeTable(data);
  const eventId=digest(collection+'/'+id+'/'+kind+'/'+stamp(data));
  const search=new URLSearchParams({pushOutlet:outlet,pushId:id,pushKind:kind});
  return {
    title:'Dolphin '+label+': '+(kind==='call'?'Yêu cầu phục vụ':'Order mới'),
    body:(table?'Bàn '+table+' · ':'')+'Mở Dolphin để xử lý.',
    tag:eventId,
    url:'https://dolphinfb.store/index.html?'+search.toString(),
    kind,outlet,eventId,type:'dolphin-order'
  };
}
function showService(booking) {
  if(!booking || !booking.service)return null;
  return {status:booking.service.status || 'pending',
    timestamp:booking.service.savedAt || 0, table:booking.label || ''};
}
async function sendAlert(event,collection,label,kind,outlet) {
  const rawBefore=event.data?.before.exists ? event.data.before.data() : null;
  const rawAfter=event.data?.after.exists ? event.data.after.data() : null;
  // Show stores an order under show_tables/{tableId}.service instead of
  // the flat *_orders structure. Notify only when this service is pending.
  const before=collection==='show_tables' ? showService(rawBefore) : rawBefore;
  const after=collection==='show_tables' ? showService(rawAfter) : rawAfter;
  if(!needsAlert(before,after) || process.env.PUSH_ENABLED!=='true')return;
  const info=notificationPayload(collection,label,kind,event.params.id,after,outlet);
  const db=getFirestore();
  const dispatch=db.collection(DISPATCHES).doc(info.eventId);
  try {
    await dispatch.create({collection,orderId:event.params.id,createdAt:Date.now()});
  }catch(err){
    if(err.code===6 || err.code==='already-exists')return; // do not send duplicates on trigger retry
    throw err;
  }
  const snapshot=await db.collection(DEVICES).where('active','==',true).limit(500).get();
  const cutoff=Date.now()-30*24*60*60*1000;
  const candidates=snapshot.docs.filter(doc=>{
    const v=doc.data();
    return v.updatedAt>=cutoff && typeof v.token==='string' && v.outlets?.includes(outlet);
  });
  if(!candidates.length)return;
  const accessCache=new Map();
  async function valid(doc) {
    const entry=doc.data(),uid=entry.uid;
    if(typeof uid!=='string')return false;
    if(!accessCache.has(uid)) accessCache.set(uid,accessForUid(uid).catch(e=>{console.error('[Push access]',e);return null;}));
    const access=await accessCache.get(uid);
    return !!access && access.role===entry.role && access.outlets.includes(outlet);
  }
  const validFlags=await Promise.all(candidates.map(valid));
  const targets=candidates.filter((doc,i)=>validFlags[i]);
  if(!targets.length)return;
  const response=await getMessaging().sendEachForMulticast({
    tokens:targets.map(doc=>doc.data().token),
    data:Object.fromEntries(Object.entries(info).map(([k,v])=>[k,String(v)])),
    android:{priority:'high'},
    webpush:{headers:{Urgency:'high',TTL:'3600'}}
  });
  const stale=[];
  response.responses.forEach((item,i)=>{
    if(item.success)return;
    const code=item.error?.code;
    if(code==='messaging/registration-token-not-registered' || code==='messaging/invalid-registration-token')
      stale.push(targets[i].ref.delete());
    else console.error('[Dolphin Push send]',code||item.error);
  });
  await Promise.allSettled(stale);
}
for(const [collection,label,kind,outlet] of FEEDS)
  exports['push_'+collection]=onDocumentWritten({
    document:collection+'/{id}',region:REGION,maxInstances:5
  },event=>sendAlert(event,collection,label,kind,outlet));

exports._pushTest={needsAlert,stamp,safeTable,normalizeOutlets,showService,notificationPayload};
