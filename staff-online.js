/* ============================================================
   STAFF ONLINE COUNTER — DolphinApp
   - Đếm nhân sự đang online realtime
   - Widget floating ở góc dưới trái
   - Chỉ chạy khi có dolphinStaffName
   - Không chạy trên iframe khi parent đang ở landing
   ============================================================ */
(function(){
  'use strict';

  /* ============================================================
     CONFIG
     ============================================================ */
  var FIREBASE_CONFIG = {
    apiKey: "AIzaSyAtBNp9WBnyIkCiVjXfUpjH2d7-9dbg-JQ",
    authDomain: "dolphin-f6d67.firebaseapp.com",
    projectId: "dolphin-f6d67"
  };

  var COL          = 'staff_online';
  var HEARTBEAT_MS = 30000;   // ping mỗi 30s
  var OFFLINE_MS   = 90000;   // 90s không ping → offline
  var RENDER_MS    = 15000;   // re-render mỗi 15s (cập nhật "X phút")
  var DEVICE_KEY   = 'dolphinDeviceId';
  var NAME_KEY     = 'dolphinStaffName';
  var DEBOUNCE_MS  = 5000;    // tránh write trùng

  /* ============================================================
     HELPERS
     ============================================================ */
  function getDeviceId(){
    try {
      var id = localStorage.getItem(DEVICE_KEY);
      if (!id){
        id = 'dev_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 10);
        localStorage.setItem(DEVICE_KEY, id);
      }
      return id;
    } catch(e){
      return 'dev_fb_' + Math.random().toString(36).slice(2, 10);
    }
  }

  function getStaffName(){
    try { return (localStorage.getItem(NAME_KEY) || '').trim(); }
    catch(e){ return ''; }
  }

  function escapeHtml(s){
    if (!s) return '';
    return String(s).replace(/[&<>"']/g, function(c){
      return { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c];
    });
  }

  /* Context: đang ở trang nào */
  var CONTEXT_MAP = {
    landing:    { label: 'Trang chủ',  icon: '🏠' },
    lounge:     { label: 'Lounge',     icon: '🍸' },
    bungalow:   { label: 'Bungalow',   icon: '🌴' },
    restaurant: { label: 'Restaurant', icon: '🍽️' },
    show:       { label: 'Show',       icon: '🎭' },
    ranking:    { label: 'Xếp hạng',   icon: '🏆' },
    caro:       { label: 'Cờ Caro',    icon: '🎮' },
    manager:    { label: 'Manager',    icon: '👑' },
    other:      { label: 'Khác',       icon: '❓' }
  };

  function detectContext(){
    var path = (location.pathname || '').toLowerCase();
    if (path.indexOf('lounge') >= 0)     return 'lounge';
    if (path.indexOf('bungalow') >= 0)   return 'bungalow';
    if (path.indexOf('restaurant') >= 0) return 'restaurant';
    if (path.indexOf('dashboard') >= 0 || path.indexOf('/manager/') >= 0) return 'manager';
    if (path.indexOf('ranking') >= 0)    return 'ranking';
    if (path.indexOf('caro') >= 0)       return 'caro';
    if (path.indexOf('show') >= 0)       return 'show';
    if (path.indexOf('index') >= 0 || path === '/' || path.endsWith('/dolphinapp/')) return 'landing';
    return 'other';
  }

  /* Đang ở iframe hay parent? */
  function isIframe(){
    try { return window.parent !== window; } catch(e){ return false; }
  }

  /* Parent có đang trong app không? (dùng class app-mode đã có) */
  function parentInApp(){
    try { return document.body.classList.contains('app-mode'); }
    catch(e){ return false; }
  }

  /* Quyết định có nên ping không */
  function shouldPing(){
    if (!getStaffName()) return false;

    /* Trong iframe → luôn ping */
    if (isIframe()) return true;

    /* Parent: đang trong app → không ping (iframe lo) */
    if (parentInApp()) return false;

    /* Parent ở landing → ping */
    return true;
  }

  /* ============================================================
     INJECT CSS
     ============================================================ */
  function injectStyles(){
    if (document.getElementById('staffOnlineStyles')) return;
    var s = document.createElement('style');
    s.id = 'staffOnlineStyles';
    s.textContent = [
      /* ─────────── WIDGET ─────────── */
      '#staffOnlineWidget{',
      '  position:fixed;',
      '  bottom:20px;',
      '  left:16px;',
      '  z-index:9997;',
      '  font-family:"Nunito",-apple-system,BlinkMacSystemFont,sans-serif;',
      '  user-select:none;',
      '  -webkit-user-select:none;',
      '  -webkit-tap-highlight-color:transparent;',
      '}',

      /* Badge chính */
      '#staffOnlineWidget .sow-badge{',
      '  display:flex;',
      '  align-items:center;',
      '  gap:8px;',
      '  padding:8px 14px;',
      '  background:linear-gradient(135deg,rgba(15,61,56,.95),rgba(10,43,40,.95));',
      '  border:1.5px solid var(--theme-border, rgba(244,184,66,.55));',
      '  border-radius:999px;',
      '  color:#fff;',
      '  font-size:12px;',
      '  font-weight:800;',
      '  cursor:pointer;',
      '  transition:all .3s ease;',
      '  box-shadow:0 6px 20px rgba(0,0,0,.5),',
      '             0 0 24px var(--theme-glow, rgba(244,184,66,.3));',
      '  backdrop-filter:blur(14px) saturate(140%);',
      '  -webkit-backdrop-filter:blur(14px) saturate(140%);',
      '  letter-spacing:.04em;',
      '}',
      '#staffOnlineWidget .sow-badge:hover{',
      '  transform:translateY(-3px) scale(1.04);',
      '  border-color:var(--theme-accent, #FBD77A);',
      '  box-shadow:0 10px 28px rgba(0,0,0,.6),',
      '             0 0 40px var(--theme-glow, rgba(244,184,66,.6));',
      '}',
      '#staffOnlineWidget .sow-badge:active{ transform:scale(.97); }',

      /* Dot xanh pulsing */
      '#staffOnlineWidget .sow-status{',
      '  width:9px;',
      '  height:9px;',
      '  border-radius:50%;',
      '  background:#22C55E;',
      '  box-shadow:0 0 10px #22C55E, 0 0 0 0 rgba(34,197,94,.6);',
      '  animation:sow-pulse 1.8s ease-in-out infinite;',
      '  flex-shrink:0;',
      '}',
      '@keyframes sow-pulse{',
      '  0%,100%{ box-shadow:0 0 10px #22C55E, 0 0 0 0 rgba(34,197,94,.6); }',
      '  50%    { box-shadow:0 0 14px #22C55E, 0 0 0 6px rgba(34,197,94,0); }',
      '}',
      '#staffOnlineWidget .sow-badge.sow-empty .sow-status{',
      '  background:#94A3B8;',
      '  box-shadow:none;',
      '  animation:none;',
      '}',

      /* Count number */
      '#staffOnlineWidget .sow-count{',
      '  color:var(--theme-accent, #FBD77A);',
      '  font-family:"Fraunces","Nunito",serif;',
      '  font-weight:900;',
      '  font-size:15px;',
      '  letter-spacing:.02em;',
      '  min-width:14px;',
      '  text-align:center;',
      '  font-variant-numeric:tabular-nums;',
      '}',
      '#staffOnlineWidget .sow-label{',
      '  color:#bfe9dc;',
      '  font-weight:800;',
      '  font-size:11px;',
      '  text-transform:uppercase;',
      '  letter-spacing:.08em;',
      '}',

      /* Chevron */
      '#staffOnlineWidget .sow-chev{',
      '  transition:transform .3s cubic-bezier(.16,1,.3,1);',
      '  font-size:10px;',
      '  opacity:.7;',
      '  color:var(--theme-accent, #FBD77A);',
      '}',
      '#staffOnlineWidget.open .sow-chev{ transform:rotate(180deg); }',

      /* Panel */
      '#staffOnlineWidget .sow-panel{',
      '  position:absolute;',
      '  bottom:calc(100% + 10px);',
      '  left:0;',
      '  width:300px;',
      '  max-width:calc(100vw - 32px);',
      '  max-height:min(60vh,420px);',
      '  background:linear-gradient(160deg,rgba(15,61,56,.98),rgba(10,43,40,.98));',
      '  border:1.5px solid var(--theme-border, rgba(244,184,66,.55));',
      '  border-radius:18px;',
      '  box-shadow:0 20px 50px rgba(0,0,0,.7),',
      '             0 0 40px var(--theme-glow, rgba(244,184,66,.4));',
      '  backdrop-filter:blur(20px) saturate(140%);',
      '  -webkit-backdrop-filter:blur(20px) saturate(140%);',
      '  overflow:hidden;',
      '  opacity:0;',
      '  transform:translateY(10px) scale(.96);',
      '  pointer-events:none;',
      '  transition:opacity .25s ease, transform .3s cubic-bezier(.16,1,.3,1);',
      '}',
      '#staffOnlineWidget.open .sow-panel{',
      '  opacity:1;',
      '  transform:translateY(0) scale(1);',
      '  pointer-events:auto;',
      '}',

      /* Panel header */
      '#staffOnlineWidget .sow-panel-head{',
      '  padding:12px 16px;',
      '  border-bottom:1px solid rgba(244,184,66,.22);',
      '  display:flex;',
      '  align-items:center;',
      '  justify-content:space-between;',
      '  gap:8px;',
      '}',
      '#staffOnlineWidget .sow-panel-title{',
      '  font-size:11px;',
      '  font-weight:900;',
      '  color:var(--theme-accent, #FBD77A);',
      '  text-transform:uppercase;',
      '  letter-spacing:.1em;',
      '}',
      '#staffOnlineWidget .sow-panel-sub{',
      '  font-size:9.5px;',
      '  color:#bfe9dc;',
      '  opacity:.75;',
      '  font-weight:700;',
      '  margin-top:1px;',
      '}',

      /* Panel body */
      '#staffOnlineWidget .sow-list{',
      '  max-height:min(50vh,340px);',
      '  overflow-y:auto;',
      '  padding:6px;',
      '  scrollbar-width:thin;',
      '  scrollbar-color:rgba(244,184,66,.4) transparent;',
      '}',
      '#staffOnlineWidget .sow-list::-webkit-scrollbar{ width:4px; }',
      '#staffOnlineWidget .sow-list::-webkit-scrollbar-thumb{',
      '  background:rgba(244,184,66,.4);',
      '  border-radius:99px;',
      '}',

      /* Item */
      '#staffOnlineWidget .sow-item{',
      '  display:flex;',
      '  align-items:center;',
      '  gap:10px;',
      '  padding:9px 10px;',
      '  border-radius:12px;',
      '  transition:background .2s ease;',
      '}',
      '#staffOnlineWidget .sow-item:hover{',
      '  background:rgba(244,184,66,.08);',
      '}',
      '#staffOnlineWidget .sow-item.sow-me{',
      '  background:rgba(244,184,66,.12);',
      '  border:1px solid rgba(244,184,66,.35);',
      '}',
      '#staffOnlineWidget .sow-avatar{',
      '  width:34px;',
      '  height:34px;',
      '  border-radius:50%;',
      '  display:flex;',
      '  align-items:center;',
      '  justify-content:center;',
      '  font-size:16px;',
      '  background:linear-gradient(135deg,rgba(244,184,66,.20),rgba(244,184,66,.06));',
      '  border:1.5px solid var(--theme-border, rgba(244,184,66,.4));',
      '  flex-shrink:0;',
      '}',
      '#staffOnlineWidget .sow-info{',
      '  flex:1;',
      '  min-width:0;',
      '}',
      '#staffOnlineWidget .sow-name{',
      '  font-size:12.5px;',
      '  font-weight:900;',
      '  color:#fff;',
      '  letter-spacing:.02em;',
      '  white-space:nowrap;',
      '  overflow:hidden;',
      '  text-overflow:ellipsis;',
      '  display:flex;',
      '  align-items:center;',
      '  gap:6px;',
      '}',
      '#staffOnlineWidget .sow-you{',
      '  background:linear-gradient(135deg,var(--theme-accent, #FBD77A),var(--theme-accent2, #bfe9dc));',
      '  color:#123634;',
      '  font-size:8px;',
      '  font-weight:900;',
      '  padding:2px 6px;',
      '  border-radius:99px;',
      '  letter-spacing:.08em;',
      '  flex-shrink:0;',
      '}',
      '#staffOnlineWidget .sow-meta{',
      '  font-size:10.5px;',
      '  color:#bfe9dc;',
      '  opacity:.8;',
      '  font-weight:700;',
      '  margin-top:2px;',
      '  white-space:nowrap;',
      '  overflow:hidden;',
      '  text-overflow:ellipsis;',
      '}',
      '#staffOnlineWidget .sow-dot{',
      '  width:8px;',
      '  height:8px;',
      '  border-radius:50%;',
      '  background:#22C55E;',
      '  box-shadow:0 0 8px #22C55E;',
      '  flex-shrink:0;',
      '}',
      '#staffOnlineWidget .sow-empty-msg{',
      '  padding:28px 16px;',
      '  text-align:center;',
      '  font-size:12px;',
      '  color:#bfe9dc;',
      '  opacity:.7;',
      '  font-weight:700;',
      '}',

      /* Mobile */
      '@media(max-width:480px){',
      '  #staffOnlineWidget{ bottom:16px; left:12px; }',
      '  #staffOnlineWidget .sow-badge{ padding:7px 12px; gap:6px; font-size:11px; }',
      '  #staffOnlineWidget .sow-count{ font-size:14px; }',
      '  #staffOnlineWidget .sow-panel{ width:280px; }',
      '}',

      /* Ẩn khi ở app mode (parent đã vào app) */
      'body.app-mode #staffOnlineWidget{ display:none !important; }',

      /* Reduce motion */
      '@media(prefers-reduced-motion:reduce){',
      '  #staffOnlineWidget .sow-status{ animation:none; }',
      '}'
    ].join('\n');
    document.head.appendChild(s);
  }

  /* ============================================================
     INJECT WIDGET HTML
     ============================================================ */
  function injectWidget(){
    if (document.getElementById('staffOnlineWidget')) return;
    if (document.body.classList.contains('app-mode')) return;

    var w = document.createElement('div');
    w.id = 'staffOnlineWidget';
    w.innerHTML = [
      '<div class="sow-panel" id="sowPanel">',
      '  <div class="sow-panel-head">',
      '    <div>',
      '      <div class="sow-panel-title">👥 Nhân sự online</div>',
      '      <div class="sow-panel-sub" id="sowPanelSub">Đang tải...</div>',
      '    </div>',
      '  </div>',
      '  <div class="sow-list" id="sowList">',
      '    <div class="sow-empty-msg">Đang tải...</div>',
      '  </div>',
      '</div>',
      '<div class="sow-badge" id="sowBadge" role="button" tabindex="0" aria-label="Xem nhân sự online">',
      '  <span class="sow-status"></span>',
      '  <span class="sow-count" id="sowCount">0</span>',
      '  <span class="sow-label">ONLINE</span>',
      '  <span class="sow-chev">▲</span>',
      '</div>'
    ].join('');
    document.body.appendChild(w);

    /* Toggle panel */
    var badge = document.getElementById('sowBadge');
    badge.addEventListener('click', function(e){
      e.stopPropagation();
      w.classList.toggle('open');
    });
    badge.addEventListener('keydown', function(e){
      if (e.key === 'Enter' || e.key === ' '){ e.preventDefault(); w.classList.toggle('open'); }
    });

    /* Click ngoài → đóng */
    document.addEventListener('click', function(e){
      if (!w.contains(e.target)) w.classList.remove('open');
    });

    /* ESC → đóng */
    document.addEventListener('keydown', function(e){
      if (e.key === 'Escape') w.classList.remove('open');
    });
  }

  /* ============================================================
     RENDER LIST
     ============================================================ */
  var lastList = [];

  function renderList(){
    var badge = document.getElementById('sowCount');
    var list  = document.getElementById('sowList');
    var sub   = document.getElementById('sowPanelSub');
    if (!badge || !list) return;

    var now = Date.now();
    var deviceId = getDeviceId();

    /* Filter còn online */
    var online = lastList.filter(function(s){
      return s.lastSeen && (now - s.lastSeen) < OFFLINE_MS;
    });

    /* Sort: mình lên đầu, rồi theo startedAt */
    online.sort(function(a, b){
      if (a.id === deviceId) return -1;
      if (b.id === deviceId) return 1;
      return (b.startedAt || 0) - (a.startedAt || 0);
    });

    var count = online.length;
    badge.textContent = count > 99 ? '99+' : String(count);

    var widget = document.getElementById('staffOnlineWidget');
    if (widget){
      if (count === 0) widget.querySelector('.sow-badge').classList.add('sow-empty');
      else widget.querySelector('.sow-badge').classList.remove('sow-empty');
    }

    if (sub) sub.textContent = count === 0 ? 'Chưa có ai online' : count + ' người đang làm việc';

    if (count === 0){
      list.innerHTML = '<div class="sow-empty-msg">Chưa có nhân viên nào online</div>';
      return;
    }

    list.innerHTML = online.map(function(s){
      var ctxKey = s.page || 'other';
      var ctx = CONTEXT_MAP[ctxKey] || CONTEXT_MAP.other;
      var isMe = s.id === deviceId;

      /* Thời gian online */
      var started = s.startedAt || s.lastSeen || now;
      var mins = Math.max(0, Math.floor((now - started) / 60000));
      var durText;
      if (mins < 1) durText = 'vừa mới vào';
      else if (mins < 60) durText = mins + ' phút';
      else {
        var h = Math.floor(mins / 60);
        var m = mins % 60;
        durText = h + 'h' + (m > 0 ? m + 'p' : '');
      }

      return [
        '<div class="sow-item ' + (isMe ? 'sow-me' : '') + '">',
        '  <div class="sow-avatar">' + ctx.icon + '</div>',
        '  <div class="sow-info">',
        '    <div class="sow-name">' + escapeHtml(s.name) + (isMe ? ' <span class="sow-you">BẠN</span>' : '') + '</div>',
        '    <div class="sow-meta">' + ctx.label + ' · ' + durText + '</div>',
        '  </div>',
        '  <div class="sow-dot"></div>',
        '</div>'
      ].join('');
    }).join('');
  }

  /* ============================================================
     HEARTBEAT + FIREBASE
     ============================================================ */
  var hbTimer = null;
  var renderTimer = null;
  var dbRef = null;
  var fbSetDoc, fbServerTimestamp;

  function startHeartbeat(){
    if (hbTimer) return;
    if (!shouldPing()) return;
    if (!dbRef || !fbSetDoc) return;

    function ping(){
      if (!shouldPing()) return;

      var name = getStaffName();
      if (!name) return;

      var deviceId = getDeviceId();
      var ctx = detectContext();

      /* Giữ nguyên startedAt cũ nếu có */
      var existingStartedAt = null;
      try {
        var cached = sessionStorage.getItem('sow_startedAt');
        if (cached) existingStartedAt = parseInt(cached, 10);
      } catch(e){}

      if (!existingStartedAt){
        existingStartedAt = Date.now();
        try { sessionStorage.setItem('sow_startedAt', String(existingStartedAt)); } catch(e){}
      }

      var data = {
        name: name,
        page: ctx,
        lastSeen: Date.now(),
        startedAt: existingStartedAt,
        platform: navigator.userAgent.indexOf('DolphinManager') >= 0 ? 'apk' : 'web'
      };

      try {
        fbSetDoc(dbRef, data, { merge: true }).catch(function(err){
          console.warn('[StaffOnline] ping error:', err);
        });
      } catch(e){
        console.warn('[StaffOnline] ping exception:', e);
      }
    }

    /* Ping ngay */
    ping();

    /* Ping định kỳ */
    hbTimer = setInterval(ping, HEARTBEAT_MS);

    /* Ping khi quay lại tab */
    document.addEventListener('visibilitychange', function(){
      if (document.visibilityState === 'visible' && shouldPing()) ping();
    });

    /* Cleanup khi tắt tab (best-effort) */
    window.addEventListener('beforeunload', function(){
      try {
        if (dbRef && fbSetDoc && shouldPing()){
          fbSetDoc(dbRef, { lastSeen: 0 }, { merge: true });
        }
      } catch(e){}
    });
  }

  function stopHeartbeat(){
    if (hbTimer){ clearInterval(hbTimer); hbTimer = null; }
  }

  function startRender(){
    if (renderTimer) return;
    renderTimer = setInterval(renderList, RENDER_MS);
  }

  /* ============================================================
     INIT
     ============================================================ */
  function init(){
    /* Luôn inject CSS để sẵn sàng */
    injectStyles();

    /* Nếu chưa có tên → chỉ hiện widget với số 0, chờ có tên rồi ping */
    /* Nhưng vẫn cần widget để nhân viên biết có ai online */

    /* Inject widget (chỉ landing / parent) */
    if (!isIframe() && !parentInApp()){
      injectWidget();
    }

    /* Load Firebase (dynamic import) */
    Promise.all([
      import("https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js"),
      import("https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js"),
      import("https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js")
    ]).then(function(mods){
      var fbApp   = mods[0];
      var fbAuth  = mods[1];
      var fbStore = mods[2];

      var app;
      try { app = fbApp.getApp('staff-online-app'); }
      catch(e){ app = fbApp.initializeApp(FIREBASE_CONFIG, 'staff-online-app'); }

      var auth = fbAuth.getAuth(app);
      var db   = fbStore.getFirestore(app);

      fbSetDoc = fbStore.setDoc;
      dbRef = fbStore.doc(db, COL, getDeviceId());

      /* Listen collection (client-side filter theo lastSeen) */
      try {
        var unsub = fbStore.onSnapshot(fbStore.collection(db, COL), function(snap){
          var now = Date.now();
          var list = [];
          snap.forEach(function(d){
            var data = d.data() || {};
            if (data.lastSeen && (now - data.lastSeen) < OFFLINE_MS){
              list.push({
                id: d.id,
                name: data.name || '',
                page: data.page || 'other',
                lastSeen: data.lastSeen,
                startedAt: data.startedAt || data.lastSeen,
                platform: data.platform || 'web'
              });
            }
          });
          lastList = list;
          renderList();
        }, function(err){
          console.warn('[StaffOnline] listen error:', err);
        });
      } catch(e){
        console.warn('[StaffOnline] listen exception:', e);
      }

      /* Auth → sau đó mới bắt đầu heartbeat */
      if (auth.currentUser){
        startHeartbeat();
        startRender();
      } else {
        fbAuth.signInAnonymously(auth).then(function(){
          startHeartbeat();
          startRender();
        }).catch(function(err){
          console.warn('[StaffOnline] auth error:', err);
          /* Vẫn start render để hiện widget trống */
          startRender();
        });
      }
    }).catch(function(err){
      console.warn('[StaffOnline] Firebase init fail:', err);
    });

    /* Re-inject widget khi parent thoát app mode */
    if (!isIframe()){
      var observer = new MutationObserver(function(){
        if (parentInApp()){
          var w = document.getElementById('staffOnlineWidget');
          if (w) w.remove();
          stopHeartbeat();
        } else {
          injectWidget();
          if (!hbTimer) startHeartbeat();
        }
      });
      observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    }

    /* Lắng nghe tên staff thay đổi → restart heartbeat */
    window.addEventListener('storage', function(e){
      if (e.key === NAME_KEY){
        if (getStaffName()){
          try { sessionStorage.removeItem('sow_startedAt'); } catch(err){}
          if (!hbTimer) startHeartbeat();
        }
      }
    });
  }

  /* ============================================================
     START
     ============================================================ */
  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  console.log('%c🟢 STAFF ONLINE COUNTER LOADED',
    'background:linear-gradient(90deg,#22C55E,#16A34A);color:#fff;font-size:11px;padding:3px 8px;border-radius:4px;font-weight:900');
})();
