/* ============================================================
   THEME SYSTEM v5 — REAL SHAPES + IFRAME SYNC
   - clip-path polygon cho 15 theme
   - Bỏ corner emoji (gây đè)
   - localStorage sync cho iframe
   - CSS variables toàn cục
   ============================================================ */
(function(){
  'use strict';

  var FIREBASE_CONFIG = {
    apiKey: "AIzaSyAtBNp9WBnyIkCiVjXfUpjH2d7-9dbg-JQ",
    authDomain: "dolphin-f6d67.firebaseapp.com",
    projectId: "dolphin-f6d67"
  };

  var LS_THEME_KEY = 'dolphin_theme';   // iframe đọc key này

  var THEMES = {
    default: {
      name:'Dolphin', badge:'DOLPHIN', icon:'🕐', loc:'📍', ann:'📢',
      border:'rgba(244,184,66,.55)', borderSoft:'rgba(244,184,66,.25)',
      glow:'rgba(244,184,66,.30)', accent:'#FBD77A', accent2:'#bfe9dc',
      bg1:'#0f3d38', bg2:'#0a2b28',
      clip: null,     /* null = dùng border-radius 22px mặc định */
      ranges: null
    },
    tet: {
      name:'Tết Nguyên Đán', badge:'TẾT', icon:'🧧', loc:'🏮', ann:'🧧',
      border:'rgba(255,107,53,.85)', borderSoft:'rgba(255,107,53,.30)',
      glow:'rgba(255,107,53,.35)', accent:'#FFD166', accent2:'#FFC1B0',
      bg1:'#3a0e0e', bg2:'#1a0505',
      clip:'polygon(0 0, 100% 0, 100% 88%, 50% 100%, 0 88%)',  /* phong bì */
      ranges:[[1,15],[2,20]]
    },
    valentine: {
      name:'Valentine', badge:'VALENTINE', icon:'💝', loc:'💖', ann:'💝',
      border:'rgba(255,77,109,.85)', borderSoft:'rgba(255,77,109,.30)',
      glow:'rgba(255,77,109,.35)', accent:'#FFB3C6', accent2:'#FFD1DC',
      bg1:'#3a0a1a', bg2:'#1a0508',
      clip:'polygon(0 22%, 12% 6%, 32% 6%, 50% 22%, 68% 6%, 88% 6%, 100% 22%, 100% 100%, 0 100%)', /* 2 thùy tim trên */
      ranges:[[2,10],[2,15]]
    },
    womenday: {
      name:'Quốc Tế Phụ Nữ', badge:'8/3', icon:'🌷', loc:'🌹', ann:'🌷',
      border:'rgba(217,70,166,.85)', borderSoft:'rgba(217,70,166,.30)',
      glow:'rgba(217,70,166,.35)', accent:'#FFC1E3', accent2:'#FFE0F0',
      bg1:'#3a1030', bg2:'#1a0515',
      clip:'polygon(50% 0, 68% 15%, 88% 8%, 92% 30%, 100% 50%, 92% 70%, 88% 92%, 68% 85%, 50% 100%, 32% 85%, 12% 92%, 8% 70%, 0 50%, 8% 30%, 12% 8%, 32% 15%)', /* hoa */
      ranges:[[3,5],[3,10]]
    },
    reunification: {
      name:'30/4 Thống Nhất', badge:'30/4', icon:'⭐', loc:'🇻🇳', ann:'⭐',
      border:'rgba(218,37,29,.90)', borderSoft:'rgba(218,37,29,.35)',
      glow:'rgba(218,37,29,.40)', accent:'#FFD700', accent2:'#FFECB3',
      bg1:'#2a0505', bg2:'#0a0202',
      clip:'polygon(0 0, 100% 0, 100% 82%, 88% 100%, 0 100%)', /* cờ gấp góc */
      ranges:[[4,28],[5,3]]
    },
    children: {
      name:'Tết Thiếu Nhi', badge:'1/6', icon:'🎈', loc:'🎉', ann:'🎈',
      border:'rgba(78,205,196,.85)', borderSoft:'rgba(78,205,196,.30)',
      glow:'rgba(78,205,196,.35)', accent:'#FFD1DC', accent2:'#B5EAD7',
      bg1:'#0e1e3a', bg2:'#050a1a',
      clip:'polygon(15% 0, 85% 0, 100% 15%, 100% 85%, 85% 100%, 15% 100%, 0 85%, 0 15%)', /* bát giác */
      ranges:[[5,25],[6,5]]
    },
    nationalday: {
      name:'Quốc Khánh', badge:'2/9', icon:'⭐', loc:'🇻🇳', ann:'⭐',
      border:'rgba(218,37,29,.90)', borderSoft:'rgba(218,37,29,.35)',
      glow:'rgba(255,215,0,.35)', accent:'#FFD700', accent2:'#FFF4B0',
      bg1:'#2a0505', bg2:'#0a0202',
      clip:'polygon(0 0, 100% 0, 100% 82%, 88% 100%, 0 100%)', /* cờ */
      ranges:[[8,30],[9,3]]
    },
    midautumn: {
      name:'Trung Thu', badge:'TRUNG THU', icon:'🏮', loc:'🌕', ann:'🏮',
      border:'rgba(240,192,96,.85)', borderSoft:'rgba(240,192,96,.30)',
      glow:'rgba(240,192,96,.35)', accent:'#FFE8A0', accent2:'#FFD1DC',
      bg1:'#2a0e2a', bg2:'#0a0310',
      clip:'polygon(12% 0, 88% 0, 100% 18%, 100% 82%, 88% 100%, 12% 100%, 0 82%, 0 18%)', /* lồng đèn */
      ranges:[[9,10],[10,5]]
    },
    halloween: {
      name:'Halloween', badge:'HALLOWEEN', icon:'🎃', loc:'🦇', ann:'🎃',
      border:'rgba(255,149,0,.85)', borderSoft:'rgba(255,149,0,.30)',
      glow:'rgba(255,149,0,.35)', accent:'#FFB84D', accent2:'#B388FF',
      bg1:'#1a0a2a', bg2:'#050108',
      clip:'polygon(22% 0, 78% 0, 100% 22%, 100% 100%, 0 100%, 0 22%)', /* quan tài */
      ranges:[[10,25],[11,1]]
    },
    christmas: {
      name:'Giáng Sinh', badge:'NOEL', icon:'🎄', loc:'🎁', ann:'🎄',
      border:'rgba(196,30,58,.90)', borderSoft:'rgba(196,30,58,.32)',
      glow:'rgba(10,125,61,.38)', accent:'#FFE8A0', accent2:'#B8E8C8',
      bg1:'#0a1a2e', bg2:'#050a14',
      clip:'polygon(0 15%, 22% 15%, 22% 0, 42% 0, 42% 15%, 58% 15%, 58% 0, 78% 0, 78% 15%, 100% 15%, 100% 100%, 0 100%)', /* hộp quà có nơ */
      ranges:[[12,15],[12,26]]
    },
    newyear: {
      name:'Tết Dương Lịch', badge:'NEW YEAR', icon:'🎊', loc:'🎆', ann:'🎊',
      border:'rgba(255,215,0,.90)', borderSoft:'rgba(255,215,0,.32)',
      glow:'rgba(139,0,255,.38)', accent:'#FFD700', accent2:'#E0B0FF',
      bg1:'#1a0a3a', bg2:'#050110',
      clip:'polygon(15% 0, 35% 0, 45% 18%, 50% 0, 55% 18%, 65% 0, 85% 0, 100% 30%, 85% 55%, 100% 80%, 85% 100%, 15% 100%, 0 80%, 15% 55%, 0 30%)', /* vương miện */
      ranges:[[12,29],[1,2]]
    },
    spring: {
      name:'Mùa Xuân', badge:'SPRING', icon:'🌸', loc:'🦋', ann:'🌸',
      border:'rgba(255,182,193,.85)', borderSoft:'rgba(255,182,193,.30)',
      glow:'rgba(255,182,193,.35)', accent:'#FFD1DC', accent2:'#B5EAD7',
      bg1:'#1a2a1a', bg2:'#0a140a',
      clip:'polygon(0 22%, 25% 0, 75% 0, 100% 22%, 100% 78%, 75% 100%, 25% 100%, 0 78%)', /* cánh bướm */
      months:[3,4,5]
    },
    summer: {
      name:'Mùa Hè', badge:'SUMMER', icon:'☀️', loc:'🌴', ann:'☀️',
      border:'rgba(255,176,0,.85)', borderSoft:'rgba(255,176,0,.30)',
      glow:'rgba(255,176,0,.35)', accent:'#FFE58F', accent2:'#A0E8E0',
      bg1:'#0a1a3a', bg2:'#030814',
      clip:'polygon(50% 0, 62% 35%, 100% 35%, 68% 60%, 85% 100%, 50% 76%, 15% 100%, 32% 60%, 0 35%, 38% 35%)', /* tia nắng */
      months:[6,7,8]
    },
    autumn: {
      name:'Mùa Thu', badge:'AUTUMN', icon:'🍁', loc:'🍂', ann:'🍁',
      border:'rgba(210,105,30,.85)', borderSoft:'rgba(210,105,30,.30)',
      glow:'rgba(210,105,30,.35)', accent:'#FFD1A0', accent2:'#FFB87A',
      bg1:'#2a1505', bg2:'#0a0502',
      clip:'polygon(50% 0, 62% 28%, 100% 22%, 78% 50%, 100% 78%, 62% 72%, 50% 100%, 38% 72%, 0 78%, 22% 50%, 0 22%, 38% 28%)', /* lá phong */
      months:[9,10,11]
    },
    winter: {
      name:'Mùa Đông', badge:'WINTER', icon:'❄️', loc:'⛄', ann:'❄️',
      border:'rgba(184,216,240,.85)', borderSoft:'rgba(184,216,240,.30)',
      glow:'rgba(184,216,240,.35)', accent:'#E0F0FF', accent2:'#B8D8F0',
      bg1:'#0a1428', bg2:'#03060f',
      clip:'polygon(50% 0, 100% 25%, 100% 75%, 50% 100%, 0 75%, 0 25%)', /* bông tuyết lục giác */
      months:[12,1,2]
    }
  };

  var state = { currentTheme:'default', unsubscribe:null, app:null };

  /* ============== DATE ============== */
  function getVNDate(){
    var parts = new Intl.DateTimeFormat('en-US', {
      timeZone:'Asia/Ho_Chi_Minh', year:'numeric', month:'2-digit', day:'2-digit'
    }).formatToParts(new Date());
    var o = {};
    parts.forEach(function(p){ if (p.type !== 'literal') o[p.type] = p.value; });
    return { year:parseInt(o.year), month:parseInt(o.month), day:parseInt(o.day) };
  }
  function isInRange(m, d, ranges){
    if (!ranges) return false;
    for (var i = 0; i < ranges.length; i++){
      var r = ranges[i];
      var start = r[0][0]*100 + r[0][1];
      var end   = r[1][0]*100 + r[1][1];
      var curr  = m*100 + d;
      if (end < start){ if (curr >= start || curr <= end) return true; }
      else { if (curr >= start && curr <= end) return true; }
    }
    return false;
  }
  function detectThemeByDate(){
    var vn = getVNDate();
    var order = ['tet','valentine','womenday','reunification','children',
                 'nationalday','midautumn','halloween','christmas','newyear'];
    for (var i = 0; i < order.length; i++)
      if (isInRange(vn.month, vn.day, THEMES[order[i]].ranges)) return order[i];
    var season = ['spring','summer','autumn','winter'];
    for (var j = 0; j < season.length; j++){
      var sk = season[j];
      if (THEMES[sk].months && THEMES[sk].months.indexOf(vn.month) >= 0) return sk;
    }
    return 'default';
  }

  /* ============== STYLES ============== */
  function injectStyles(){
    if (document.getElementById('theme-styles')) return;
    var s = document.createElement('style');
    s.id = 'theme-styles';
    s.textContent = [
      ':root{',
      '  --theme-border: rgba(244,184,66,.55);',
      '  --theme-border-soft: rgba(244,184,66,.25);',
      '  --theme-glow: rgba(244,184,66,.30);',
      '  --theme-accent: #FBD77A;',
      '  --theme-accent2: #bfe9dc;',
      '  --theme-bg1: #0f3d38;',
      '  --theme-bg2: #0a2b28;',
      '  --theme-clip: inset(0 round 22px);',
      '  --theme-trans: 1s ease;',
      '}',

      'body{',
      '  background: linear-gradient(160deg, var(--theme-bg1) 0%, var(--theme-bg2) 100%) !important;',
      '  transition: background var(--theme-trans) !important;',
      '}',
      '#landing{ background: transparent !important; }',

      /* ==== ĐỒNG HỒ ==== */
      '#halongClock{',
      '  border-color: var(--theme-border) !important;',
      '  box-shadow: 0 8px 32px rgba(0,0,0,.5), 0 0 40px var(--theme-glow),',
      '              inset 0 0 30px var(--theme-glow) !important;',
      '  transition: border-color var(--theme-trans), box-shadow var(--theme-trans) !important;',
      '}',
      '#halongClock .hclock-time{',
      '  color: var(--theme-accent) !important;',
      '  text-shadow: 0 0 12px var(--theme-glow), 0 0 24px var(--theme-glow) !important;',
      '  transition: color var(--theme-trans) !important;',
      '}',
      '#halongClock .hclock-loc-text{',
      '  color: var(--theme-accent) !important;',
      '  text-shadow: 0 0 8px var(--theme-glow) !important;',
      '  transition: color var(--theme-trans) !important;',
      '}',
      '#halongClock .hclock-date, #halongClock .hclock-s{',
      '  color: var(--theme-accent2) !important;',
      '  transition: color var(--theme-trans) !important;',
      '}',
      '#halongClock .hclock-loc{ border-left-color: var(--theme-border) !important; transition: border-color var(--theme-trans) !important; }',

      /* ==== AREA CARD ==== */
      /* Bỏ gradient border cũ, dùng ::before làm nền + clip-path */
      '.area-card{',
      '  position: relative;',
      '  background: transparent !important;',
      '  border: none !important;',
      '  border-radius: 0 !important;',
      '  overflow: visible !important;',
      '  isolation: isolate;',
      '  transition: transform .45s cubic-bezier(.16,1,.3,1) !important;',
      '}',
      /* Ẩn ::before cũ (gradient border) */
      '.area-card > .old-border{ display: none !important; }',

      '.area-card::before{',
      '  content: "";',
      '  position: absolute;',
      '  inset: 0;',
      '  background: linear-gradient(135deg, rgba(22,66,62,.85), rgba(12,40,38,.9));',
      '  -webkit-backdrop-filter: blur(14px) saturate(140%);',
      '  backdrop-filter: blur(14px) saturate(140%);',
      '  -webkit-clip-path: var(--theme-clip);',
      '  clip-path: var(--theme-clip);',
      '  -webkit-filter: drop-shadow(0 0 2px var(--theme-border)) drop-shadow(0 0 12px var(--theme-glow));',
      '  filter: drop-shadow(0 0 2px var(--theme-border)) drop-shadow(0 0 12px var(--theme-glow));',
      '  z-index: -1;',
      '  transition: filter .45s ease, background .6s ease, -webkit-clip-path .7s cubic-bezier(.16,1,.3,1), clip-path .7s cubic-bezier(.16,1,.3,1);',
      '  pointer-events: none;',
      '}',
      '.area-card:hover::before{',
      '  background: linear-gradient(135deg, rgba(30,86,80,.95), rgba(18,55,50,.95));',
      '  -webkit-filter: drop-shadow(0 0 3px var(--theme-accent)) drop-shadow(0 0 24px var(--theme-glow));',
      '  filter: drop-shadow(0 0 3px var(--theme-accent)) drop-shadow(0 0 24px var(--theme-glow));',
      '}',
      '.area-card:hover{ transform: translateY(-8px) scale(1.03); }',

      '.area-card .area-title-en{ transition: color var(--theme-trans) !important; }',
      '.area-card:hover .area-title-en{',
      '  color: var(--theme-accent) !important;',
      '  text-shadow: 0 0 20px var(--theme-glow) !important;',
      '}',
      '.area-title-vi{ color: var(--theme-accent2) !important; transition: color var(--theme-trans) !important; }',
      '.area-badge{',
      '  background: linear-gradient(135deg, var(--theme-accent), var(--theme-accent2)) !important;',
      '  transition: background var(--theme-trans) !important;',
      '}',

      /* ==== ANNOUNCEMENT ==== */
      '#announcementBar{',
      '  border-color: var(--theme-border) !important;',
      '  box-shadow: 0 6px 28px var(--theme-glow), inset 0 0 30px var(--theme-glow) !important;',
      '  transition: border-color var(--theme-trans), box-shadow var(--theme-trans) !important;',
      '}',
      '.announcement-text{ color: var(--theme-accent) !important; transition: color var(--theme-trans) !important; }',
      '.welcome-lbl .wlc-vi{ color: var(--theme-accent) !important; transition: color var(--theme-trans); }',
      '.welcome-lbl .wlc-en{ color: var(--theme-accent2) !important; transition: color var(--theme-trans); }',

      /* ==== BADGE ==== */
      '#themeBadge{',
      '  position: fixed; top: 8px; left: 8px; z-index: 9998;',
      '  display: flex; align-items: center; gap: 6px;',
      '  padding: 6px 12px;',
      '  background: rgba(10,31,29,.9);',
      '  border: 1px solid var(--theme-border);',
      '  border-radius: 999px;',
      '  font-size: 11px; font-weight: 900;',
      '  color: var(--theme-accent);',
      '  font-family: Nunito, sans-serif;',
      '  backdrop-filter: blur(10px);',
      '  pointer-events: none; opacity: 0;',
      '  transition: opacity .5s, border-color var(--theme-trans), color var(--theme-trans);',
      '}',
      '#themeBadge.show{ opacity: 1; }',
      '#themeBadge .tb-icon{ font-size: 14px; }',
      'body.app-mode #themeBadge{ display: none !important; }',

      /* ==== GENERIC THEME HOOKS cho iframe ==== */
      '/* Các app con có thể dùng class này để tự động ăn theme */',
      '[data-themed-card]{',
      '  border-color: var(--theme-border-soft) !important;',
      '  transition: border-color var(--theme-trans), box-shadow var(--theme-trans) !important;',
      '}',
      '[data-themed-card]:hover{',
      '  border-color: var(--theme-border) !important;',
      '  box-shadow: 0 0 20px var(--theme-glow) !important;',
      '}',
      '[data-themed-accent]{ color: var(--theme-accent) !important; }',
      '[data-themed-accent2]{ color: var(--theme-accent2) !important; }',
      '[data-themed-glow]{ box-shadow: 0 0 20px var(--theme-glow) !important; }',

      '@media(max-width:768px){',
      '  #themeBadge{ font-size: 9.5px; padding: 4px 9px; top: 6px; left: 6px; }',
      '  #themeBadge .tb-icon{ font-size: 12px; }',
      '}'
    ].join('\n');
    document.head.appendChild(s);
  }

  /* ============== APPLY ============== */
  function applyTheme(key){
    var t = THEMES[key] || THEMES.default;
    state.currentTheme = (key in THEMES) ? key : 'default';

    var root = document.documentElement;
    root.style.setProperty('--theme-border',      t.border);
    root.style.setProperty('--theme-border-soft', t.borderSoft);
    root.style.setProperty('--theme-glow',        t.glow);
    root.style.setProperty('--theme-accent',      t.accent);
    root.style.setProperty('--theme-accent2',     t.accent2);
    root.style.setProperty('--theme-bg1',         t.bg1);
    root.style.setProperty('--theme-bg2',         t.bg2);
    root.style.setProperty('--theme-clip',
      t.clip ? t.clip : 'inset(0 round 22px)');

    document.body.setAttribute('data-theme', state.currentTheme);

    /* Emoji trên clock / announcement */
    var ci = document.querySelector('#halongClock .hclock-icon');
    if (ci && t.icon) ci.textContent = t.icon;
    var li = document.querySelector('#halongClock .hclock-loc-icon');
    if (li && t.loc) li.textContent = t.loc;
    var ai = document.querySelector('#announcementBar .announcement-icon');
    if (ai && t.ann) ai.textContent = t.ann;

    /* Lưu vào localStorage để iframe đọc */
    try { localStorage.setItem(LS_THEME_KEY, state.currentTheme); } catch(e){}

    /* Broadcast cho iframe (same-origin) */
    try {
      var bc = window.__dolphinThemeBC || (window.__dolphinThemeBC = new BroadcastChannel('dolphin-theme'));
      bc.postMessage({ type:'theme', key: state.currentTheme });
    } catch(e){}

    updateBadge(state.currentTheme);
    console.log('[Theme] Applied:', state.currentTheme);
  }

  function updateBadge(key){
    var b = document.getElementById('themeBadge');
    if (!b){ b = document.createElement('div'); b.id = 'themeBadge'; document.body.appendChild(b); }
    if (!key || key === 'default'){ b.classList.remove('show'); return; }
    var t = THEMES[key];
    b.innerHTML = '<span class="tb-icon">' + t.icon + '</span><span>' + t.badge + '</span>';
    b.classList.add('show');
  }

  /* ============== FIREBASE ============== */
  function fetchThemeFromFirebase(){
    Promise.all([
      import("https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js"),
      import("https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js"),
      import("https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js")
    ]).then(function(mods){
      try { state.app = mods[0].getApp('theme-app'); }
      catch(e){ state.app = mods[0].initializeApp(FIREBASE_CONFIG, 'theme-app'); }
      var auth = mods[1].getAuth(state.app);
      var db   = mods[2].getFirestore(state.app);

      function startListener(){
        if (state.unsubscribe) state.unsubscribe();
        var ref = mods[2].doc(db, 'master_config', 'theme');
        state.unsubscribe = mods[2].onSnapshot(ref, function(snap){
          var key = 'auto';
          if (snap.exists()){
            var data = snap.data();
            key = data.themeKey || data.theme || 'auto';
          }
          if (key === 'auto' || !THEMES[key]) applyTheme(detectThemeByDate());
          else applyTheme(key);
        }, function(err){
          console.warn('[Theme] Listen error:', err);
          applyTheme(detectThemeByDate());
        });
      }
      if (auth.currentUser) startListener();
      else mods[1].signInAnonymously(auth).then(startListener).catch(function(err){
        console.warn('[Theme] Auth error:', err);
        applyTheme(detectThemeByDate());
      });
    }).catch(function(err){
      console.warn('[Theme] Firebase init fail:', err);
      applyTheme(detectThemeByDate());
    });
  }

  /* ============== INIT ============== */
  function init(){
    injectStyles();
    /* Ưu tiên: URL > localStorage > Firestore */
    var urlParams = new URLSearchParams(location.search);
    var urlTheme = urlParams.get('theme');
    if (urlTheme && THEMES[urlTheme]){ applyTheme(urlTheme); return; }

    /* Nếu là iframe → đọc localStorage của parent (same-origin) */
    var saved = null;
    try { saved = localStorage.getItem(LS_THEME_KEY); } catch(e){}
    if (saved && THEMES[saved]) applyTheme(saved);

    /* Vẫn listen Firestore để cập nhật realtime */
    fetchThemeFromFirebase();

    /* Lắng nghe sự thay đổi theme từ tab khác (parent <-> iframe) */
    try {
      window.addEventListener('storage', function(e){
        if (e.key === LS_THEME_KEY && THEMES[e.newValue]) applyTheme(e.newValue);
      });
    } catch(e){}

    try {
      var bc = window.__dolphinThemeBC || (window.__dolphinThemeBC = new BroadcastChannel('dolphin-theme'));
      bc.onmessage = function(ev){
        var d = ev.data || {};
        if (d.type === 'theme' && THEMES[d.key]) applyTheme(d.key);
      };
    } catch(e){}
  }

  window.ThemeSystem = {
    version:   '5.0',
    setTheme:  function(key){ applyTheme(key); },
    getCurrent:function(){ return state.currentTheme; },
    listThemes:function(){ return Object.keys(THEMES); },
    detect:    detectThemeByDate,
    getThemes: function(){ return THEMES; },
    applyTo:   function(el){ if (el && el.setAttribute) el.setAttribute('data-themed-card',''); }
  };

  if (document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded', init);
  else init();

  console.log('%c🎨 THEME SYSTEM v5 LOADED',
    'background:linear-gradient(90deg,#FFD700,#FF1493);color:#fff;font-size:12px;padding:4px 10px;border-radius:4px;font-weight:900');
})();
