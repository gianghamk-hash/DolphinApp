'use strict';
// Dolphin Manager push: registration is server-authorized, not inferred from WebView UA.
const crypto = require('node:crypto');
const {getFirestore} = require('firebase-admin/firestore');
const {getMessaging} = require('firebase-admin/messaging');
const {onCall, HttpsError} = require('firebase-functions/v2/https');
const {onDocumentWritten} = require('firebase-functions/v2/firestore');

const REGION = 'asia-southeast1';
const DEVICES = 'dolphin_push_devices';
const DISPATCHES = 'dolphin_push_dispatches';
const collections = [
  ['bun_orders', 'Bungalow', 'order'], ['lounge_orders', 'Lounge', 'order'],
  ['res_orders', 'Restaurant', 'order'], ['bun_calls', 'Bungalow', 'call'],
  ['lounge_calls', 'Lounge', 'call'], ['res_calls', 'Restaurant', 'call']
];
const digest = str => crypto.createHash('sha256').update(str).digest('hex');
function managerIds() {
  return new Set(String(process.env.PUSH_MANAGER_UIDS || process.env.STAFF_ADMIN_UIDS || '')
    .split(',').map(s => s.trim()).filter(Boolean));
}
function isManager(uid) { return Boolean(uid && managerIds().has(uid)); }
function requireManager(request) {
  const uid = request.auth && request.auth.uid;
  if (!uid) throw new HttpsError('unauthenticated', 'Đăng nhập Firebase trước khi đăng ký thông báo.');
  if (!isManager(uid)) throw new HttpsError('permission-denied', 'UID chưa được quản trị viên cho phép nhận thông báo Manager.');
  return uid;
}
function validateToken(value) {
  const token = typeof value === 'string' ? value.trim() : '';
  if (token.length < 20 || token.length > 4096 || !/^[A-Za-z0-9_:.-]+$/.test(token))
    throw new HttpsError('invalid-argument', 'FCM token không hợp lệ.');
  return token;
}
exports.pushRegisterDevice = onCall({region: REGION, maxInstances: 5}, async request => {
  const uid = requireManager(request);
  const token = validateToken(request.data && request.data.token);
  const platform = request.data && request.data.platform;
  if (!['web', 'manager-android'].includes(platform))
    throw new HttpsError('invalid-argument', 'Nền tảng không hợp lệ.');
  if (process.env.PUSH_ENABLED !== 'true')
    throw new HttpsError('failed-precondition', 'Hệ thống Push chưa được kích hoạt phía máy chủ.');
  const id = digest(token);
  await getFirestore().collection(DEVICES).doc(id).set({
    uid, token, platform, active: true, updatedAt: Date.now()
  }, {merge: true});
  return {registered: true};
});
exports.pushUnregisterDevice = onCall({region: REGION, maxInstances: 5}, async request => {
  const uid = requireManager(request);
  const token = validateToken(request.data && request.data.token);
  const ref = getFirestore().collection(DEVICES).doc(digest(token));
  const snap = await ref.get();
  if (snap.exists && snap.data().uid === uid) await ref.delete();
  return {unregistered: true};
});
function stamp(data) {
  if (!data) return 0;
  const v = data.timestamp || data.createdAt;
  if (v && typeof v.toMillis === 'function') return v.toMillis();
  return Number(v) || 0;
}
function needsAlert(before, after) {
  if (!after || after.status !== 'pending') return false;
  if (!before || before.status !== 'pending') return true;
  return Boolean(stamp(after) && stamp(after) !== stamp(before));
}
function safeTable(data) {
  const raw = data.table || data.tableName || data.bungalow || data.room || '';
  return String(raw).replace(/[^\p{L}\p{N} ._-]/gu, '').slice(0, 40);
}
function notificationPayload(collection, label, kind, id, data) {
  const table = safeTable(data);
  const outlet = collection.startsWith('bun_') ? 'bungalow' : collection.startsWith('lounge_') ? 'lounge' : 'restaurant';
  const eventId = digest(collection + '/' + id + '/' + kind + '/' + stamp(data));
  const search = new URLSearchParams({pushOutlet: outlet, pushId: id, pushKind: kind});
  return {
    title: 'Dolphin ' + label + ': ' + (kind === 'call' ? 'Yêu cầu phục vụ' : 'Order mới'),
    body: (table ? 'Bàn ' + table + ' · ' : '') + 'Mở Dolphin để xử lý.',
    tag: eventId,
    url: 'https://dolphinfb.store/index.html?' + search.toString(),
    kind, outlet, eventId, type: 'dolphin-order'
  };
}
async function sendAlert(event, collection, label, kind) {
  const before = event.data && event.data.before.exists ? event.data.before.data() : null;
  const after = event.data && event.data.after.exists ? event.data.after.data() : null;
  if (!needsAlert(before, after) || process.env.PUSH_ENABLED !== 'true') return;
  const info = notificationPayload(collection, label, kind, event.params.id, after);
  const db = getFirestore();
  const dispatch = db.collection(DISPATCHES).doc(info.tag);
  try {
    await dispatch.create({collection, orderId: event.params.id, createdAt: Date.now()});
  } catch (err) {
    if (err.code === 6 || err.code === 'already-exists') return; // duplicate event delivery
    throw err;
  }
  const snapshot = await db.collection(DEVICES).where('active', '==', true).limit(500).get();
  const now = Date.now();
  const devices = snapshot.docs.filter(d => {
    const v = d.data();
    return isManager(v.uid) && typeof v.token === 'string' &&
      now - (Number(v.updatedAt) || 0) < 30 * 24 * 60 * 60 * 1000;
  });
  if (!devices.length) return;
  const response = await getMessaging().sendEachForMulticast({
    tokens: devices.map(d => d.data().token),
    data: Object.fromEntries(Object.entries(info).map(([k,v]) => [k, String(v)])),
    android: {priority: 'high'},
    webpush: {headers: {Urgency: 'high'}, fcmOptions: {link: info.url}}
  });
  const stale = [];
  response.responses.forEach((result, i) => {
    if (result.success) return;
    const code = result.error && result.error.code;
    if (code === 'messaging/registration-token-not-registered' || code === 'messaging/invalid-registration-token')
      stale.push(devices[i].ref.delete());
    else console.error('[Manager push]', code || result.error);
  });
  await Promise.allSettled(stale);
}
for (const [collection, label, kind] of collections) {
  const exportName = 'push_' + collection;
  exports[exportName] = onDocumentWritten({
    document: collection + '/{id}', region: REGION, maxInstances: 5
  }, event => sendAlert(event, collection, label, kind));
}
exports._pushTest = {needsAlert, stamp, safeTable, notificationPayload};
