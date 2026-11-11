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
// A longer presence window cuts shared Firestore fan-out without changing room semantics.
const HEARTBEAT_MS = 10000;
const STALE_MS = 35000;
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

const _handlers = { room: [], players: [], state: [], input: [], error: [], network: [] };

/* Passive server-ack latency: no extra Firebase requests or room writes.
 * Shows the latest round-trip estimate (not device-to-device ICMP ping).
 */
const PING_BADGE_ID = 'dolphin-online-ping';
const PING_STALE_MS = 35000;
let _pingMs = null, _pingAt = 0, _pingTimer = null, _pingSamples = [];
function onlineNow(){ return !window.navigator || window.navigator.onLine !== false; }
function getPing(){
  const fresh = _pingAt && Date.now() - _pingAt <= PING_STALE_MS;
  return { rttMs: onlineNow() && fresh ? _pingMs : null, updatedAt: _pingAt, online: onlineNow() };
}
function showPing(){
  if (typeof document === 'undefined' || !document.body) return;
  let badge = document.getElementById(PING_BADGE_ID);
  if (!_roomId){ if (badge) badge.style.display = 'none'; return; }
  if (!badge){
    badge = document.createElement('div');
    badge.id = PING_BADGE_ID;
    badge.style.cssText = 'position:fixed;top:calc(env(safe-area-inset-top,0px) + 58px);left:8px;z-index:2147483000;pointer-events:none;padding:4px 8px;border-radius:7px;font:700 11px/1.2 system-ui,sans-serif;letter-spacing:.02em;background:rgba(7,24,32,.83);box-shadow:0 2px 9px rgba(0,0,0,.24);white-space:nowrap;';
    badge.setAttribute('role','status');
    badge.setAttribute('aria-live','off');
    document.body.appendChild(badge);
  }
  const stats = getPing(), ms = stats.rttMs;
  const text = !stats.online ? '● OFFLINE' : ms === null ? '● PING --' : '● PING ' + ms + ' ms';
  if (badge.textContent !== text) badge.textContent = text;
  badge.style.color = !stats.online || ms !== null && ms >= 220 ? '#ff8585' : ms !== null && ms >= 110 ? '#ffe080' : '#70f3b0';
  badge.style.display = 'block';
}
function notePing(ms, room){
  if (!_roomId || room !== _roomId || !Number.isFinite(ms) || ms < 0) return;
  _pingSamples.push(Math.round(ms));
  if (_pingSamples.length > 3) _pingSamples.shift();
  const values = _pingSamples.slice().sort((a,b) => a-b);
  _pingMs = values[Math.floor(values.length/2)];
  _pingAt = Date.now();
  showPing();
}
function startPing(){
  stopPing();
  if (!_roomId) return;
  showPing();
  _pingTimer = setInterval(showPing, 1000);
}
function stopPing(){
  if (_pingTimer !== null){ clearInterval(_pingTimer); _pingTimer = null; }
  _pingSamples = []; _pingMs = null; _pingAt = 0;
  showPing();
}


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
    const room = _roomId, started = Date.now();
    db.collection(COL).doc(room).collection('players').doc(_deviceId)
      .update({ lastSeen: started })
      .then(() => notePing(Date.now() - started, room)).catch(() => {});
  };
  startPing();
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
  startPing();
  try {
    const cleanup = adapter.subscribe({
      roomId: _roomId, playerId: _adapterPlayerId,
      emit: (type, payload) => {
        if (type === 'room' && payload) _isHost = !!payload.isHost;
        if (type === 'network' && payload && Number.isFinite(payload.rttMs)) notePing(payload.rttMs, _roomId);
        fire(type, payload);
      }
    });
    if (cleanup && typeof cleanup !== 'function') throw new Error('subscribe phải trả về hàm hủy theo dõi');
    _adapterCleanup = cleanup || null;
  } catch(err){
    _roomId = null; _game = null; _side = null; _isHost = false;
    _activeAdapter = null; _adapterPlayerId = null;
    stopPing();
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
    seats: { p1: _deviceId },
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

  // Four-seat rooms reserve seats atomically to prevent simultaneous joins
  // claiming the same slot. Legacy 2P games retain their existing flow.
  if ((Number(room.maxPlayers)||2)>=2){
    const roomRef=db.collection(COL).doc(code),playerRef=roomRef.collection('players').doc(_deviceId);
    const assigned=await db.runTransaction(async tx=>{
      const current=await tx.get(roomRef);
      if(!current.exists)throw Error('Phòng không tồn tại');
      const data=current.data();
      const seats={...(data.seats||{})};
      const prior=Object.keys(seats).find(slot=>seats[slot]===_deviceId);
      if(!prior && data.status!=='waiting')throw Error('Trận đã bắt đầu');
      let slot=prior;
      if(!slot){
        for(let n=1;n<=Math.min(4,Number(data.maxPlayers)||2);n++)if(!seats['p'+n]){slot='p'+n;break;}
        if(!slot)throw Error('Phòng đã đủ '+data.maxPlayers+' người');
        seats[slot]=_deviceId;
      }
      tx.update(roomRef,{seats,updatedAt:Date.now()});
      tx.set(playerRef,{name:_name,side:slot,joinedAt:Date.now(),lastSeen:Date.now(),ready:false},{merge:true});
      return slot;
    });
    _roomId=code;_side=assigned;_isHost=room.hostId===_deviceId;
    startHeartbeat();subscribe();
    return {roomId:code,side:assigned,isHost:_isHost,seed:room.seed,name:_name};
  }
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
    stopPing();
    if (typeof adapter.leaveRoom === 'function') await adapter.leaveRoom(id);
    return;
  }
  stopHeartbeat();
  unsubscribeAll();
  const db = getDB();
  if(db && _roomId && _game === 'dolphin-tactics'){
    const roomRef=db.collection(COL).doc(_roomId);
    await db.runTransaction(async tx=>{
      const snap=await tx.get(roomRef);
      if(!snap.exists)return;
      const data=snap.data(),seats={...(data.seats||{})};
      if(seats[_side]===_deviceId)delete seats[_side];
      tx.update(roomRef,{seats,updatedAt:Date.now(),...(_isHost?{status:'closed'}:{})});
      tx.delete(roomRef.collection('players').doc(_deviceId));
    });
    _roomId=null;_isHost=false;_side=null;_game=null;
    stopPing();
    return;
  }
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
  stopPing();
}

// Strict variants surface permissions/network errors to the game rather than
// silently losing player commands. Legacy multiplayer API is unchanged.
async function sendInputStrict(payload){
  if(!_roomId)throw Error('Chưa vào phòng');
  const db=getDB();if(!db)throw Error('Chưa kết nối Firestore');
  const room = _roomId, started = Date.now();
  await db.collection(COL).doc(room).collection('inputs').doc(_deviceId).set({
    ...payload,at:started,
  });
  notePing(Date.now() - started, room);
}
async function sendStateStrict(snapshot){
  if(!_roomId||!_isHost)throw Error('Chỉ chủ phòng được ghi trạng thái');
  const db=getDB();if(!db)throw Error('Chưa kết nối Firestore');
  const room = _roomId, started = Date.now();
  await db.collection(COL).doc(room).collection('data').doc('state').set(snapshot);
  notePing(Date.now() - started, room);
}

async function sendInput(payload){
  if (_activeAdapter){
    if (!_activeAdapter.sendInput) throw new Error('Adapter chỉ nhận thao tác qua máy chủ');
    return _activeAdapter.sendInput(payload);
  }
  if (!_roomId) return;
  const db = getDB(); if (!db) return;
  const room = _roomId, started = Date.now();
  try {
    await db.collection(COL).doc(room).collection('inputs').doc(_deviceId).set({
      ...payload, at: started,
    });
    notePing(Date.now() - started, room);
  } catch(e){}
}
let _lastSendStateTime = 0;
async function sendState(state){
  if (_activeAdapter) throw new Error('Không thể ghi trạng thái trận đấu từ client adapter');
  if (!_roomId || !_isHost) return;
  const now = Date.now();
  // Never discard game events (Snake eat/death/respawn) with the normal frame throttle.
  if (!state?.__event && now - _lastSendStateTime < 100) return;
  _lastSendStateTime = now;
  const db = getDB(); if (!db) return;
  const room = _roomId, started = Date.now();
  try {
    await db.collection(COL).doc(room).collection('data').doc('state').set(state);
    notePing(Date.now() - started, room);
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
  sendInput, sendState, sendInputStrict, sendStateStrict, sendConfig, updateRoomStatus, setReady,
  onRoom:    cb => on('room', cb),
  onPlayers: cb => on('players', cb),
  onState:   cb => on('state', cb),
  onInput:   cb => on('input', cb),
  onError:   cb => on('error', cb),
  onNetwork: cb => on('network', cb),
  getRoomId:   () => _roomId,
  getDeviceId: () => _deviceId,
  getPlayerId: () => _adapterPlayerId || _deviceId,
  getSide:     () => _side,
  isHost:      () => _isHost,
  getName:     () => _name,
  getPing,
};

console.log('%c🎮 DolphinMP v1.0 ready', 'background:#F4B842;color:#123634;font-weight:900;padding:3px 10px;border-radius:5px');
})();
