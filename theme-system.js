/* ============================================================
   THEME SYSTEM v7.2 — REVOLUTIONARY
   ─────────────────────────────────────────────────────────────
   • Aurora background + Real glass card + 3D tilt + Logo shimmer
   • Status pulse + Timeline visual + Theme ripple + Breathe order
   • Landing: Big icon + Firework (giữ nguyên)
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
      aurora1:'rgba(78,205,196,.18)', aurora2:'rgba(244,184,66,.14)', aurora3:'rgba(111,195,191,.12)'
    },
    tet: {
      name:'Tết', badge:'TẾT', icon:'🧧', loc:'🏮', ann:'🧧',
      border:'rgba(255,107,53,.80)', borderSoft:'rgba(255,107,53,.28)',
      glow:'rgba(255,107,53,.32)', accent:'#FFD166', accent2:'#FFC1B0',
      bg1:'#3a0e0e', bg2:'#1a0505',
      radius:'4px 4px 60px 60px / 4px 4px 45px 45px', ranges:[[1,15],[2,20]],
      aurora1:'rgba(255,107,53,.22)', aurora2:'rgba(255,209,102,.18)', aurora3:'rgba(255,80,80,.15)'
    },
    valentine: {
      name:'Valentine', badge:'VALENTINE', icon:'💝', loc:'💖', ann:'💝',
      border:'rgba(255,77,109,.80)', borderSoft:'rgba(255,77,109,.28)',
      glow:'rgba(255,77,109,.32)', accent:'#FFB3C6', accent2:'#FFD1DC',
      bg1:'#3a0a1a', bg2:'#1a0508',
      radius:'60% 60% 22px 22px / 45% 45% 22px 22px', ranges:[[2,10],[2,15]],
      aurora1:'rgba(255,77,109,.22)', aurora2:'rgba(255,179,198,.18)', aurora3:'rgba(255,150,200,.15)'
    },
    womenday: {
      name:'Quốc Tế Phụ Nữ', badge:'20/10', icon:'🌷', loc:'🌹', ann:'🌷',
      border:'rgba(217,70,166,.80)', borderSoft:'rgba(217,70,166,.28)',
      glow:'rgba(217,70,166,.32)', accent:'#FFC1E3', accent2:'#FFE0F0',
      bg1:'#3a1030', bg2:'#1a0515',
      radius:'100px 22px 100px 22px', ranges:[[3,5],[3,10],[10,15],[10,25]],
      aurora1:'rgba(217,70,166,.22)', aurora2:'rgba(255,193,227,.18)', aurora3:'rgba(180,100,220,.15)'
    },
    reunification: {
      name:'30/4', badge:'30/4', icon:'⭐', loc:'🇻🇳', ann:'⭐',
      border:'rgba(218,37,29,.85)', borderSoft:'rgba(218,37,29,.30)',
      glow:'rgba(218,37,29,.35)', accent:'#FFD700', accent2:'#FFECB3',
      bg1:'#2a0505', bg2:'#0a0202',
      radius:'2px 40px 2px 40px', ranges:[[4,28],[5,3]],
      aurora1:'rgba(218,37,29,.25)', aurora2:'rgba(255,215,0,.20)', aurora3:'rgba(255,100,100,.15)'
    },
    children: {
      name:'Tết Thiếu Nhi', badge:'1/6', icon:'🎈', loc:'🎉', ann:'🎈',
      border:'rgba(78,205,196,.80)', borderSoft:'rgba(78,205,196,.28)',
      glow:'rgba(78,205,196,.32)', accent:'#FFD1DC', accent2:'#B5EAD7',
      bg1:'#0e1e3a', bg2:'#050a1a',
      radius:'50% 50% 50% 50% / 60% 60% 40% 40%', ranges:[[5,25],[6,5]],
      aurora1:'rgba(78,205,196,.22)', aurora2:'rgba(255,107,157,.18)', aurora3:'rgba(180,150,255,.15)'
    },
    nationalday: {
      name:'Quốc Khánh', badge:'2/9', icon:'⭐', loc:'🇻🇳', ann:'⭐',
      border:'rgba(218,37,29,.85)', borderSoft:'rgba(218,37,29,.30)',
      glow:'rgba(255,215,0,.32)', accent:'#FFD700', accent2:'#FFF4B0',
      bg1:'#2a0505', bg2:'#0a0202',
      radius:'2px 40px 2px 40px', ranges:[[8,30],[9,3]],
      aurora1:'rgba(218,37,29,.25)', aurora2:'rgba(255,215,0,.22)', aurora3:'rgba(255,150,50,.15)'
    },
    midautumn: {
      name:'Trung Thu', badge:'TRUNG THU', icon:'🏮', loc:'🌕', ann:'🏮',
      border:'rgba(240,192,96,.80)', borderSoft:'rgba(240,192,96,.28)',
      glow:'rgba(240,192,96,.32)', accent:'#FFE8A0', accent2:'#FFD1DC',
      bg1:'#2a0e2a', bg2:'#0a0310',
      radius:'70px 70px 22px 22px', ranges:[[9,10],[10,5]],
      aurora1:'rgba(240,192,96,.22)', aurora2:'rgba(255,180,120,.18)', aurora3:'rgba(180,100,180,.15)'
    },
    halloween: {
      name:'Halloween', badge:'HALLOWEEN', icon:'🎃', loc:'🦇', ann:'🎃',
      border:'rgba(255,149,0,.80)', borderSoft:'rgba(255,149,0,.28)',
      glow:'rgba(255,149,0,.32)', accent:'#FFB84D', accent2:'#B388FF',
      bg1:'#1a0a2a', bg2:'#050108',
      radius:'60px 60px 60px 60px / 80px 80px 40px 40px', ranges:[[10,25],[11,1]],
      aurora1:'rgba(255,149,0,.25)', aurora2:'rgba(179,136,255,.20)', aurora3:'rgba(120,60,180,.15)'
    },
    christmas: {
      name:'Giáng Sinh', badge:'NOEL', icon:'🎄', loc:'🎁', ann:'🎄',
      border:'rgba(196,30,58,.85)', borderSoft:'rgba(196,30,58,.30)',
      glow:'rgba(10,125,61,.35)', accent:'#FFE8A0', accent2:'#B8E8C8',
      bg1:'#0a1a2e', bg2:'#050a14',
      radius:'8px 8px 80px 80px / 8px 8px 60px 60px', ranges:[[12,15],[12,26]],
      aurora1:'rgba(196,30,58,.25)', aurora2:'rgba(10,125,61,.22)', aurora3:'rgba(255,200,100,.15)'
    },
    newyear: {
      name:'Tết Dương', badge:'NEW YEAR', icon:'🎊', loc:'🎆', ann:'🎊',
      border:'rgba(255,215,0,.85)', borderSoft:'rgba(255,215,0,.30)',
      glow:'rgba(139,0,255,.35)', accent:'#FFD700', accent2:'#E0B0FF',
      bg1:'#1a0a3a', bg2:'#050110',
      radius:'60px', ranges:[[12,29],[1,2]],
      aurora1:'rgba(255,215,0,.25)', aurora2:'rgba(139,0,255,.22)', aurora3:'rgba(100,150,255,.15)'
    },
    spring: {
      name:'Mùa Xuân', badge:'SPRING', icon:'🌸', loc:'🦋', ann:'🌸',
      border:'rgba(255,182,193,.80)', borderSoft:'rgba(255,182,193,.28)',
      glow:'rgba(255,182,193,.32)', accent:'#FFD1DC', accent2:'#B5EAD7',
      bg1:'#1a2a1a', bg2:'#0a140a',
      radius:'70px 70px 22px 22px', months:[3,4,5],
      aurora1:'rgba(255,182,193,.22)', aurora2:'rgba(181,234,215,.18)', aurora3:'rgba(255,220,150,.15)'
    },
    summer: {
      name:'Mùa Hè', badge:'SUMMER', icon:'☀️', loc:'🌴', ann:'☀️',
      border:'rgba(255,176,0,.80)', borderSoft:'rgba(255,176,0,.28)',
      glow:'rgba(255,176,0,.32)', accent:'#FFE58F', accent2:'#A0E8E0',
      bg1:'#0a1a3a', bg2:'#030814',
      radius:'22px 22px 50% 50% / 22px 22px 60% 60%', months:[6,7,8],
      aurora1:'rgba(255,176,0,.25)', aurora2:'rgba(160,232,224,.18)', aurora3:'rgba(255,120,50,.15)'
    },
    autumn: {
      name:'Mùa Thu', badge:'AUTUMN', icon:'🍁', loc:'🍂', ann:'🍁',
      border:'rgba(210,105,30,.80)', borderSoft:'rgba(210,105,30,.28)',
      glow:'rgba(210,105,30,.32)', accent:'#FFD1A0', accent2:'#FFB87A',
      bg1:'#2a1505', bg2:'#0a0502',
      radius:'22px 100px 22px 100px', months:[9,10,11],
      aurora1:'rgba(210,105,30,.25)', aurora2:'rgba(255,209,160,.18)', aurora3:'rgba(180,80,40,.15)'
    },
    winter: {
      name:'Mùa Đông', badge:'WINTER', icon:'❄️', loc:'⛄', ann:'❄️',
      border:'rgba(184,216,240,.80)', borderSoft:'rgba(184,216,240,.28)',
      glow:'rgba(184,216,240,.32)', accent:'#E0F0FF', accent2:'#B8D8F0',
      bg1:'#0a1428', bg2:'#03060f',
      radius:'60px 6px 60px 6px', months:[12,1,2],
      aurora1:'rgba(184,216,240,.22)', aurora2:'rgba(200,230,255,.18)', aurora3:'rgba(120,180,255,.15)'
    }
  };

  /* ============================================================
     BIG ICON
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


  var THEME_SCENES = {
    default:['🐬','🫧','🐠','🫧','🐬'],tet:['🏮','🌸','🧧','🌼','🏮','✨'],
    valentine:['💕','💗','🌹','💌','💖','💕'],womenday:['🌷','🌸','🦋','🌺','💐','🌷'],
    reunification:['⭐','🇻🇳','⭐','✨','🇻🇳'],children:['🎈','🪁','🎉','🎈','🫧','🎊'],
    nationalday:['⭐','🇻🇳','🎆','⭐','✨'],midautumn:['🏮','🐇','🌕','✨','🏮','☁️'],
    halloween:['👻','🦇','👻','🦇','👻','🦇','🦇'],
    christmas:['❄️','🎁','🔔','❄️','⭐','❄️','🎄'],
    newyear:['✨','🎇','⭐','🎊','✨','🎇'],
    spring:['🌸','🦋','🌷','🌸','🌼','🦋'],summer:['🌊','🐠','🫧','🌴','🕊️','🌊'],
    autumn:['🍁','🍂','🍃','🍁','🍂','🍃'],winter:['❄️','🌨️','❄️','✨','❄️','🧊']
  };
  var SCENE_POSITIONS = [[13,21,.72,13,0],[82,16,.68,17,-3],[23,69,.86,15,-7],
    [76,72,.82,19,-10],[46,13,.58,16,-4],[91,46,.65,14,-8],[8,48,.74,18,-12]];
  function renderThemeScene(key,holder){
    if (!holder) return;
    var icons=THEME_SCENES[key]||THEME_SCENES.default, html='';
    for(var i=0;i<icons.length;i++){
      var p=SCENE_POSITIONS[i],bat=key==='halloween'&&icons[i]==='🦇';
      html+='<span class="tbi-particle '+(bat?'tbi-bat':'tbi-drifter')+
        '" style="--px:'+p[0]+'%;--py:'+p[1]+'%;--ps:'+p[2]+
        ';--duration:'+p[3]+'s;--delay:'+p[4]+'s" aria-hidden="true">'+icons[i]+'</span>';
    }
    holder.innerHTML=html;
  }

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
        '<div class="fw-rocket"></div><div class="fw-burst"></div></div>';
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
     INJECT STYLES
     ============================================================ */
  function injectStyles(){
    if (document.getElementById('theme-styles')) return;
    var s = document.createElement('style');
    s.id = 'theme-styles';

    var css = [];

    /* ─── BASE ─── */
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
      '  --theme-aurora1: rgba(78,205,196,.18);',
      '  --theme-aurora2: rgba(244,184,66,.14);',
      '  --theme-aurora3: rgba(111,195,191,.12);',
      '  --theme-trans: 1s ease;',
      '}',
      'html{ background-color:#0a2b28; }'
    );

    /* ═══════════════════════════════════════════════════════════
       ĐỘT PHÁ #1: AURORA BACKGROUND
       Nền app con có 3 radial gradient chuyển động chậm
       ═══════════════════════════════════════════════════════════ */
    css.push(
      'body{',
      '  background: var(--theme-bg1) !important;',
      '  transition: background var(--theme-trans) !important;',
      '  position:relative;',
      '}',
      'body::before{',
      '  content:"";',
      '  position:fixed;',
      '  inset:0;',
      '  pointer-events:none;',
      '  z-index:0;',
      '  background:',
      '    radial-gradient(circle at 20% 20%, var(--theme-aurora1) 0%, transparent 45%),',
      '    radial-gradient(circle at 80% 30%, var(--theme-aurora2) 0%, transparent 50%),',
      '    radial-gradient(circle at 50% 80%, var(--theme-aurora3) 0%, transparent 55%),',
      '    linear-gradient(160deg, var(--theme-bg1) 0%, var(--theme-bg2) 100%);',
      '  background-size:200% 200%, 200% 200%, 200% 200%, 100% 100%;',
      '  animation:aurora-drift 24s ease-in-out infinite alternate;',
      '  will-change:background-position;',
      '}',
      '@keyframes aurora-drift{',
      '  0%   { background-position:0% 0%,   100% 0%,   50% 100%, 0 0; }',
      '  50%  { background-position:50% 30%, 50% 50%,   0% 50%,  0 0; }',
      '  100% { background-position:100% 100%, 0% 100%, 100% 0%, 0 0; }',
      '}',
      'body > *{ position:relative; z-index:1; }',
      '#landing{ background: transparent !important; z-index:50 !important; }',
      '@media (prefers-reduced-motion: reduce){ body::before{ animation:none; } }'
    );

    /* ═══════════════════════════════════════════════════════════
       BIG ICON (giữ nguyên)
       ═══════════════════════════════════════════════════════════ */
    css.push(
      '#themeBigIcon{ position:fixed; top:0; left:0; pointer-events:none; z-index:1; opacity:0; transition:opacity 1.4s ease; }',
      '#themeBigIcon.show{ opacity:1; }',
      '#themeBigIcon .tbi-aura{ position:absolute; top:50%; left:50%; border-radius:50%; pointer-events:none; }',
      '#themeBigIcon .tbi-emoji{ position:absolute; top:50%; left:50%; font-family:"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif; line-height:1; text-align:center; user-select:none; -webkit-user-select:none; -webkit-font-smoothing:antialiased; transform-origin:center; }',
      '#themeBigIcon .tbi-emoji.flag > .tbi-e-inner{ display:inline-block; transform:scaleY(0.72); transform-origin:center; }',
            '#themeBigIcon .tbi-scene{position:absolute;inset:0;overflow:hidden;pointer-events:none;contain:layout style paint;}',
      '#themeBigIcon .tbi-particle{position:absolute;left:var(--px);top:var(--py);font-family:"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif;font-size:clamp(22px,5vmin,66px);line-height:1;opacity:.65;user-select:none;transform:translate3d(0,0,0) scale(var(--ps));animation:tbi-drift var(--duration) ease-in-out var(--delay) infinite alternate;backface-visibility:hidden;}',
      '#themeBigIcon .tbi-bat{font-size:clamp(24px,5.5vmin,72px);animation-name:tbi-bat-flight;opacity:.75;}',
      '@keyframes tbi-drift{from{transform:translate3d(-14px,14px,0) rotate(-9deg) scale(var(--ps));opacity:.38;}to{transform:translate3d(20px,-26px,0) rotate(11deg) scale(var(--ps));opacity:.8;}}',
      '@keyframes tbi-bat-flight{from{transform:translate3d(-42px,24px,0) rotate(-15deg) scale(var(--ps));opacity:.25;}50%{opacity:.85;}to{transform:translate3d(50px,-32px,0) rotate(14deg) scale(var(--ps));opacity:.55;}}',
      'body.app-mode #themeBigIcon .tbi-particle{animation-play-state:paused;}',
      '@media (prefers-reduced-motion: reduce){#themeBigIcon .tbi-particle,#themeBigIcon .tbi-emoji,#themeBigIcon .tbi-aura,#themeBigIcon .fw-rocket,#themeBigIcon .fw-burst,#themeBigIcon .fw-burst::before{animation:none !important;}#themeBigIcon .tbi-particle{opacity:.35;}}',
      '#themeBigIcon .tbi-fireworks{ position:absolute; top:0; left:0; width:100%; height:100%; pointer-events:none; display:none; }',
      '#themeBigIcon .tbi-fireworks.active{ display:block; }',
      '#themeBigIcon .fw{ position:absolute; left:var(--x); top:var(--y); width:0; height:0; pointer-events:none; }',
      '#themeBigIcon .fw-rocket{ position:absolute; left:-3px; top:-3px; width:6px; height:6px; border-radius:50%; background:var(--c); box-shadow:0 0 8px var(--c),0 0 16px var(--c),0 0 24px var(--c),0 0 40px var(--c); animation:fw-launch 4s cubic-bezier(.3,.05,.5,1) infinite; animation-delay:var(--delay); opacity:0; }',
      '#themeBigIcon .fw-rocket::before{ content:""; position:absolute; left:50%; top:4px; width:3px; height:56px; margin-left:-1.5px; border-radius:3px; background:linear-gradient(to bottom,var(--c) 0%,rgba(255,255,255,.6) 20%,transparent 100%); opacity:.7; }',
      '#themeBigIcon .fw-burst{ position:absolute; left:-4px; top:-4px; width:8px; height:8px; border-radius:50%; background:var(--c); box-shadow:0 -110px var(--c),78px -78px var(--c),110px 0 var(--c),78px 78px var(--c),0 110px var(--c),-78px 78px var(--c),-110px 0 var(--c),-78px -78px var(--c),33px -79px var(--c),79px -33px var(--c),79px 33px var(--c),33px 79px var(--c),-33px 79px var(--c),-79px 33px var(--c),-79px -33px var(--c),-33px -79px var(--c),0 -55px var(--c),39px -39px var(--c),55px 0 var(--c),39px 39px var(--c),0 55px var(--c),-39px 39px var(--c),-55px 0 var(--c),-39px -39px var(--c); animation:fw-explode 4s ease-out infinite; animation-delay:var(--delay); opacity:0; transform-origin:center; }',
      '#themeBigIcon .fw-burst::before{ content:""; position:absolute; left:-22px; top:-22px; width:44px; height:44px; border-radius:50%; background:radial-gradient(circle at center,#FFFFFF 0%,#FFFFFF 20%,var(--c) 45%,transparent 75%); animation:fw-flash 4s ease-out infinite; animation-delay:var(--delay); opacity:0; }',
      '@keyframes fw-launch{ 0%{ transform:translateY(var(--launch-y,800px)) scale(.6); opacity:0; } 4%{ opacity:1; } 22%{ transform:translateY(0) scale(1); opacity:1; } 24%{ opacity:0; transform:translateY(0) scale(1.3); } 100%{ opacity:0; transform:translateY(0) scale(1.3); } }',
      '@keyframes fw-explode{ 0%,24%{ transform:scale(0); opacity:0; } 25%{ transform:scale(.18); opacity:1; } 32%{ transform:scale(.55); opacity:1; } 48%{ transform:scale(.95); opacity:1; } 68%{ transform:scale(1.25); opacity:.6; } 85%{ transform:scale(1.45); opacity:.15; } 95%,100%{ transform:scale(1.55); opacity:0; } }',
      '@keyframes fw-flash{ 0%,24%{ transform:scale(.3); opacity:0; } 25%{ transform:scale(.8); opacity:1; } 32%{ transform:scale(1.15); opacity:.9; } 42%{ transform:scale(1.4); opacity:0; } 100%{ transform:scale(1.4); opacity:0; } }'
    );

    /* ─── BIG ICON keyframes ─── */
    css.push(
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
      '@keyframes bgi-fall-sway{ 0%{ transform:translateY(-22vh) rotate(-15deg) translateX(-20px); opacity:.5; } 50%{ opacity:1; transform:translateY(0) rotate(0deg) translateX(20px); } 100%{ transform:translateY(22vh) rotate(15deg) translateX(-20px); opacity:.5; } }'
    );

    /* ─── LANDING ELEMENTS ─── */
    css.push(
      '#halongClock{ border-color:var(--theme-border) !important; box-shadow:0 8px 32px rgba(0,0,0,.5),0 0 40px var(--theme-glow),inset 0 0 30px var(--theme-glow) !important; transition:border-color var(--theme-trans),box-shadow var(--theme-trans) !important; }',
      '#halongClock .hclock-time{ color:var(--theme-accent) !important; text-shadow:0 0 12px var(--theme-glow),0 0 24px var(--theme-glow) !important; transition:color var(--theme-trans) !important; }',
      '#halongClock .hclock-loc-text{ color:var(--theme-accent) !important; text-shadow:0 0 8px var(--theme-glow) !important; }',
      '#halongClock .hclock-date, #halongClock .hclock-s{ color:var(--theme-accent2) !important; }',
      '#halongClock .hclock-loc{ border-left-color:var(--theme-border) !important; }',
      '.area-card{ border-color:var(--theme-border-soft) !important; transition:border-color var(--theme-trans), transform .45s cubic-bezier(.16,1,.3,1), box-shadow .45s ease, border-radius .7s cubic-bezier(.16,1,.3,1) !important; }',
      '.area-card:hover{ border-color:var(--theme-border) !important; box-shadow:0 28px 56px -16px rgba(0,0,0,.7),0 0 40px -8px var(--theme-glow),inset 0 0 30px var(--theme-glow) !important; }',
      '.area-card::before{ background:linear-gradient(135deg,var(--theme-border),transparent 45%,var(--theme-border-soft)) !important; }',
      '.area-card:hover .area-title-en{ color:var(--theme-accent) !important; text-shadow:0 0 20px var(--theme-glow) !important; }',
      '.area-title-vi{ color:var(--theme-accent2) !important; }',
      '.area-badge{ background:linear-gradient(135deg,var(--theme-accent),var(--theme-accent2)) !important; }',
      '#announcementBar{ border-color:var(--theme-border) !important; box-shadow:0 6px 28px var(--theme-glow),inset 0 0 30px var(--theme-glow) !important; }',
      '.announcement-text{ color:var(--theme-accent) !important; }',
      '.welcome-lbl .wlc-vi{ color:var(--theme-accent) !important; }',
      '.welcome-lbl .wlc-en{ color:var(--theme-accent2) !important; }',
      '#themeBadge{ position:fixed;top:8px;left:8px;z-index:9998; display:flex;align-items:center;gap:6px; padding:6px 12px; background:rgba(10,31,29,.9); border:1px solid var(--theme-border); border-radius:999px; font-size:11px;font-weight:900; color:var(--theme-accent); font-family:Nunito,sans-serif; backdrop-filter:blur(10px); -webkit-backdrop-filter:blur(10px); pointer-events:none;opacity:0; transition:opacity .5s,border-color var(--theme-trans),color var(--theme-trans); }',
      '#themeBadge.show{ opacity:1; }',
      '#themeBadge .tb-icon{ font-size:14px; }',
      'body.app-mode #themeBadge{ display:none !important; }',
      '@supports (-webkit-touch-callout: none){ html{ height:-webkit-fill-available; } body{ min-height:-webkit-fill-available; } }'
    );

    /* ═══════════════════════════════════════════════════════════
       DEEP APP INTEGRATION LV1 (giữ)
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
      'body[data-theme]:not([data-theme="default"]) .app-header,',
      'body[data-theme]:not([data-theme="default"]) .cust-header{',
      '  border-bottom-color:var(--theme-border) !important;',
      '  box-shadow:0 4px 24px var(--theme-glow) !important;',
      '}'
    );

    /* ═══════════════════════════════════════════════════════════
       🚀 ĐỘT PHÁ #2: REAL GLASS CARD
       Card có backdrop-filter + inner highlight + conic border xoay
       ═══════════════════════════════════════════════════════════ */
    css.push(
      'body[data-theme]:not([data-theme="default"]) .glass-card{',
      '  background:linear-gradient(135deg, rgba(255,255,255,.06) 0%, rgba(255,255,255,.02) 100%), var(--theme-bg1) !important;',
      '  backdrop-filter:blur(20px) saturate(160%);',
      '  -webkit-backdrop-filter:blur(20px) saturate(160%);',
      '  box-shadow:',
      '    0 8px 32px rgba(0,0,0,.35),',
      '    inset 0 1px 0 rgba(255,255,255,.15),',
      '    inset 0 -1px 0 rgba(0,0,0,.15),',
      '    inset 0 0 40px var(--theme-glow) !important;',
      '}',
      'body[data-theme]:not([data-theme="default"]) .glass-card::after{',
      '  content:"";',
      '  position:absolute;',
      '  inset:0;',
      '  border-radius:inherit;',
      '  padding:1.5px;',
      '  background:conic-gradient(from 0deg, var(--theme-border), transparent 25%, var(--theme-border-soft) 50%, transparent 75%, var(--theme-border) 100%);',
      '  -webkit-mask:linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);',
      '  -webkit-mask-composite:xor;',
      '  mask-composite:exclude;',
      '  animation:border-rotate 8s linear infinite;',
      '  pointer-events:none;',
      '  opacity:.7;',
      '}',
      '@keyframes border-rotate{ to{ transform:rotate(360deg); } }',
      '@media (prefers-reduced-motion: reduce){',
      '  body[data-theme] .glass-card::after{ animation:none; }',
      '}'
    );

    /* ═══════════════════════════════════════════════════════════
       🚀 ĐỘT PHÁ #4: LOGO SHIMMER
       ═══════════════════════════════════════════════════════════ */
    css.push(
      'body[data-theme]:not([data-theme="default"]) .brand-title,',
      'body[data-theme]:not([data-theme="default"]) .logo-shimmer{',
      '  background:linear-gradient(90deg,',
      '    var(--theme-accent) 0%,',
      '    var(--theme-accent2) 25%,',
      '    #ffffff 50%,',
      '    var(--theme-accent2) 75%,',
      '    var(--theme-accent) 100%) !important;',
      '  background-size:200% auto !important;',
      '  -webkit-background-clip:text !important;',
      '  background-clip:text !important;',
      '  -webkit-text-fill-color:transparent !important;',
      '  animation:logo-shine 3.5s linear infinite !important;',
      '}',
      '@keyframes logo-shine{',
      '  0%   { background-position:-200% center; }',
      '  100% { background-position:200% center; }',
      '}'
    );

    /* ═══════════════════════════════════════════════════════════
       🚀 ĐỘT PHÁ #5: STATUS CHIP PULSE theo state
       ═══════════════════════════════════════════════════════════ */
    css.push(
      'body[data-theme]:not([data-theme="default"]) .state-pending{',
      '  border-color:var(--theme-border) !important;',
      '  background:var(--theme-border-soft) !important;',
      '  animation:chip-wait 2s ease-in-out infinite;',
      '}',
      '@keyframes chip-wait{',
      '  0%,100%{ box-shadow:0 0 0 var(--theme-glow); }',
      '  50%    { box-shadow:0 0 12px var(--theme-glow); }',
      '}',
      'body[data-theme]:not([data-theme="default"]) .state-cooking{',
      '  animation:chip-cook 1.4s ease-in-out infinite;',
      '}',
      '@keyframes chip-cook{',
      '  0%,100%{ box-shadow:0 0 0 transparent; }',
      '  50%    { box-shadow:0 0 18px rgba(255,107,107,.6); }',
      '}',
      'body[data-theme]:not([data-theme="default"]) .state-alert{',
      '  animation:chip-alert 1s ease-in-out infinite;',
      '}',
      '@keyframes chip-alert{',
      '  0%,100%{ transform:translateX(0); box-shadow:0 0 0 transparent; }',
      '  25%    { transform:translateX(-2px); box-shadow:0 0 16px rgba(239,68,68,.6); }',
      '  75%    { transform:translateX(2px);  box-shadow:0 0 16px rgba(239,68,68,.6); }',
      '}',
      'body[data-theme]:not([data-theme="default"]) .state-ready{',
      '  box-shadow:0 0 10px rgba(102,187,106,.5) !important;',
      '}'
    );

    /* ═══════════════════════════════════════════════════════════
       🚀 ĐỘT PHÁ #6: TIMELINE VISUAL cho order card
       Đường dọc nối các item
       ═══════════════════════════════════════════════════════════ */
    css.push(
      'body[data-theme]:not([data-theme="default"]) .order-slot{',
      '  position:relative;',
      '  padding-left:20px !important;',
      '  border-left-color:var(--theme-accent) !important;',
      '}',
      'body[data-theme]:not([data-theme="default"]) .order-slot::before{',
      '  content:"";',
      '  position:absolute;',
      '  left:6px;',
      '  top:8px;',
      '  bottom:8px;',
      '  width:2px;',
      '  background:linear-gradient(to bottom, var(--theme-accent), transparent);',
      '  opacity:.5;',
      '  border-radius:2px;',
      '}',
      'body[data-theme]:not([data-theme="default"]) .order-slot .item-row{',
      '  position:relative;',
      '}',
      'body[data-theme]:not([data-theme="default"]) .order-slot .item-row::before{',
      '  content:"";',
      '  position:absolute;',
      '  left:-18px;',
      '  top:50%;',
      '  transform:translateY(-50%);',
      '  width:6px;',
      '  height:6px;',
      '  border-radius:50%;',
      '  background:var(--theme-accent);',
      '  box-shadow:0 0 8px var(--theme-glow);',
      '}'
    );

    /* ═══════════════════════════════════════════════════════════
       🚀 ĐỘT PHÁ #8: BREATHING ORDER (>3 phút)
       ═══════════════════════════════════════════════════════════ */
    css.push(
      'body[data-theme]:not([data-theme="default"]) .order-card.breathe{',
      '  animation:breathe 4s ease-in-out infinite;',
      '}',
      '@keyframes breathe{',
      '  0%,100%{ transform:scale(1); }',
      '  50%    { transform:scale(1.005); }',
      '}',
      '@media (prefers-reduced-motion: reduce){',
      '  body[data-theme] .order-card.breathe{ animation:none; }',
      '}'
    );

    /* ═══════════════════════════════════════════════════════════
       DEEP APP LV2 (giữ từ v7.1)
       ═══════════════════════════════════════════════════════════ */
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
      '}',
      'body[data-theme]:not([data-theme="default"]) .qty-control{',
      '  border-color:var(--theme-border) !important;',
      '  box-shadow:0 0 12px var(--theme-glow) !important;',
      '  transition:box-shadow .3s ease, border-color .3s ease !important;',
      '}',
      'body[data-theme]:not([data-theme="default"]) .qty-control .qty-num{',
      '  color:var(--theme-accent) !important;',
      '  text-shadow:0 0 8px var(--theme-glow);',
      '}',
      'body[data-theme]:not([data-theme="default"]) .menu-card h3{',
      '  transition:color .3s ease, text-shadow .3s ease !important;',
      '}',
      'body[data-theme]:not([data-theme="default"]) .menu-card:hover h3{',
      '  color:var(--theme-accent) !important;',
      '  text-shadow:0 0 12px var(--theme-glow);',
      '}',
      'body[data-theme]:not([data-theme="default"]) .search-input,',
      'body[data-theme]:not([data-theme="default"]) input[type="text"]:focus,',
      'body[data-theme]:not([data-theme="default"]) input[type="number"]:focus,',
      'body[data-theme]:not([data-theme="default"]) textarea:focus,',
      'body[data-theme]:not([data-theme="default"]) select:focus{',
      '  border-color:var(--theme-border) !important;',
      '  box-shadow:0 0 0 2px var(--theme-glow), 0 0 16px var(--theme-glow) !important;',
      '  outline:none !important;',
      '}',
      'body[data-theme]:not([data-theme="default"]) .cat-btn:hover{',
      '  border-color:var(--theme-border) !important;',
      '  box-shadow:0 0 12px var(--theme-glow);',
      '}',
      'body[data-theme]:not([data-theme="default"]) .table-display-box{',
      '  border-color:var(--theme-border) !important;',
      '  box-shadow:0 0 14px var(--theme-glow), inset 0 0 10px var(--theme-glow) !important;',
      '}',
      'body[data-theme]:not([data-theme="default"]) #current-table-display{',
      '  color:var(--theme-accent) !important;',
      '  text-shadow:0 0 10px var(--theme-glow);',
      '}',
      'body[data-theme]:not([data-theme="default"]) .empty-state h4{',
      '  color:var(--theme-accent) !important;',
      '  text-shadow:0 0 10px var(--theme-glow);',
      '}',
      'body[data-theme]:not([data-theme="default"]) .empty-state p{ color:var(--theme-accent2) !important; }',
      'body[data-theme]:not([data-theme="default"]) .skeleton{',
      '  background:linear-gradient(90deg, rgba(255,255,255,.04) 25%, var(--theme-border-soft) 50%, rgba(255,255,255,.04) 75%) !important;',
      '  background-size:200% 100% !important;',
      '}',
      'body[data-theme]:not([data-theme="default"]) #hb-progress{',
      '  stroke:var(--theme-accent) !important;',
      '  filter:drop-shadow(0 0 4px var(--theme-glow));',
      '}',
      'body[data-theme]:not([data-theme="default"]) #heartbeat-count{',
      '  color:var(--theme-accent) !important;',
      '  text-shadow:0 0 10px var(--theme-glow);',
      '}',
      'body[data-theme]:not([data-theme="default"]) #peak-alert{',
      '  background:var(--theme-accent) !important;',
      '  color:#0a2b28 !important;',
      '  box-shadow:0 0 20px var(--theme-glow) !important;',
      '}',
      'body[data-theme]:not([data-theme="default"]) .order-slot.done{ border-left-color:#6ee7b7 !important; }',
      'body[data-theme]:not([data-theme="default"]) .order-slot.prep{ border-left-color:#fb7185 !important; }',
      'body[data-theme]:not([data-theme="default"]) .modal-header-icon{',
      '  border-color:var(--theme-border) !important;',
      '  box-shadow:0 0 20px var(--theme-glow), inset 0 0 12px var(--theme-glow) !important;',
      '}',
      'body[data-theme]:not([data-theme="default"]) #cart-items-list > div{',
      '  border-color:var(--theme-border-soft) !important;',
      '  transition:border-color .3s ease, box-shadow .3s ease !important;',
      '}',
      'body[data-theme]:not([data-theme="default"]) #cart-items-list > div:hover{',
      '  border-color:var(--theme-border) !important;',
      '  box-shadow:0 0 12px var(--theme-glow);',
      '}',
      'body[data-theme]:not([data-theme="default"]) #stat-total,',
      'body[data-theme]:not([data-theme="default"]) #stat-done{',
      '  text-shadow:0 0 15px var(--theme-glow);',
      '}',
      'body[data-theme]:not([data-theme="default"]) #stat-pending{',
      '  color:var(--theme-accent) !important;',
      '  text-shadow:0 0 15px var(--theme-glow);',
      '}',
      'body[data-theme]:not([data-theme="default"]) .filter-chip{',
      '  border-color:var(--theme-border-soft) !important;',
      '  transition:border-color .3s, background .3s !important;',
      '}',
      'body[data-theme]:not([data-theme="default"]) .filter-chip:hover{',
      '  border-color:var(--theme-border) !important;',
      '}',
      'body[data-theme]:not([data-theme="default"]) .qty-badge{',
      '  background:linear-gradient(135deg,var(--theme-accent),var(--theme-accent2)) !important;',
      '  color:#0a2b28 !important;',
      '  box-shadow:0 0 8px var(--theme-glow);',
      '}',
      'body[data-theme]:not([data-theme="default"]) .icon-badge{',
      '  border-color:var(--theme-border) !important;',
      '  background:linear-gradient(135deg,var(--theme-border-soft),transparent) !important;',
      '}',
      'body[data-theme]:not([data-theme="default"]) .brand-title{',
      '  filter:drop-shadow(0 2px 10px var(--theme-glow)) !important;',
      '}'
    );

    /* ═══════════════════════════════════════════════════════════
       PER-THEME CORNER ICONS
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
     🚀 ĐỘT PHÁ #3: 3D TILT + #7 THEME RIPPLE (JS)
     ============================================================ */
  function initTilt(){
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (window.innerWidth < 900) return;  /* chỉ PC */

    document.addEventListener('mousemove', function(e){
      var card = e.target.closest('.menu-card');
      if (!card) {
        document.querySelectorAll('.menu-card.tilting').forEach(function(c){
          c.style.transform = '';
          c.classList.remove('tilting');
        });
        return;
      }
      var r = card.getBoundingClientRect();
      var cx = (e.clientX - r.left) / r.width - 0.5;
      var cy = (e.clientY - r.top) / r.height - 0.5;
      var rx = (-cy * 8).toFixed(2);
      var ry = (cx * 8).toFixed(2);
      card.style.transform = 'perspective(800px) rotateX(' + rx + 'deg) rotateY(' + ry + 'deg) translateZ(6px) scale(1.015)';
      card.classList.add('tilting');
    }, { passive:true });

    document.addEventListener('mouseleave', function(){
      document.querySelectorAll('.menu-card.tilting').forEach(function(c){
        c.style.transform = '';
        c.classList.remove('tilting');
      });
    });
  }

  function initThemeRipple(){
    document.addEventListener('click', function(e){
      var btn = e.target.closest('button, .btn-select, .cat-btn, .filter-chip');
      if (!btn) return;
      var r = btn.getBoundingClientRect();
      var size = Math.max(r.width, r.height);
      var span = document.createElement('span');
      span.className = 'theme-ripple';
      span.style.cssText =
        'position:absolute;border-radius:50%;pointer-events:none;' +
        'width:' + size + 'px;height:' + size + 'px;' +
        'left:' + (e.clientX - r.left - size / 2) + 'px;' +
        'top:' + (e.clientY - r.top - size / 2) + 'px;' +
        'background:radial-gradient(circle, var(--theme-accent) 0%, transparent 70%);' +
        'opacity:.5;transform:scale(0);' +
        'animation:theme-ripple-anim .6s ease-out;' +
        'z-index:0;';
      if (getComputedStyle(btn).position === 'static'){
        btn.style.position = 'relative';
      }
      btn.appendChild(span);
      setTimeout(function(){ span.remove(); }, 620);
    }, true);

    /* Inject keyframe */
    var kf = document.createElement('style');
    kf.textContent = '@keyframes theme-ripple-anim{ to{ transform:scale(4); opacity:0; } }';
    document.head.appendChild(kf);
  }

  /* ═══════════════════════════════════════════════════════════
     🚀 ĐỘT PHÁ #8: Đánh dấu order card cần "thở"
     Quét DOM mỗi 30s — nếu đơn > 3 phút → thêm class breathe
     ═══════════════════════════════════════════════════════════ */
  function markBreathingOrders(){
    var cards = document.querySelectorAll('.order-card');
    if (!cards.length) return;
    var now = Date.now();
    cards.forEach(function(card){
      var timeEl = card.querySelector('[class*="tabular"]');
      if (!timeEl) return;
      var m = timeEl.textContent.match(/(\d{1,2}):(\d{2})/);
      if (!m) return;
      var cardMins = parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
      var nowMins = new Date().getHours() * 60 + new Date().getMinutes();
      var diff = nowMins - cardMins;
      if (diff < 0) diff += 1440;
      if (diff >= 3 && diff < 60){
        card.classList.add('breathe');
      } else {
        card.classList.remove('breathe');
      }
    });
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
       '<div class="tbi-scene" aria-hidden="true"></div>' +
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
    var scene = el.querySelector('.tbi-scene');
    if (!aura || !emoji || !fw || !scene) return;
    if (el.getAttribute('data-scene') !== themeKey){
      renderThemeScene(themeKey,scene);
      el.setAttribute('data-scene',themeKey);
    }
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
  document.addEventListener('visibilitychange',function(){
    var holder=document.querySelector('#themeBigIcon .tbi-scene');
    if (!holder) return;
    Array.prototype.forEach.call(holder.children,function(node){node.style.animationPlayState=document.hidden?'paused':'running';});
  });
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
    root.style.setProperty('--theme-aurora1',     t.aurora1 || 'rgba(78,205,196,.18)');
    root.style.setProperty('--theme-aurora2',     t.aurora2 || 'rgba(244,184,66,.14)');
    root.style.setProperty('--theme-aurora3',     t.aurora3 || 'rgba(111,195,191,.12)');
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
    initTilt();
    initThemeRipple();

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

    /* Đánh dấu order "thở" mỗi 30s */
    setTimeout(markBreathingOrders, 3000);
    setInterval(markBreathingOrders, 30000);
  }

  window.ThemeSystem = {
    version:    '7.2',
    setTheme:   function(key){ applyTheme(key); },
    getCurrent: function(){ return state.currentTheme; },
    listThemes: function(){ return Object.keys(THEMES); },
    detect:     detectThemeByDate,
    getThemes:  function(){ return THEMES; }
  };

  if (document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded', init);
  else init();

  console.log('%c🚀 THEME SYSTEM v7.2 — REVOLUTIONARY',
    'background:linear-gradient(90deg,#FF1493,#FFD700);color:#fff;font-size:12px;padding:4px 10px;border-radius:4px;font-weight:900');
})();
