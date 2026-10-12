/* ============================================================
   THEME SYSTEM v4.1 — MINIMAL + SHAPES
   - Border-radius đổi theo theme (15 shapes)
   - Không particle, không canvas, không aurora
   - Chỉ CSS variables + border-radius động
   ============================================================ */
(function(){
  'use strict';

  var FIREBASE_CONFIG = {
    apiKey: "AIzaSyAtBNp9WBnyIkCiVjXfUpjH2d7-9dbg-JQ",
    authDomain: "dolphin-f6d67.firebaseapp.com",
    projectId: "dolphin-f6d67"
  };

  var THEMES = {
    default: {
      name: 'Dolphin', badge: 'DOLPHIN',
      icon: '🕐', loc: '📍', ann: '📢',
      corner1: '', corner2: '',
      border:      'rgba(244,184,66,.55)',
      borderSoft:  'rgba(244,184,66,.22)',
      glow:        'rgba(244,184,66,.28)',
      accent:      '#FBD77A',
      accent2:     '#bfe9dc',
      bg1: '#0f3d38', bg2: '#0a2b28',
      shape: '22px',
      ranges: null
    },
    tet: {
      name: 'Tết Nguyên Đán', badge: 'TẾT',
      icon: '🧧', loc: '🏮', ann: '🧧',
      corner1: '🧧', corner2: '🌸',
      border:      'rgba(255,107,53,.75)',
      borderSoft:  'rgba(255,107,53,.28)',
      glow:        'rgba(255,107,53,.30)',
      accent:      '#FFD166',
      accent2:     '#FFC1B0',
      bg1: '#3a0e0e', bg2: '#1a0505',
      shape: '4px 4px 60px 60px / 4px 4px 45px 45px',
      ranges: [[1,15],[2,20]]
    },
    valentine: {
      name: 'Valentine', badge: 'VALENTINE',
      icon: '💝', loc: '💖', ann: '💝',
      corner1: '💕', corner2: '🌹',
      border:      'rgba(255,77,109,.75)',
      borderSoft:  'rgba(255,77,109,.28)',
      glow:        'rgba(255,77,109,.30)',
      accent:      '#FFB3C6',
      accent2:     '#FFD1DC',
      bg1: '#3a0a1a', bg2: '#1a0508',
      shape: '60% 60% 22px 22px / 45% 45% 22px 22px',
      ranges: [[2,10],[2,15]]
    },
    womenday: {
      name: 'Quốc Tế Phụ Nữ', badge: '8/3',
      icon: '🌷', loc: '🌹', ann: '🌷',
      corner1: '🌹', corner2: '💮',
      border:      'rgba(217,70,166,.75)',
      borderSoft:  'rgba(217,70,166,.28)',
      glow:        'rgba(217,70,166,.30)',
      accent:      '#FFC1E3',
      accent2:     '#FFE0F0',
      bg1: '#3a1030', bg2: '#1a0515',
      shape: '100px 22px 100px 22px',
      ranges: [[3,5],[3,10]]
    },
    reunification: {
      name: '30/4 Thống Nhất', badge: '30/4',
      icon: '⭐', loc: '🇻🇳', ann: '⭐',
      corner1: '⭐', corner2: '🎆',
      border:      'rgba(218,37,29,.80)',
      borderSoft:  'rgba(218,37,29,.30)',
      glow:        'rgba(218,37,29,.35)',
      accent:      '#FFD700',
      accent2:     '#FFECB3',
      bg1: '#2a0505', bg2: '#0a0202',
      shape: '2px 40px 2px 40px',
      ranges: [[4,28],[5,3]]
    },
    children: {
      name: 'Tết Thiếu Nhi', badge: '1/6',
      icon: '🎈', loc: '🎉', ann: '🎈',
      corner1: '🎁', corner2: '🍭',
      border:      'rgba(78,205,196,.75)',
      borderSoft:  'rgba(78,205,196,.28)',
      glow:        'rgba(78,205,196,.30)',
      accent:      '#FFD1DC',
      accent2:     '#B5EAD7',
      bg1: '#0e1e3a', bg2: '#050a1a',
      shape: '50% 50% 50% 50% / 60% 60% 40% 40%',
      ranges: [[5,25],[6,5]]
    },
    nationalday: {
      name: 'Quốc Khánh', badge: '2/9',
      icon: '⭐', loc: '🇻🇳', ann: '⭐',
      corner1: '⭐', corner2: '🎆',
      border:      'rgba(218,37,29,.80)',
      borderSoft:  'rgba(218,37,29,.30)',
      glow:        'rgba(255,215,0,.32)',
      accent:      '#FFD700',
      accent2:     '#FFF4B0',
      bg1: '#2a0505', bg2: '#0a0202',
      shape: '2px 40px 2px 40px',
      ranges: [[8,30],[9,3]]
    },
    midautumn: {
      name: 'Trung Thu', badge: 'TRUNG THU',
      icon: '🏮', loc: '🌕', ann: '🏮',
      corner1: '🏮', corner2: '🥮',
      border:      'rgba(240,192,96,.75)',
      borderSoft:  'rgba(240,192,96,.28)',
      glow:        'rgba(240,192,96,.32)',
      accent:      '#FFE8A0',
      accent2:     '#FFD1DC',
      bg1: '#2a0e2a', bg2: '#0a0310',
      shape: '70px 70px 22px 22px',
      ranges: [[9,10],[10,5]]
    },
    halloween: {
      name: 'Halloween', badge: 'HALLOWEEN',
      icon: '🎃', loc: '🦇', ann: '🎃',
      corner1: '👻', corner2: '🕷️',
      border:      'rgba(255,149,0,.75)',
      borderSoft:  'rgba(255,149,0,.28)',
      glow:        'rgba(255,149,0,.32)',
      accent:      '#FFB84D',
      accent2:     '#B388FF',
      bg1: '#1a0a2a', bg2: '#050108',
      shape: '60px 60px 60px 60px / 80px 80px 40px 40px',
      ranges: [[10,25],[11,1]]
    },
    christmas: {
      name: 'Giáng Sinh', badge: 'NOEL',
      icon: '🎄', loc: '🎁', ann: '🎄',
      corner1: '❄️', corner2: '🎅',
      border:      'rgba(196,30,58,.80)',
      borderSoft:  'rgba(196,30,58,.30)',
      glow:        'rgba(10,125,61,.35)',
      accent:      '#FFE8A0',
      accent2:     '#B8E8C8',
      bg1: '#0a1a2e', bg2: '#050a14',
      shape: '8px 8px 80px 80px / 8px 8px 60px 60px',
      ranges: [[12,15],[12,26]]
    },
    newyear: {
      name: 'Tết Dương Lịch', badge: 'NEW YEAR',
      icon: '🎊', loc: '🎆', ann: '🎊',
      corner1: '🥂', corner2: '✨',
      border:      'rgba(255,215,0,.80)',
      borderSoft:  'rgba(255,215,0,.30)',
      glow:        'rgba(139,0,255,.35)',
      accent:      '#FFD700',
      accent2:     '#E0B0FF',
      bg1: '#1a0a3a', bg2: '#050110',
      shape: '60px',
      ranges: [[12,29],[1,2]]
    },
    spring: {
      name: 'Mùa Xuân', badge: 'SPRING',
      icon: '🌸', loc: '🦋', ann: '🌸',
      corner1: '🦋', corner2: '🌺',
      border:      'rgba(255,182,193,.75)',
      borderSoft:  'rgba(255,182,193,.28)',
      glow:        'rgba(255,182,193,.30)',
      accent:      '#FFD1DC',
      accent2:     '#B5EAD7',
      bg1: '#1a2a1a', bg2: '#0a140a',
      shape: '70px 70px 22px 22px',
      months: [3,4,5]
    },
    summer: {
      name: 'Mùa Hè', badge: 'SUMMER',
      icon: '☀️', loc: '🌴', ann: '☀️',
      corner1: '🍹', corner2: '🥥',
      border:      'rgba(255,176,0,.75)',
      borderSoft:  'rgba(255,176,0,.28)',
      glow:        'rgba(255,176,0,.32)',
      accent:      '#FFE58F',
      accent2:     '#A0E8E0',
      bg1: '#0a1a3a', bg2: '#030814',
      shape: '22px 22px 50% 50% / 22px 22px 60% 60%',
      months: [6,7,8]
    },
    autumn: {
      name: 'Mùa Thu', badge: 'AUTUMN',
      icon: '🍁', loc: '🍂', ann: '🍁',
      corner1: '🌾', corner2: '🍄',
      border:      'rgba(210,105,30,.75)',
      borderSoft:  'rgba(210,105,30,.28)',
      glow:        'rgba(210,105,30,.32)',
      accent:      '#FFD1A0',
      accent2:     '#FFB87A',
      bg1: '#2a1505', bg2: '#0a0502',
      shape: '22px 100px 22px 100px',
      months: [9,10,11]
    },
    winter: {
      name: 'Mùa Đông', badge: 'WINTER',
      icon: '❄️', loc: '⛄', ann: '❄️',
      corner1: '❄️', corner2: '🌨️',
      border:      'rgba(184,216,240,.75)',
      borderSoft:  'rgba(184,216,240,.26)',
      glow:        'rgba(184,216,240,.32)',
      accent:      '#E0F0FF',
      accent2:     '#B8D8F0',
      bg1: '#0a1428', bg2: '#03060f',
      shape: '60px 6px 60px 6px',
      months: [12,1,2]
    }
  };

  var state = {
    currentTheme: 'default',
    unsubscribe: null,
    app: null
  };

  /* ============== DATE HELPERS ============== */
  function getVNDate(){
    var parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Ho_Chi_Minh',
      year: 'numeric', month: '2-digit', day: '2-digit'
    }).formatToParts(new Date());
    var o = {};
    parts.forEach(function(p){ if (p.type !== 'literal') o[p.type] = p.value; });
    return { year: parseInt(o.year), month: parseInt(o.month), day: parseInt(o.day) };
  }

  function isInRange(m, d, ranges){
    if (!ranges) return false;
    for (var i = 0; i < ranges.length; i++){
      var r = ranges[i];
      var start = r[0][0] * 100 + r[0][1];
      var end   = r[1][0] * 100 + r[1][1];
      var curr  = m * 100 + d;
      if (end < start){
        if (curr >= start || curr <= end) return true;
      } else {
        if (curr >= start && curr <= end) return true;
      }
    }
    return false;
  }

  function detectThemeByDate(){
    var vn = getVNDate();
    var holidayOrder = ['tet','valentine','womenday','reunification','children',
                        'nationalday','midautumn','halloween','christmas','newyear'];
    for (var i = 0; i < holidayOrder.length; i++){
      if (isInRange(vn.month, vn.day, THEMES[holidayOrder[i]].ranges)) return holidayOrder[i];
    }
    var seasonOrder = ['spring','summer','autumn','winter'];
    for (var j = 0; j < seasonOrder.length; j++){
      var sk = seasonOrder[j];
      if (THEMES[sk].months && THEMES[sk].months.indexOf(vn.month) >= 0) return sk;
    }
    return 'default';
  }

  /* ============== INJECT MINIMAL STYLES ============== */
  function injectStyles(){
    if (document.getElementById('theme-styles')) return;
    var s = document.createElement('style');
    s.id = 'theme-styles';
    s.textContent = [
      /* CSS Variables */
      ':root{',
      '  --theme-border: rgba(244,184,66,.55);',
      '  --theme-border-soft: rgba(244,184,66,.22);',
      '  --theme-glow: rgba(244,184,66,.28);',
      '  --theme-accent: #FBD77A;',
      '  --theme-accent2: #bfe9dc;',
      '  --theme-bg1: #0f3d38;',
      '  --theme-bg2: #0a2b28;',
      '  --theme-shape: 22px;',
      '  --theme-trans: 1s ease;',
      '}',

      /* Body nền gradient theo theme */
      'body{',
      '  background: linear-gradient(160deg, var(--theme-bg1) 0%, var(--theme-bg2) 100%) !important;',
      '  transition: background var(--theme-trans) !important;',
      '}',
      '#landing{ background: transparent !important; }',

      /* ==== ĐỒNG HỒ ==== */
      '#halongClock{',
      '  border-color: var(--theme-border) !important;',
      '  box-shadow: 0 8px 32px rgba(0,0,0,.5),',
      '              0 0 40px var(--theme-glow),',
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
      '#halongClock .hclock-date,',
      '#halongClock .hclock-s{',
      '  color: var(--theme-accent2) !important;',
      '  transition: color var(--theme-trans) !important;',
      '}',
      '#halongClock .hclock-loc{',
      '  border-left-color: var(--theme-border) !important;',
      '  transition: border-color var(--theme-trans) !important;',
      '}',

      /* ==== AREA CARDS — viền + hình dáng + hover ==== */
      '.area-card{',
      '  border-color: var(--theme-border-soft) !important;',
      '  border-width: 2px !important;',
      '  border-radius: var(--theme-shape) !important;',
      '  transition: border-color var(--theme-trans),',
      '              border-radius .7s cubic-bezier(.16,1,.3,1),',
      '              transform .45s cubic-bezier(.16,1,.3,1),',
      '              box-shadow .45s ease !important;',
      '}',
      '.area-card::before{',
      '  border-radius: inherit !important;',
      '}',
      '.area-card:hover{',
      '  border-color: var(--theme-border) !important;',
      '  box-shadow: 0 28px 56px -16px rgba(0,0,0,.7),',
      '              0 0 40px -8px var(--theme-glow),',
      '              inset 0 0 30px var(--theme-glow) !important;',
      '}',
      '.area-card::before{',
      '  background: linear-gradient(135deg,',
      '              var(--theme-border),',
      '              transparent 45%,',
      '              var(--theme-border-soft)) !important;',
      '  transition: opacity .4s, background var(--theme-trans) !important;',
      '}',
      '.area-card:hover .area-title-en{',
      '  color: var(--theme-accent) !important;',
      '  text-shadow: 0 0 20px var(--theme-glow) !important;',
      '}',
      '.area-title-vi{',
      '  color: var(--theme-accent2) !important;',
      '  transition: color var(--theme-trans) !important;',
      '}',
      '.area-badge{',
      '  background: linear-gradient(135deg, var(--theme-accent), var(--theme-accent2)) !important;',
      '  transition: background var(--theme-trans) !important;',
      '}',

      /* ==== ANNOUNCEMENT ==== */
      '#announcementBar{',
      '  border-color: var(--theme-border) !important;',
      '  box-shadow: 0 6px 28px var(--theme-glow),',
      '              inset 0 0 30px var(--theme-glow) !important;',
      '  transition: border-color var(--theme-trans), box-shadow var(--theme-trans) !important;',
      '}',
      '.announcement-text{',
      '  color: var(--theme-accent) !important;',
      '  transition: color var(--theme-trans) !important;',
      '}',

      /* ==== WELCOME ==== */
      '.welcome-lbl .wlc-vi{ color: var(--theme-accent) !important; transition: color var(--theme-trans); }',
      '.welcome-lbl .wlc-en{ color: var(--theme-accent2) !important; transition: color var(--theme-trans); }',

      /* ==== CORNER DECORATION ==== */
      '.theme-corner{',
      '  position: absolute;',
      '  font-size: 18px;',
      '  line-height: 1;',
      '  pointer-events: none;',
      '  z-index: 5;',
      '  opacity: .75;',
      '  filter: drop-shadow(0 2px 6px rgba(0,0,0,.6));',
      '  transition: opacity .3s, transform .3s;',
      '}',
      '.theme-corner-tl{ top: 10px; left: 12px; }',
      '.theme-corner-br{ bottom: 10px; right: 12px; }',
      '.area-card:hover .theme-corner{ opacity: 1; transform: scale(1.15); }',

      /* ==== HÌNH DÁNG RIÊNG THEO TỪNG THEME ==== */
      'body[data-theme="default"]      .area-card { border-radius: 22px !important; }',
      'body[data-theme="tet"]          .area-card { border-radius: 4px 4px 60px 60px / 4px 4px 45px 45px !important; }',
      'body[data-theme="valentine"]    .area-card { border-radius: 60% 60% 22px 22px / 45% 45% 22px 22px !important; }',
      'body[data-theme="womenday"]     .area-card { border-radius: 100px 22px 100px 22px !important; }',
      'body[data-theme="reunification"].area-card { border-radius: 2px 40px 2px 40px !important; }',
      'body[data-theme="children"]     .area-card { border-radius: 50% 50% 50% 50% / 60% 60% 40% 40% !important; }',
      'body[data-theme="nationalday"]  .area-card { border-radius: 2px 40px 2px 40px !important; }',
      'body[data-theme="midautumn"]    .area-card { border-radius: 70px 70px 22px 22px !important; }',
      'body[data-theme="halloween"]    .area-card { border-radius: 60px 60px 60px 60px / 80px 80px 40px 40px !important; }',
      'body[data-theme="christmas"]    .area-card { border-radius: 8px 8px 80px 80px / 8px 8px 60px 60px !important; }',
      'body[data-theme="newyear"]      .area-card { border-radius: 60px !important; }',
      'body[data-theme="spring"]       .area-card { border-radius: 70px 70px 22px 22px !important; }',
      'body[data-theme="summer"]       .area-card { border-radius: 22px 22px 50% 50% / 22px 22px 60% 60% !important; }',
      'body[data-theme="autumn"]       .area-card { border-radius: 22px 100px 22px 100px !important; }',
      'body[data-theme="winter"]       .area-card { border-radius: 60px 6px 60px 6px !important; }',

      /* ==== THEME BADGE ==== */
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
      '  -webkit-backdrop-filter: blur(10px);',
      '  pointer-events: none;',
      '  opacity: 0;',
      '  transition: opacity .5s, border-color var(--theme-trans), color var(--theme-trans);',
      '}',
      '#themeBadge.show{ opacity: 1; }',
      '#themeBadge .tb-icon{ font-size: 14px; }',
      'body.app-mode #themeBadge{ display: none !important; }',
      '@media(max-width:768px){',
      '  #themeBadge{ font-size: 9.5px; padding: 4px 9px; top: 6px; left: 6px; }',
      '  #themeBadge .tb-icon{ font-size: 12px; }',
      '  .theme-corner{ font-size: 15px; }',
      '}'
    ].join('\n');
    document.head.appendChild(s);
  }

  /* ============== APPLY THEME ============== */
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
    root.style.setProperty('--theme-shape',       t.shape || '22px');

    document.body.setAttribute('data-theme', state.currentTheme);

    /* Emoji */
    var clockIcon = document.querySelector('#halongClock .hclock-icon');
    if (clockIcon && t.icon) clockIcon.textContent = t.icon;
    var locIcon = document.querySelector('#halongClock .hclock-loc-icon');
    if (locIcon && t.loc) locIcon.textContent = t.loc;
    var annIcon = document.querySelector('#announcementBar .announcement-icon');
    if (annIcon && t.ann) annIcon.textContent = t.ann;

    /* Trang trí góc card */
    document.querySelectorAll('.area-card').forEach(function(card){
      card.querySelectorAll('.theme-corner').forEach(function(el){ el.remove(); });
      if (t.corner1){
        var tl = document.createElement('span');
        tl.className = 'theme-corner theme-corner-tl';
        tl.textContent = t.corner1;
        card.appendChild(tl);
      }
      if (t.corner2){
        var br = document.createElement('span');
        br.className = 'theme-corner theme-corner-br';
        br.textContent = t.corner2;
        card.appendChild(br);
      }
    });

    updateBadge(state.currentTheme);
    console.log('[Theme] Applied:', state.currentTheme);
  }

  function updateBadge(key){
    var b = document.getElementById('themeBadge');
    if (!b){
      b = document.createElement('div');
      b.id = 'themeBadge';
      document.body.appendChild(b);
    }
    if (!key || key === 'default'){
      b.classList.remove('show');
      return;
    }
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
      else mods[1].signInAnonymously(auth)
        .then(startListener)
        .catch(function(err){
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
    var urlParams = new URLSearchParams(location.search);
    var urlTheme = urlParams.get('theme');
    if (urlTheme && THEMES[urlTheme]){
      applyTheme(urlTheme);
      return;
    }
    fetchThemeFromFirebase();
  }

  window.ThemeSystem = {
    version:    '4.1',
    setTheme:   function(key){ applyTheme(key); },
    getCurrent: function(){ return state.currentTheme; },
    listThemes: function(){ return Object.keys(THEMES); },
    detect:     detectThemeByDate,
    getThemes:  function(){ return THEMES; }
  };

  if (document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded', init);
  else init();

  console.log('%c🎨 THEME SYSTEM v4.1 MINIMAL+SHAPES LOADED',
    'background:linear-gradient(90deg,#FFD700,#FF1493);color:#fff;font-size:12px;padding:4px 10px;border-radius:4px;font-weight:900');
})();
