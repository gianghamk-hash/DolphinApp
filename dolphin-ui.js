/* ============================================================
   DOLPHIN UI EXTRAS v6.0
   ─────────────────────────────────────────────────────────────
   • N6: Global Toast System (thống nhất 4 app)
   • A4: Alert đơn quá 5 phút trên Landing
   • C2: Empty State Illustrations cho 3 app con
   • D1: Mini Dashboard cho Manager
   ─────────────────────────────────────────────────────────────
   Tự detect context:
     - Có #landing + không iframe → chạy A4 + D1
     - Không có #landing (app con) → chạy C2
     - N6 toast chạy mọi nơi
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

  var AREAS = [
    { key:'lounge',     col:'lounge_orders', label:'Lounge',     icon:'🍸', app:'lounge' },
    { key:'bungalow',   col:'bun_orders',    label:'Bungalow',   icon:'🌴', app:'bungalow' },
    { key:'restaurant', col:'res_orders',    label:'Restaurant', icon:'🍽️', app:'restaurant' }
  ];

  var DELAY_MS      = 5 * 60 * 1000;
  var ALERT_POLL_MS = 20000;
  var DASH_POLL_MS  = 30000;

  /* Toast config */
  var TOAST_MAX        = 5;         /* tối đa 5 toast cùng lúc */
  var TOAST_DEFAULT_MS = 3200;      /* auto dismiss mặc định */
  var TOAST_ERR_MS     = 5200;      /* lỗi hiện lâu hơn */
  var TOAST_LOADING_MS = 0;         /* loading không tự tắt */

  /* ============================================================
     HELPERS
     ============================================================ */
  function hasLanding(){ return !!document.getElementById('landing'); }
  function isIframe(){ try { return window.parent !== window; } catch(e){ return false; } }
  function isManager(){ return navigator.userAgent.indexOf('DolphinManager') >= 0; }

  function escapeHtml(s){
    if (s == null) return '';
    return String(s).replace(/[&<>"']/g, function(c){
      return { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c];
    });
  }

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
     ══════════════ N6: GLOBAL TOAST SYSTEM ══════════════
     ============================================================ */
  var ToastSystem = (function(){

    var container = null;
    var activeToasts = [];

    var TYPE_MAP = {
      success: { icon:'✅', color:'#22C55E', bg1:'rgba(22,163,74,.98)',  bg2:'rgba(21,128,61,.98)' },
      error:   { icon:'❌', color:'#EF4444', bg1:'rgba(220,38,38,.98)',  bg2:'rgba(153,27,27,.98)' },
      warning: { icon:'⚠️', color:'#F59E0B', bg1:'rgba(217,119,6,.98)',  bg2:'rgba(146,64,14,.98)' },
      info:    { icon:'ℹ️', color:'#3B82F6', bg1:'rgba(37,99,235,.98)',  bg2:'rgba(30,64,175,.98)' },
      loading: { icon:'⏳', color:'#FBD77A', bg1:'rgba(15,61,56,.98)',   bg2:'rgba(10,43,40,.98)' }
    };

    /* ───── Inject CSS ───── */
    function injectStyles(){
      if (document.getElementById('dolphinToastStyles')) return;
      var s = document.createElement('style');
      s.id = 'dolphinToastStyles';
      s.textContent = [
        /* Container */
        '#dtoastContainer{',
        '  position:fixed;',
        '  top:16px;',
        '  right:16px;',
        '  z-index:9999;',
        '  display:flex;',
        '  flex-direction:column;',
        '  gap:10px;',
        '  pointer-events:none;',
        '  max-width:min(92vw,400px);',
        '  width:max-content;',
        '  font-family:"Nunito",-apple-system,BlinkMacSystemFont,sans-serif;',
        '}',
        '@media(max-width:640px){',
        '  #dtoastContainer{',
        '    top:10px;',
        '    left:10px;',
        '    right:10px;',
        '    max-width:none;',
        '    width:auto;',
        '    align-items:stretch;',
        '  }',
        '}',

        /* Toast base */
        '.dtoast{',
        '  position:relative;',
        '  display:flex;',
        '  align-items:center;',
        '  gap:12px;',
        '  padding:12px 14px 12px 14px;',
        '  border-radius:14px;',
        '  color:#fff;',
        '  font-size:13px;',
        '  font-weight:800;',
        '  letter-spacing:.02em;',
        '  box-shadow:0 12px 36px rgba(0,0,0,.45),',
        '             0 0 0 1px rgba(255,255,255,.08) inset;',
        '  pointer-events:auto;',
        '  cursor:default;',
        '  backdrop-filter:blur(14px);',
        '  -webkit-backdrop-filter:blur(14px);',
        '  overflow:hidden;',
        '  will-change:transform,opacity;',
        '  transform-origin:top right;',
        '  opacity:0;',
        '  transform:translateX(120%) scale(.94);',
        '  transition:opacity .28s cubic-bezier(.16,1,.3,1),',
        '             transform .34s cubic-bezier(.16,1,.3,1);',
        '}',
        '.dtoast.show{',
        '  opacity:1;',
        '  transform:translateX(0) scale(1);',
        '}',
        '.dtoast.hide{',
        '  opacity:0;',
        '  transform:translateX(120%) scale(.94);',
        '}',
        '@media(max-width:640px){',
        '  .dtoast{',
        '    transform-origin:top center;',
        '    transform:translateY(-120%) scale(.94);',
        '  }',
        '  .dtoast.show{ transform:translateY(0) scale(1); }',
        '  .dtoast.hide{ transform:translateY(-120%) scale(.94); }',
        '}',

        /* Type variants */
        '.dtoast[data-type="success"]{',
        '  background:linear-gradient(135deg,rgba(22,163,74,.98),rgba(21,128,61,.98));',
        '  border:1px solid rgba(74,222,128,.4);',
        '  box-shadow:0 12px 36px rgba(22,163,74,.5),',
        '             0 0 24px rgba(74,222,128,.35),',
        '             0 0 0 1px rgba(74,222,128,.15) inset;',
        '}',
        '.dtoast[data-type="error"]{',
        '  background:linear-gradient(135deg,rgba(220,38,38,.98),rgba(153,27,27,.98));',
        '  border:1px solid rgba(248,113,113,.4);',
        '  box-shadow:0 12px 36px rgba(220,38,38,.55),',
        '             0 0 24px rgba(248,113,113,.35),',
        '             0 0 0 1px rgba(248,113,113,.15) inset;',
        '}',
        '.dtoast[data-type="warning"]{',
        '  background:linear-gradient(135deg,rgba(217,119,6,.98),rgba(146,64,14,.98));',
        '  border:1px solid rgba(251,191,36,.45);',
        '  box-shadow:0 12px 36px rgba(217,119,6,.55),',
        '             0 0 24px rgba(251,191,36,.35),',
        '             0 0 0 1px rgba(251,191,36,.18) inset;',
        '}',
        '.dtoast[data-type="info"]{',
        '  background:linear-gradient(135deg,rgba(37,99,235,.98),rgba(30,64,175,.98));',
        '  border:1px solid rgba(96,165,250,.4);',
        '  box-shadow:0 12px 36px rgba(37,99,235,.5),',
        '             0 0 24px rgba(96,165,250,.35),',
        '             0 0 0 1px rgba(96,165,250,.15) inset;',
        '}',
        '.dtoast[data-type="loading"]{',
        '  background:linear-gradient(135deg,rgba(15,61,56,.98),rgba(10,43,40,.98));',
        '  border:1px solid rgba(244,184,66,.5);',
        '  box-shadow:0 12px 36px rgba(0,0,0,.55),',
        '             0 0 28px rgba(244,184,66,.4),',
        '             0 0 0 1px rgba(244,184,66,.15) inset;',
        '}',

        /* Icon */
        '.dtoast .dt-icon{',
        '  font-size:20px;',
        '  line-height:1;',
        '  flex-shrink:0;',
        '  filter:drop-shadow(0 0 8px rgba(255,255,255,.35));',
        '  display:flex;',
        '  align-items:center;',
        '  justify-content:center;',
        '  width:26px;',
        '  height:26px;',
        '}',
        '.dtoast[data-type="loading"] .dt-icon{',
        '  animation:dtSpin 1.4s linear infinite;',
        '}',
        '@keyframes dtSpin{',
        '  to{ transform:rotate(360deg); }',
        '}',

        /* Body */
        '.dtoast .dt-body{',
        '  flex:1;',
        '  min-width:0;',
        '  display:flex;',
        '  flex-direction:column;',
        '  gap:2px;',
        '}',
        '.dtoast .dt-title{',
        '  font-weight:900;',
        '  font-size:13px;',
        '  letter-spacing:.03em;',
        '  line-height:1.25;',
        '  text-shadow:0 1px 2px rgba(0,0,0,.35);',
        '  word-break:break-word;',
        '}',
        '.dtoast .dt-sub{',
        '  font-size:11px;',
        '  font-weight:700;',
        '  opacity:.9;',
        '  letter-spacing:.02em;',
        '  line-height:1.3;',
        '  word-break:break-word;',
        '}',

        /* Close btn */
        '.dtoast .dt-close{',
        '  flex-shrink:0;',
        '  width:22px;',
        '  height:22px;',
        '  border-radius:50%;',
        '  border:none;',
        '  background:rgba(255,255,255,.15);',
        '  color:#fff;',
        '  font-size:11px;',
        '  font-weight:900;',
        '  cursor:pointer;',
        '  display:flex;',
        '  align-items:center;',
        '  justify-content:center;',
        '  padding:0;',
        '  transition:background .15s, transform .15s;',
        '  font-family:inherit;',
        '  line-height:1;',
        '}',
        '.dtoast .dt-close:hover{',
        '  background:rgba(255,255,255,.3);',
        '  transform:scale(1.1);',
        '}',
        '.dtoast .dt-close:active{ transform:scale(.92); }',

        /* Progress bar */
        '.dtoast .dt-progress{',
        '  position:absolute;',
        '  left:0;',
        '  right:0;',
        '  bottom:0;',
        '  height:3px;',
        '  background:rgba(255,255,255,.15);',
        '  overflow:hidden;',
        '  border-radius:0 0 14px 14px;',
        '}',
        '.dtoast .dt-progress::before{',
        '  content:"";',
        '  position:absolute;',
        '  inset:0;',
        '  background:linear-gradient(90deg,',
        '    rgba(255,255,255,0) 0%,',
        '    rgba(255,255,255,.7) 50%,',
        '    rgba(255,255,255,0) 100%);',
        '  transform:translateX(-100%);',
        '  animation:dtProgress 3.2s linear forwards;',
        '}',
        '@keyframes dtProgress{',
        '  to{ transform:translateX(100%); }',
        '}',

        /* Reduce motion */
        '@media(prefers-reduced-motion:reduce){',
        '  .dtoast{ transition:opacity .01s; transform:none !important; }',
        '  .dtoast.show{ opacity:1; }',
        '  .dtoast.hide{ opacity:0; }',
        '  .dtoast .dt-progress::before{ animation:none; }',
        '  .dtoast[data-type="loading"] .dt-icon{ animation:none; }',
        '}'
      ].join('\n');
      document.head.appendChild(s);
    }

    /* ───── Ensure container ───── */
    function ensureContainer(){
      if (container) return container;
      container = document.getElementById('dtoastContainer');
      if (container) return container;
      container = document.createElement('div');
      container.id = 'dtoastContainer';
      container.setAttribute('role', 'region');
      container.setAttribute('aria-label', 'Thông báo');
      container.setAttribute('aria-live', 'polite');
      document.body.appendChild(container);
      return container;
    }

    /* ───── Create toast element ───── */
    function createToast(opts){
      var type = opts.type || 'info';
      var cfg = TYPE_MAP[type] || TYPE_MAP.info;
      var duration = typeof opts.duration === 'number' ? opts.duration : TOAST_DEFAULT_MS;

      var el = document.createElement('div');
      el.className = 'dtoast';
      el.dataset.type = type;
      el.setAttribute('role', type === 'error' ? 'alert' : 'status');

      var iconHtml;
      if (opts.icon != null && opts.icon !== '') {
        /* Custom icon (emoji) */
        iconHtml = '<span class="dt-icon">' + escapeHtml(opts.icon) + '</span>';
      } else {
        iconHtml = '<span class="dt-icon">' + cfg.icon + '</span>';
      }

      var titleHtml = opts.title
        ? '<div class="dt-title">' + escapeHtml(opts.title) + '</div>'
        : '';

      /* Nếu không có title → message là title luôn */
      var bodyHtml;
      if (opts.title) {
        bodyHtml = titleHtml +
          (opts.message ? '<div class="dt-sub">' + escapeHtml(opts.message) + '</div>' : '');
      } else {
        bodyHtml = '<div class="dt-title">' + escapeHtml(opts.message || '') + '</div>';
      }

      var closeHtml = opts.dismissible === false
        ? ''
        : '<button class="dt-close" type="button" aria-label="Đóng">✕</button>';

      var progressHtml = (duration > 0 && opts.showProgress !== false)
        ? '<div class="dt-progress" style="animation-duration:' + duration + 'ms"></div>'
        : '';

      el.innerHTML =
        iconHtml +
        '<div class="dt-body">' + bodyHtml + '</div>' +
        closeHtml +
        progressHtml;

      /* Set progress duration */
      if (duration > 0 && opts.showProgress !== false) {
        var prog = el.querySelector('.dt-progress::before');
        /* Dùng style trực tiếp cho ::before không được, dùng animation-duration qua custom property */
        el.style.setProperty('--dt-progress-dur', duration + 'ms');
      }

      /* Click close */
      var closeBtn = el.querySelector('.dt-close');
      if (closeBtn) {
        closeBtn.addEventListener('click', function(e){
          e.stopPropagation();
          dismiss(el);
        });
      }

      /* Click toast → dismiss (trừ loading) */
      if (type !== 'loading' && opts.clickToDismiss !== false) {
        el.addEventListener('click', function(e){
          if (e.target.closest('.dt-close')) return;
          dismiss(el);
        });
      }

      return { el: el, duration: duration, type: type };
    }

    /* ───── Show toast ───── */
    function show(opts){
      if (!opts || (!opts.message && !opts.title)) return null;

      injectStyles();
      var c = ensureContainer();

      /* Giới hạn số toast */
      while (activeToasts.length >= TOAST_MAX) {
        var oldest = activeToasts.shift();
        if (oldest && oldest.el && oldest.el.parentNode) {
          oldest.el.classList.add('hide');
          setTimeout(function(el){ return function(){ if (el.parentNode) el.parentNode.removeChild(el); }; }(oldest.el), 320);
        }
        if (oldest && oldest.timer) clearTimeout(oldest.timer);
      }

      var obj = createToast(opts);
      c.appendChild(obj.el);
      activeToasts.push(obj);

      /* Trigger animation */
      requestAnimationFrame(function(){
        requestAnimationFrame(function(){
          obj.el.classList.add('show');
        });
      });

      /* Auto dismiss */
      if (obj.duration > 0) {
        obj.timer = setTimeout(function(){ dismiss(obj.el); }, obj.duration);
      }

      return {
        el: obj.el,
        dismiss: function(){ dismiss(obj.el); },
        update: function(newOpts){ updateToast(obj.el, newOpts); }
      };
    }

    /* ───── Dismiss toast ───── */
    function dismiss(el){
      if (!el || !el.parentNode) return;
      var idx = -1;
      for (var i = 0; i < activeToasts.length; i++){
        if (activeToasts[i].el === el){ idx = i; break; }
      }
      if (idx >= 0){
        var obj = activeToasts[idx];
        if (obj.timer) clearTimeout(obj.timer);
        activeToasts.splice(idx, 1);
      }
      el.classList.remove('show');
      el.classList.add('hide');
      setTimeout(function(){
        if (el.parentNode) el.parentNode.removeChild(el);
      }, 320);
    }

    /* ───── Update toast (chuyển loading → success/error) ───── */
    function updateToast(el, opts){
      if (!el || !el.parentNode || !opts) return;

      var type = opts.type || el.dataset.type || 'info';
      var cfg = TYPE_MAP[type] || TYPE_MAP.info;

      el.dataset.type = type;

      /* Update icon */
      var iconEl = el.querySelector('.dt-icon');
      if (iconEl){
        if (opts.icon != null && opts.icon !== ''){
          iconEl.textContent = opts.icon;
        } else {
          iconEl.textContent = cfg.icon;
        }
      }

      /* Update body */
      var bodyEl = el.querySelector('.dt-body');
      if (bodyEl){
        var titleHtml = opts.title
          ? '<div class="dt-title">' + escapeHtml(opts.title) + '</div>' : '';
        var bodyHtml;
        if (opts.title) {
          bodyHtml = titleHtml +
            (opts.message ? '<div class="dt-sub">' + escapeHtml(opts.message) + '</div>' : '');
        } else {
          bodyHtml = '<div class="dt-title">' + escapeHtml(opts.message || '') + '</div>';
        }
        bodyEl.innerHTML = bodyHtml;
      }

      /* Reset timer */
      var obj = null;
      for (var i = 0; i < activeToasts.length; i++){
        if (activeToasts[i].el === el){ obj = activeToasts[i]; break; }
      }

      if (obj){
        if (obj.timer) clearTimeout(obj.timer);
        var dur = typeof opts.duration === 'number'
          ? opts.duration
          : (type === 'error' ? TOAST_ERR_MS : TOAST_DEFAULT_MS);

        /* Update progress bar */
        var prog = el.querySelector('.dt-progress');
        if (prog && dur > 0){
          prog.style.animationDuration = dur + 'ms';
          /* Reset animation */
          prog.style.display = 'none';
          void prog.offsetWidth;
          prog.style.display = '';
        }

        if (dur > 0){
          obj.timer = setTimeout(function(){ dismiss(el); }, dur);
        }
      }
    }

    /* ───── Public API ───── */
    function success(msg, opts){
      opts = opts || {};
      opts.type = 'success';
      opts.message = msg;
      return show(opts);
    }
    function error(msg, opts){
      opts = opts || {};
      opts.type = 'error';
      opts.message = msg;
      if (typeof opts.duration !== 'number') opts.duration = TOAST_ERR_MS;
      return show(opts);
    }
    function warning(msg, opts){
      opts = opts || {};
      opts.type = 'warning';
      opts.message = msg;
      return show(opts);
    }
    function info(msg, opts){
      opts = opts || {};
      opts.type = 'info';
      opts.message = msg;
      return show(opts);
    }
    function loading(msg, opts){
      opts = opts || {};
      opts.type = 'loading';
      opts.message = msg;
      opts.duration = TOAST_LOADING_MS;   /* không auto dismiss */
      opts.dismissible = opts.dismissible !== false;
      return show(opts);
    }
    function dismissAll(){
      var copy = activeToasts.slice();
      copy.forEach(function(t){ dismiss(t.el); });
    }

    /* ───── Legacy adapter: chuyển showToast cũ → toast mới ───── */
    var LEGACY_ICON_TYPE_MAP = {
      '✅': 'success', '🟢': 'success', '🎉': 'success', '✨': 'success',
      '🚀': 'success', '🏝️': 'success', '👋': 'success', '📝': 'info',
      '❌': 'error', '🚫': 'error', '⛔': 'error',
      '⚠️': 'warning', '🚨': 'warning', '🔔': 'warning',
      '⏳': 'loading', '☁️': 'loading',
      'ℹ️': 'info', '🛎️': 'info', '🍸': 'info', '🏆': 'info'
    };

    function legacy(msg, icon){
      var type = LEGACY_ICON_TYPE_MAP[icon] || 'info';
      var opts = {
        type: type,
        message: msg,
        icon: icon || null,
        duration: type === 'error' ? TOAST_ERR_MS :
                  type === 'loading' ? TOAST_LOADING_MS :
                  TOAST_DEFAULT_MS
      };
      return show(opts);
    }

    return {
      show:        show,
      success:     success,
      error:       error,
      warning:     warning,
      info:        info,
      loading:     loading,
      dismiss:     dismiss,
      dismissAll:  dismissAll,
      update:      updateToast,
      legacy:      legacy,
      TYPE_MAP:    TYPE_MAP
    };
  })();

  /* Expose global */
  window.UI = window.UI || {};
  window.UI.toast = ToastSystem;

  /* Override window.showToast cũ → dùng system mới */
  var _originalShowToast = window.showToast;
  window.showToast = function(msg, icon){
    try {
      ToastSystem.legacy(msg, icon);
    } catch(e){
      /* Fallback nếu toast system lỗi */
      if (_originalShowToast && _originalShowToast !== window.showToast){
        try { _originalShowToast(msg, icon); } catch(err){}
      }
      console.warn('[Toast] error:', e);
    }
  };

  /* ═══════════════════════════════════════════════════════════
     ══════════ A4: DELAY ALERT ON LANDING ══════════
     ═══════════════════════════════════════════════════════════ */
  function injectAlertStyles(){
    if (document.getElementById('delayAlertStyles')) return;
    var s = document.createElement('style');
    s.id = 'delayAlertStyles';
    s.textContent = [
      '#delayAlert{',
      '  position:fixed;top:14px;left:50%;',
      '  transform:translateX(-50%) translateY(-140%);',
      '  z-index:9997;max-width:min(92vw,560px);',
      '  opacity:0;pointer-events:none;',
      '  transition:transform .55s cubic-bezier(.16,1,.3,1), opacity .35s ease;',
      '  font-family:"Nunito",sans-serif;',
      '}',
      '#delayAlert.show{ transform:translateX(-50%) translateY(0); opacity:1; pointer-events:auto; }',
      '#delayAlert .da-inner{',
      '  display:flex;align-items:center;gap:14px;padding:12px 18px;',
      '  background:linear-gradient(135deg,#7F1D1D 0%,#B91C1C 100%);',
      '  border:2px solid #FBD77A;border-radius:16px;',
      '  box-shadow:0 12px 40px rgba(185,28,28,.65),0 0 60px rgba(244,184,66,.35);',
      '  animation:daPulse 1.6s ease-in-out infinite;',
      '}',
      '@keyframes daPulse{',
      '  0%,100%{ box-shadow:0 12px 40px rgba(185,28,28,.65),0 0 60px rgba(244,184,66,.35); }',
      '  50%    { box-shadow:0 12px 50px rgba(185,28,28,.95),0 0 90px rgba(244,184,66,.65); }',
      '}',
      '#delayAlert .da-icon{ font-size:26px;flex-shrink:0;animation:daShake .8s ease-in-out infinite;filter:drop-shadow(0 0 12px rgba(251,215,122,.9)); }',
      '@keyframes daShake{ 0%,100%{ transform:rotate(-8deg) } 50%{ transform:rotate(8deg) } }',
      '#delayAlert .da-body{ flex:1;min-width:0; }',
      '#delayAlert .da-title{ color:#FFE58F;font-size:13.5px;font-weight:900;letter-spacing:.05em;text-transform:uppercase;text-shadow:0 0 8px rgba(0,0,0,.9);line-height:1.2; }',
      '#delayAlert .da-sub{ color:#fff;font-size:11.5px;font-weight:700;margin-top:3px;opacity:.95;white-space:nowrap;overflow:hidden;text-overflow:ellipsis; }',
      '#delayAlert .da-sub .area-hl{ display:inline-block;background:rgba(255,229,143,.2);color:#FFE58F;padding:1px 7px;border-radius:6px;font-weight:900;margin:0 2px; }',
      '#delayAlert .da-btn{ background:linear-gradient(135deg,#FBD77A,#F4B842);color:#7F1D1D;font-weight:900;font-size:11.5px;padding:9px 14px;border:none;border-radius:11px;cursor:pointer;white-space:nowrap;text-transform:uppercase;letter-spacing:.06em;box-shadow:0 4px 14px rgba(0,0,0,.3);transition:transform .15s;font-family:inherit; }',
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
    el.innerHTML =
      '<div class="da-inner">' +
      '  <span class="da-icon">⚠️</span>' +
      '  <div class="da-body">' +
      '    <div class="da-title" id="daTitle">CÓ ĐƠN QUÁ 5 PHÚT</div>' +
      '    <div class="da-sub" id="daSub"></div>' +
      '  </div>' +
      '  <button class="da-btn" id="daBtn" type="button">Xem ngay</button>' +
      '</div>';
    document.body.appendChild(el);

    el.querySelector('#daBtn').addEventListener('click', function(e){
      e.stopPropagation();
      var areaKey = el.dataset.targetArea;
      if (areaKey && window.openApp) window.openApp(areaKey);
      el.classList.remove('show');
    });
    el.addEventListener('click', function(e){
      if (e.target.id === 'daBtn') return;
      var areaKey = el.dataset.targetArea;
      if (areaKey && window.openApp) window.openApp(areaKey);
    });
    return el;
  }

  var delayedCache = {};

  function updateDelayAlert(){
    var total = 0, breakdown = [], topArea = null, topCount = 0;
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
    if (total === 0){ el.classList.remove('show'); return; }
    document.getElementById('daTitle').textContent = '⚠️ CÓ ' + total + ' ĐƠN QUÁ 5 PHÚT!';
    document.getElementById('daSub').innerHTML = breakdown.map(function(b){
      return '<span class="area-hl">' + b.icon + ' ' + b.label + ' · ' + b.count + '</span>';
    }).join('');
    el.dataset.targetArea = topArea || AREAS[0].app;
    el.classList.add('show');
  }

  /* ═══════════════════════════════════════════════════════════
     ══════════ D1: MINI DASHBOARD FOR MANAGER ══════════
     ═══════════════════════════════════════════════════════════ */
  function injectDashboardStyles(){
    if (document.getElementById('mgrDashStyles')) return;
    var s = document.createElement('style');
    s.id = 'mgrDashStyles';
    s.textContent = [
      '#mgrDash{ display:none;margin:0 auto 1.5rem;max-width:min(92vw,900px);',
      '  background:linear-gradient(135deg,rgba(15,61,56,.85),rgba(10,43,40,.92));',
      '  border:2px solid var(--theme-border, rgba(244,184,66,.55));border-radius:18px;padding:14px 18px;',
      '  box-shadow:0 8px 28px rgba(0,0,0,.5),0 0 32px var(--theme-glow, rgba(244,184,66,.25)),inset 0 0 24px var(--theme-glow, rgba(244,184,66,.06));',
      '  backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);font-family:"Nunito",sans-serif; }',
      '#mgrDash.show{ display:block;animation:mgrIn .6s ease-out; }',
      '@keyframes mgrIn{ from{opacity:0;transform:translateY(-8px)} to{opacity:1;transform:translateY(0)} }',
      '#mgrDash .mgr-head{ display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:10px;padding-bottom:8px;border-bottom:1px dashed var(--theme-border-soft, rgba(244,184,66,.25)); }',
      '#mgrDash .mgr-title{ font-size:12px;font-weight:900;color:var(--theme-accent, #FBD77A);text-transform:uppercase;letter-spacing:.12em;text-shadow:0 0 10px var(--theme-glow, rgba(244,184,66,.5));display:flex;align-items:center;gap:6px; }',
      '#mgrDash .mgr-time{ font-size:10.5px;font-weight:700;color:var(--theme-accent2, #bfe9dc);opacity:.85;font-variant-numeric:tabular-nums; }',
      '#mgrDash .mgr-grid{ display:grid;grid-template-columns:repeat(3,1fr);gap:8px; }',
      '@media(min-width:640px){ #mgrDash .mgr-grid{ grid-template-columns:repeat(5,1fr); } }',
      '#mgrDash .mgr-item{ position:relative;background:rgba(0,0,0,.22);border:1.5px solid var(--theme-border-soft, rgba(244,184,66,.22));border-radius:12px;padding:9px 8px;text-align:center;cursor:pointer;transition:all .25s ease; }',
      '#mgrDash .mgr-item:hover{ background:rgba(244,184,66,.10);border-color:var(--theme-border, rgba(244,184,66,.55));transform:translateY(-2px);box-shadow:0 6px 16px var(--theme-glow, rgba(244,184,66,.3)); }',
      '#mgrDash .mgr-item.no-click{ cursor:default; }',
      '#mgrDash .mgr-item.no-click:hover{ transform:none;background:rgba(0,0,0,.22);box-shadow:none; }',
      '#mgrDash .mgr-label{ font-size:9.5px;font-weight:800;color:var(--theme-accent2, #bfe9dc);text-transform:uppercase;letter-spacing:.06em;opacity:.85;margin-bottom:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis; }',
      '#mgrDash .mgr-value{ font-family:"Fraunces","Nunito",serif;font-size:20px;font-weight:900;line-height:1;color:var(--theme-accent, #FBD77A);text-shadow:0 0 12px var(--theme-glow, rgba(244,184,66,.5));font-variant-numeric:tabular-nums; }',
      '#mgrDash .mgr-value.danger{ color:#FF6B6B;text-shadow:0 0 12px rgba(239,68,68,.6); }',
      '#mgrDash .mgr-value.ok{ color:#66BB6A;text-shadow:0 0 12px rgba(102,187,106,.5); }',
      '#mgrDash .mgr-sub{ font-size:9px;font-weight:700;color:var(--theme-accent2, #bfe9dc);opacity:.7;margin-top:2px; }',
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
    el.innerHTML =
      '<div class="mgr-head">' +
      '  <div class="mgr-title">📊 TỔNG QUAN HÔM NAY</div>' +
      '  <div class="mgr-time" id="mgrTime">--:--</div>' +
      '</div>' +
      '<div class="mgr-grid" id="mgrGrid"></div>';
    var ref = document.querySelector('.welcome-lbl');
    if (ref && ref.parentNode) ref.parentNode.insertBefore(el, ref);
    else document.body.appendChild(el);
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
    var t = new Date();
    var timeEl = document.getElementById('mgrTime');
    if (timeEl) timeEl.textContent = String(t.getHours()).padStart(2,'0') + ':' + String(t.getMinutes()).padStart(2,'0');

    var totalAll = 0, pendingAll = 0, delayedAll = 0;
    AREAS.forEach(function(a){
      var s = dashStats[a.key];
      if (!s) return;
      totalAll += s.total; pendingAll += s.pending; delayedAll += s.delayed;
    });

    document.getElementById('mgrGrid').innerHTML =
      '<div class="mgr-item no-click">' +
      '  <div class="mgr-label">📦 Tổng đơn</div>' +
      '  <div class="mgr-value">' + totalAll + '</div>' +
      '  <div class="mgr-sub">' + pendingAll + ' chờ xử lý</div>' +
      '</div>' +
      '<div class="mgr-item" onclick="openApp(\'lounge\')">' +
      '  <div class="mgr-label">🍸 Lounge</div>' +
      '  <div class="mgr-value">' + dashStats.lounge.total + '</div>' +
      '  <div class="mgr-sub">' + dashStats.lounge.pending + ' chờ</div>' +
      '</div>' +
      '<div class="mgr-item" onclick="openApp(\'bungalow\')">' +
      '  <div class="mgr-label">🌴 Bungalow</div>' +
      '  <div class="mgr-value">' + dashStats.bungalow.total + '</div>' +
      '  <div class="mgr-sub">' + dashStats.bungalow.pending + ' chờ</div>' +
      '</div>' +
      '<div class="mgr-item" onclick="openApp(\'restaurant\')">' +
      '  <div class="mgr-label">🍽️ Restaurant</div>' +
      '  <div class="mgr-value">' + dashStats.restaurant.total + '</div>' +
      '  <div class="mgr-sub">' + dashStats.restaurant.pending + ' chờ</div>' +
      '</div>' +
      '<div class="mgr-item no-click">' +
      '  <div class="mgr-label">⚠️ Trễ / 🟢 Online</div>' +
      '  <div class="mgr-value ' + (delayedAll > 0 ? 'danger' : 'ok') + '">' +
           delayedAll + ' <span style="font-size:14px;opacity:.7;">/</span> ' + dashStats.staffOnline +
      '  </div>' +
      '  <div class="mgr-sub">quá 5 phút · nhân viên</div>' +
      '</div>';
  }

  /* ═══════════════════════════════════════════════════════════
     ══════════ C2: EMPTY STATES ══════════
     ═══════════════════════════════════════════════════════════ */
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

  function injectEmptyStates(){
    var area = detectArea();
    var icons = EMPTY_EMOJI[area] || EMPTY_EMOJI.default;
    var s = document.createElement('style');
    s.id = 'emptyStatesStyles';
    s.textContent = [
      '.empty-state{ padding:52px 20px !important;text-align:center;position:relative; }',
      '.empty-state::before{',
      '  content:"' + icons[0] + '";display:block;font-size:64px;line-height:1;margin-bottom:16px;opacity:.85;',
      '  filter:drop-shadow(0 0 24px var(--theme-glow, rgba(244,184,66,.45)));',
      '  animation:esFloat 3.2s ease-in-out infinite;transform-origin:center;',
      '}',
      '.empty-state::after{',
      '  content:"' + icons[1] + '   ' + icons[2] + '";display:block;font-size:20px;line-height:1;margin-top:14px;opacity:.5;',
      '  letter-spacing:.5em;filter:drop-shadow(0 0 12px var(--theme-glow, rgba(244,184,66,.35)));',
      '  animation:esSparkle 2.4s ease-in-out infinite;animation-delay:-1.2s;',
      '}',
      '@keyframes esFloat{ 0%,100%{ transform:translateY(0) rotate(-4deg) scale(1); } 50%{ transform:translateY(-10px) rotate(4deg) scale(1.06); } }',
      '@keyframes esSparkle{ 0%,100%{ opacity:.35; transform:scale(1); } 50%{ opacity:.85; transform:scale(1.15); } }',
      'table .empty-state::before, table .empty-state::after{ display:none; }',
      '.empty-state h4{ font-size:15px !important;font-weight:900 !important;color:var(--theme-accent, #FBD77A) !important;letter-spacing:.04em;margin-bottom:6px !important;text-shadow:0 0 12px var(--theme-glow, rgba(244,184,66,.4)); }',
      '.empty-state p{ font-size:12px !important;font-weight:700 !important;color:var(--theme-accent2, #bfe9dc) !important;opacity:.85 !important;line-height:1.55 !important;max-width:340px;margin:0 auto; }',
      '@media(prefers-reduced-motion:reduce){ .empty-state::before, .empty-state::after{ animation:none !important; } }',
      '@media(max-width:520px){',
      '  .empty-state::before{ font-size:52px; margin-bottom:12px; }',
      '  .empty-state::after{ font-size:16px; }',
      '  .empty-state h4{ font-size:14px !important; }',
      '  .empty-state p{ font-size:11.5px !important; }',
      '}'
    ].join('\n');
    document.head.appendChild(s);
  }

  /* ═══════════════════════════════════════════════════════════
     FIREBASE LISTENERS
     ═══════════════════════════════════════════════════════════ */
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
        if (hasLanding() && !isIframe()){
          listenOrders(fbStore, db);
          if (isManager()) listenStaff(fbStore, db);
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

  function listenOrders(fbStore, db){
    AREAS.forEach(function(a){
      fbStore.onSnapshot(fbStore.collection(db, a.col), function(snap){
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
        delayedCache[a.key] = { count: delayed };
        dashStats[a.key] = { total: total, pending: pending, preparing: preparing, done: done, delayed: delayed };
        updateDelayAlert();
        var d = document.getElementById('mgrDash');
        if (d && d.classList.contains('show')) renderDashboard();
      }, function(err){
        console.warn('[DolphinUI] listen error', a.col, err);
      });
    });
    setInterval(updateDelayAlert, ALERT_POLL_MS);
  }

  function listenStaff(fbStore, db){
    fbStore.onSnapshot(fbStore.collection(db, 'staff_online'), function(snap){
      var now = Date.now();
      var count = 0;
      snap.forEach(function(doc){
        var d = doc.data() || {};
        if (d.lastSeen && (now - d.lastSeen) < 90000) count++;
      });
      dashStats.staffOnline = count;
      var el = document.getElementById('mgrDash');
      if (el && el.classList.contains('show')) renderDashboard();
    }, function(err){
      console.warn('[DolphinUI] staff listen error:', err);
    });
  }

  /* ═══════════════════════════════════════════════════════════
     INIT
     ═══════════════════════════════════════════════════════════ */
  function init(){
    if (hasLanding() && !isIframe()){
      injectAlertStyles();
      injectDashboardStyles();
      ensureAlertEl();
      if (isManager()){
        var d = ensureDashEl();
        d.classList.add('show');
        setInterval(function(){
          var el = document.getElementById('mgrDash');
          if (el && el.classList.contains('show')) renderDashboard();
        }, DASH_POLL_MS);
      }
      initFirebase();
    } else {
      injectEmptyStates();
    }
  }

  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  console.log('%c🎨 DOLPHIN UI v6.0 LOADED',
    'background:linear-gradient(90deg,#FBD77A,#F4B842);color:#0a2b28;font-size:11px;padding:3px 8px;border-radius:4px;font-weight:900');
})();
