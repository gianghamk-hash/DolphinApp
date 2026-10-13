/* ============================================================
   DOLPHIN SOUNDSCAPE v1.0
   ─────────────────────────────────────────────────────────────
   • Nhạc thương hiệu theo 5 theme: Tết, Valentine, Halloween,
     Noel, Tết Dương
   • Loop vô hạn, fade in/out mượt
   • Widget floating + popup điều khiển
   • Auto-pause khi tab inactive
   • Chỉ phát ở landing (không phát trong iframe app con)
   • Mặc định OFF — user tự bật
   ============================================================ */
(function(){
  'use strict';

  /* ═══════════════ CONFIG ═══════════════ */
  var SOUND_MAP = {
    tet:       'sounds/soundscape-tet.mp3',
    valentine: 'sounds/soundscape-valentine.mp3',
    halloween: 'sounds/soundscape-halloween.mp3',
    christmas: 'sounds/soundscape-christmas.mp3',
    newyear:   'sounds/soundscape-newyear.mp3'
  };

  var THEME_LABEL = {
    tet:       'Tết Nguyên Đán 🧧',
    valentine: 'Valentine 💝',
    halloween: 'Halloween 🎃',
    christmas: 'Giáng Sinh 🎄',
    newyear:   'Tết Dương Lịch 🎊'
  };

  var LS_ENABLED = 'dolphin_soundscape';
  var LS_VOLUME  = 'dolphin_soundscape_vol';
  var LS_ASKED   = 'dolphin_soundscape_asked';

  var FADE_DURATION = 1200;   /* ms */

  /* ═══════════════ STATE ═══════════════ */
  var state = {
    enabled: false,           /* user bật/tắt */
    volume: 0.4,              /* 0..1 */
    currentTheme: null,
    audio: null,
    fadeTimer: null,
    unlocked: false,
    pausedByVisibility: false
  };

  /* ═══════════════ UTILS ═══════════════ */
  function getLS(key, fallback){
    try {
      var v = localStorage.getItem(key);
      return v === null ? fallback : v;
    } catch(e){ return fallback; }
  }
  function setLS(key, value){
    try { localStorage.setItem(key, value); } catch(e){}
  }

  function isInIframe(){
    try { return window.parent !== window; } catch(e){ return true; }
  }

  function hasLanding(){
    return !!document.getElementById('landing');
  }

  /* Chỉ chạy ở landing hoặc standalone (không chạy trong iframe) */
  function shouldRun(){
    if (isInIframe()) return false;
    return true;
  }

  /* ═══════════════ AUDIO INIT ═══════════════ */
  function ensureAudio(){
    if (state.audio) return state.audio;
    var audio = new Audio();
    audio.loop = true;
    audio.preload = 'metadata';
    audio.volume = 0;   /* bắt đầu từ 0, fade in dần */
    audio.crossOrigin = 'anonymous';
    audio.addEventListener('error', function(e){
      console.warn('[Sound] Audio error:', state.currentTheme, e);
    });
    state.audio = audio;
    return audio;
  }

  /* ═══════════════ FADE ═══════════════ */
  function fadeTo(targetVolume, duration, onDone){
    var audio = state.audio;
    if (!audio) { if (onDone) onDone(); return; }

    if (state.fadeTimer){
      clearInterval(state.fadeTimer);
      state.fadeTimer = null;
    }

    var startVolume = audio.volume;
    var startTime = Date.now();
    var steps = Math.max(10, Math.floor(duration / 30));

    state.fadeTimer = setInterval(function(){
      var elapsed = Date.now() - startTime;
      var progress = Math.min(1, elapsed / duration);
      var newVol = startVolume + (targetVolume - startVolume) * progress;
      newVol = Math.max(0, Math.min(1, newVol));
      try { audio.volume = newVol; } catch(e){}

      if (progress >= 1){
        clearInterval(state.fadeTimer);
        state.fadeTimer = null;
        if (onDone) onDone();
      }
    }, 30);
  }

  /* ═══════════════ PLAY / PAUSE ═══════════════ */
  function playTheme(themeKey){
    if (!SOUND_MAP[themeKey]){
      /* Theme không có nhạc → tắt audio nếu đang phát */
      stopAudio();
      state.currentTheme = null;
      return;
    }

    var audio = ensureAudio();

    /* Nếu đang phát đúng theme này → không làm gì */
    if (state.currentTheme === themeKey && !audio.paused){
      return;
    }

    state.currentTheme = themeKey;

    /* Nếu audio có src khác → fade out cũ, đổi src, fade in mới */
    var newSrc = SOUND_MAP[themeKey];
    var currentSrc = audio.src ? audio.src.split('/').pop() : '';
    var newSrcName = newSrc.split('/').pop();

    if (currentSrc && currentSrc !== newSrcName){
      /* Đang phát bài khác → fade out rồi đổi */
      fadeTo(0, FADE_DURATION / 2, function(){
        audio.src = newSrc;
        audio.load();
        audio.play().then(function(){
          fadeTo(state.volume, FADE_DURATION, null);
        }).catch(function(err){
          console.warn('[Sound] Play failed:', err);
        });
      });
    } else {
      /* Cùng bài hoặc chưa có src → set src rồi fade in */
      if (!audio.src || currentSrc !== newSrcName){
        audio.src = newSrc;
        audio.load();
      }
      if (audio.paused){
        audio.play().then(function(){
          fadeTo(state.volume, FADE_DURATION, null);
        }).catch(function(err){
          console.warn('[Sound] Play failed:', err);
        });
      } else {
        fadeTo(state.volume, FADE_DURATION, null);
      }
    }

    updateUI();
  }

  function stopAudio(){
    var audio = state.audio;
    if (!audio) return;

    fadeTo(0, FADE_DURATION / 2, function(){
      try { audio.pause(); } catch(e){}
    });
  }

  /* ═══════════════ THEME SYNC ═══════════════ */
  function onThemeChange(themeKey){
    if (!state.enabled) return;
    if (!SOUND_MAP[themeKey]){
      stopAudio();
      state.currentTheme = null;
      updateUI();
      return;
    }
    playTheme(themeKey);
  }

  /* ═══════════════ VISIBILITY ═══════════════ */
  document.addEventListener('visibilitychange', function(){
    if (!state.enabled || !state.audio) return;
    if (document.visibilityState === 'hidden'){
      if (!state.audio.paused){
        try { state.audio.pause(); state.pausedByVisibility = true; } catch(e){}
      }
    } else if (document.visibilityState === 'visible'){
      if (state.pausedByVisibility && state.currentTheme){
        state.pausedByVisibility = false;
        playTheme(state.currentTheme);
      }
    }
  });

  /* ═══════════════ UI WIDGET ═══════════════ */
  function injectStyles(){
    if (document.getElementById('dsound-styles')) return;
    var s = document.createElement('style');
    s.id = 'dsound-styles';
    s.textContent = [
      '#dsound-widget{',
      '  position:fixed; top:14px; right:14px; z-index:9998;',
      '  font-family:"Nunito",-apple-system,sans-serif;',
      '  user-select:none;-webkit-user-select:none;',
      '}',

      /* Nút chính */
      '#dsound-btn{',
      '  width:42px; height:42px; border-radius:50%;',
      '  background:rgba(10,31,29,.9);',
      '  border:1.5px solid var(--theme-border, rgba(244,184,66,.6));',
      '  color:var(--theme-accent, #FBD77A);',
      '  font-size:18px; line-height:1;',
      '  cursor:pointer;',
      '  display:flex; align-items:center; justify-content:center;',
      '  backdrop-filter:blur(12px); -webkit-backdrop-filter:blur(12px);',
      '  box-shadow:0 4px 14px rgba(0,0,0,.4), 0 0 12px var(--theme-glow, rgba(244,184,66,.25));',
      '  transition:transform .2s, box-shadow .3s, border-color .3s;',
      '  -webkit-appearance:none; padding:0;',
      '}',
      '#dsound-btn:hover{ transform:scale(1.08); }',
      '#dsound-btn:active{ transform:scale(.94); }',
      '#dsound-btn.on{',
      '  background:linear-gradient(135deg, var(--theme-accent, #FBD77A), var(--theme-accent2, #bfe9dc));',
      '  color:#0a2b28;',
      '  box-shadow:0 4px 14px rgba(0,0,0,.4), 0 0 20px var(--theme-glow, rgba(244,184,66,.6));',
      '}',
      '#dsound-btn.on::after{',
      '  content:""; position:absolute; inset:-4px;',
      '  border-radius:50%; border:1.5px solid var(--theme-border, rgba(244,184,66,.6));',
      '  opacity:.6; animation:dsound-ring 1.8s ease-out infinite;',
      '}',
      '@keyframes dsound-ring{',
      '  0%{ transform:scale(1); opacity:.6; }',
      '  100%{ transform:scale(1.4); opacity:0; }',
      '}',

      /* Popup */
      '#dsound-popup{',
      '  position:absolute; top:52px; right:0;',
      '  width:240px;',
      '  background:linear-gradient(160deg, rgba(15,61,56,.98), rgba(10,43,40,.98));',
      '  border:1.5px solid var(--theme-border, rgba(244,184,66,.55));',
      '  border-radius:16px;',
      '  box-shadow:0 12px 40px rgba(0,0,0,.7), 0 0 30px var(--theme-glow, rgba(244,184,66,.3));',
      '  backdrop-filter:blur(20px); -webkit-backdrop-filter:blur(20px);',
      '  padding:14px;',
      '  opacity:0; pointer-events:none;',
      '  transform:translateY(-6px) scale(.96);',
      '  transform-origin:top right;',
      '  transition:opacity .25s, transform .3s cubic-bezier(.16,1,.3,1);',
      '}',
      '#dsound-popup.show{',
      '  opacity:1; pointer-events:auto;',
      '  transform:translateY(0) scale(1);',
      '}',
      '#dsound-popup .dsound-title{',
      '  font-size:10.5px; font-weight:900;',
      '  color:var(--theme-accent, #FBD77A);',
      '  text-transform:uppercase; letter-spacing:.1em;',
      '  margin-bottom:8px; text-align:center;',
      '}',
      '#dsound-popup .dsound-info{',
      '  font-size:11px; color:#bfe9dc;',
      '  text-align:center; margin-bottom:12px;',
      '  padding:8px 10px; border-radius:10px;',
      '  background:rgba(0,0,0,.25);',
      '  border:1px solid var(--theme-border-soft, rgba(244,184,66,.2));',
      '  min-height:34px; display:flex; align-items:center; justify-content:center;',
      '}',
      '#dsound-popup .dsound-volume{',
      '  display:flex; align-items:center; gap:8px;',
      '  margin-bottom:12px;',
      '}',
      '#dsound-popup .dsound-volume .icon{',
      '  font-size:14px; flex-shrink:0;',
      '}',
      '#dsound-popup .dsound-volume input[type=range]{',
      '  flex:1; height:4px;',
      '  -webkit-appearance:none; appearance:none;',
      '  background:linear-gradient(90deg, var(--theme-accent, #FBD77A), var(--theme-accent2, #bfe9dc));',
      '  border-radius:99px; outline:none; cursor:pointer;',
      '}',
      '#dsound-popup .dsound-volume input[type=range]::-webkit-slider-thumb{',
      '  -webkit-appearance:none; appearance:none;',
      '  width:14px; height:14px; border-radius:50%;',
      '  background:#fff; cursor:pointer;',
      '  box-shadow:0 0 8px var(--theme-glow, rgba(244,184,66,.6));',
      '}',
      '#dsound-popup .dsound-volume .pct{',
      '  font-size:10px; font-weight:900;',
      '  color:var(--theme-accent, #FBD77A);',
      '  min-width:32px; text-align:right;',
      '  font-variant-numeric:tabular-nums;',
      '}',
      '#dsound-popup .dsound-toggle{',
      '  width:100%; padding:9px 12px;',
      '  border-radius:10px; border:none;',
      '  font-family:inherit; font-size:11px; font-weight:900;',
      '  letter-spacing:.06em; text-transform:uppercase;',
      '  cursor:pointer;',
      '  background:linear-gradient(135deg, var(--theme-accent, #FBD77A), var(--theme-accent2, #bfe9dc));',
      '  color:#0a2b28;',
      '  box-shadow:0 4px 12px var(--theme-glow, rgba(244,184,66,.4));',
      '  transition:transform .15s;',
      '}',
      '#dsound-popup .dsound-toggle:active{ transform:scale(.97); }',
      '#dsound-popup .dsound-toggle.off{',
      '  background:rgba(255,255,255,.06);',
      '  color:#bfe9dc;',
      '  border:1px solid var(--theme-border-soft, rgba(244,184,66,.3));',
      '  box-shadow:none;',
      '}',

      '@media(max-width:480px){',
      '  #dsound-widget{ top:10px; right:10px; }',
      '  #dsound-btn{ width:38px; height:38px; font-size:16px; }',
      '  #dsound-popup{ width:220px; }',
      '}',

      '@media(prefers-reduced-motion: reduce){',
      '  #dsound-btn.on::after{ animation:none; }',
      '}'
    ].join('\n');
    document.head.appendChild(s);
  }

  function buildWidget(){
    if (document.getElementById('dsound-widget')) return;

    var w = document.createElement('div');
    w.id = 'dsound-widget';
    w.innerHTML =
      '<button id="dsound-btn" type="button" title="Nhạc theme">🔇</button>' +
      '<div id="dsound-popup">' +
      '  <div class="dsound-title">🎵 Nhạc Theme</div>' +
      '  <div class="dsound-info" id="dsound-info">Chưa có nhạc</div>' +
      '  <div class="dsound-volume">' +
      '    <span class="icon">🔊</span>' +
      '    <input id="dsound-vol" type="range" min="0" max="100" value="' + Math.round(state.volume * 100) + '">' +
      '    <span class="pct" id="dsound-pct">' + Math.round(state.volume * 100) + '%</span>' +
      '  </div>' +
      '  <button class="dsound-toggle" id="dsound-toggle" type="button">Bật nhạc</button>' +
      '</div>';

    document.body.appendChild(w);

    var btn      = document.getElementById('dsound-btn');
    var popup    = document.getElementById('dsound-popup');
    var toggleBtn= document.getElementById('dsound-toggle');
    var volInput = document.getElementById('dsound-vol');
    var pctLabel = document.getElementById('dsound-pct');

    btn.addEventListener('click', function(e){
      e.stopPropagation();
      popup.classList.toggle('show');
    });

    toggleBtn.addEventListener('click', function(){
      if (state.enabled){
        disableSound();
      } else {
        enableSound();
      }
    });

    volInput.addEventListener('input', function(){
      var v = parseInt(this.value, 10);
      state.volume = v / 100;
      pctLabel.textContent = v + '%';
      setLS(LS_VOLUME, String(v));
      if (state.audio && !state.audio.paused){
        state.audio.volume = state.volume;
      }
    });

    /* Click ngoài popup → đóng */
    document.addEventListener('click', function(e){
      if (!w.contains(e.target)) popup.classList.remove('show');
    });

    /* ESC để đóng */
    document.addEventListener('keydown', function(e){
      if (e.key === 'Escape') popup.classList.remove('show');
    });

    updateUI();
  }

  function updateUI(){
    var btn    = document.getElementById('dsound-btn');
    var info   = document.getElementById('dsound-info');
    var toggle = document.getElementById('dsound-toggle');
    if (!btn) return;

    if (state.enabled){
      btn.textContent = '🔊';
      btn.classList.add('on');
      if (toggle){
        toggle.textContent = 'Tắt nhạc';
        toggle.classList.remove('off');
      }
    } else {
      btn.textContent = '🔇';
      btn.classList.remove('on');
      if (toggle){
        toggle.textContent = 'Bật nhạc';
        toggle.classList.add('off');
      }
    }

    if (info){
      if (state.currentTheme && THEME_LABEL[state.currentTheme]){
        info.textContent = 'Đang phát: ' + THEME_LABEL[state.currentTheme];
      } else if (state.enabled){
        info.textContent = 'Theme này không có nhạc';
      } else {
        info.textContent = 'Nhạc đang tắt';
      }
    }
  }

  /* ═══════════════ ENABLE / DISABLE ═══════════════ */
  function enableSound(){
    state.enabled = true;
    setLS(LS_ENABLED, '1');

    /* Unlock audio context bằng user gesture */
    state.unlocked = true;

    /* Nếu theme hiện tại có nhạc → phát */
    var theme = getCurrentTheme();
    if (SOUND_MAP[theme]){
      playTheme(theme);
    } else {
      updateUI();
    }
    updateUI();
  }

  function disableSound(){
    state.enabled = false;
    setLS(LS_ENABLED, '0');
    stopAudio();
    updateUI();
  }

  /* ═══════════════ THEME DETECTION ═══════════════ */
  function getCurrentTheme(){
    /* Ưu tiên: URL param → data-theme attribute → localStorage */
    try {
      var params = new URLSearchParams(location.search);
      var urlTheme = params.get('theme');
      if (urlTheme && SOUND_MAP[urlTheme]) return urlTheme;
    } catch(e){}

    var attr = document.body.getAttribute('data-theme');
    if (attr) return attr;

    try {
      var ls = localStorage.getItem('dolphin_theme');
      if (ls) return ls;
    } catch(e){}

    return null;
  }

  /* ═══════════════ UNLOCK (auto-play policy) ═══════════════ */
  function setupUnlock(){
    function unlockOnce(){
      state.unlocked = true;
      /* Nếu user đã bật trước đó → chạy lại */
      if (state.enabled){
        var theme = getCurrentTheme();
        if (SOUND_MAP[theme]) playTheme(theme);
      }
      document.removeEventListener('click', unlockOnce, true);
      document.removeEventListener('touchstart', unlockOnce, true);
      document.removeEventListener('keydown', unlockOnce, true);
    }
    document.addEventListener('click', unlockOnce, true);
    document.addEventListener('touchstart', unlockOnce, true);
    document.addEventListener('keydown', unlockOnce, true);
  }

  /* ═══════════════ FIRST-TIME TOAST ═══════════════ */
  function maybeShowToast(){
    /* Chỉ nhắc 1 lần duy nhất */
    if (getLS(LS_ASKED) === '1') return;

    setTimeout(function(){
      var theme = getCurrentTheme();
      if (!SOUND_MAP[theme]) return;  /* Theme không có nhạc → không nhắc */

      var toast = document.createElement('div');
      toast.id = 'dsound-toast';
      toast.style.cssText =
        'position:fixed;top:70px;right:14px;z-index:9999;' +
        'background:linear-gradient(135deg,rgba(15,61,56,.98),rgba(10,43,40,.98));' +
        'border:1.5px solid var(--theme-border, rgba(244,184,66,.6));' +
        'border-radius:14px;padding:12px 14px;' +
        'box-shadow:0 10px 30px rgba(0,0,0,.6), 0 0 20px var(--theme-glow, rgba(244,184,66,.3));' +
        'backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);' +
        'font-family:"Nunito",sans-serif;font-size:12px;color:#fff;' +
        'max-width:240px;animation:dsoundSlideIn .4s ease;';

      toast.innerHTML =
        '<div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;">' +
        '  <span style="font-size:20px;">🔊</span>' +
        '  <span style="font-weight:900;color:var(--theme-accent, #FBD77A);letter-spacing:.04em;">Bật nhạc theme?</span>' +
        '</div>' +
        '<div style="display:flex;gap:6px;">' +
        '  <button id="dsound-toast-yes" style="flex:1;padding:8px;border-radius:9px;border:none;background:linear-gradient(135deg,var(--theme-accent, #FBD77A),var(--theme-accent2, #bfe9dc));color:#0a2b28;font-family:inherit;font-weight:900;font-size:11px;letter-spacing:.06em;cursor:pointer;">BẬT</button>' +
        '  <button id="dsound-toast-no" style="padding:8px 12px;border-radius:9px;border:1px solid var(--theme-border-soft, rgba(244,184,66,.3));background:transparent;color:#bfe9dc;font-family:inherit;font-weight:700;font-size:11px;cursor:pointer;">ĐỂ SAU</button>' +
        '</div>';

      /* Inject animation */
      if (!document.getElementById('dsound-anim')){
        var st = document.createElement('style');
        st.id = 'dsound-anim';
        st.textContent = '@keyframes dsoundSlideIn{from{opacity:0;transform:translateX(20px);}to{opacity:1;transform:translateX(0);}}';
        document.head.appendChild(st);
      }

      document.body.appendChild(toast);

      document.getElementById('dsound-toast-yes').addEventListener('click', function(){
        enableSound();
        setLS(LS_ASKED, '1');
        toast.remove();
      });
      document.getElementById('dsound-toast-no').addEventListener('click', function(){
        setLS(LS_ASKED, '1');
        toast.remove();
      });

      /* Auto close sau 15s */
      setTimeout(function(){ if (toast.parentNode) toast.remove(); }, 15000);
    }, 5000);
  }

  /* ═══════════════ LISTEN THEME CHANGE ═══════════════ */
  function listenThemeChange(){
    /* 1. Qua BroadcastChannel (từ theme-system v6+) */
    try {
      var bc = new BroadcastChannel('dolphin-theme');
      bc.addEventListener('message', function(ev){
        var d = ev.data || {};
        if (d.type === 'theme' && d.key){
          onThemeChange(d.key);
        }
      });
    } catch(e){}

    /* 2. Qua MutationObserver (fallback) */
    if (window.MutationObserver){
      var last = document.body.getAttribute('data-theme');
      var obs = new MutationObserver(function(){
        var cur = document.body.getAttribute('data-theme');
        if (cur !== last){
          last = cur;
          if (cur) onThemeChange(cur);
        }
      });
      obs.observe(document.body, { attributes: true, attributeFilter: ['data-theme'] });
    }

    /* 3. Poll định kỳ mỗi 3s (phòng hờ) */
    setInterval(function(){
      if (!state.enabled) return;
      var cur = getCurrentTheme();
      if (cur && cur !== state.currentTheme){
        onThemeChange(cur);
      }
    }, 3000);
  }

  /* ═══════════════ INIT ═══════════════ */
  function init(){
    if (!shouldRun()) return;

    /* Load state từ localStorage */
    state.enabled = getLS(LS_ENABLED, '0') === '1';
    var volStr = getLS(LS_VOLUME, '40');
    var volInt = parseInt(volStr, 10);
    if (isNaN(volInt) || volInt < 0 || volInt > 100) volInt = 40;
    state.volume = volInt / 100;

    injectStyles();
    buildWidget();
    setupUnlock();
    listenThemeChange();

    /* Nếu user đã bật trước → chờ unlock gesture rồi tự chạy */
    /* (không chạy ngay vì browser chặn autoplay) */

    /* Nhắc lần đầu */
    if (!state.enabled) maybeShowToast();

    console.log('%c🎵 DOLPHIN SOUNDSCAPE LOADED',
      'background:linear-gradient(90deg,#FBD77A,#F4B842);color:#0a2b28;font-size:11px;padding:3px 8px;border-radius:4px;font-weight:900');
  }

  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  /* Expose API */
  window.DolphinSound = {
    enable:  enableSound,
    disable: disableSound,
    toggle:  function(){ state.enabled ? disableSound() : enableSound(); },
    isOn:    function(){ return state.enabled; },
    version: '1.0'
  };
})();
