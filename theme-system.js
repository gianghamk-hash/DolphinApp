/* ============================================================
   THEME SYSTEM v6.3 — BIG ICON iOS SAFARI FIX
   - Cấu trúc 3 lớp: container → center → aura+emoji
   - Dùng vmin (iOS-safe) thay min()
   - Bỏ transform/will-change trên container
   ============================================================ */
(function(){
  'use strict';

  var FIREBASE_CONFIG = {
    apiKey: "AIzaSyAtBNp9WBnyIkCiVjXfUpjH2d7-9dbg-JQ",
    authDomain: "dolphin-f6d67.firebaseapp.com",
    projectId: "dolphin-f6d67"
  };
  var LS_THEME_KEY = 'dolphin_theme';

  /* ============================================================
     THEME DEFINITIONS
     ============================================================ */
  var THEMES = {
    default: {
      name:'Dolphin', badge:'DOLPHIN', icon:'🕐', loc:'📍', ann:'📢',
      border:'rgba(244,184,66,.55)', borderSoft:'rgba(244,184,66,.25)',
      glow:'rgba(244,184,66,.30)', accent:'#FBD77A', accent2:'#bfe9dc',
      bg1:'#0f3d38', bg2:'#0a2b28', radius: null, ranges: null
    },
    tet: {
      name:'Tết', badge:'TẾT', icon:'🧧', loc:'🏮', ann:'🧧',
      border:'rgba(255,107,53,.80)', borderSoft:'rgba(255,107,53,.28)',
      glow:'rgba(255,107,53,.32)', accent:'#FFD166', accent2:'#FFC1B0',
      bg1:'#3a0e0e', bg2:'#1a0505',
      radius:'4px 4px 60px 60px / 4px 4px 45px 45px', ranges:[[1,15],[2,20]]
    },
    valentine: {
      name:'Valentine', badge:'VALENTINE', icon:'💝', loc:'💖', ann:'💝',
      border:'rgba(255,77,109,.80)', borderSoft:'rgba(255,77,109,.28)',
      glow:'rgba(255,77,109,.32)', accent:'#FFB3C6', accent2:'#FFD1DC',
      bg1:'#3a0a1a', bg2:'#1a0508',
      radius:'60% 60% 22px 22px / 45% 45% 22px 22px', ranges:[[2,10],[2,15]]
    },
    womenday: {
      name:'Quốc Tế Phụ Nữ', badge:'20/10', icon:'🌷', loc:'🌹', ann:'🌷',
      border:'rgba(217,70,166,.80)', borderSoft:'rgba(217,70,166,.28)',
      glow:'rgba(217,70,166,.32)', accent:'#FFC1E3', accent2:'#FFE0F0',
      bg1:'#3a1030', bg2:'#1a0515',
      radius:'100px 22px 100px 22px', ranges:[[3,5],[3,10],[10,15],[10,25]]
    },
    reunification: {
      name:'30/4', badge:'30/4', icon:'⭐', loc:'🇻🇳', ann:'⭐',
      border:'rgba(218,37,29,.85)', borderSoft:'rgba(218,37,29,.30)',
      glow:'rgba(218,37,29,.35)', accent:'#FFD700', accent2:'#FFECB3',
      bg1:'#2a0505', bg2:'#0a0202',
      radius:'2px 40px 2px 40px', ranges:[[4,28],[5,3]]
    },
    children: {
      name:'Tết Thiếu Nhi', badge:'1/6', icon:'🎈', loc:'🎉', ann:'🎈',
      border:'rgba(78,205,196,.80)', borderSoft:'rgba(78,205,196,.28)',
      glow:'rgba(78,205,196,.32)', accent:'#FFD1DC', accent2:'#B5EAD7',
      bg1:'#0e1e3a', bg2:'#050a1a',
      radius:'50% 50% 50% 50% / 60% 60% 40% 40%', ranges:[[5,25],[6,5]]
    },
    nationalday: {
      name:'Quốc Khánh', badge:'2/9', icon:'⭐', loc:'🇻🇳', ann:'⭐',
      border:'rgba(218,37,29,.85)', borderSoft:'rgba(218,37,29,.30)',
      glow:'rgba(255,215,0,.32)', accent:'#FFD700', accent2:'#FFF4B0',
      bg1:'#2a0505', bg2:'#0a0202',
      radius:'2px 40px 2px 40px', ranges:[[8,30],[9,3]]
    },
    midautumn: {
      name:'Trung Thu', badge:'TRUNG THU', icon:'🏮', loc:'🌕', ann:'🏮',
      border:'rgba(240,192,96,.80)', borderSoft:'rgba(240,192,96,.28)',
      glow:'rgba(240,192,96,.32)', accent:'#FFE8A0', accent2:'#FFD1DC',
      bg1:'#2a0e2a', bg2:'#0a0310',
      radius:'70px 70px 22px 22px', ranges:[[9,10],[10,5]]
    },
    halloween: {
      name:'Halloween', badge:'HALLOWEEN', icon:'🎃', loc:'🦇', ann:'🎃',
      border:'rgba(255,149,0,.80)', borderSoft:'rgba(255,149,0,.28)',
      glow:'rgba(255,149,0,.32)', accent:'#FFB84D', accent2:'#B388FF',
      bg1:'#1a0a2a', bg2:'#050108',
      radius:'60px 60px 60px 60px / 80px 80px 40px 40px', ranges:[[10,25],[11,1]]
    },
    christmas: {
      name:'Giáng Sinh', badge:'NOEL', icon:'🎄', loc:'🎁', ann:'🎄',
      border:'rgba(196,30,58,.85)', borderSoft:'rgba(196,30,58,.30)',
      glow:'rgba(10,125,61,.35)', accent:'#FFE8A0', accent2:'#B8E8C8',
      bg1:'#0a1a2e', bg2:'#050a14',
      radius:'8px 8px 80px 80px / 8px 8px 60px 60px', ranges:[[12,15],[12,26]]
    },
    newyear: {
      name:'Tết Dương', badge:'NEW YEAR', icon:'🎊', loc:'🎆', ann:'🎊',
      border:'rgba(255,215,0,.85)', borderSoft:'rgba(255,215,0,.30)',
      glow:'rgba(139,0,255,.35)', accent:'#FFD700', accent2:'#E0B0FF',
      bg1:'#1a0a3a', bg2:'#050110',
      radius:'60px', ranges:[[12,29],[1,2]]
    },
    spring: {
      name:'Mùa Xuân', badge:'SPRING', icon:'🌸', loc:'🦋', ann:'🌸',
      border:'rgba(255,182,193,.80)', borderSoft:'rgba(255,182,193,.28)',
      glow:'rgba(255,182,193,.32)', accent:'#FFD1DC', accent2:'#B5EAD7',
      bg1:'#1a2a1a', bg2:'#0a140a',
      radius:'70px 70px 22px 22px', months:[3,4,5]
    },
    summer: {
      name:'Mùa Hè', badge:'SUMMER', icon:'☀️', loc:'🌴', ann:'☀️',
      border:'rgba(255,176,0,.80)', borderSoft:'rgba(255,176,0,.28)',
      glow:'rgba(255,176,0,.32)', accent:'#FFE58F', accent2:'#A0E8E0',
      bg1:'#0a1a3a', bg2:'#030814',
      radius:'22px 22px 50% 50% / 22px 22px 60% 60%', months:[6,7,8]
    },
    autumn: {
      name:'Mùa Thu', badge:'AUTUMN', icon:'🍁', loc:'🍂', ann:'🍁',
      border:'rgba(210,105,30,.80)', borderSoft:'rgba(210,105,30,.28)',
      glow:'rgba(210,105,30,.32)', accent:'#FFD1A0', accent2:'#FFB87A',
      bg1:'#2a1505', bg2:'#0a0502',
      radius:'22px 100px 22px 100px', months:[9,10,11]
    },
    winter: {
      name:'Mùa Đông', badge:'WINTER', icon:'❄️', loc:'⛄', ann:'❄️',
      border:'rgba(184,216,240,.80)', borderSoft:'rgba(184,216,240,.28)',
      glow:'rgba(184,216,240,.32)', accent:'#E0F0FF', accent2:'#B8D8F0',
      bg1:'#0a1428', bg2:'#03060f',
      radius:'60px 6px 60px 6px', months:[12,1,2]
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
      '  --theme-radius: 22px;',
      '  --theme-trans: 1s ease;',
      '}',

      'html{ background-color:#0a2b28; }',
      'body{',
      '  background: linear-gradient(160deg, var(--theme-bg1) 0%, var(--theme-bg2) 100%) !important;',
      '  transition: background var(--theme-trans) !important;',
      '}',
      '#landing{ background: transparent !important; }',

      /* ============================================================
         BIG BACKGROUND ICON — CẤU TRÚC 3 LỚP
         ────────────────────────────────────────────────────────────
         .outer (fixed, flex center)  →  .center (100%)  →  aura + emoji
         Mỗi lớp không transform, chỉ inner mới animate.
         ============================================================ */
      '#themeBigIcon{',
      '  position: fixed;',
      '  top: 0;',
      '  left: 0;',
      '  right: 0;',
      '  bottom: 0;',
      '  pointer-events: none;',
      '  z-index: 1;',
      '  display: flex;',
      '  align-items: center;',
      '  justify-content: center;',
      '  opacity: 0;',
      '  transition: opacity 1.4s ease;',
      '}',
      '#themeBigIcon.show{ opacity: 1; }',

      '#themeBigIcon .tbi-center{',
      '  position: relative;',
      '  display: flex;',
      '  align-items: center;',
      '  justify-content: center;',
      '  width: 100%;',
      '  height: 100%;',
      '}',

      /* ───── AURA — dùng vmin (iOS-safe) ───── */
      '#themeBigIcon .tbi-aura{',
      '  position: absolute;',
      '  width: 88vmin;',
      '  height: 88vmin;',
      '  max-width: 900px;',
      '  max-height: 900px;',
      '  border-radius: 50%;',
      '  -webkit-filter: blur(40px);',
      '  filter: blur(40px);',
      '  opacity: .6;',
      '  pointer-events: none;',
      '}',

      /* ───── EMOJI — dùng vmin + inner wrapper ───── */
      '#themeBigIcon .tbi-emoji{',
      '  position: relative;',
      '  font-size: 52vmin;',
      '  max-font-size: 620px;',
      '  font-family: "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji","EmojiOne Color",sans-serif;',
      '  line-height: 1;',
      '  user-select: none;',
      '  -webkit-user-select: none;',
      '  display: block;',
      '  transform-origin: center;',
      '  -webkit-font-smoothing: antialiased;',
      '  -webkit-text-size-adjust: 100%;',
      '}',
      /* Emoji cờ cần wrap để scaleY */
      '#themeBigIcon .tbi-emoji.flag{',
      '  font-size: 66vmin;',
      '}',
      '#themeBigIcon .tbi-emoji.flag > .tbi-e-inner{',
      '  display: inline-block;',
      '  transform: scaleY(0.72);',
      '  transform-origin: center;',
      '}',

      /* ============ AURA ANIMATIONS ============ */
      '@keyframes aura-soft{',
      '  0%,100%{ transform:scale(.95); opacity:.5; }',
      '  50%    { transform:scale(1.08); opacity:.8; }',
      '}',
      '@keyframes aura-warm{',
      '  0%,100%{ transform:scale(.92); opacity:.55; }',
      '  50%    { transform:scale(1.12); opacity:.9; }',
      '}',
      '@keyframes aura-heart{',
      '  0%,100%{ transform:scale(1); opacity:.6; }',
      '  12%    { transform:scale(1.15); opacity:.95; }',
      '  24%    { transform:scale(1); opacity:.6; }',
      '  36%    { transform:scale(1.1); opacity:.85; }',
      '  48%    { transform:scale(1); opacity:.6; }',
      '}',
      '@keyframes aura-bloom{',
      '  0%   { transform:scale(.9) rotate(0deg); opacity:.55; }',
      '  50%  { transform:scale(1.15) rotate(180deg); opacity:.85; }',
      '  100% { transform:scale(.9) rotate(360deg); opacity:.55; }',
      '}',
      '@keyframes aura-flag{',
      '  0%,100%{ transform:scale(1);    opacity:.7; }',
      '  25%    { transform:scale(1.05); opacity:.85; }',
      '  75%    { transform:scale(1.05); opacity:.85; }',
      '}',
      '@keyframes aura-ghost{',
      '  0%,100%{ transform:scale(1);    opacity:.75; }',
      '  25%    { transform:scale(1.08); opacity:.45; }',
      '  50%    { transform:scale(1);    opacity:.85; }',
      '  75%    { transform:scale(1.05); opacity:.5; }',
      '}',
      '@keyframes aura-firework{',
      '  0%   { transform:scale(.8); opacity:.4; }',
      '  40%  { transform:scale(1.2); opacity:1; }',
      '  70%  { transform:scale(1.05); opacity:.85; }',
      '  100% { transform:scale(.8); opacity:.4; }',
      '}',
      '@keyframes aura-sun{',
      '  0%  { transform:scale(.95) rotate(0deg); opacity:.55; }',
      '  50% { transform:scale(1.1) rotate(180deg); opacity:.85; }',
      '  100%{ transform:scale(.95) rotate(360deg); opacity:.55; }',
      '}',
      '@keyframes aura-frost{',
      '  0%,100%{ transform:scale(.9); opacity:.5; }',
      '  50%    { transform:scale(1.15); opacity:.85; }',
      '}',

      /* ============ EMOJI ANIMATIONS (chỉ transform/opacity/filter) ============ */
      '@keyframes bgi-float{',
      '  0%,100%{ transform:translateY(0) rotate(-2deg); }',
      '  50%    { transform:translateY(-36px) rotate(2deg); }',
      '}',
      '@keyframes bgi-swing{',
      '  0%,100%{ transform:rotate(-9deg); }',
      '  50%    { transform:rotate(9deg); }',
      '}',
      '@keyframes bgi-beat{',
      '  0%,100%{ transform:scale(1); }',
      '  12%    { transform:scale(1.14); }',
      '  24%    { transform:scale(1); }',
      '  36%    { transform:scale(1.1); }',
      '  48%    { transform:scale(1); }',
      '}',
      '@keyframes bgi-bloom{',
      '  0%  { transform:rotate(-12deg) scale(1); }',
      '  50% { transform:rotate(12deg) scale(1.1); }',
      '  100%{ transform:rotate(-12deg) scale(1); }',
      '}',
      '@keyframes bgi-glow{',
      '  0%,100%{ filter:drop-shadow(0 0 40px currentColor) drop-shadow(0 0 80px currentColor) brightness(.9); opacity:.7; }',
      '  50%    { filter:drop-shadow(0 0 100px currentColor) drop-shadow(0 0 200px currentColor) brightness(1.3); opacity:1; }',
      '}',
      '@keyframes bgi-wave{',
      '  0%,100%{ transform:skewY(0deg); }',
      '  25%    { transform:skewY(4deg); }',
      '  75%    { transform:skewY(-4deg); }',
      '}',
      '@keyframes bgi-flicker{',
      '  0%,100%{ opacity:.85; transform:translateY(0) scale(1); }',
      '  8%    { opacity:.35; transform:translateY(-10px) scale(1.02); }',
      '  16%   { opacity:1;   transform:translateY(0) scale(1); }',
      '  28%   { opacity:.5;  transform:translateY(-6px) scale(1.01); }',
      '  36%   { opacity:1;   transform:translateY(0) scale(1.03); }',
      '  48%   { opacity:.4;  transform:translateY(-14px) scale(1.02); }',
      '  60%   { opacity:.95; transform:translateY(0) scale(1); }',
      '  72%   { opacity:.55; transform:translateY(-8px) scale(1.01); }',
      '  84%   { opacity:1;   transform:translateY(0) scale(1.02); }',
      '  92%   { opacity:.7;  transform:translateY(-4px) scale(1); }',
      '}',
      '@keyframes bgi-pulse{',
      '  0%,100%{ transform:scale(.92); opacity:.65; }',
      '  50%    { transform:scale(1.18); opacity:1; }',
      '}',
      '@keyframes bgi-sway{',
      '  0%,100%{ transform:rotate(-14deg) translateX(-18px); }',
      '  50%    { transform:rotate(14deg)  translateX(18px); }',
      '}',
      '@keyframes bgi-rotate{',
      '  0%  { transform:rotate(0deg); }',
      '  100%{ transform:rotate(360deg); }',
      '}',
      '@keyframes bgi-fall-sway{',
      '  0%  { transform:translateY(-22vh) rotate(-15deg) translateX(-20px); opacity:.5; }',
      '  50% { opacity:1; transform:translateY(0) rotate(0deg) translateX(20px); }',
      '  100%{ transform:translateY(22vh) rotate(15deg) translateX(-20px); opacity:.5; }',
      '}',

      '@media (prefers-reduced-motion: reduce){',
      '  #themeBigIcon .tbi-emoji,',
      '  #themeBigIcon .tbi-aura{ animation:none !important; }',
      '}',

      /* ==== ĐỒNG HỒ ==== */
      '#halongClock{',
      '  border-color:var(--theme-border) !important;',
      '  box-shadow:0 8px 32px rgba(0,0,0,.5),0 0 40px var(--theme-glow),',
      '             inset 0 0 30px var(--theme-glow) !important;',
      '  transition:border-color var(--theme-trans),box-shadow var(--theme-trans) !important;',
      '}',
      '#halongClock .hclock-time{',
      '  color:var(--theme-accent) !important;',
      '  text-shadow:0 0 12px var(--theme-glow),0 0 24px var(--theme-glow) !important;',
      '  transition:color var(--theme-trans) !important;',
      '}',
      '#halongClock .hclock-loc-text{',
      '  color:var(--theme-accent) !important;',
      '  text-shadow:0 0 8px var(--theme-glow) !important;',
      '  transition:color var(--theme-trans) !important;',
      '}',
      '#halongClock .hclock-date, #halongClock .hclock-s{',
      '  color:var(--theme-accent2) !important;',
      '  transition:color var(--theme-trans) !important;',
      '}',
      '#halongClock .hclock-loc{',
      '  border-left-color:var(--theme-border) !important;',
      '  transition:border-color var(--theme-trans) !important;',
      '}',

      /* ==== AREA CARD ==== */
      '.area-card{',
      '  border-color:var(--theme-border-soft) !important;',
      '  transition:border-color var(--theme-trans),',
      '             transform .45s cubic-bezier(.16,1,.3,1),',
      '             box-shadow .45s ease,',
      '             border-radius .7s cubic-bezier(.16,1,.3,1) !important;',
      '}',
      '.area-card:hover{',
      '  border-color:var(--theme-border) !important;',
      '  box-shadow:0 28px 56px -16px rgba(0,0,0,.7),',
      '             0 0 40px -8px var(--theme-glow),',
      '             inset 0 0 30px var(--theme-glow) !important;',
      '}',
      '.area-card::before{',
      '  background:linear-gradient(135deg,var(--theme-border),transparent 45%,var(--theme-border-soft)) !important;',
      '  transition:opacity .4s,background var(--theme-trans) !important;',
      '}',
      '.area-card:hover .area-title-en{',
      '  color:var(--theme-accent) !important;',
      '  text-shadow:0 0 20px var(--theme-glow) !important;',
      '}',
      '.area-title-vi{ color:var(--theme-accent2) !important; transition:color var(--theme-trans) !important; }',
      '.area-badge{',
      '  background:linear-gradient(135deg,var(--theme-accent),var(--theme-accent2)) !important;',
      '  transition:background var(--theme-trans) !important;',
      '}',

      /* ==== ANNOUNCEMENT + WELCOME ==== */
      '#announcementBar{',
      '  border-color:var(--theme-border) !important;',
      '  box-shadow:0 6px 28px var(--theme-glow),inset 0 0 30px var(--theme-glow) !important;',
      '  transition:border-color var(--theme-trans),box-shadow var(--theme-trans) !important;',
      '}',
      '.announcement-text{ color:var(--theme-accent) !important; transition:color var(--theme-trans) !important; }',
      '.welcome-lbl .wlc-vi{ color:var(--theme-accent) !important; transition:color var(--theme-trans); }',
      '.welcome-lbl .wlc-en{ color:var(--theme-accent2) !important; transition:color var(--theme-trans); }',

      /* ==== BADGE ==== */
      '#themeBadge{',
      '  position:fixed;top:8px;left:8px;z-index:9998;',
      '  display:flex;align-items:center;gap:6px;',
      '  padding:6px 12px;',
      '  background:rgba(10,31,29,.9);',
      '  border:1px solid var(--theme-border);',
      '  border-radius:999px;',
      '  font-size:11px;font-weight:900;',
      '  color:var(--theme-accent);',
      '  font-family:Nunito,sans-serif;',
      '  backdrop-filter:blur(10px);',
      '  -webkit-backdrop-filter:blur(10px);',
      '  pointer-events:none;opacity:0;',
      '  transition:opacity .5s,border-color var(--theme-trans),color var(--theme-trans);',
      '}',
      '#themeBadge.show{ opacity:1; }',
      '#themeBadge .tb-icon{ font-size:14px; }',
      'body.app-mode #themeBadge{ display:none !important; }',

      /* ==== APP CON ==== */
      'body[data-theme]:not([data-theme="default"]) .glass-card,',
      'body[data-theme]:not([data-theme="default"]) .menu-card,',
      'body[data-theme]:not([data-theme="default"]) .order-card,',
      'body[data-theme]:not([data-theme="default"]) .order-slot,',
      'body[data-theme]:not([data-theme="default"]) .order-item,',
      'body[data-theme]:not([data-theme="default"]) .modal-content,',
      'body[data-theme]:not([data-theme="default"]) .app-header{',
      '  border-radius:var(--theme-radius) !important;',
      '  transition:border-color var(--theme-trans),',
      '             box-shadow var(--theme-trans),',
      '             background var(--theme-trans),',
      '             border-radius .9s cubic-bezier(.16,1,.3,1) !important;',
      '}',

      /* ==== MOBILE ==== */
      '@media(max-width:768px){',
      '  #themeBadge{ font-size:9.5px;padding:4px 9px;top:6px;left:6px; }',
      '  #themeBadge .tb-icon{ font-size:12px; }',
      '  #themeBigIcon .tbi-aura{ -webkit-filter:blur(30px); filter:blur(30px); }',
      '}',

      /* ==== iOS SAFARI SPECIFIC — dùng -webkit-fill-available ==== */
      '@supports (-webkit-touch-callout: none){',
      '  html{ height: -webkit-fill-available; }',
      '  body{ min-height: -webkit-fill-available; }',
      '}'
    ].join('\n');
    document.head.appendChild(s);
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
      '<div class="tbi-center">' +
      '  <div class="tbi-aura" aria-hidden="true"></div>' +
      '  <span class="tbi-emoji" aria-hidden="true"></span>' +
      '</div>';

    document.body.appendChild(el);
    return el;
  }

  function applyBigIcon(themeKey, accentColor){
    var el = ensureBigIcon();
    if (!el) return;

    var cfg = BIG_ICONS[themeKey] || BIG_ICONS.default;
    var aura = el.querySelector('.tbi-aura');
    var emoji = el.querySelector('.tbi-emoji');
    if (!aura || !emoji) return;

    /* ═══════ EMOJI ═══════ */
    var isFlag = (cfg.e === '🇻🇳' || /[\u{1F1E6}-\u{1F1FF}]{2}/u.test(cfg.e));

    if (isFlag){
      emoji.classList.add('flag');
      /* Wrap inner để scaleY trên iOS hoạt động */
      emoji.innerHTML = '<span class="tbi-e-inner">' + cfg.e + '</span>';
    } else {
      emoji.classList.remove('flag');
      emoji.textContent = cfg.e;
    }

    emoji.style.color = accentColor;
    emoji.style.opacity = cfg.o;
    emoji.style.filter = 'drop-shadow(0 0 60px ' + accentColor + ') drop-shadow(0 0 120px ' + accentColor + ')';
    emoji.style.webkitFilter = emoji.style.filter;

    /* Reset + apply animation */
    emoji.style.animation = 'none';
    void emoji.offsetWidth;
    emoji.style.animation = cfg.aE + ' ' + cfg.dE + ' ease-in-out infinite';
    emoji.style.webkitAnimation = emoji.style.animation;

    /* ═══════ AURA ═══════ */
    aura.style.background = 'radial-gradient(circle at 50% 50%, ' +
      cfg.aura + ' 0%, ' +
      cfg.aura.replace(/[\d.]+\)$/, '0.35)') + ' 35%, ' +
      'transparent 70%)';

    aura.style.animation = 'none';
    void aura.offsetWidth;
    aura.style.animation = cfg.aA + ' ' + cfg.dA + ' ease-in-out infinite';
    aura.style.webkitAnimation = aura.style.animation;

    el.classList.add('show');
    el.setAttribute('data-bt', themeKey);
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

    /* iOS: re-apply khi orientation change */
    var isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
                (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    if (isIOS){
      window.addEventListener('orientationchange', function(){
        setTimeout(function(){
          var el = document.getElementById('themeBigIcon');
          if (el) el.classList.add('show');
        }, 300);
      });
      /* Re-apply sau khi load xong (Safari iOS đôi khi render trễ) */
      window.addEventListener('load', function(){
        setTimeout(function(){
          applyBigIcon(state.currentTheme, THEMES[state.currentTheme].accent);
        }, 200);
      });
    }
  }

  window.ThemeSystem = {
    version:    '6.3',
    setTheme:   function(key){ applyTheme(key); },
    getCurrent: function(){ return state.currentTheme; },
    listThemes: function(){ return Object.keys(THEMES); },
    detect:     detectThemeByDate,
    getThemes:  function(){ return THEMES; }
  };

  if (document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded', init);
  else init();

  console.log('%c🎨 THEME SYSTEM v6.3 — iOS Safari FIX',
    'background:linear-gradient(90deg,#FFD700,#FF1493);color:#fff;font-size:12px;padding:4px 10px;border-radius:4px;font-weight:900');
})();
