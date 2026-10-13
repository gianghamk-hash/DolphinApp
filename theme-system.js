/* ============================================================
   THEME SYSTEM v7.1 — DEEP APP INTEGRATION LV2
   ─────────────────────────────────────────────────────────────
   • Landing: Big icon + Firework (giữ nguyên)
   • App con: Áp theme sâu vào MỌI element
     - Menu card, btn, qty, chip, input, skeleton, heartbeat...
   ============================================================ */
(function(){
  'use strict';

  var FIREBASE_CONFIG = {
    apiKey: "AIzaSyAtBNp9WBnyIkCiVjXfUpjH2d7-9dbg-JQ",
    authDomain: "dolphin-f6d67.firebaseapp.com",
    projectId: "dolphin-f6d67"
  };
  var LS_THEME_KEY = 'dolphin_theme';

  var DEBUG = false;
  try { DEBUG = new URLSearchParams(location.search).get('btdebug') === '1'; } catch(e){}

  /* ============================================================
     THEME DEFINITIONS
     ============================================================ */
  var THEMES = {
    default: {
      name:'Dolphin', badge:'DOLPHIN', icon:'🕐', loc:'📍', ann:'📢',
      border:'rgba(244,184,66,.55)', borderSoft:'rgba(244,184,66,.25)',
      glow:'rgba(244,184,66,.30)', accent:'#FBD77A', accent2:'#bfe9dc',
      bg1:'#0f3d38', bg2:'#0a2b28', radius:null, ranges:null,
      /* Menu icon set — mỗi theme có icon riêng cho card */
      menuIcon: '🐬'
    },
    tet: {
      name:'Tết', badge:'TẾT', icon:'🧧', loc:'🏮', ann:'🧧',
      border:'rgba(255,107,53,.80)', borderSoft:'rgba(255,107,53,.28)',
      glow:'rgba(255,107,53,.32)', accent:'#FFD166', accent2:'#FFC1B0',
      bg1:'#3a0e0e', bg2:'#1a0505',
      radius:'4px 4px 60px 60px / 4px 4px 45px 45px', ranges:[[1,15],[2,20]],
      menuIcon: '🧧'
    },
    valentine: {
      name:'Valentine', badge:'VALENTINE', icon:'💝', loc:'💖', ann:'💝',
      border:'rgba(255,77,109,.80)', borderSoft:'rgba(255,77,109,.28)',
      glow:'rgba(255,77,109,.32)', accent:'#FFB3C6', accent2:'#FFD1DC',
      bg1:'#3a0a1a', bg2:'#1a0508',
      radius:'60% 60% 22px 22px / 45% 45% 22px 22px', ranges:[[2,10],[2,15]],
      menuIcon: '💖'
    },
    womenday: {
      name:'Quốc Tế Phụ Nữ', badge:'20/10', icon:'🌷', loc:'🌹', ann:'🌷',
      border:'rgba(217,70,166,.80)', borderSoft:'rgba(217,70,166,.28)',
      glow:'rgba(217,70,166,.32)', accent:'#FFC1E3', accent2:'#FFE0F0',
      bg1:'#3a1030', bg2:'#1a0515',
      radius:'100px 22px 100px 22px', ranges:[[3,5],[3,10],[10,15],[10,25]],
      menuIcon: '💐'
    },
    reunification: {
      name:'30/4', badge:'30/4', icon:'⭐', loc:'🇻🇳', ann:'⭐',
      border:'rgba(218,37,29,.85)', borderSoft:'rgba(218,37,29,.30)',
      glow:'rgba(218,37,29,.35)', accent:'#FFD700', accent2:'#FFECB3',
      bg1:'#2a0505', bg2:'#0a0202',
      radius:'2px 40px 2px 40px', ranges:[[4,28],[5,3]],
      menuIcon: '⭐'
    },
    children: {
      name:'Tết Thiếu Nhi', badge:'1/6', icon:'🎈', loc:'🎉', ann:'🎈',
      border:'rgba(78,205,196,.80)', borderSoft:'rgba(78,205,196,.28)',
      glow:'rgba(78,205,196,.32)', accent:'#FFD1DC', accent2:'#B5EAD7',
      bg1:'#0e1e3a', bg2:'#050a1a',
      radius:'50% 50% 50% 50% / 60% 60% 40% 40%', ranges:[[5,25],[6,5]],
      menuIcon: '🎈'
    },
    nationalday: {
      name:'Quốc Khánh', badge:'2/9', icon:'⭐', loc:'🇻🇳', ann:'⭐',
      border:'rgba(218,37,29,.85)', borderSoft:'rgba(218,37,29,.30)',
      glow:'rgba(255,215,0,.32)', accent:'#FFD700', accent2:'#FFF4B0',
      bg1:'#2a0505', bg2:'#0a0202',
      radius:'2px 40px 2px 40px', ranges:[[8,30],[9,3]],
      menuIcon: '🎆'
    },
    midautumn: {
      name:'Trung Thu', badge:'TRUNG THU', icon:'🏮', loc:'🌕', ann:'🏮',
      border:'rgba(240,192,96,.80)', borderSoft:'rgba(240,192,96,.28)',
      glow:'rgba(240,192,96,.32)', accent:'#FFE8A0', accent2:'#FFD1DC',
      bg1:'#2a0e2a', bg2:'#0a0310',
      radius:'70px 70px 22px 22px', ranges:[[9,10],[10,5]],
      menuIcon: '🏮'
    },
    halloween: {
      name:'Halloween', badge:'HALLOWEEN', icon:'🎃', loc:'🦇', ann:'🎃',
      border:'rgba(255,149,0,.80)', borderSoft:'rgba(255,149,0,.28)',
      glow:'rgba(255,149,0,.32)', accent:'#FFB84D', accent2:'#B388FF',
      bg1:'#1a0a2a', bg2:'#050108',
      radius:'60px 60px 60px 60px / 80px 80px 40px 40px', ranges:[[10,25],[11,1]],
      menuIcon: '🎃'
    },
    christmas: {
      name:'Giáng Sinh', badge:'NOEL', icon:'🎄', loc:'🎁', ann:'🎄',
      border:'rgba(196,30,58,.85)', borderSoft:'rgba(196,30,58,.30)',
      glow:'rgba(10,125,61,.35)', accent:'#FFE8A0', accent2:'#B8E8C8',
      bg1:'#0a1a2e', bg2:'#050a14',
      radius:'8px 8px 80px 80px / 8px 8px 60px 60px', ranges:[[12,15],[12,26]],
      menuIcon: '🎄'
    },
    newyear: {
      name:'Tết Dương', badge:'NEW YEAR', icon:'🎊', loc:'🎆', ann:'🎊',
      border:'rgba(255,215,0,.85)', borderSoft:'rgba(255,215,0,.30)',
      glow:'rgba(139,0,255,.35)', accent:'#FFD700', accent2:'#E0B0FF',
      bg1:'#1a0a3a', bg2:'#050110',
      radius:'60px', ranges:[[12,29],[1,2]],
      menuIcon: '🎊'
    },
    spring: {
      name:'Mùa Xuân', badge:'SPRING', icon:'🌸', loc:'🦋', ann:'🌸',
      border:'rgba(255,182,193,.80)', borderSoft:'rgba(255,182,193,.28)',
      glow:'rgba(255,182,193,.32)', accent:'#FFD1DC', accent2:'#B5EAD7',
      bg1:'#1a2a1a', bg2:'#0a140a',
      radius:'70px 70px 22px 22px', months:[3,4,5],
      menuIcon: '🌸'
    },
    summer: {
      name:'Mùa Hè', badge:'SUMMER', icon:'☀️', loc:'🌴', ann:'☀️',
      border:'rgba(255,176,0,.80)', borderSoft:'rgba(255,176,0,.28)',
      glow:'rgba(255,176,0,.32)', accent:'#FFE58F', accent2:'#A0E8E0',
      bg1:'#0a1a3a', bg2:'#030814',
      radius:'22px 22px 50% 50% / 22px 22px 60% 60%', months:[6,7,8],
      menuIcon: '☀️'
    },
    autumn: {
      name:'Mùa Thu', badge:'AUTUMN', icon:'🍁', loc:'🍂', ann:'🍁',
      border:'rgba(210,105,30,.80)', borderSoft:'rgba(210,105,30,.28)',
      glow:'rgba(210,105,30,.32)', accent:'#FFD1A0', accent2:'#FFB87A',
      bg1:'#2a1505', bg2:'#0a0502',
      radius:'22px 100px 22px 100px', months:[9,10,11],
      menuIcon: '🍁'
    },
    winter: {
      name:'Mùa Đông', badge:'WINTER', icon:'❄️', loc:'⛄', ann:'❄️',
      border:'rgba(184,216,240,.80)', borderSoft:'rgba(184,216,240,.28)',
      glow:'rgba(184,216,240,.32)', accent:'#E0F0FF', accent2:'#B8D8F0',
      bg1:'#0a1428', bg2:'#03060f',
      radius:'60px 6px 60px 6px', months:[12,1,2],
      menuIcon: '❄️'
    }
  };

  /* ============================================================
     BIG ICON CONFIG
     ============================================================ */
  var BIG_ICONS = {
    default:        { e:'🐬', aE:'bgi-float',     dE:'6s',   oE:0.55, aura:'rgba(111,195,191,.55)', aA:'aura-soft',     dA:'4s'   },
    tet:            { e:'🧧', aE:'bgi-swing',     dE:'4s',   oE:0.72, aura:'rgba(255,107,53,.55)',  aA:'aura-warm',     dA:'3s'   },
    valentine:      { e:'💖', aE:'bgi-beat',      dE:'1.8s', oE:0.75, aura:'rgba(255,77,109,.60)',  aA:'aura-heart',    dA:'1.8s' },
    womenday:       { e:'💐', aE:'bgi-bloom',     dE:'3.2s', oE:0.72, aura:'rgba(217,70,166,.55)',  aA:'aura-bloom',    dA:'3.2s' },
    reunification:  { e:'🇻🇳', aE:'bgi-wave',      dE:'3s',   oE:0.68, aura:'rgba(218,37,29,.55)',   aA:'aura-flag',     dA:'3s'   },
    children:       { e:'🎈', aE:'bgi-float',     dE:'3.6s', oE:0.72, aura:'rgba(78,205,196,.55)',  aA:'aura-soft',     dA:'3s'   },
    nationalday:    { e:'🇻🇳', aE:'bgi-wave',      dE:'3s',   oE:0.68, aura:'rgba(255,215,0,.55)',   aA:'aura-flag',     dA:'3s'   },
    midautumn:      { e:'🏮', aE:'bgi-swing',     dE:'3.2s', oE:0.75, aura:'rgba(240,192,96,.60)',  aA:'aura-warm',     dA:'3s'   },
    halloween:      { e:'👻', aE:'bgi-flicker',   dE:'3s',   oE:0.80, aura:'rgba(255,149,0,.55)',   aA:'aura-ghost',    dA:'3s'   },
    christmas:      { e:'🎄', aE:'bgi-glow',      dE:'3s',   oE:0.72, aura:'rgba(10,125,61,.60)',   aA:'aura-soft',     dA:'2.4s' },
    newyear:        { e:'🎆', aE:'bgi-pulse',     dE:'2s',   oE:0.78, aura:'rgba(139,0,255,.60)',   aA:'aura-firework', dA:'2s'   },
    spring:         { e:'🌸', aE:'bgi-sway',      dE:'4.5s', oE:0.70, aura:'rgba(255,182,193,.55)', aA:'aura-bloom',    dA:'3.5s' },
    summer:         { e:'☀️', aE:'bgi-rotate',    dE:'28s',  oE:0.72, aura:'rgba(255,176,0,.60)',   aA:'aura-sun',      dA:'4s'   },
    autumn:         { e:'🍁', aE:'bgi-fall-sway', dE:'5s',   oE:0.72, aura:'rgba(210,105,30,.55)',  aA:'aura-warm',     dA:'3.2s' },
    winter:         { e:'❄️', aE:'bgi-rotate',    dE:'22s',  oE:0.70, aura:'rgba(184,216,240,.60)', aA:'aura-frost',    dA:'3s'   }
  };

  /* ============================================================
     FIREWORK CONFIG
     ============================================================ */
  var FIREWORKS = [
    { x: '18%', y: '26%', c: '#FFD700', delay: '0s'   },
    { x: '78%', y: '22%', c: '#FF6B9D', delay: '0.7s' },
    { x: '42%', y: '18%', c: '#4ECDC4', delay: '1.4s' },
    { x: '88%', y: '35%', c: '#B388FF', delay: '2.1s' },
    { x: '12%', y: '38%', c: '#FF6B35', delay: '2.8s' },
    { x: '60%', y: '30%', c: '#22C55E', delay: '3.5s' }
  ];

  function generateFireworksHTML(){
    return FIREWORKS.map(function(fw){
      return '<div class="fw" style="--x:' + fw.x + ';--y:' + fw.y + ';--c:' + fw.c + ';--delay:' + fw.delay + ';">' +
        '<div class="fw-rocket"></div>' +
        '<div class="fw-burst"></div>' +
        '</div>';
    }).join('');
  }

  var state = { currentTheme:'default', unsubscribe:null, app:null, urlParam:null };

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
    for (var i=0;i<ranges.length;i++){
      var r = ranges[i];
      var s = r[0][0]*100 + r[0][1];
      var e = r[1][0]*100 + r[1][1];
      var c = m*100 + d;
      if (e < s){ if (c >= s || c <= e) return true; }
      else { if (c >= s && c <= e) return true; }
    }
    return false;
  }
  function detectThemeByDate(){
    var vn = getVNDate();
    var order = ['tet','valentine','womenday','reunification','children',
                 'nationalday','midautumn','halloween','christmas','newyear'];
    for (var i=0;i<order.length;i++)
      if (isInRange(vn.month, vn.day, THEMES[order[i]].ranges)) return order[i];
    var season = ['spring','summer','autumn','winter'];
    for (var j=0;j<season.length;j++){
      var k = season[j];
      if (THEMES[k].months && THEMES[k].months.indexOf(vn.month) >= 0) return k;
    }
    return 'default';
  }

  /* ============================================================
     INJECT STYLES — 4 PHẦN
     1. BASE (variables + landing)
     2. BIG ICON
     3. DEEP APP LV1 (border radius + card bàn)
     4. DEEP APP LV2 (mọi element còn lại) ← MỚI
     ============================================================ */
  function injectStyles(){
    if (document.getElementById('theme-styles')) return;
    var s = document.createElement('style');
    s.id = 'theme-styles';

    var css = [];

    /* ═══════════════════════════════════════════════════════════
       PHẦN 1: BASE
       ═══════════════════════════════════════════════════════════ */
    css.push(
      ':root{',
      '  --theme-border: rgba(244,184,66,.55);',
      '  --theme-border-soft: rgba(244,184,66,.25);',
      '  --theme-glow: rgba(244,184,66,.30);',
      '  --theme-accent: #FBD77A;',
      '  --theme-accent2: #bfe9dc;',
      '  --theme-bg1: #0f3d38;',
      '  --theme-bg2: #0a2b28;',
      '  --theme-radius: 22px;',
      '  --theme-trans: 1s ease;',
      '}',
      'html{ background-color:#0a2b28; }',
      'body{',
      '  background: linear-gradient(160deg, var(--theme-bg1) 0%, var(--theme-bg2) 100%) !important;',
      '  transition: background var(--theme-trans) !important;',
      '}',
      '#landing{ background: transparent !important; }'
    );

    /* ═══════════════════════════════════════════════════════════
       PHẦN 2: BIG ICON
       ═══════════════════════════════════════════════════════════ */
    css.push(
      '#themeBigIcon{ position:fixed; top:0; left:0; pointer-events:none; z-index:1; opacity:0; transition:opacity 1.4s ease; }',
      '#themeBigIcon.show{ opacity:1; }',
      '#themeBigIcon .tbi-aura{ position:absolute; top:50%; left:50%; border-radius:50%; pointer-events:none; }',
      '#themeBigIcon .tbi-emoji{ position:absolute; top:50%; left:50%; font-family:"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif; line-height:1; text-align:center; user-select:none; -webkit-user-select:none; -webkit-font-smoothing:antialiased; transform-origin:center; }',
      '#themeBigIcon .tbi-emoji.flag > .tbi-e-inner{ display:inline-block; transform:scaleY(0.72); transform-origin:center; }',
      '#themeBigIcon .tbi-fireworks{ position:absolute; top:0; left:0; width:100%; height:100%; pointer-events:none; display:none; }',
      '#themeBigIcon .tbi-fireworks.active{ display:block; }',
      '#themeBigIcon .fw{ position:absolute; left:var(--x); top:var(--y); width:0; height:0; pointer-events:none; }',
      '#themeBigIcon .fw-rocket{ position:absolute; left:-3px; top:-3px; width:6px; height:6px; border-radius:50%; background:var(--c); box-shadow:0 0 8px var(--c),0 0 16px var(--c),0 0 24px var(--c),0 0 40px var(--c); animation:fw-launch 4s cubic-bezier(.3,.05,.5,1) infinite; animation-delay:var(--delay); opacity:0; }',
      '#themeBigIcon .fw-rocket::before{ content:""; position:absolute; left:50%; top:4px; width:3px; height:56px; margin-left:-1.5px; border-radius:3px; background:linear-gradient(to bottom,var(--c) 0%,rgba(255,255,255,.6) 20%,transparent 100%); opacity:.7; }',
      '#themeBigIcon .fw-burst{ position:absolute; left:-4px; top:-4px; width:8px; height:8px; border-radius:50%; background:var(--c); box-shadow:0 -110px var(--c),78px -78px var(--c),110px 0 var(--c),78px 78px var(--c),0 110px var(--c),-78px 78px var(--c),-110px 0 var(--c),-78px -78px var(--c),33px -79px var(--c),79px -33px var(--c),79px 33px var(--c),33px 79px var(--c),-33px 79px var(--c),-79px 33px var(--c),-79px -33px var(--c),-33px -79px var(--c),0 -55px var(--c),39px -39px var(--c),55px 0 var(--c),39px 39px var(--c),0 55px var(--c),-39px 39px var(--c),-55px 0 var(--c),-39px -39px var(--c); animation:fw-explode 4s ease-out infinite; animation-delay:var(--delay); opacity:0; transform-origin:center; }',
      '#themeBigIcon .fw-burst::before{ content:""; position:absolute; left:-22px; top:-22px; width:44px; height:44px; border-radius:50%; background:radial-gradient(circle at center,#FFFFFF 0%,#FFFFFF 20%,var(--c) 45%,transparent 75%); animation:fw-flash 4s ease-out infinite; animation-delay:var(--delay); opacity:0; }',
      '@keyframes fw-launch{ 0%{ transform:translateY(var(--launch-y,800px)) scale(.6); opacity:0; } 4%{ opacity:1; } 22%{ transform:translateY(0) scale(1); opacity:1; } 24%{ opacity:0; transform:translateY(0) scale(1.3); } 100%{ opacity:0; transform:translateY(0) scale(1.3); } }',
      '@keyframes fw-explode{ 0%,24%{ transform:scale(0); opacity:0; } 25%{ transform:scale(.18); opacity:1; } 32%{ transform:scale(.55); opacity:1; } 48%{ transform:scale(.95); opacity:1; } 68%{ transform:scale(1.25); opacity:.6; } 85%{ transform:scale(1.45); opacity:.15; } 95%,100%{ transform:scale(1.55); opacity:0; } }',
      '@keyframes fw-flash{ 0%,24%{ transform:scale(.3); opacity:0; } 25%{ transform:scale(.8); opacity:1; } 32%{ transform:scale(1.15); opacity:.9; } 42%{ transform:scale(1.4); opacity:0; } 100%{ transform:scale(1.4); opacity:0; } }',
      '@media (prefers-reduced-motion: reduce){ #themeBigIcon .fw-rocket,#themeBigIcon .fw-burst,#themeBigIcon .fw-burst::before{ animation:none !important; } }',

      '@keyframes aura-soft{ 0%,100%{ opacity:.5; } 50%{ opacity:.8; } }',
      '@keyframes aura-warm{ 0%,100%{ opacity:.55; } 50%{ opacity:.9; } }',
      '@keyframes aura-heart{ 0%,100%{ opacity:.6; } 12%{ opacity:.95; } 24%{ opacity:.6; } 36%{ opacity:.85; } 48%{ opacity:.6; } }',
      '@keyframes aura-bloom{ 0%,100%{ opacity:.55; } 50%{ opacity:.85; } }',
      '@keyframes aura-flag{ 0%,100%{ opacity:.7; } 25%{ opacity:.85; } 75%{ opacity:.85; } }',
      '@keyframes aura-ghost{ 0%,100%{ opacity:.75; } 25%{ opacity:.45; } 50%{ opacity:.85; } 75%{ opacity:.5; } }',
      '@keyframes aura-firework{ 0%,100%{ opacity:.5; } 50%{ opacity:.85; } }',
      '@keyframes aura-sun{ 0%,100%{ opacity:.55; } 50%{ opacity:.85; } }',
      '@keyframes aura-frost{ 0%,100%{ opacity:.5; } 50%{ opacity:.85; } }',
      '@keyframes bgi-float{ 0%,100%{ transform:translateY(0) rotate(-2deg); } 50%{ transform:translateY(-36px) rotate(2deg); } }',
      '@keyframes bgi-swing{ 0%,100%{ transform:rotate(-9deg); } 50%{ transform:rotate(9deg); } }',
      '@keyframes bgi-beat{ 0%,100%{ transform:scale(1); } 12%{ transform:scale(1.14); } 24%{ transform:scale(1); } 36%{ transform:scale(1.1); } 48%{ transform:scale(1); } }',
      '@keyframes bgi-bloom{ 0%{ transform:rotate(-12deg) scale(1); } 50%{ transform:rotate(12deg) scale(1.1); } 100%{ transform:rotate(-12deg) scale(1); } }',
      '@keyframes bgi-glow{ 0%,100%{ opacity:.7; } 50%{ opacity:1; } }',
      '@keyframes bgi-wave{ 0%,100%{ transform:skewY(0deg); } 25%{ transform:skewY(4deg); } 75%{ transform:skewY(-4deg); } }',
      '@keyframes bgi-flicker{ 0%,100%{ opacity:.85; transform:translateY(0) scale(1); } 8%{ opacity:.35; transform:translateY(-10px) scale(1.02); } 16%{ opacity:1; transform:translateY(0) scale(1); } 28%{ opacity:.5; transform:translateY(-6px) scale(1.01); } 36%{ opacity:1; transform:translateY(0) scale(1.03); } 48%{ opacity:.4; transform:translateY(-14px) scale(1.02); } 60%{ opacity:.95; transform:translateY(0) scale(1); } 72%{ opacity:.55; transform:translateY(-8px) scale(1.01); } 84%{ opacity:1; transform:translateY(0) scale(1.02); } 92%{ opacity:.7; transform:translateY(-4px) scale(1); } }',
      '@keyframes bgi-pulse{ 0%,100%{ transform:scale(.92); opacity:.65; } 50%{ transform:scale(1.18); opacity:1; } }',
      '@keyframes bgi-sway{ 0%,100%{ transform:rotate(-14deg) translateX(-18px); } 50%{ transform:rotate(14deg) translateX(18px); } }',
      '@keyframes bgi-rotate{ 0%{ transform:rotate(0deg); } 100%{ transform:rotate(360deg); } }',
      '@keyframes bgi-fall-sway{ 0%{ transform:translateY(-22vh) rotate(-15deg) translateX(-20px); opacity:.5; } 50%{ opacity:1; transform:translateY(0) rotate(0deg) translateX(20px); } 100%{ transform:translateY(22vh) rotate(15deg) translateX(-20px); opacity:.5; } }',
      'body.btdebug #themeBigIcon{ background:rgba(255,0,0,.15); border:2px dashed #FF0000; }',
      'body.btdebug #themeBigIcon .tbi-aura{ background:rgba(255,255,0,.2)!important; border:2px solid #FFFF00; }',
      'body.btdebug #themeBigIcon .tbi-emoji{ background:rgba(0,255,0,.15); border:2px solid #00FF00; }'
    );

    /* ═══════════════════════════════════════════════════════════
       LANDING ELEMENTS
       ═══════════════════════════════════════════════════════════ */
    css.push(
      '#halongClock{ border-color:var(--theme-border) !important; box-shadow:0 8px 32px rgba(0,0,0,.5),0 0 40px var(--theme-glow),inset 0 0 30px var(--theme-glow) !important; transition:border-color var(--theme-trans),box-shadow var(--theme-trans) !important; }',
      '#halongClock .hclock-time{ color:var(--theme-accent) !important; text-shadow:0 0 12px var(--theme-glow),0 0 24px var(--theme-glow) !important; transition:color var(--theme-trans) !important; }',
      '#halongClock .hclock-loc-text{ color:var(--theme-accent) !important; text-shadow:0 0 8px var(--theme-glow) !important; transition:color var(--theme-trans) !important; }',
      '#halongClock .hclock-date, #halongClock .hclock-s{ color:var(--theme-accent2) !important; transition:color var(--theme-trans) !important; }',
      '#halongClock .hclock-loc{ border-left-color:var(--theme-border) !important; transition:border-color var(--theme-trans) !important; }',
      '.area-card{ border-color:var(--theme-border-soft) !important; transition:border-color var(--theme-trans), transform .45s cubic-bezier(.16,1,.3,1), box-shadow .45s ease, border-radius .7s cubic-bezier(.16,1,.3,1) !important; }',
      '.area-card:hover{ border-color:var(--theme-border) !important; box-shadow:0 28px 56px -16px rgba(0,0,0,.7),0 0 40px -8px var(--theme-glow),inset 0 0 30px var(--theme-glow) !important; }',
      '.area-card::before{ background:linear-gradient(135deg,var(--theme-border),transparent 45%,var(--theme-border-soft)) !important; transition:opacity .4s,background var(--theme-trans) !important; }',
      '.area-card:hover .area-title-en{ color:var(--theme-accent) !important; text-shadow:0 0 20px var(--theme-glow) !important; }',
      '.area-title-vi{ color:var(--theme-accent2) !important; transition:color var(--theme-trans) !important; }',
      '.area-badge{ background:linear-gradient(135deg,var(--theme-accent),var(--theme-accent2)) !important; transition:background var(--theme-trans) !important; }',
      '#announcementBar{ border-color:var(--theme-border) !important; box-shadow:0 6px 28px var(--theme-glow),inset 0 0 30px var(--theme-glow) !important; transition:border-color var(--theme-trans),box-shadow var(--theme-trans) !important; }',
      '.announcement-text{ color:var(--theme-accent) !important; transition:color var(--theme-trans) !important; }',
      '.welcome-lbl .wlc-vi{ color:var(--theme-accent) !important; transition:color var(--theme-trans); }',
      '.welcome-lbl .wlc-en{ color:var(--theme-accent2) !important; transition:color var(--theme-trans); }',
      '#themeBadge{ position:fixed;top:8px;left:8px;z-index:9998; display:flex;align-items:center;gap:6px; padding:6px 12px; background:rgba(10,31,29,.9); border:1px solid var(--theme-border); border-radius:999px; font-size:11px;font-weight:900; color:var(--theme-accent); font-family:Nunito,sans-serif; backdrop-filter:blur(10px); -webkit-backdrop-filter:blur(10px); pointer-events:none;opacity:0; transition:opacity .5s,border-color var(--theme-trans),color var(--theme-trans); }',
      '#themeBadge.show{ opacity:1; }',
      '#themeBadge .tb-icon{ font-size:14px; }',
      'body.app-mode #themeBadge{ display:none !important; }',
      '@media(max-width:768px){ #themeBadge{ font-size:9.5px;padding:4px 9px;top:6px;left:6px; } #themeBadge .tb-icon{ font-size:12px; } }',
      '@supports (-webkit-touch-callout: none){ html{ height:-webkit-fill-available; } body{ min-height:-webkit-fill-available; } }'
    );

    /* ═══════════════════════════════════════════════════════════
       DEEP APP LV1 — GIỮ TỪ v7.0
       ═══════════════════════════════════════════════════════════ */
    css.push(
      'body[data-theme]:not([data-theme="default"]) .glass-card,',
      'body[data-theme]:not([data-theme="default"]) .menu-card,',
      'body[data-theme]:not([data-theme="default"]) .order-card,',
      'body[data-theme]:not([data-theme="default"]) .order-slot,',
      'body[data-theme]:not([data-theme="default"]) .order-item,',
      'body[data-theme]:not([data-theme="default"]) .modal-content,',
      'body[data-theme]:not([data-theme="default"]) .app-header{',
      '  border-radius:var(--theme-radius) !important;',
      '  transition:border-color var(--theme-trans), box-shadow var(--theme-trans), background var(--theme-trans), border-radius .9s cubic-bezier(.16,1,.3,1) !important;',
      '}',
      'body[data-theme]:not([data-theme="default"]) #bungalow-track-b2 > div,',
      'body[data-theme]:not([data-theme="default"]) #bungalow-track-b3 > div,',
      'body[data-theme]:not([data-theme="default"]) #bungalow-track-b4 > div,',
      'body[data-theme]:not([data-theme="default"]) #reception-tables-j > button,',
      'body[data-theme]:not([data-theme="default"]) #reception-tables-q > button,',
      'body[data-theme]:not([data-theme="default"]) #reception-tables-lounge > button{',
      '  position:relative; overflow:hidden;',
      '  transition:border-color 1s ease, box-shadow .35s ease, transform .25s cubic-bezier(.16,1,.3,1) !important;',
      '}',
      'body[data-theme]:not([data-theme="default"]) #bungalow-track-b2 > div::before,',
      'body[data-theme]:not([data-theme="default"]) #bungalow-track-b3 > div::before,',
      'body[data-theme]:not([data-theme="default"]) #bungalow-track-b4 > div::before{',
      '  content:""; position:absolute; inset:0; border-radius:inherit;',
      '  border:1.5px solid var(--theme-border); opacity:.18;',
      '  pointer-events:none; transition:opacity .4s ease; z-index:1;',
      '}',
      'body[data-theme]:not([data-theme="default"]) #bungalow-track-b2 > div:hover::before,',
      'body[data-theme]:not([data-theme="default"]) #bungalow-track-b3 > div:hover::before,',
      'body[data-theme]:not([data-theme="default"]) #bungalow-track-b4 > div:hover::before{ opacity:.65; }',
      'body[data-theme]:not([data-theme="default"]) #bungalow-track-b2 > div:hover,',
      'body[data-theme]:not([data-theme="default"]) #bungalow-track-b3 > div:hover,',
      'body[data-theme]:not([data-theme="default"]) #bungalow-track-b4 > div:hover{',
      '  transform:translateY(-2px);',
      '  box-shadow:0 0 22px var(--theme-glow), 0 10px 24px -8px rgba(0,0,0,.5) !important;',
      '}',
      'body[data-theme]:not([data-theme="default"]) .menu-card{ position:relative; overflow:hidden; }',
      'body[data-theme]:not([data-theme="default"]) .menu-card::before{',
      '  content:""; position:absolute; inset:0; border-radius:inherit;',
      '  border:1.5px solid var(--theme-border); opacity:.18;',
      '  pointer-events:none; transition:opacity .4s ease; z-index:1;',
      '}',
      'body[data-theme]:not([data-theme="default"]) .menu-card:hover::before{ opacity:.6; }',
      'body[data-theme]:not([data-theme="default"]) .menu-card:hover{',
      '  box-shadow:0 0 30px var(--theme-glow), 0 15px 40px -12px rgba(0,0,0,.6) !important;',
      '  transform:translateY(-3px);',
      '}',
      'body[data-theme]:not([data-theme="default"]) .order-card{ position:relative; overflow:hidden; }',
      'body[data-theme]:not([data-theme="default"]) .order-card::before{',
      '  content:""; position:absolute; inset:0; border-radius:inherit;',
      '  border:1px solid var(--theme-border); opacity:.22;',
      '  pointer-events:none; z-index:1;',
      '}',
      'body[data-theme]:not([data-theme="default"]) .app-header,',
      'body[data-theme]:not([data-theme="default"]) .cust-header{',
      '  border-bottom-color:var(--theme-border) !important;',
      '  box-shadow:0 4px 24px var(--theme-glow) !important;',
      '}',
      'body[data-theme]:not([data-theme="default"]) #reception-tables-j > button:hover,',
      'body[data-theme]:not([data-theme="default"]) #reception-tables-q > button:hover,',
      'body[data-theme]:not([data-theme="default"]) #reception-tables-lounge > button:hover{',
      '  box-shadow:0 0 20px var(--theme-glow), 0 8px 16px -6px rgba(0,0,0,.5) !important;',
      '  transform:translateY(-2px) scale(1.02);',
      '}'
    );

    /* ═══════════════════════════════════════════════════════════
       ██████ DEEP APP LV2 — MỚI ██████
       Mọi element còn lại: button, chip, input, skeleton, etc.
       ═══════════════════════════════════════════════════════════ */

    /* ───── A. NÚT SELECT trong menu card ───── */
    css.push(
      'body[data-theme]:not([data-theme="default"]) .btn-select{',
      '  position:relative;',
      '  border:1.5px solid var(--theme-border) !important;',
      '  box-shadow:0 0 12px var(--theme-glow), 0 4px 12px rgba(0,0,0,.25) !important;',
      '  animation:selectPulse 2.4s ease-in-out infinite;',
      '  transition:transform .2s, box-shadow .3s !important;',
      '}',
      'body[data-theme]:not([data-theme="default"]) .btn-select:hover{',
      '  transform:scale(1.06);',
      '  box-shadow:0 0 24px var(--theme-glow), 0 6px 20px rgba(0,0,0,.35) !important;',
      '}',
      '@keyframes selectPulse{',
      '  0%,100%{ box-shadow:0 0 12px var(--theme-glow), 0 4px 12px rgba(0,0,0,.25); }',
      '  50%    { box-shadow:0 0 22px var(--theme-glow), 0 4px 16px rgba(0,0,0,.35); }',
      '}'
    );

    /* ───── B. QTY CONTROL (➕➖) ───── */
    css.push(
      'body[data-theme]:not([data-theme="default"]) .qty-control{',
      '  border-color:var(--theme-border) !important;',
      '  box-shadow:0 0 12px var(--theme-glow) !important;',
      '  transition:box-shadow .3s ease, border-color .3s ease !important;',
      '}',
      'body[data-theme]:not([data-theme="default"]) .qty-control:hover{',
      '  box-shadow:0 0 20px var(--theme-glow) !important;',
      '}',
      'body[data-theme]:not([data-theme="default"]) .qty-control .qty-num{',
      '  color:var(--theme-accent) !important;',
      '  text-shadow:0 0 8px var(--theme-glow);',
      '}',
      'body[data-theme]:not([data-theme="default"]) .qty-control button:hover{',
      '  color:var(--theme-accent) !important;',
      '  background:rgba(255,255,255,.06);',
      '}'
    );

    /* ───── C. MENU CARD — thêm gradient overlay khi selected ───── */
    css.push(
      'body[data-theme]:not([data-theme="default"]) .menu-card h3{',
      '  transition:color .3s ease, text-shadow .3s ease !important;',
      '}',
      'body[data-theme]:not([data-theme="default"]) .menu-card:hover h3{',
      '  color:var(--theme-accent) !important;',
      '  text-shadow:0 0 12px var(--theme-glow);',
      '}'
    );

    /* ───── D. STATUS CHIPS ───── */
    css.push(
      'body[data-theme]:not([data-theme="default"]) .state-pending{',
      '  border-color:var(--theme-border) !important;',
      '  background:rgba(244,184,66,.10) !important;',
      '}',
      'body[data-theme]:not([data-theme="default"]) .state-ready{',
      '  box-shadow:0 0 8px var(--theme-glow);',
      '}'
    );

    /* ───── E. SEARCH INPUT ───── */
    css.push(
      'body[data-theme]:not([data-theme="default"]) .search-input,',
      'body[data-theme]:not([data-theme="default"]) input[type="text"]:focus,',
      'body[data-theme]:not([data-theme="default"]) input[type="number"]:focus,',
      'body[data-theme]:not([data-theme="default"]) textarea:focus,',
      'body[data-theme]:not([data-theme="default"]) select:focus{',
      '  border-color:var(--theme-border) !important;',
      '  box-shadow:0 0 0 2px var(--theme-glow), 0 0 16px var(--theme-glow) !important;',
      '  outline:none !important;',
      '}'
    );

    /* ───── F. CATEGORY BUTTON active ───── */
    css.push(
      'body[data-theme]:not([data-theme="default"]) .cat-btn:hover{',
      '  border-color:var(--theme-border) !important;',
      '  box-shadow:0 0 12px var(--theme-glow);',
      '}'
    );

    /* ───── G. TABLE DISPLAY (header) ───── */
    css.push(
      'body[data-theme]:not([data-theme="default"]) .table-display-box{',
      '  border-color:var(--theme-border) !important;',
      '  box-shadow:0 0 14px var(--theme-glow), inset 0 0 10px var(--theme-glow) !important;',
      '}',
      'body[data-theme]:not([data-theme="default"]) #current-table-display{',
      '  color:var(--theme-accent) !important;',
      '  text-shadow:0 0 10px var(--theme-glow);',
      '}'
    );

    /* ───── H. EMPTY STATE ───── */
    css.push(
      'body[data-theme]:not([data-theme="default"]) .empty-state h4{',
      '  color:var(--theme-accent) !important;',
      '  text-shadow:0 0 10px var(--theme-glow);',
      '}',
      'body[data-theme]:not([data-theme="default"]) .empty-state p{',
      '  color:var(--theme-accent2) !important;',
      '}'
    );

    /* ───── I. SKELETON loading ───── */
    css.push(
      'body[data-theme]:not([data-theme="default"]) .skeleton{',
      '  background:linear-gradient(90deg,',
      '    rgba(255,255,255,.04) 25%,',
      '    var(--theme-border-soft) 50%,',
      '    rgba(255,255,255,.04) 75%) !important;',
      '  background-size:200% 100% !important;',
      '}'
    );

    /* ───── J. HEARTBEAT ring ───── */
    css.push(
      'body[data-theme]:not([data-theme="default"]) #hb-progress{',
      '  stroke:var(--theme-accent) !important;',
      '  filter:drop-shadow(0 0 4px var(--theme-glow));',
      '}',
      'body[data-theme]:not([data-theme="default"]) #heartbeat-count{',
      '  color:var(--theme-accent) !important;',
      '  text-shadow:0 0 10px var(--theme-glow);',
      '}'
    );

    /* ───── K. PEAK alert + CALL cards ───── */
    css.push(
      'body[data-theme]:not([data-theme="default"]) #peak-alert{',
      '  background:var(--theme-accent) !important;',
      '  color:#0a2b28 !important;',
      '  box-shadow:0 0 20px var(--theme-glow) !important;',
      '}',
      'body[data-theme]:not([data-theme="default"]) #staff-calls-grid > div,',
      'body[data-theme]:not([data-theme="default"]) #bungalow-calls-grid > div{',
      '  border-color:var(--theme-border) !important;',
      '  box-shadow:0 0 12px var(--theme-glow), inset 0 0 10px rgba(0,0,0,.2) !important;',
      '  animation:callPulseTheme 2s ease-in-out infinite;',
      '}',
      '@keyframes callPulseTheme{',
      '  0%,100%{ box-shadow:0 0 12px var(--theme-glow), inset 0 0 10px rgba(0,0,0,.2); }',
      '  50%    { box-shadow:0 0 24px var(--theme-glow), inset 0 0 10px rgba(0,0,0,.2); }',
      '}'
    );

    /* ───── L. TIMELINE order slot (Bungalow) ───── */
    css.push(
      'body[data-theme]:not([data-theme="default"]) .order-slot{',
      '  border-left-color:var(--theme-accent) !important;',
      '  border-top-color:var(--theme-border-soft) !important;',
      '  border-right-color:var(--theme-border-soft) !important;',
      '  border-bottom-color:var(--theme-border-soft) !important;',
      '}',
      'body[data-theme]:not([data-theme="default"]) .order-slot.done{',
      '  border-left-color:#6ee7b7 !important;',
      '}',
      'body[data-theme]:not([data-theme="default"]) .order-slot.prep{',
      '  border-left-color:#fb7185 !important;',
      '}'
    );

    /* ───── M. PAYMENT CHIPS trong card bàn ───── */
    css.push(
      'body[data-theme]:not([data-theme="default"]) #bungalow-track-b2 .bg-teal-900\\/80,',
      'body[data-theme]:not([data-theme="default"]) #bungalow-track-b3 .bg-teal-900\\/80,',
      'body[data-theme]:not([data-theme="default"]) #bungalow-track-b4 .bg-teal-900\\/80{',
      '  border-color:var(--theme-border) !important;',
      '  color:var(--theme-accent) !important;',
      '}'
    );

    /* ───── N. MODAL header icon ───── */
    css.push(
      'body[data-theme]:not([data-theme="default"]) .modal-header-icon{',
      '  border-color:var(--theme-border) !important;',
      '  box-shadow:0 0 20px var(--theme-glow), inset 0 0 12px var(--theme-glow) !important;',
      '}'
    );

    /* ───── O. CART ITEM ROW (Lounge/Restaurant modal) ───── */
    css.push(
      'body[data-theme]:not([data-theme="default"]) #cart-items-list > div{',
      '  border-color:var(--theme-border-soft) !important;',
      '  transition:border-color .3s ease, box-shadow .3s ease !important;',
      '}',
      'body[data-theme]:not([data-theme="default"]) #cart-items-list > div:hover{',
      '  border-color:var(--theme-border) !important;',
      '  box-shadow:0 0 12px var(--theme-glow);',
      '}'
    );

    /* ───── P. STATS CARDS (Admin) ───── */
    css.push(
      'body[data-theme]:not([data-theme="default"]) #stat-total,',
      'body[data-theme]:not([data-theme="default"]) #stat-done{',
      '  text-shadow:0 0 15px var(--theme-glow);',
      '}',
      'body[data-theme]:not([data-theme="default"]) #stat-pending{',
      '  color:var(--theme-accent) !important;',
      '  text-shadow:0 0 15px var(--theme-glow);',
      '}'
    );

    /* ───── Q. FILTER CHIP ───── */
    css.push(
      'body[data-theme]:not([data-theme="default"]) .filter-chip{',
      '  border-color:var(--theme-border-soft) !important;',
      '  transition:border-color .3s, background .3s !important;',
      '}',
      'body[data-theme]:not([data-theme="default"]) .filter-chip:hover{',
      '  border-color:var(--theme-border) !important;',
      '  background:rgba(255,255,255,.06) !important;',
      '}'
    );

    /* ───── R. TABLE BADGE trong reception ───── */
    css.push(
      'body[data-theme]:not([data-theme="default"]) #reception-tables-j > button,',
      'body[data-theme]:not([data-theme="default"]) #reception-tables-q > button,',
      'body[data-theme]:not([data-theme="default"]) #reception-tables-lounge > button{',
      '  position:relative;',
      '}',
      'body[data-theme]:not([data-theme="default"]) #reception-tables-j > button::before,',
      'body[data-theme]:not([data-theme="default"]) #reception-tables-q > button::before,',
      'body[data-theme]:not([data-theme="default"]) #reception-tables-lounge > button::before{',
      '  content:""; position:absolute; inset:-1px; border-radius:inherit;',
      '  border:1.5px dashed var(--theme-border); opacity:.15;',
      '  pointer-events:none; z-index:0;',
      '}'
    );

    /* ───── S. HEARTBEAT panel border ───── */
    css.push(
      'body[data-theme]:not([data-theme="default"]) #heartbeat-panel{',
      '  border-color:var(--theme-border) !important;',
      '  box-shadow:0 0 20px var(--theme-glow), inset 0 0 12px rgba(0,0,0,.2) !important;',
      '}'
    );

    /* ───── T. QTY BADGE trong order ───── */
    css.push(
      'body[data-theme]:not([data-theme="default"]) .qty-badge{',
      '  background:linear-gradient(135deg,var(--theme-accent),var(--theme-accent2)) !important;',
      '  color:#0a2b28 !important;',
      '  box-shadow:0 0 8px var(--theme-glow);',
      '}'
    );

    /* ───── U. ICON BADGE ───── */
    css.push(
      'body[data-theme]:not([data-theme="default"]) .icon-badge{',
      '  border-color:var(--theme-border) !important;',
      '  background:linear-gradient(135deg,var(--theme-border-soft),transparent) !important;',
      '}'
    );

    /* ───── V. BRAND TITLE (header app con) ───── */
    css.push(
      'body[data-theme]:not([data-theme="default"]) .brand-title{',
      '  filter:drop-shadow(0 2px 10px var(--theme-glow)) !important;',
      '}'
    );

    /* ───── W. FOOD/TABLE icons trong menu card - tint nhẹ ───── */
    css.push(
      'body[data-theme]:not([data-theme="default"]) .area-icon{',
      '  filter:drop-shadow(0 8px 16px rgba(0,0,0,.5)) drop-shadow(0 0 12px var(--theme-glow));',
      '}'
    );

    /* ═══════════════════════════════════════════════════════════
       PER-THEME CORNER DECORATIONS
       ═══════════════════════════════════════════════════════════ */
    var cardCorners = {
      tet:'🧧', valentine:'💕', womenday:'🌹', reunification:'⭐',
      children:'🎈', nationalday:'⭐', midautumn:'🏮', halloween:'🎃',
      christmas:'❄️', newyear:'✨', spring:'🌸', summer:'☀️',
      autumn:'🍁', winter:'❄️'
    };
    var menuCorners = {
      tet:'🌸', valentine:'💖', womenday:'💐', reunification:'🎆',
      children:'🍭', nationalday:'🎆', midautumn:'🥮', halloween:'👻',
      christmas:'🎄', newyear:'🎊', spring:'🌺', summer:'🥥',
      autumn:'🍄', winter:'⛄'
    };

    Object.keys(cardCorners).forEach(function(key){
      css.push(
        'body[data-theme="'+key+'"] #bungalow-track-b2 > div::after,',
        'body[data-theme="'+key+'"] #bungalow-track-b3 > div::after,',
        'body[data-theme="'+key+'"] #bungalow-track-b4 > div::after{',
        '  content:"'+cardCorners[key]+'";',
        '  position:absolute; top:3px; right:4px;',
        '  font-size:12px; opacity:.35;',
        '  pointer-events:none; z-index:2;',
        '  animation:theme-corner-float 3s ease-in-out infinite;',
        '}'
      );
    });
    Object.keys(menuCorners).forEach(function(key){
      css.push(
        'body[data-theme="'+key+'"] .menu-card::after{',
        '  content:"'+menuCorners[key]+'";',
        '  position:absolute; bottom:4px; right:6px;',
        '  font-size:14px; opacity:.22;',
        '  pointer-events:none; z-index:2;',
        '  animation:theme-corner-float 4s ease-in-out infinite;',
        '}'
      );
    });

    css.push(
      '@keyframes theme-corner-float{ 0%,100%{ transform:translateY(0); } 50%{ transform:translateY(-3px); } }',
      '@media (prefers-reduced-motion: reduce){',
      '  body[data-theme] #bungalow-track-b2 > div::after,',
      '  body[data-theme] #bungalow-track-b3 > div::after,',
      '  body[data-theme] #bungalow-track-b4 > div::after,',
      '  body[data-theme] .menu-card::after,',
      '  body[data-theme] .btn-select{ animation:none !important; }',
      '}'
    );

    s.textContent = css.join('\n');
    document.head.appendChild(s);
  }

  /* ============================================================
     MEASURE VIEWPORT
     ============================================================ */
  function measureViewport(){
    var de = document.documentElement;
    var vw = de.clientWidth || window.innerWidth || 0;
    var vh = de.clientHeight || window.innerHeight || 0;
    if (window.visualViewport){
      vw = Math.max(vw, Math.round(window.visualViewport.width) || 0);
      vh = Math.max(vh, Math.round(window.visualViewport.height) || 0);
    }
    if (vw <= 0) vw = 375;
    if (vh <= 0) vh = 667;
    return { w: vw, h: vh, vmin: Math.min(vw, vh) };
  }

  /* ============== BIG ICON ============== */
  function hasLanding(){ return !!document.getElementById('landing'); }
  function ensureBigIcon(){
    if (!hasLanding()) return null;
    var el = document.getElementById('themeBigIcon');
    if (el) return el;
    el = document.createElement('div');
    el.id = 'themeBigIcon';
    el.setAttribute('aria-hidden', 'true');
    el.innerHTML =
      '<div class="tbi-aura" aria-hidden="true"></div>' +
      '<span class="tbi-emoji" aria-hidden="true"></span>' +
      '<div class="tbi-fireworks" aria-hidden="true"></div>';
    document.body.appendChild(el);
    return el;
  }
  function sizeBigIcon(){
    var el = document.getElementById('themeBigIcon');
    if (!el) return;
    var vp = measureViewport();
    el.style.width  = vp.w + 'px';
    el.style.height = vp.h + 'px';
    el.style.top    = '0px';
    el.style.left   = '0px';
    var aura = el.querySelector('.tbi-aura');
    var emoji = el.querySelector('.tbi-emoji');
    if (aura){
      var auraSize = Math.min(vp.vmin * 0.88, 900);
      var auraHalf = auraSize / 2;
      aura.style.width  = auraSize + 'px';
      aura.style.height = auraSize + 'px';
      aura.style.marginTop  = (-auraHalf) + 'px';
      aura.style.marginLeft = (-auraHalf) + 'px';
    }
    if (emoji){
      var isFlag = emoji.classList.contains('flag');
      var baseSize = isFlag ? vp.vmin * 0.66 : vp.vmin * 0.52;
      var emojiSize = Math.min(baseSize, isFlag ? 820 : 620);
      var emojiHalf = emojiSize / 2;
      emoji.style.width  = emojiSize + 'px';
      emoji.style.height = emojiSize + 'px';
      emoji.style.marginTop  = (-emojiHalf) + 'px';
      emoji.style.marginLeft = (-emojiHalf) + 'px';
      emoji.style.fontSize = Math.round(emojiSize * 0.9) + 'px';
      emoji.style.lineHeight = emojiSize + 'px';
    }
    var fw = el.querySelector('.tbi-fireworks');
    if (fw){
      fw.style.width  = vp.w + 'px';
      fw.style.height = vp.h + 'px';
      fw.style.setProperty('--launch-y', Math.round(vp.h * 0.85) + 'px');
    }
  }
  function buildAuraGradient(color){
    var m = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (!m) return color;
    var r = m[1], g = m[2], b = m[3];
    return 'radial-gradient(circle at center,' +
      ' rgba(' + r + ',' + g + ',' + b + ',.75) 0%,' +
      ' rgba(' + r + ',' + g + ',' + b + ',.55) 15%,' +
      ' rgba(' + r + ',' + g + ',' + b + ',.35) 30%,' +
      ' rgba(' + r + ',' + g + ',' + b + ',.18) 45%,' +
      ' rgba(' + r + ',' + g + ',' + b + ',.08) 60%,' +
      ' rgba(' + r + ',' + g + ',' + b + ',0) 75%)';
  }
  function applyBigIcon(themeKey, accentColor){
    var el = ensureBigIcon();
    if (!el) return;
    var cfg = BIG_ICONS[themeKey] || BIG_ICONS.default;
    var aura = el.querySelector('.tbi-aura');
    var emoji = el.querySelector('.tbi-emoji');
    var fw = el.querySelector('.tbi-fireworks');
    if (!aura || !emoji || !fw) return;
    var isNewYear = (themeKey === 'newyear');
    aura.style.background = buildAuraGradient(cfg.aura);
    aura.style.opacity = '.6';
    if (isNewYear){
      emoji.style.display = 'none';
      emoji.style.animation = 'none';
      if (!fw.innerHTML || !fw.querySelector('.fw')) fw.innerHTML = generateFireworksHTML();
      fw.classList.add('active');
    } else {
      emoji.style.display = 'block';
      fw.classList.remove('active');
      var isFlag = (cfg.e === '🇻🇳' || /[\u{1F1E6}-\u{1F1FF}]{2}/u.test(cfg.e));
      if (isFlag){
        emoji.classList.add('flag');
        emoji.innerHTML = '<span class="tbi-e-inner">' + cfg.e + '</span>';
      } else {
        emoji.classList.remove('flag');
        emoji.textContent = cfg.e;
      }
      emoji.style.color = accentColor;
      emoji.style.opacity = cfg.o;
      emoji.style.filter = 'drop-shadow(0 0 60px ' + accentColor + ')';
      emoji.style.webkitFilter = emoji.style.filter;
      emoji.style.animation = 'none';
      void emoji.offsetWidth;
      emoji.style.animation = cfg.aE + ' ' + cfg.dE + ' ease-in-out infinite';
    }
    aura.style.animation = 'none';
    void aura.offsetWidth;
    aura.style.animation = cfg.aA + ' ' + cfg.dA + ' ease-in-out infinite';
    sizeBigIcon();
    el.classList.add('show');
    el.setAttribute('data-bt', themeKey);
  }
  var resizeDebounce = null;
  function handleResize(){
    if (resizeDebounce) clearTimeout(resizeDebounce);
    resizeDebounce = setTimeout(sizeBigIcon, 100);
  }
  window.addEventListener('resize', handleResize);
  window.addEventListener('orientationchange', function(){ setTimeout(handleResize, 300); });
  if (window.visualViewport) window.visualViewport.addEventListener('resize', handleResize);

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
    root.style.setProperty('--theme-radius',      t.radius || '22px');
    root.style.backgroundColor = t.bg2;
    document.body.setAttribute('data-theme', state.currentTheme);
    var ci = document.querySelector('#halongClock .hclock-icon');
    if (ci && t.icon) ci.textContent = t.icon;
    var li = document.querySelector('#halongClock .hclock-loc-icon');
    if (li && t.loc) li.textContent = t.loc;
    var ai = document.querySelector('#announcementBar .announcement-icon');
    if (ai && t.ann) ai.textContent = t.ann;
    document.querySelectorAll('.area-card').forEach(function(card){
      card.style.borderRadius = t.radius || '22px';
    });
    applyBigIcon(state.currentTheme, t.accent);
    try { localStorage.setItem(LS_THEME_KEY, state.currentTheme); } catch(e){}
    try {
      var bc = window.__dolphinThemeBC ||
               (window.__dolphinThemeBC = new BroadcastChannel('dolphin-theme'));
      bc.postMessage({ type:'theme', key: state.currentTheme });
    } catch(e){}
    updateBadge(state.currentTheme);
    console.log('[Theme] Applied:', state.currentTheme);
  }
  function updateBadge(key){
    var b = document.getElementById('themeBadge');
    if (!b){ b = document.createElement('div'); b.id='themeBadge'; document.body.appendChild(b); }
    if (!key || key === 'default'){ b.classList.remove('show'); return; }
    var t = THEMES[key];
    b.innerHTML = '<span class="tb-icon">' + t.icon + '</span><span>' + t.badge + '</span>';
    b.classList.add('show');
  }

  /* ============== FIREBASE ============== */
  function fetchThemeFromFirebase(){
    if (state.urlParam) return;
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
      console.warn('[Theme] Firebase fail:', err);
      applyTheme(detectThemeByDate());
    });
  }

  /* ============== INIT ============== */
  function init(){
    injectStyles();
    var urlParams = new URLSearchParams(location.search);
    var urlTheme = urlParams.get('theme');
    if (urlTheme && THEMES[urlTheme]){
      state.urlParam = urlTheme;
      applyTheme(urlTheme);
    } else {
      var saved = null;
      try { saved = localStorage.getItem(LS_THEME_KEY); } catch(e){}
      if (saved && THEMES[saved]) applyTheme(saved);
      else applyTheme(detectThemeByDate());
    }
    try {
      window.addEventListener('storage', function(e){
        if (e.key === LS_THEME_KEY && THEMES[e.newValue]) applyTheme(e.newValue);
      });
    } catch(e){}
    try {
      var bc = window.__dolphinThemeBC ||
               (window.__dolphinThemeBC = new BroadcastChannel('dolphin-theme'));
      bc.onmessage = function(ev){
        var d = ev.data || {};
        if (d.type === 'theme' && THEMES[d.key]) applyTheme(d.key);
      };
    } catch(e){}
    fetchThemeFromFirebase();
    if (hasLanding() && !document.getElementById('themeBigIcon')){
      applyBigIcon(state.currentTheme, THEMES[state.currentTheme].accent);
    }
    [0, 50, 200, 500, 1000, 2000, 3500].forEach(function(t){
      setTimeout(sizeBigIcon, t);
    });
    document.addEventListener('visibilitychange', function(){
      if (document.visibilityState === 'visible') setTimeout(sizeBigIcon, 100);
    });
    if (document.readyState === 'complete'){
      setTimeout(sizeBigIcon, 100);
    } else {
      window.addEventListener('load', function(){ setTimeout(sizeBigIcon, 100); });
    }
  }

  window.ThemeSystem = {
    version:    '7.1',
    setTheme:   function(key){ applyTheme(key); },
    getCurrent: function(){ return state.currentTheme; },
    listThemes: function(){ return Object.keys(THEMES); },
    detect:     detectThemeByDate,
    getThemes:  function(){ return THEMES; }
  };

  if (document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded', init);
  else init();

  console.log('%c🎨 THEME SYSTEM v7.1 — DEEP LV2',
    'background:linear-gradient(90deg,#FFD700,#FF1493);color:#fff;font-size:12px;padding:4px 10px;border-radius:4px;font-weight:900');
})();
