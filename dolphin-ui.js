/* ============================================================
   DOLPHIN UI EXTRAS
   ─────────────────────────────────────────────────────────────
   • A4: Alert đơn quá 5 phút trên Landing
   • C2: Empty State Illustrations cho 3 app con
   • D1: Mini Dashboard cho Manager trên Landing
   ─────────────────────────────────────────────────────────────
   Tự detect context:
     - Có #landing + không iframe → chạy A4 + D1
     - Không có #landing (app con) → chạy C2
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

  /* Collection → khu vực */
  var AREAS = [
    { key:'lounge',     col:'lounge_orders', label:'Lounge',     icon:'🍸', app:'lounge' },
    { key:'bungalow',   col:'bun_orders',    label:'Bungalow',   icon:'🌴', app:'bungalow' },
    { key:'restaurant', col:'res_orders',    label:'Restaurant', icon:'🍽️', app:'restaurant' }
  ];

  var DELAY_MS = 5 * 60 * 1000;    /* 5 phút */
  var ALERT_POLL_MS = 20000;       /* check alert mỗi 20s */
  var DASH_POLL_MS = 30000;        /* refresh dashboard mỗi 30s */

  /* ============================================================
     HELPERS
     ============================================================ */
  function hasLanding(){
    return !!document.getElementById('landing');
  }
  function isIframe(){
    try { return window.parent !== window; } catch(e){ return false; }
  }
  function isManager(){
    return navigator.userAgent.indexOf('DolphinManager') >= 0;
  }
  function escapeHtml(s){
    if (!s) return '';
    return String(s).replace(/[&<>"']/g, function(c){
      return { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c];
    });
  }

  /* Detect khu vực cho empty states */
  function detectArea(){
    var p = (location.pathname || '').toLowerCase();
    if (p.indexOf('lounge') >= 0)     return 'lounge';
    if (p.indexOf('bungalow') >= 0)   return 'bungalow';
    if (p.indexOf('restaurant') >= 0) return 'restaurant';
    if (p.indexOf('ranking') >= 0)    return 'ranking';
    if (p.indexOf('caro') >= 0)       return 'caro';
    if (p.indexOf('show') >= 0)       return 'show';
    if (p.indexOf('dashboard') >= 0)  return 'manager';
    return 'default';
  }

  /* ============================================================
     A4 — DELAY ALERT ON LANDING
     ============================================================ */
  function injectAlertStyles(){
    if (document.getElementById('delayAlertStyles')) return;
    var s = document.createElement('style');
    s.id = 'delayAlertStyles';
    s.textContent = [
      '#delayAlert{',
      '  position:fixed;',
      '  top:14px;',
      '  left:50%;',
      '  transform:translateX(-50%) translateY(-140%);',
      '  z-index:9997;',
      '  max-width:min(92vw,560px);',
      '  opacity:0;',
      '  pointer-events:none;',
      '  transition:transform .55s cubic-bezier(.16,1,.3,1), opacity .35s ease;',
      '  font-family:"Nunito",sans-serif;',
      '}',
      '#delayAlert.show{',
      '  transform:translateX(-50%) translateY(0);',
      '  opacity:1;',
      '  pointer-events:auto;',
      '}',
      '#delayAlert .da-inner{',
      '  display:flex;',
      '  align-items:center;',
      '  gap:14px;',
      '  padding:12px 18px;',
      '  background:linear-gradient(135deg,#7F1D1D 0%,#B91C1C 100%);',
      '  border:2px solid #FBD77A;',
      '  border-radius:16px;',
      '  box-shadow:0 12px 40px rgba(185,28,28,.65),',
      '             0 0 60px rgba(244,184,66,.35);',
      '  animation:daPulse 1.6s ease-in-out infinite;',
      '}',
      '@keyframes daPulse{',
      '  0%,100%{ box-shadow:0 12px 40px rgba(185,28,28,.65),0 0 60px rgba(244,184,66,.35); }',
      '  50%    { box-shadow:0 12px 50px rgba(185,28,28,.95),0 0 90px rgba(244,184,66,.65); }',
      '}',
      '#delayAlert .da-icon{',
      '  font-size:26px;',
      '  flex-shrink:0;',
      '  animation:daShake .8s ease-in-out infinite;',
      '  filter:drop-shadow(0 0 12px rgba(251,215,122,.9));',
      '}',
      '@keyframes daShake{',
      '  0%,100%{ transform:rotate(-8deg) }',
      '  50%    { transform:rotate(8deg) }',
      '}',
      '#delayAlert .da-body{',
      '  flex:1;',
      '  min-width:0;',
      '}',
      '#delayAlert .da-title{',
      '  color:#FFE58F;',
      '  font-size:13.5px;',
      '  font-weight:900;',
      '  letter-spacing:.05em;',
      '  text-transform:uppercase;',
      '  text-shadow:0 0 8px rgba(0,0,0,.9);',
      '  line-height:1.2;',
      '}',
      '#delayAlert .da-sub{',
      '  color:#fff;',
      '  font-size:11.5px;',
      '  font-weight:700;',
      '  margin-top:3px;',
      '  opacity:.95;',
      '  white-space:nowrap;',
      '  overflow:hidden;',
      '  text-overflow:ellipsis;',
      '}',
      '#delayAlert .da-sub .area-hl{',
      '  display:inline-block;',
      '  background:rgba(255,229,143,.2);',
      '  color:#FFE58F;',
      '  padding:1px 7px;',
      '  border-radius:6px;',
      '  font-weight:900;',
      '  margin:0 2px;',
      '}',
      '#delayAlert .da-btn{',
      '  background:linear-gradient(135deg,#FBD77A,#F4B842);',
      '  color:#7F1D1D;',
      '  font-weight:900;',
      '  font-size:11.5px;',
      '  padding:9px 14px;',
      '  border:none;',
      '  border-radius:11px;',
      '  cursor:pointer;',
      '  white-space:nowrap;',
      '  text-transform:uppercase;',
      '  letter-spacing:.06em;',
      '  box-shadow:0 4px 14px rgba(0,0,0,.3);',
      '  transition:transform .15s;',
      '  font-family:inherit;',
      '}',
      '#delayAlert .da-btn:active{ transform:scale(.95); }',
      '@media(max-width:520px){',
      '  #delayAlert .da-inner{ padding:10px 14px; gap:10px; }',
      '  #delayAlert .da-icon{ font-size:22px; }',
      '  #delayAlert .da-title{ font-size:12px; }',
      '  #delayAlert .da-sub{ font-size:10.5px; }',
      '  #delayAlert .da-btn{ padding:8px 11px; font-size:10.5px; }',
      '}',
      '@media(prefers-reduced-motion:reduce){',
      '  #delayAlert .da-inner{ animation:none; }',
      '  #delayAlert .da-icon{ animation:none; }',
      '}'
    ].join('\n');
    document.head.appendChild(s);
  }

  function ensureAlertEl(){
    var el = document.getElementById('delayAlert');
    if (el) return el;
    el = document.createElement('div');
    el.id = 'delayAlert';
    el.innerHTML = [
      '<div class="da-inner">',
      '  <span class="da-icon">⚠️</span>',
      '  <div class="da-body">',
      '    <div class="da-title" id="daTitle">CÓ ĐƠN QUÁ 5 PHÚT</div>',
      '    <div class="da-sub" id="daSub"></div>',
      '  </div>',
      '  <button class="da-btn" id="daBtn" type="button">Xem ngay</button>',
      '</div>'
    ].join('');
    document.body.appendChild(el);

    /* Click button → mở khu vực có nhiều đơn trễ nhất */
    el.querySelector('#daBtn').addEventListener('click', function(e){
      e.stopPropagation();
      var areaKey = el.dataset.targetArea;
      if (!areaKey) return;
      if (window.openApp) window.openApp(areaKey);
      el.classList.remove('show');
    });

    /* Click banner → cũng mở luôn */
    el.addEventListener('click', function(e){
      if (e.target.id === 'daBtn') return;
      var areaKey = el.dataset.targetArea;
      if (areaKey && window.openApp) window.openApp(areaKey);
    });

    return el;
  }

  var delayedCache = {}; /* { areaKey: { count, sample } } */

  function updateDelayAlert(){
    var total = 0;
    var breakdown = [];
    var topArea = null;
    var topCount = 0;

    AREAS.forEach(function(a){
      var c = delayedCache[a.key] ? delayedCache[a.key].count : 0;
      total += c;
      if (c > 0){
        breakdown.push({ label:a.label, icon:a.icon, count:c, app:a.app });
        if (c > topCount){ topCount = c; topArea = a.app; }
      }
    });

    var el = ensureAlertEl();
    if (!el) return;

    if (total === 0){
      el.classList.remove('show');
      return;
    }

    /* Title */
    document.getElementById('daTitle').textContent =
      '⚠️ CÓ ' + total + ' ĐƠN QUÁ 5 PHÚT!';

    /* Sub: breakdown */
    var subHtml = breakdown.map(function(b){
      return '<span class="area-hl">' + b.icon + ' ' + b.label + ' · ' + b.count + '</span>';
    }).join('');
    document.getElementById('daSub').innerHTML = subHtml;

    el.dataset.targetArea = topArea || AREAS[0].app;
    el.classList.add('show');
  }

  /* ============================================================
     D1 — MINI DASHBOARD FOR MANAGER
     ============================================================ */
  function injectDashboardStyles(){
    if (document.getElementById('mgrDashStyles')) return;
    var s = document.createElement('style');
    s.id = 'mgrDashStyles';
    s.textContent = [
      '#mgrDash{',
      '  display:none;',
      '  margin:0 auto 1.5rem;',
      '  max-width:min(92vw,900px);',
      '  background:linear-gradient(135deg,rgba(15,61,56,.85),rgba(10,43,40,.92));',
      '  border:2px solid var(--theme-border, rgba(244,184,66,.55));',
      '  border-radius:18px;',
      '  padding:14px 18px;',
      '  box-shadow:0 8px 28px rgba(0,0,0,.5),',
      '             0 0 32px var(--theme-glow, rgba(244,184,66,.25)),',
      '             inset 0 0 24px var(--theme-glow, rgba(244,184,66,.06));',
      '  backdrop-filter:blur(14px);',
      '  -webkit-backdrop-filter:blur(14px);',
      '  font-family:"Nunito",sans-serif;',
      '}',
      '#mgrDash.show{ display:block; animation:mgrIn .6s ease-out; }',
      '@keyframes mgrIn{',
      '  from{ opacity:0; transform:translateY(-8px); }',
      '  to  { opacity:1; transform:translateY(0); }',
      '}',
      '#mgrDash .mgr-head{',
      '  display:flex;',
      '  align-items:center;',
      '  justify-content:space-between;',
      '  gap:8px;',
      '  margin-bottom:10px;',
      '  padding-bottom:8px;',
      '  border-bottom:1px dashed var(--theme-border-soft, rgba(244,184,66,.25));',
      '}',
      '#mgrDash .mgr-title{',
      '  font-size:12px;',
      '  font-weight:900;',
      '  color:var(--theme-accent, #FBD77A);',
      '  text-transform:uppercase;',
      '  letter-spacing:.12em;',
      '  text-shadow:0 0 10px var(--theme-glow, rgba(244,184,66,.5));',
      '  display:flex;',
      '  align-items:center;',
      '  gap:6px;',
      '}',
      '#mgrDash .mgr-time{',
      '  font-size:10.5px;',
      '  font-weight:700;',
      '  color:var(--theme-accent2, #bfe9dc);',
      '  opacity:.85;',
      '  font-variant-numeric:tabular-nums;',
      '}',
      '#mgrDash .mgr-grid{',
      '  display:grid;',
      '  grid-template-columns:repeat(3,1fr);',
      '  gap:8px;',
      '}',
      '@media(min-width:640px){',
      '  #mgrDash .mgr-grid{ grid-template-columns:repeat(5,1fr); }',
      '}',
      '#mgrDash .mgr-item{',
      '  position:relative;',
      '  background:rgba(0,0,0,.22);',
      '  border:1.5px solid var(--theme-border-soft, rgba(244,184,66,.22));',
      '  border-radius:12px;',
      '  padding:9px 8px;',
      '  text-align:center;',
      '  cursor:pointer;',
      '  transition:all .25s ease;',
      '}',
      '#mgrDash .mgr-item:hover{',
      '  background:rgba(244,184,66,.10);',
      '  border-color:var(--theme-border, rgba(244,184,66,.55));',
      '  transform:translateY(-2px);',
      '  box-shadow:0 6px 16px var(--theme-glow, rgba(244,184,66,.3));',
      '}',
      '#mgrDash .mgr-item.no-click{ cursor:default; }',
      '#mgrDash .mgr-item.no-click:hover{ transform:none; background:rgba(0,0,0,.22); box-shadow:none; }',
      '#mgrDash .mgr-label{',
      '  font-size:9.5px;',
      '  font-weight:800;',
      '  color:var(--theme-accent2, #bfe9dc);',
      '  text-transform:uppercase;',
      '  letter-spacing:.06em;',
      '  opacity:.85;',
      '  margin-bottom:3px;',
      '  white-space:nowrap;',
      '  overflow:hidden;',
      '  text-overflow:ellipsis;',
      '}',
      '#mgrDash .mgr-value{',
      '  font-family:"Fraunces","Nunito",serif;',
      '  font-size:20px;',
      '  font-weight:900;',
      '  line-height:1;',
      '  color:var(--theme-accent, #FBD77A);',
      '  text-shadow:0 0 12px var(--theme-glow, rgba(244,184,66,.5));',
      '  font-variant-numeric:tabular-nums;',
      '}',
      '#mgrDash .mgr-value.danger{ color:#FF6B6B; text-shadow:0 0 12px rgba(239,68,68,.6); }',
      '#mgrDash .mgr-value.warn  { color:#FFB84D; text-shadow:0 0 12px rgba(255,184,77,.5); }',
      '#mgrDash .mgr-value.ok    { color:#66BB6A; text-shadow:0 0 12px rgba(102,187,106,.5); }',
      '#mgrDash .mgr-sub{',
      '  font-size:9px;',
      '  font-weight:700;',
      '  color:var(--theme-accent2, #bfe9dc);',
      '  opacity:.7;',
      '  margin-top:2px;',
      '}',
      '@media(max-width:520px){',
      '  #mgrDash{ padding:11px 12px; }',
      '  #mgrDash .mgr-title{ font-size:11px; }',
      '  #mgrDash .mgr-value{ font-size:17px; }',
      '  #mgrDash .mgr-item{ padding:8px 6px; }',
      '}'
    ].join('\n');
    document.head.appendChild(s);
  }

  function ensureDashEl(){
    var el = document.getElementById('mgrDash');
    if (el) return el;
    el = document.createElement('div');
    el.id = 'mgrDash';
    el.innerHTML = [
      '<div class="mgr-head">',
      '  <div class="mgr-title">📊 TỔNG QUAN HÔM NAY</div>',
      '  <div class="mgr-time" id="mgrTime">--:--</div>',
      '</div>',
      '<div class="mgr-grid" id="mgrGrid"></div>'
    ].join('');

    /* Chèn sau announcementBar, trước welcome-lbl */
    var ref = document.querySelector('.welcome-lbl');
    var target = ref ? ref.parentNode : document.body;
    if (ref){
      target.insertBefore(el, ref);
    } else {
      target.appendChild(el);
    }
    return el;
  }

  var dashStats = {
    lounge:    { total:0, pending:0, preparing:0, done:0, delayed:0 },
    bungalow:  { total:0, pending:0, preparing:0, done:0, delayed:0 },
    restaurant:{ total:0, pending:0, preparing:0, done:0, delayed:0 },
    staffOnline: 0
  };

  function renderDashboard(){
    var el = document.getElementById('mgrDash');
    if (!el || !el.classList.contains('show')) return;

    var now = Date.now();
    var t = new Date();
    var hh = String(t.getHours()).padStart(2,'0');
    var mm = String(t.getMinutes()).padStart(2,'0');
    var timeEl = document.getElementById('mgrTime');
    if (timeEl) timeEl.textContent = hh + ':' + mm;

    var totalAll = 0, pendingAll = 0, delayedAll = 0;
    AREAS.forEach(function(a){
      var s = dashStats[a.key];
      if (!s) return;
      totalAll   += s.total;
      pendingAll += s.pending;
      delayedAll += s.delayed;
    });

    var html = [
      /* Tổng đơn */
      '<div class="mgr-item no-click">',
      '  <div class="mgr-label">📦 Tổng đơn</div>',
      '  <div class="mgr-value">' + totalAll + '</div>',
      '  <div class="mgr-sub">' + pendingAll + ' chờ xử lý</div>',
      '</div>',

      /* Lounge */
      '<div class="mgr-item" data-area="lounge" onclick="openApp(\'lounge\')">',
      '  <div class="mgr-label">🍸 Lounge</div>',
      '  <div class="mgr-value">' + dashStats.lounge.total + '</div>',
      '  <div class="mgr-sub">' + dashStats.lounge.pending + ' chờ</div>',
      '</div>',

      /* Bungalow */
      '<div class="mgr-item" data-area="bungalow" onclick="openApp(\'bungalow\')">',
      '  <div class="mgr-label">🌴 Bungalow</div>',
      '  <div class="mgr-value">' + dashStats.bungalow.total + '</div>',
      '  <div class="mgr-sub">' + dashStats.bungalow.pending + ' chờ</div>',
      '</div>',

      /* Restaurant */
      '<div class="mgr-item" data-area="restaurant" onclick="openApp(\'restaurant\')">',
      '  <div class="mgr-label">🍽️ Restaurant</div>',
      '  <div class="mgr-value">' + dashStats.restaurant.total + '</div>',
      '  <div class="mgr-sub">' + dashStats.restaurant.pending + ' chờ</div>',
      '</div>',

      /* Đơn trễ + NV online */
      '<div class="mgr-item no-click">',
      '  <div class="mgr-label">⚠️ Trễ / 🟢 Online</div>',
      '  <div class="mgr-value ' + (delayedAll > 0 ? 'danger' : 'ok') + '">' +
           delayedAll + ' <span style="font-size:14px;opacity:.7;">/</span> ' +
           dashStats.staffOnline +
      '  </div>',
      '  <div class="mgr-sub">quá 5 phút · nhân viên</div>',
      '</div>'
    ].join('');

    var grid = document.getElementById('mgrGrid');
    if (grid) grid.innerHTML = html;
  }

  /* ============================================================
     C2 — EMPTY STATES FOR APP CON
     ============================================================ */
  var EMPTY_EMOJI = {
    lounge:     ['🍸', '🥂', '✨'],
    bungalow:   ['🌴', '🥥', '🏝️'],
    restaurant: ['🍽️', '🥂', '✨'],
    ranking:    ['🏆', '👑', '⭐'],
    caro:       ['🎮', '🎯', '✨'],
    show:       ['🎭', '🌟', '✨'],
    manager:    ['📊', '📈', '✨'],
    default:    ['🌊', '✨', '💫']
  };

  var EMPTY_TEXT = {
    lounge:     { title:'Chưa có đơn nào', sub:'Mọi thứ đang yên ắng... Nghỉ ngơi chút nhé! ☕' },
    bungalow:   { title:'Chưa có đơn nào', sub:'Chòi đang vắng khách... Thư giãn chút nhé! 🌴' },
    restaurant: { title:'Chưa có đơn nào', sub:'Nhà hàng đang yên tĩnh... Nghỉ ngơi chút nhé! 🍃' },
    ranking:    { title:'Chưa có dữ liệu xếp hạng', sub:'Hãy chờ các hoạt động được ghi nhận! 🏆' },
    caro:       { title:'Chưa có ván đấu nào', sub:'Mời bạn tạo ván mới để bắt đầu! 🎮' },
    show:       { title:'Chưa có suất diễn', sub:'Các suất diễn sẽ xuất hiện tại đây! 🎭' },
    manager:    { title:'Chưa có dữ liệu', sub:'Hệ thống đang chờ hoạt động mới! 📊' },
    default:    { title:'Chưa có dữ liệu', sub:'Mọi thứ đang yên ắng... ✨' }
  };

  function injectEmptyStates(){
    var area = detectArea();
    var icons = EMPTY_EMOJI[area]    || EMPTY_EMOJI.default;
    var text  = EMPTY_TEXT[area]     || EMPTY_TEXT.default;

    var s = document.createElement('style');
    s.id = 'emptyStatesStyles';
    s.textContent = [
      /* Decor ::before cho .empty-state */
      '.empty-state{',
      '  padding:52px 20px !important;',
      '  text-align:center;',
      '  position:relative;',
      '}',
      '.empty-state::before{',
      '  content:"' + icons[0] + '";',
      '  display:block;',
      '  font-size:64px;',
      '  line-height:1;',
      '  margin-bottom:16px;',
      '  opacity:.85;',
      '  filter:drop-shadow(0 0 24px var(--theme-glow, rgba(244,184,66,.45)));',
      '  animation:esFloat 3.2s ease-in-out infinite;',
      '  transform-origin:center;',
      '}',
      '.empty-state::after{',
      '  content:"' + icons[1] + '   ' + icons[2] + '";',
      '  display:block;',
      '  font-size:20px;',
      '  line-height:1;',
      '  margin-top:14px;',
      '  opacity:.5;',
      '  letter-spacing:.5em;',
      '  filter:drop-shadow(0 0 12px var(--theme-glow, rgba(244,184,66,.35)));',
      '  animation:esSparkle 2.4s ease-in-out infinite;',
      '  animation-delay:-1.2s;',
      '}',
      '@keyframes esFloat{',
      '  0%,100%{ transform:translateY(0) rotate(-4deg) scale(1); }',
      '  50%    { transform:translateY(-10px) rotate(4deg) scale(1.06); }',
      '}',
      '@keyframes esSparkle{',
      '  0%,100%{ opacity:.35; transform:scale(1); }',
      '  50%    { opacity:.85; transform:scale(1.15); }',
      '}',

      /* Ẩn icon nếu empty-state trong bảng (colspan) */
      'table .empty-state::before,',
      'table .empty-state::after{',
      '  display:none;',
      '}',

      /* Nâng cấp text */
      '.empty-state h4{',
      '  font-size:15px !important;',
      '  font-weight:900 !important;',
      '  color:var(--theme-accent, #FBD77A) !important;',
      '  letter-spacing:.04em;',
      '  margin-bottom:6px !important;',
      '  text-shadow:0 0 12px var(--theme-glow, rgba(244,184,66,.4));',
      '}',
      '.empty-state p{',
      '  font-size:12px !important;',
      '  font-weight:700 !important;',
      '  color:var(--theme-accent2, #bfe9dc) !important;',
      '  opacity:.85 !important;',
      '  line-height:1.55 !important;',
      '  max-width:340px;',
      '  margin:0 auto;',
      '}',

      /* Nếu empty state là inline text (không có h4/p) → vẫn thêm icon */
      '.empty-state:not(:has(h4))::before{',
      '  margin-bottom:10px;',
      '}',

      /* Reduce motion */
      '@media(prefers-reduced-motion:reduce){',
      '  .empty-state::before,',
      '  .empty-state::after{ animation:none !important; }',
      '}',

      /* Mobile */
      '@media(max-width:520px){',
      '  .empty-state::before{ font-size:52px; margin-bottom:12px; }',
      '  .empty-state::after{ font-size:16px; }',
      '  .empty-state h4{ font-size:14px !important; }',
      '  .empty-state p{ font-size:11.5px !important; }',
      '}'
    ].join('\n');
    document.head.appendChild(s);
  }

  /* ============================================================
     FIREBASE LISTENERS
     ============================================================ */
  function initFirebase(){
    Promise.all([
      import("https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js"),
      import("https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js"),
      import("https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js")
    ]).then(function(mods){
      var fbApp = mods[0], fbAuth = mods[1], fbStore = mods[2];
      var app;
      try { app = fbApp.getApp('dolphin-ui'); }
      catch(e){ app = fbApp.initializeApp(FIREBASE_CONFIG, 'dolphin-ui'); }
      var auth = fbAuth.getAuth(app);
      var db   = fbStore.getFirestore(app);

      function onReady(){
        /* A4 + D1 */
        if (hasLanding() && !isIframe()){
          listenOrdersForLanding(fbStore, db);
          if (isManager()) listenStaffForDash(fbStore, db);
        }
      }

      if (auth.currentUser) onReady();
      else fbAuth.signInAnonymously(auth).then(onReady).catch(function(err){
        console.warn('[DolphinUI] auth error:', err);
      });
    }).catch(function(err){
      console.warn('[DolphinUI] Firebase init fail:', err);
    });
  }

  function listenOrdersForLanding(fbStore, db){
    AREAS.forEach(function(a){
      var col = fbStore.collection(db, a.col);
      fbStore.onSnapshot(col, function(snap){
        var now = Date.now();
        var total = 0, pending = 0, preparing = 0, done = 0, delayed = 0;
        snap.forEach(function(doc){
          var o = doc.data() || {};
          total++;
          if (o.status === 'pending'){
            pending++;
            if (o.timestamp && (now - o.timestamp) > DELAY_MS) delayed++;
          } else if (o.status === 'preparing') preparing++;
          else if (o.status === 'completed') done++;
        });

        /* Cache cho alert */
        delayedCache[a.key] = { count: delayed };

        /* Cache cho dashboard */
        dashStats[a.key] = { total: total, pending: pending, preparing: preparing, done: done, delayed: delayed };

        /* Update UI */
        updateDelayAlert();
        if (document.getElementById('mgrDash') &&
            document.getElementById('mgrDash').classList.contains('show')){
          renderDashboard();
        }
      }, function(err){
        console.warn('[DolphinUI] listen error', a.col, err);
      });
    });

    /* Re-check alert mỗi 20s (để bắt đơn mới quá 5 phút) */
    setInterval(updateDelayAlert, ALERT_POLL_MS);
  }

  function listenStaffForDash(fbStore, db){
    var col = fbStore.collection(db, 'staff_online');
    fbStore.onSnapshot(col, function(snap){
      var now = Date.now();
      var count = 0;
      snap.forEach(function(doc){
        var d = doc.data() || {};
        if (d.lastSeen && (now - d.lastSeen) < 90000) count++;
      });
      dashStats.staffOnline = count;
      if (document.getElementById('mgrDash') &&
          document.getElementById('mgrDash').classList.contains('show')){
        renderDashboard();
      }
    }, function(err){
      console.warn('[DolphinUI] staff listen error:', err);
    });
  }

  /* ============================================================
     INIT
     ============================================================ */
  function init(){
    if (hasLanding() && !isIframe()){
      /* ============ LANDING ============ */
      injectAlertStyles();
      injectDashboardStyles();
      ensureAlertEl();

      if (isManager()){
        var dashEl = ensureDashEl();
        dashEl.classList.add('show');
      }

      initFirebase();

      /* Refresh dashboard mỗi 30s */
      if (isManager()){
        setInterval(function(){
          if (document.getElementById('mgrDash') &&
              document.getElementById('mgrDash').classList.contains('show')){
            renderDashboard();
          }
        }, DASH_POLL_MS);
      }
    } else {
      /* ============ APP CON ============ */
      injectEmptyStates();
    }
  }

  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  console.log('%c🎨 DOLPHIN UI EXTRAS LOADED',
    'background:linear-gradient(90deg,#FBD77A,#F4B842);color:#0a2b28;font-size:11px;padding:3px 8px;border-radius:4px;font-weight:900');
})();
