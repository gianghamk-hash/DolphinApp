/* ============================================================
   DOLPHIN CLOCK EXTRAS v2.0 — MOON PHASE ONLY
   ─────────────────────────────────────────────────────────────
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

  /* ═══════════ MOON PHASE ═══════════ */
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
    if (document.getElementById('hclockMoonStyles')) return;
    var style = document.createElement('style');
    style.id = 'hclockMoonStyles';
    style.textContent = [
      '#halongClock .hclock-moon{',
      '  display:flex;',
      '  align-items:center;',
      '  gap:4px;',
      '  margin-top:4px;',
      '  font-size:clamp(.6rem, 1.3vw, .72rem);',
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
      '  font-size:1.2em;',
      '  filter:drop-shadow(0 0 6px rgba(244,184,66,.5));',
      '  -webkit-filter:drop-shadow(0 0 6px rgba(244,184,66,.5));',
      '  flex-shrink:0;',
      '  transition:filter .5s ease;',
      '}',
      '#halongClock .hclock-moon .moon-name{',
      '  opacity:.85;',
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

      '@media(max-width:480px){',
      '  #halongClock .hclock-moon{ font-size:.58rem; margin-top:3px; }',
      '}'
    ].join('\n');
    document.head.appendChild(style);
  }

  /* ═══════════ INJECT MOON LINE ═══════════ */
  function injectMoonLine(){
    var body = document.querySelector('#halongClock .hclock-body');
    if (!body) return false;
    if (body.querySelector('.hclock-moon')) return true;

    var moon = document.createElement('div');
    moon.className = 'hclock-moon';
    moon.id = 'hclockMoon';
    moon.textContent = '🌕 · --%';
    body.appendChild(moon);
    return true;
  }

  /* ═══════════ UPDATE MOON ═══════════ */
  function updateMoon(){
    var el = document.getElementById('hclockMoon');
    if (!el) return;
    var moon = getMoonPhase();
    el.innerHTML =
      '<span class="moon-icon">' + moon.emoji + '</span>' +
      '<span class="moon-name">' + moon.name + '</span>' +
      '<span class="moon-sep">·</span>' +
      '<span class="moon-illum">' + moon.illum + '%</span>';
    el.setAttribute('title',
      'Trăng ' + moon.age.toFixed(1) + ' ngày tuổi · ' + moon.tide);
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
        if (injectMoonLine()){
          injected = true;
          updateMoon();
        }
      }
    }

    retries.forEach(function(t){ setTimeout(tryInject, t); });

    /* Update mỗi 30 phút (moon phase thay đổi rất chậm) */
    setInterval(updateMoon, 30 * 60 * 1000);
  }

  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  console.log('%c🌕 MOON PHASE LOADED',
    'background:linear-gradient(90deg,#FBD77A,#F4B842);color:#0a2b28;font-size:11px;padding:3px 8px;border-radius:4px;font-weight:900');
})();
