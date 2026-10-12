/* ============================================================
   DOLPHIN CLOCK EXTRAS — A3 + A5
   ─────────────────────────────────────────────────────────────
   • A3: Aura Progress Ring quanh đồng hồ (tiến độ ca làm việc)
   • A5: Moon Phase Widget (trăng + thủy triều)
   ─────────────────────────────────────────────────────────────
   Tự inject vào #halongClock — không cần sửa HTML
   ============================================================ */
(function(){
  'use strict';

  /* ═══════════ CONFIG ═══════════ */
  var SYNODIC_DAYS = 29.530588853;
  var KNOWN_NEW_MOON = Date.UTC(2000, 0, 6, 18, 14, 0);
  var DAY_MS = 86400000;

  /* Ca làm việc VN (phút kể từ 00:00) */
  var SHIFTS = [
    { name: 'Ca sáng', start: 9*60,      end: 11*60 + 30 },
    { name: 'Ca chiều', start: 14*60,     end: 17*60 + 30 },
    { name: 'Ca tối',  start: 18*60,     end: 20*60      }
  ];

  /* ═══════════ HELPERS ═══════════ */
  function getVNTime(){
    var parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Ho_Chi_Minh',
      hour: '2-digit', minute: '2-digit', hour12: false
    }).formatToParts(new Date());
    var h = 0, m = 0;
    for (var i = 0; i < parts.length; i++){
      var p = parts[i];
      if (p.type === 'hour')   h = parseInt(p.value, 10);
      if (p.type === 'minute') m = parseInt(p.value, 10);
    }
    if (h === 24) h = 0;
    return { h: h, m: m, total: h * 60 + m };
  }

  function formatDuration(mins){
    if (mins <= 0) return 'sắp hết';
    if (mins < 60) return mins + ' phút';
    var h = Math.floor(mins / 60);
    var m = mins % 60;
    return h + 'h' + (m > 0 ? m + 'p' : '');
  }

  /* ═══════════ A3 — SHIFT PROGRESS ═══════════ */
  function getShiftProgress(){
    var now = getVNTime().total;

    /* Đang trong ca? */
    for (var i = 0; i < SHIFTS.length; i++){
      var s = SHIFTS[i];
      if (now >= s.start && now <= s.end){
        var progress = (now - s.start) / (s.end - s.start);
        return {
          shift: s,
          progress: Math.max(0, Math.min(1, progress)),
          remaining: s.end - now,
          state: 'in'
        };
      }
    }

    /* Ngoài ca — tìm ca kế tiếp */
    var next = null, minWait = Infinity;
    for (var j = 0; j < SHIFTS.length; j++){
      var s2 = SHIFTS[j];
      var wait = s2.start - now;
      if (wait < 0) wait += 24 * 60;
      if (wait < minWait){ minWait = wait; next = s2; }
    }

    return {
      shift: next,
      progress: 0,
      remaining: minWait,
      state: 'out'
    };
  }

  /* ═══════════ A5 — MOON PHASE ═══════════ */
  function getMoonPhase(){
    var days = (Date.now() - KNOWN_NEW_MOON) / DAY_MS;
    var phase = ((days / SYNODIC_DAYS) % 1 + 1) % 1;
    var age = phase * SYNODIC_DAYS;

    var emoji, name;
    if      (age < 1.85)  { emoji = '🌑'; name = 'Trăng non'; }
    else if (age < 5.54)  { emoji = '🌒'; name = 'Lưỡi liềm đầu'; }
    else if (age < 9.23)  { emoji = '🌓'; name = 'Bán nguyệt đầu'; }
    else if (age < 12.91) { emoji = '🌔'; name = 'Khuyết đầu'; }
    else if (age < 16.61) { emoji = '🌕'; name = 'Trăng tròn'; }
    else if (age < 20.30) { emoji = '🌖'; name = 'Khuyết sau'; }
    else if (age < 23.99) { emoji = '🌗'; name = 'Bán nguyệt sau'; }
    else if (age < 27.68) { emoji = '🌘'; name = 'Lưỡi liềm sau'; }
    else                  { emoji = '🌑'; name = 'Trăng non'; }

    /* % chiếu sáng */
    var illum = (1 - Math.cos(2 * Math.PI * phase)) / 2 * 100;

    /* Thủy triều ước lượng */
    var tideVal = Math.abs(Math.cos(2 * Math.PI * phase));
    var tide;
    if      (tideVal > 0.75) tide = 'Cường triều';
    else if (tideVal > 0.40) tide = 'Bình thường';
    else                     tide = 'Tạp triều';

    return {
      emoji: emoji,
      name: name,
      illum: Math.round(illum),
      age: age,
      tide: tide
    };
  }

  /* ═══════════ INJECT CSS ═══════════ */
  function injectStyles(){
    if (document.getElementById('hclockExtrasStyles')) return;
    var style = document.createElement('style');
    style.id = 'hclockExtrasStyles';
    style.textContent = [
      /* Đảm bảo clock có position relative cho ring absolute */
      '#halongClock{ position:relative; }',

      /* SVG ring */
      '#halongClock .hclock-ring-svg{',
      '  position:absolute;',
      '  top:0; left:0;',
      '  width:100%; height:100%;',
      '  pointer-events:none;',
      '  z-index:5;',
      '  overflow:visible;',
      '}',

      '#halongClock .hclock-ring-bg{',
      '  transition:stroke .5s ease;',
      '}',

      '#halongClock .hclock-ring-fg{',
      '  transition:stroke-dashoffset 1s linear,',
      '             stroke .5s ease,',
      '             opacity .5s ease;',
      '  filter:drop-shadow(0 0 6px currentColor);',
      '  -webkit-filter:drop-shadow(0 0 6px currentColor);',
      '}',

      '#halongClock .hclock-ring-fg.ring-pulse{',
      '  animation:ringPulse 1.6s ease-in-out infinite;',
      '}',

      '@keyframes ringPulse{',
      '  0%,100%{ opacity:.6; }',
      '  50%    { opacity:1; }',
      '}',

      /* Moon line */
      '#halongClock .hclock-moon{',
      '  display:flex;',
      '  align-items:center;',
      '  gap:4px;',
      '  margin-top:3px;',
      '  font-size:clamp(.6rem, 1.3vw, .7rem);',
      '  font-weight:800;',
      '  color:#bfe9dc;',
      '  letter-spacing:.03em;',
      '  opacity:.92;',
      '  transition:color 1s ease;',
      '  line-height:1.2;',
      '  white-space:nowrap;',
      '  overflow:hidden;',
      '  text-overflow:ellipsis;',
      '}',
      '#halongClock .hclock-moon .moon-icon{',
      '  font-size:1.15em;',
      '  filter:drop-shadow(0 0 6px rgba(244,184,66,.5));',
      '  flex-shrink:0;',
      '}',
      '#halongClock .hclock-moon .moon-sep{',
      '  opacity:.5;',
      '  margin:0 1px;',
      '}',
      '#halongClock .hclock-moon .moon-illum{',
      '  color:var(--theme-accent, #FBD77A);',
      '  font-family:"Fraunces","Nunito",serif;',
      '  font-weight:900;',
      '  font-variant-numeric:tabular-nums;',
      '  transition:color 1s ease;',
      '}',

      /* Shift line */
      '#halongClock .hclock-shift{',
      '  display:block;',
      '  margin-top:2px;',
      '  font-size:clamp(.58rem, 1.2vw, .68rem);',
      '  font-weight:700;',
      '  color:var(--theme-accent, #FBD77A);',
      '  letter-spacing:.03em;',
      '  opacity:.85;',
      '  font-variant-numeric:tabular-nums;',
      '  transition:color 1s ease;',
      '  white-space:nowrap;',
      '  overflow:hidden;',
      '  text-overflow:ellipsis;',
      '}',

      /* Mobile */
      '@media(max-width:480px){',
      '  #halongClock .hclock-moon{ font-size:.55rem; margin-top:2px; }',
      '  #halongClock .hclock-shift{ font-size:.55rem; }',
      '}',

      /* Reduce motion */
      '@media(prefers-reduced-motion:reduce){',
      '  #halongClock .hclock-ring-fg{ transition:none; }',
      '  #halongClock .hclock-ring-fg.ring-pulse{ animation:none; }',
      '}'
    ].join('\n');
    document.head.appendChild(style);
  }

  /* ═══════════ INJECT SVG RING ═══════════ */
  function injectRing(){
    var clock = document.getElementById('halongClock');
    if (!clock) return false;
    if (clock.querySelector('.hclock-ring-svg')) return true;

    var NS = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('class', 'hclock-ring-svg');
    svg.setAttribute('preserveAspectRatio', 'none');
    svg.setAttribute('aria-hidden', 'true');

    var bg = document.createElementNS(NS, 'rect');
    bg.setAttribute('class', 'hclock-ring-bg');
    bg.setAttribute('fill', 'none');
    bg.setAttribute('stroke', 'rgba(244,184,66,0.10)');
    bg.setAttribute('stroke-width', '2');

    var fg = document.createElementNS(NS, 'rect');
    fg.setAttribute('class', 'hclock-ring-fg');
    fg.setAttribute('fill', 'none');
    fg.setAttribute('stroke-width', '3');
    fg.setAttribute('stroke-linecap', 'round');

    svg.appendChild(bg);
    svg.appendChild(fg);
    clock.insertBefore(svg, clock.firstChild);
    return true;
  }

  /* ═══════════ INJECT INFO LINES ═══════════ */
  function injectInfoLines(){
    var body = document.querySelector('#halongClock .hclock-body');
    if (!body) return false;

    if (!body.querySelector('.hclock-moon')){
      var moon = document.createElement('div');
      moon.className = 'hclock-moon';
      moon.id = 'hclockMoon';
      moon.textContent = '🌕 · --%';
      body.appendChild(moon);
    }

    if (!body.querySelector('.hclock-shift')){
      var shift = document.createElement('div');
      shift.className = 'hclock-shift';
      shift.id = 'hclockShift';
      shift.textContent = '⏱️ --';
      body.appendChild(shift);
    }
    return true;
  }

  /* ═══════════ UPDATE RING ═══════════ */
  function updateRing(){
    var clock = document.getElementById('halongClock');
    if (!clock) return;

    var w = clock.offsetWidth;
    var h = clock.offsetHeight;
    if (!w || !h) return;

    var svg = clock.querySelector('.hclock-ring-svg');
    if (!svg) return;

    var pad = 3;
    var rectW = w - pad * 2;
    var rectH = h - pad * 2;
    var r = 16;

    svg.setAttribute('viewBox', '0 0 ' + w + ' ' + h);
    svg.setAttribute('width', w);
    svg.setAttribute('height', h);

    var bg = svg.querySelector('.hclock-ring-bg');
    var fg = svg.querySelector('.hclock-ring-fg');
    if (!bg || !fg) return;

    [bg, fg].forEach(function(el){
      el.setAttribute('x', pad);
      el.setAttribute('y', pad);
      el.setAttribute('width', rectW);
      el.setAttribute('height', rectH);
      el.setAttribute('rx', r);
      el.setAttribute('ry', r);
    });

    /* Chu vi rounded rectangle */
    var perimeter = 2 * (rectW + rectH) - 8 * r + 2 * Math.PI * r;

    var prog = getShiftProgress();
    var offset = perimeter * (1 - prog.progress);

    fg.style.strokeDasharray = perimeter;
    fg.style.strokeDashoffset = offset;

    /* Màu theme + trạng thái */
    if (prog.state === 'out'){
      fg.style.opacity = '0.25';
      fg.classList.remove('ring-pulse');
    } else if (prog.remaining < 30){
      /* Sắp hết ca (<30 phút) → pulse */
      fg.style.opacity = '1';
      fg.classList.add('ring-pulse');
    } else {
      fg.style.opacity = '0.85';
      fg.classList.remove('ring-pulse');
    }
  }

  /* ═══════════ UPDATE MOON + SHIFT TEXT ═══════════ */
  function updateMoon(){
    var el = document.getElementById('hclockMoon');
    if (!el) return;
    var moon = getMoonPhase();
    el.innerHTML =
      '<span class="moon-icon">' + moon.emoji + '</span>' +
      '<span class="moon-name">' + moon.name + '</span>' +
      '<span class="moon-sep">·</span>' +
      '<span class="moon-illum">' + moon.illum + '%</span>';
    el.setAttribute('title', 'Trăng ' + moon.age.toFixed(1) + ' ngày tuổi · ' + moon.tide);
  }

  function updateShiftText(){
    var el = document.getElementById('hclockShift');
    if (!el) return;
    var prog = getShiftProgress();
    var txt;
    if (prog.state === 'in'){
      txt = '⏱️ ' + prog.shift.name + ' · còn ' + formatDuration(prog.remaining);
    } else {
      txt = '⏱️ ' + prog.shift.name + ' sau ' + formatDuration(prog.remaining);
    }
    el.textContent = txt;
  }

  /* ═══════════ INIT ═══════════ */
  function init(){
    /* Chỉ chạy trên landing */
    if (!document.getElementById('landing')) return;

    injectStyles();

    /* Retry cho iOS Safari (DOM xong muộn) */
    var injected = false;
    var retries = [0, 100, 300, 600, 1200, 2000];

    function tryInject(){
      if (!injected){
        if (injectRing() && injectInfoLines()){
          injected = true;
          updateRing();
          updateMoon();
          updateShiftText();
        }
      } else {
        updateRing();
      }
    }

    retries.forEach(function(t){ setTimeout(tryInject, t); });

    /* Update định kỳ mỗi 30s */
    setInterval(function(){
      updateRing();
      updateMoon();
      updateShiftText();
    }, 30000);

    /* Update khi resize / xoay máy */
    var rt = null;
    window.addEventListener('resize', function(){
      if (rt) clearTimeout(rt);
      rt = setTimeout(updateRing, 150);
    });
    window.addEventListener('orientationchange', function(){
      setTimeout(updateRing, 400);
    });

    /* Update khi theme đổi */
    try {
      var bc = new BroadcastChannel('dolphin-theme');
      bc.addEventListener('message', function(){
        setTimeout(updateRing, 100);
      });
    } catch(e){}
  }

  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  console.log('%c🌕 CLOCK EXTRAS LOADED',
    'background:linear-gradient(90deg,#FBD77A,#F4B842);color:#0a2b28;font-size:11px;padding:3px 8px;border-radius:4px;font-weight:900');
})();
