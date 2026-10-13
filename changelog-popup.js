/* ============================================================
   DOLPHIN CHANGELOG POPUP
   ─────────────────────────────────────────────────────────────
   - Hiện "Có gì mới?" khi version thay đổi
   - Chỉ hiện 1 lần cho mỗi version
   - Chỉ chạy trên landing
   - Không ảnh hưởng chức năng app
   ============================================================ */
(function(){
  'use strict';

  var LS_KEY = 'dolphin_seen_version';
  var CHANGELOG_URL = '/DolphinApp/changelog.json';

  /* Delay trước khi hiện popup (cho landing ổn định) */
  var SHOW_DELAY = 1500;

  /* ═══════════ CHECK SHOULD SHOW ═══════════ */
  function shouldShow(){
    /* Chỉ landing */
    if (!document.getElementById('landing')) return false;

    /* Không phải iframe */
    try { if (window.parent !== window) return false; } catch(e){}

    /* Đã xem version này chưa? */
    var currentVersion = window.__DOLPHIN_VERSION__ || null;
    if (!currentVersion){
      /* Thử đọc từ meta tag */
      var meta = document.querySelector('meta[name="dolphin-version"]');
      if (meta) currentVersion = meta.content;
    }

    /* Fallback: fetch /version.json */
    return { need: true, currentVersion: currentVersion };
  }

  /* ═══════════ INJECT CSS ═══════════ */
  function injectStyles(){
    if (document.getElementById('dolphinChangelogStyles')) return;
    var s = document.createElement('style');
    s.id = 'dolphinChangelogStyles';
    s.textContent = [
      /* Backdrop */
      '#dchangelogBackdrop{',
      '  position:fixed;inset:0;z-index:99998;',
      '  background:rgba(0,0,0,.7);',
      '  backdrop-filter:blur(6px);',
      '  -webkit-backdrop-filter:blur(6px);',
      '  opacity:0;pointer-events:none;',
      '  transition:opacity .4s ease;',
      '}',
      '#dchangelogBackdrop.show{ opacity:1;pointer-events:auto; }',

      /* Modal */
      '#dchangelogModal{',
      '  position:fixed;z-index:99999;',
      '  top:50%;left:50%;',
      '  transform:translate(-50%,-50%) scale(.92);',
      '  width:min(92vw,520px);',
      '  max-height:85vh;',
      '  background:linear-gradient(160deg,#0f3d38 0%,#0a2b28 100%);',
      '  border:2px solid var(--theme-border, #FBD77A);',
      '  border-radius:22px;',
      '  box-shadow:0 30px 80px rgba(0,0,0,.85),',
      '             0 0 60px var(--theme-glow, rgba(244,184,66,.4));',
      '  opacity:0;pointer-events:none;',
      '  transition:opacity .35s ease, transform .4s cubic-bezier(.16,1,.3,1);',
      '  font-family:"Nunito",-apple-system,sans-serif;',
      '  overflow:hidden;',
      '}',
      '#dchangelogModal.show{',
      '  opacity:1;pointer-events:auto;',
      '  transform:translate(-50%,-50%) scale(1);',
      '}',

      /* Header */
      '#dchangelogModal .dcl-head{',
      '  padding:20px 24px 16px;',
      '  border-bottom:1px solid rgba(244,184,66,.2);',
      '  display:flex;align-items:center;gap:14px;',
      '  background:linear-gradient(135deg,rgba(244,184,66,.15),transparent);',
      '}',
      '#dchangelogModal .dcl-icon{',
      '  font-size:36px;line-height:1;flex-shrink:0;',
      '  filter:drop-shadow(0 0 20px var(--theme-glow, rgba(244,184,66,.8)));',
      '  animation:dclBounce 2s ease-in-out infinite;',
      '}',
      '@keyframes dclBounce{',
      '  0%,100%{ transform:translateY(0) rotate(-5deg); }',
      '  50%    { transform:translateY(-6px) rotate(5deg); }',
      '}',
      '#dchangelogModal .dcl-title-box{ flex:1;min-width:0; }',
      '#dchangelogModal .dcl-title{',
      '  font-family:"Fraunces","Nunito",serif;',
      '  font-size:19px;font-weight:900;',
      '  color:var(--theme-accent, #FBD77A);',
      '  letter-spacing:.05em;line-height:1.2;',
      '  text-shadow:0 0 16px var(--theme-glow, rgba(244,184,66,.5));',
      '  margin-bottom:4px;',
      '}',
      '#dchangelogModal .dcl-version{',
      '  display:inline-flex;align-items:center;gap:6px;',
      '  font-size:11px;font-weight:900;',
      '  color:#fff;',
      '  background:linear-gradient(135deg,var(--theme-accent, #FBD77A),var(--theme-accent2, #bfe9dc));',
      '  padding:3px 10px;border-radius:99px;',
      '  letter-spacing:.08em;',
      '}',
      '#dchangelogModal .dcl-close{',
      '  flex-shrink:0;',
      '  width:32px;height:32px;border-radius:50%;',
      '  background:rgba(255,255,255,.08);',
      '  border:1px solid rgba(244,184,66,.25);',
      '  color:var(--theme-accent, #FBD77A);',
      '  font-size:14px;font-weight:900;',
      '  cursor:pointer;display:flex;align-items:center;justify-content:center;',
      '  transition:transform .15s, background .2s;',
      '  font-family:inherit;padding:0;',
      '}',
      '#dchangelogModal .dcl-close:hover{',
      '  background:rgba(244,184,66,.2);',
      '  transform:scale(1.1);',
      '}',

      /* Body */
      '#dchangelogModal .dcl-body{',
      '  padding:20px 24px;',
      '  max-height:calc(85vh - 180px);',
      '  overflow-y:auto;',
      '  scrollbar-width:thin;',
      '  scrollbar-color:rgba(244,184,66,.4) transparent;',
      '}',
      '#dchangelogModal .dcl-body::-webkit-scrollbar{ width:5px; }',
      '#dchangelogModal .dcl-body::-webkit-scrollbar-thumb{',
      '  background:rgba(244,184,66,.4);',
      '  border-radius:99px;',
      '}',

      /* Subtitle */
      '#dchangelogModal .dcl-subtitle{',
      '  font-size:12.5px;color:#bfe9dc;font-weight:700;',
      '  line-height:1.55;',
      '  margin-bottom:16px;',
      '  padding:10px 14px;',
      '  background:rgba(244,184,66,.08);',
      '  border-left:3px solid var(--theme-accent, #FBD77A);',
      '  border-radius:8px;',
      '}',

      /* List */
      '#dchangelogModal .dcl-list{',
      '  display:flex;flex-direction:column;gap:10px;',
      '}',
      '#dchangelogModal .dcl-item{',
      '  display:flex;align-items:flex-start;gap:10px;',
      '  padding:10px 12px;',
      '  background:rgba(0,0,0,.22);',
      '  border:1px solid rgba(244,184,66,.15);',
      '  border-radius:12px;',
      '  font-size:12.5px;',
      '  color:#fff;',
      '  font-weight:700;',
      '  line-height:1.5;',
      '  transition:border-color .2s, background .2s;',
      '}',
      '#dchangelogModal .dcl-item:hover{',
      '  border-color:rgba(244,184,66,.4);',
      '  background:rgba(244,184,66,.06);',
      '}',
      '#dchangelogModal .dcl-bullet{',
      '  flex-shrink:0;font-size:14px;line-height:1.5;',
      '}',

      /* Stats */
      '#dchangelogModal .dcl-stats{',
      '  display:grid;grid-template-columns:repeat(3,1fr);',
      '  gap:8px;margin-top:16px;',
      '}',
      '#dchangelogModal .dcl-stat{',
      '  text-align:center;padding:8px 4px;',
      '  background:rgba(244,184,66,.08);',
      '  border:1px solid rgba(244,184,66,.2);',
      '  border-radius:10px;',
      '}',
      '#dchangelogModal .dcl-stat-val{',
      '  font-family:"Fraunces","Nunito",serif;',
      '  font-size:18px;font-weight:900;',
      '  color:var(--theme-accent, #FBD77A);',
      '  line-height:1;',
      '}',
      '#dchangelogModal .dcl-stat-lbl{',
      '  font-size:9.5px;font-weight:800;',
      '  color:#bfe9dc;opacity:.75;',
      '  text-transform:uppercase;letter-spacing:.08em;',
      '  margin-top:4px;',
      '}',

      /* Footer */
      '#dchangelogModal .dcl-foot{',
      '  padding:14px 24px 20px;',
      '  border-top:1px solid rgba(244,184,66,.15);',
      '  display:flex;gap:10px;',
      '}',
      '#dchangelogModal .dcl-btn{',
      '  flex:1;',
      '  padding:13px 18px;',
      '  border-radius:14px;',
      '  border:none;',
      '  font-family:inherit;',
      '  font-size:12.5px;',
      '  font-weight:900;',
      '  letter-spacing:.08em;',
      '  text-transform:uppercase;',
      '  cursor:pointer;',
      '  transition:transform .15s, box-shadow .2s, background .2s;',
      '}',
      '#dchangelogModal .dcl-btn:active{ transform:scale(.97); }',
      '#dchangelogModal .dcl-btn-primary{',
      '  background:linear-gradient(135deg,var(--theme-accent, #FBD77A),var(--theme-accent2, #bfe9dc));',
      '  color:#0a2b28;',
      '  box-shadow:0 6px 20px var(--theme-glow, rgba(244,184,66,.5));',
      '}',
      '#dchangelogModal .dcl-btn-primary:hover{',
      '  box-shadow:0 8px 28px var(--theme-glow, rgba(244,184,66,.7));',
      '}',

      '@media(max-width:520px){',
      '  #dchangelogModal .dcl-head{ padding:16px 18px 12px; }',
      '  #dchangelogModal .dcl-icon{ font-size:28px; }',
      '  #dchangelogModal .dcl-title{ font-size:16px; }',
      '  #dchangelogModal .dcl-body{ padding:16px 18px; }',
      '  #dchangelogModal .dcl-foot{ padding:12px 18px 16px; }',
      '  #dchangelogModal .dcl-stats{ grid-template-columns:repeat(2,1fr); }',
      '}'
    ].join('\n');
    document.head.appendChild(s);
  }

  /* ═══════════ RENDER POPUP ═══════════ */
  function renderPopup(data){
    /* Backdrop */
    var bd = document.createElement('div');
    bd.id = 'dchangelogBackdrop';

    /* Modal */
    var md = document.createElement('div');
    md.id = 'dchangelogModal';

    var details = (data.details || []).filter(Boolean);
    var bullets = ['✨', '🎨', '🐛', '⚡', '🔥', '💡', '🛠️', '📱', '🌟', '✅'];

    var detailsHtml = details.length
      ? details.map(function(d, i){
          return '<div class="dcl-item">' +
            '<span class="dcl-bullet">' + bullets[i % bullets.length] + '</span>' +
            '<span>' + escapeHtml(d) + '</span>' +
          '</div>';
        }).join('')
      : '<div class="dcl-item"><span class="dcl-bullet">✨</span><span>Cập nhật mới đã sẵn sàng!</span></div>';

    var statsHtml = '';
    if (data.changes && (data.changes.filesChanged || data.changes.totalCommits)){
      statsHtml =
        '<div class="dcl-stats">' +
        '  <div class="dcl-stat">' +
        '    <div class="dcl-stat-val">' + (data.changes.totalCommits || 0) + '</div>' +
        '    <div class="dcl-stat-lbl">Commits</div>' +
        '  </div>' +
        '  <div class="dcl-stat">' +
        '    <div class="dcl-stat-val">' + (data.changes.filesChanged || 0) + '</div>' +
        '    <div class="dcl-stat-lbl">Files</div>' +
        '  </div>' +
        '  <div class="dcl-stat">' +
        '    <div class="dcl-stat-val">' + details.length + '</div>' +
        '    <div class="dcl-stat-lbl">Changes</div>' +
        '  </div>' +
        '</div>';
    }

    var prevVersionHtml = data.previousVersion
      ? '<span>← từ v' + escapeHtml(data.previousVersion) + '</span>'
      : '';

    md.innerHTML =
      '<div class="dcl-head">' +
      '  <span class="dcl-icon">🎉</span>' +
      '  <div class="dcl-title-box">' +
      '    <div class="dcl-title">CÓ GÌ MỚI?</div>' +
      '    <div class="dcl-version">v' + escapeHtml(data.version || '?') + ' ' + prevVersionHtml + '</div>' +
      '  </div>' +
      '  <button class="dcl-close" id="dclClose" type="button" aria-label="Đóng">✕</button>' +
      '</div>' +
      '<div class="dcl-body">' +
      (data.summary ? '<div class="dcl-subtitle">' + escapeHtml(data.summary) + '</div>' : '') +
      '  <div class="dcl-list">' + detailsHtml + '</div>' +
      statsHtml +
      '</div>' +
      '<div class="dcl-foot">' +
      '  <button class="dcl-btn dcl-btn-primary" id="dclOk" type="button">ĐÃ HIỂU</button>' +
      '</div>';

    document.body.appendChild(bd);
    document.body.appendChild(md);

    /* Animations */
    requestAnimationFrame(function(){
      requestAnimationFrame(function(){
        bd.classList.add('show');
        md.classList.add('show');
      });
    });

    /* Events */
    function close(){
      bd.classList.remove('show');
      md.classList.remove('show');
      setTimeout(function(){
        if (bd.parentNode) bd.parentNode.removeChild(bd);
        if (md.parentNode) md.parentNode.removeChild(md);
      }, 400);
    }

    document.getElementById('dclClose').onclick = close;
    document.getElementById('dclOk').onclick = close;
    bd.onclick = close;

    document.addEventListener('keydown', function onEsc(e){
      if (e.key === 'Escape'){
        close();
        document.removeEventListener('keydown', onEsc);
      }
    });
  }

  function escapeHtml(s){
    if (s == null) return '';
    return String(s).replace(/[&<>"']/g, function(c){
      return { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c];
    });
  }

  /* ═══════════ MAIN ═══════════ */
  function init(){
    /* Chỉ landing */
    if (!document.getElementById('landing')) return;
    try { if (window.parent !== window) return; } catch(e){}

    /* Fetch version.json + changelog.json */
    Promise.all([
      fetch('/DolphinApp/version.json?t=' + Date.now(), { cache: 'no-store' })
        .then(function(r){ return r.ok ? r.json() : null; })
        .catch(function(){ return null; }),
      fetch('/DolphinApp/changelog.json?t=' + Date.now(), { cache: 'no-store' })
        .then(function(r){ return r.ok ? r.json() : null; })
        .catch(function(){ return null; })
    ]).then(function(results){
      var verData = results[0];
      var chgData = results[1];

      if (!verData || !verData.version) return;

      var currentVersion = String(verData.version);
      var seenVersion = null;
      try { seenVersion = localStorage.getItem(LS_KEY); } catch(e){}

      /* Nếu chưa từng thấy → lưu lần đầu, không hiện popup */
      if (!seenVersion){
        try { localStorage.setItem(LS_KEY, currentVersion); } catch(e){}
        return;
      }

      /* Nếu version không đổi → không hiện */
      if (seenVersion === currentVersion) return;

      /* Version đổi → hiện popup sau delay */
      if (!chgData) return;

      injectStyles();
      setTimeout(function(){
        renderPopup(chgData);

        /* Đánh dấu đã xem */
        try { localStorage.setItem(LS_KEY, currentVersion); } catch(e){}
      }, SHOW_DELAY);
    });
  }

  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  console.log('%c🎉 CHANGELOG POPUP LOADED',
    'background:linear-gradient(90deg,#FBD77A,#F4B842);color:#0a2b28;font-size:11px;padding:3px 8px;border-radius:4px;font-weight:900');
})();
