/* ═══════════════════════════════════════════════════════════════
   🎮 DOLPHIN MULTIPLAYER v1.0
   Module dùng chung cho game co-op 2 người qua Firestore
   
   Usage:
     await DolphinMP.createRoom('snake-coop', {name:'An'})
     await DolphinMP.joinRoom('ABC123', 'snake-coop', {name:'Bình'})
     DolphinMP.onPlayers(cb)   // realtime list
     DolphinMP.onState(cb)     // host state
     DolphinMP.onInput(cb)     // other player's input
     DolphinMP.sendInput({dir:'up'})
     DolphinMP.sendState({...})
   ═══════════════════════════════════════════════════════════════ */
(function(){
'use strict';

const COL = 'mp_rooms';
const DEVICE_KEY = 'dolphin_device_id';
const HEARTBEAT_MS = 4000;
const STALE_MS = 14000;
const MAX_ATTEMPTS = 10;

function getDB(){
  if (window.db) return window.db;
  if (window.firebase && firebase.firestore) return firebase.firestore();
  return null;
}

function getDeviceId(){
  let id = null;
  try { id = localStorage.getItem(DEVICE_KEY); } catch(e){}
  if (!id){
    id = 'dev_' + Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);
    try { localStorage.setItem(DEVICE_KEY, id); } catch(e){}
  }
  return id;
}

function getName(){
  try {
    if (typeof window.getSyncedStaffName === 'function'){
      var n1 = window.getSyncedStaffName();
      if (n1 && n1.trim()) return n1.trim();
    }
    if (typeof window.getStaffName === 'function'){
      var n2 = window.getStaffName();
      if (n2 && n2.trim()) return n2.trim();
    }
    if (window.DolphinStaff && window.DolphinStaff.getName){
      var n3 = window.DolphinStaff.getName();
      if (n3 && n3.trim()) return n3.trim();
    }
    return localStorage.getItem('dolphinStaffName')
        || localStorage.getItem('dolphinShowSeller')
        || 'Khách';
  } catch(e){ return 'Khách'; }
}
function genCode(){
  // Bỏ ký tự dễ nhầm: 0 O 1 I L
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let s = '';
  for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

// ═══ STATE ═══
let _roomId = null;
let _deviceId = getDeviceId();
let _name = getName();
let _game = null;
let _isHost = false;
let _side = null;
let _activeAdapter = null;
let _adapterCleanup = null;
let _adapterPlayerId = null;
const _adapters = Object.create(null);
let _hbTimer = null;
let _unsubs = [];

const _handlers = { room: [], players: [], state: [], input: [], error: [] };

function fire(type, payload){
  (_handlers[type] || []).forEach(cb => {
    try { cb(payload); } catch(e){ console.error('[MP]', type, e); }
  });
}

function on(type, cb){
  if (!_handlers[type]) _handlers[type] = [];
  _handlers[type].push(cb);
  return () => { _handlers[type] = _handlers[type].filter(x => x !== cb); };
}

function stopHeartbeat(){
  if (_hbTimer){ clearInterval(_hbTimer); _hbTimer = null; }
}

function startHeartbeat(){
  stopHeartbeat();
  const beat = () => {
    if (!_roomId) return;
    const db = getDB(); if (!db) return;
    db.collection(COL).doc(_roomId).collection('players').doc(_deviceId)
      .update({ lastSeen: Date.now() }).catch(() => {});
  };
  beat();
  _hbTimer = setInterval(beat, HEARTBEAT_MS);
}

function unsubscribeAll(){
  _unsubs.forEach(fn => { try { fn(); } catch(e){} });
  _unsubs = [];
}

function subscribe(){
  unsubscribeAll();
  const db = getDB(); if (!db || !_roomId) return;

  // Room meta
  _unsubs.push(db.collection(COL).doc(_roomId).onSnapshot(snap => {
    if (!snap.exists){ fire('error', { type: 'room_deleted' }); return; }
    const d = snap.data();
    _isHost = d.hostId === _deviceId;
    fire('room', { id: _roomId, ...d, isHost: _isHost });
  }, err => fire('error', { type: 'room', err })));

  // Players (with stale filter)
  _unsubs.push(db.collection(COL).doc(_roomId).collection('players').onSnapshot(snap => {
    const now = Date.now();
    const players = snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .filter(p => (now - (p.lastSeen || 0)) < STALE_MS || p.id === _deviceId);
    fire('players', { players, me: _deviceId, side: _side });
  }, err => fire('error', { type: 'players', err })));

  // Host-authoritative state
  _unsubs.push(db.collection(COL).doc(_roomId).collection('data').doc('state')
    .onSnapshot(snap => {
      if (!snap.exists) return;
      fire('state', snap.data());
    }, err => {}));

  // Other player's inputs
  _unsubs.push(db.collection(COL).doc(_roomId).collection('inputs').onSnapshot(snap => {
    snap.docChanges().forEach(ch => {
      if (ch.type === 'removed') return;
      if (ch.doc.id === _deviceId) return;
      fire('input', { playerId: ch.doc.id, ...ch.doc.data() });
    });
  }, err => {}));
}

// ═══ OPTIONAL GAME TRANSPORT ADAPTERS ═══
// Legacy Firestore games retain their existing 2-player protocol unchanged.
// Games using a trusted backend can reuse the common room/player event API.
function registerAdapter(game, adapter){
  if (typeof game !== 'string' || !game || !adapter ||
      typeof adapter.createRoom !== 'function' ||
      typeof adapter.joinRoom !== 'function' ||
      typeof adapter.subscribe !== 'function'){
    throw new Error('Multiplayer adapter phải có createRoom, joinRoom và subscribe');
  }
  if (_adapters[game] && _adapters[game] !== adapter) throw new Error('Adapter đã đăng ký: ' + game);
  _adapters[game] = adapter;
  return () => { if (_adapters[game] === adapter && _game !== game) delete _adapters[game]; };
}
async function connectAdapter(game, code, opts){
  const adapter = _adapters[game];
  if (!adapter) throw new Error('Adapter không tồn tại');
  if (_roomId) throw new Error('Đã tham gia phòng, hãy rời phòng trước khi mở phòng mới');
  const result = code
    ? await adapter.joinRoom(code, opts)
    : await adapter.createRoom(opts);
  if (!result || !result.roomId) throw new Error('Adapter không trả về mã phòng');
  _roomId = String(result.roomId);
  _game = game;
  _name = opts.name || getName();
  _side = result.side || null;
  _isHost = !!result.isHost;
  _activeAdapter = adapter;
  _adapterPlayerId = result.playerId || result.uid || null;
  try {
    const cleanup = adapter.subscribe({
      roomId: _roomId, playerId: _adapterPlayerId,
      emit: (type, payload) => {
        if (type === 'room' && payload) _isHost = !!payload.isHost;
        fire(type, payload);
      }
    });
    if (cleanup && typeof cleanup !== 'function') throw new Error('subscribe phải trả về hàm hủy theo dõi');
    _adapterCleanup = cleanup || null;
  } catch(err){
    _roomId = null; _game = null; _side = null; _isHost = false;
    _activeAdapter = null; _adapterPlayerId = null;
    throw err;
  }
  return { ...result, roomId: _roomId, isHost: _isHost, side: _side };
}

// ═══ PUBLIC API ═══

async function createRoom(game, opts = {}){
  if (_adapters[game]) return connectAdapter(game, null, opts);
  const db = getDB();
  if (!db) throw new Error('Chưa kết nối Firebase');

  _deviceId = getDeviceId();
  _name = opts.name || getName();
  _game = game;

  let code = null;
  for (let i = 0; i < MAX_ATTEMPTS; i++){
    const c = genCode();
    const doc = await db.collection(COL).doc(c).get();
    if (!doc.exists){ code = c; break; }
  }
  if (!code) throw new Error('Không tạo được mã phòng, thử lại');

  const seed = Math.floor(Math.random() * 1e9);
  const now = Date.now();

  await db.collection(COL).doc(code).set({
    game, hostId: _deviceId, status: 'waiting', maxPlayers: Math.min(4, Math.max(2, Number(opts.maxPlayers)||2)),
    seed, createdAt: now, updatedAt: now,
  });

  await db.collection(COL).doc(code).collection('players').doc(_deviceId).set({
    name: _name, side: 'p1', joinedAt: now, lastSeen: now, ready: false,
  });

  _roomId = code;
  _side = 'p1';
  _isHost = true;

  startHeartbeat();
  subscribe();

  return { roomId: code, side: 'p1', isHost: true, seed, name: _name };
}

async function joinRoom(code, game, opts = {}){
  if (_adapters[game]) return connectAdapter(game, code, opts);
  const db = getDB();
  if (!db) throw new Error('Chưa kết nối Firebase');

  code = String(code || '').toUpperCase().replace(/[^A-Z0-9]/g, '').trim();
  if (code.length !== 6) throw new Error('Mã phòng phải 6 ký tự');

  _deviceId = getDeviceId();
  _name = opts.name || getName();
  _game = game;

  const roomDoc = await db.collection(COL).doc(code).get();
  if (!roomDoc.exists) throw new Error('Phòng không tồn tại');

  const room = roomDoc.data();
  if (room.game !== game) throw new Error('Phòng dành cho game khác');
  if (room.status === 'closed') throw new Error('Phòng đã đóng');

  const pSnap = await db.collection(COL).doc(code).collection('players').get();
  const players = pSnap.docs.map(d => ({ id: d.id, ...d.data() }));

  const existing = players.find(p => p.id === _deviceId);
  let side = existing ? existing.side : null;

  if (!existing){
    if (room.status !== 'waiting') throw new Error('Trận đã bắt đầu, không thể vào mới');
    const capacity = Math.min(4,Math.max(2,Number(room.maxPlayers)||2));
    const used = new Set(players.map(p => p.side));
    for(let i=1;i<=capacity;i++)if(!used.has('p'+i)){side='p'+i;break;}
    if (!side) throw new Error('Phòng đã đủ '+capacity+' người');

    await db.collection(COL).doc(code).collection('players').doc(_deviceId).set({
      name: _name, side, joinedAt: Date.now(), lastSeen: Date.now(), ready: false,
    });
  } else {
    await db.collection(COL).doc(code).collection('players').doc(_deviceId).update({
      lastSeen: Date.now(),
    });
  }

  _roomId = code;
  _side = side;
  _isHost = room.hostId === _deviceId;

  startHeartbeat();
  subscribe();

  return { roomId: code, side, isHost: _isHost, seed: room.seed, name: _name };
}

async function leaveRoom(){
  if (_activeAdapter){
    const adapter = _activeAdapter, id = _roomId;
    if (_adapterCleanup){ try { _adapterCleanup(); } catch(e){console.warn('[MP] adapter unsubscribe:',e);} }
    _adapterCleanup = null;
    _activeAdapter = null;
    _roomId = null; _side = null; _isHost = false; _game = null; _adapterPlayerId = null;
    if (typeof adapter.leaveRoom === 'function') await adapter.leaveRoom(id);
    return;
  }
  stopHeartbeat();
  unsubscribeAll();
  const db = getDB();
  if (db && _roomId){
    try {
      await db.collection(COL).doc(_roomId).collection('players').doc(_deviceId).delete();
    } catch(e){}
    if (_isHost){
      try {
        await db.collection(COL).doc(_roomId).update({ status: 'closed', updatedAt: Date.now() });
      } catch(e){}
    }
  }
  _roomId = null;
  _isHost = false;
  _side = null;
  _game = null;
}

async function sendInput(payload){
  if (_activeAdapter){
    if (!_activeAdapter.sendInput) throw new Error('Adapter chỉ nhận thao tác qua máy chủ');
    return _activeAdapter.sendInput(payload);
  }
  if (!_roomId) return;
  const db = getDB(); if (!db) return;
  try {
    await db.collection(COL).doc(_roomId).collection('inputs').doc(_deviceId).set({
      ...payload, at: Date.now(),
    });
  } catch(e){}
}

async function sendState(state){
  if (_activeAdapter) throw new Error('Không thể ghi trạng thái trận đấu từ client adapter');
  if (!_roomId || !_isHost) return;
  const db = getDB(); if (!db) return;
  try {
    await db.collection(COL).doc(_roomId).collection('data').doc('state').set(state);
  } catch(e){}
}

async function sendConfig(config){
  if (_activeAdapter) throw new Error('Cấu hình trận đấu do server quản lý');
  if (!_roomId || !_isHost) return;
  const db = getDB(); if (!db) return;
  try {
    await db.collection(COL).doc(_roomId).collection('data').doc('config').set(config);
  } catch(e){}
}

async function updateRoomStatus(status){
  if (_activeAdapter) throw new Error('Phase và trạng thái phòng do server quản lý');
  if (!_roomId || !_isHost) return;
  const db = getDB(); if (!db) return;
  try {
    await db.collection(COL).doc(_roomId).update({ status, updatedAt: Date.now() });
  } catch(e){}
}

async function setReady(ready){
  if (_activeAdapter){
    if (typeof _activeAdapter.setReady !== 'function') throw new Error('Adapter không hỗ trợ ready');
    return _activeAdapter.setReady(!!ready);
  }
  if (!_roomId) return;
  const db = getDB(); if (!db) return;
  try {
    await db.collection(COL).doc(_roomId).collection('players').doc(_deviceId).update({
      ready: !!ready, lastSeen: Date.now(),
    });
  } catch(e){}
}

window.DolphinMP = {
  registerAdapter,
  createRoom, joinRoom, leaveRoom,
  sendInput, sendState, sendConfig, updateRoomStatus, setReady,
  onRoom:    cb => on('room', cb),
  onPlayers: cb => on('players', cb),
  onState:   cb => on('state', cb),
  onInput:   cb => on('input', cb),
  onError:   cb => on('error', cb),
  getRoomId:   () => _roomId,
  getDeviceId: () => _deviceId,
  getPlayerId: () => _adapterPlayerId || _deviceId,
  getSide:     () => _side,
  isHost:      () => _isHost,
  getName:     () => _name,
};

console.log('%c🎮 DolphinMP v1.0 ready', 'background:#F4B842;color:#123634;font-weight:900;padding:3px 10px;border-radius:5px');
})();
