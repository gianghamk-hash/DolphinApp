/**
 * Dolphin Soundscape v2.2
 *
 * CHANGELOG v2.2:
 *   - Thêm API pause() và resume() cho landing ↔ iframe sync
 *   - Chỉ phát nhạc ở Landing và app Giải Trí (DOLPHIN_ALLOW_SOUND)
 *   - Không phát ở Lounge/Bungalow/Restaurant/Show
 *   - Tự ẩn widget ở iframe không cho phép
 *   - Lưu vị trí phát (currentTime) để liền mạch khi quay lại
 *
 * ═══════════════════════════════════════════════════════════
 * 📌 HƯỚNG DẪN THÊM NHẠC MỚI
 * ═══════════════════════════════════════════════════════════
 * Bước 1: Upload file MP3 vào folder sounds/
 *         Đặt tên: soundscape-<key>.mp3
 *         VD: soundscape-lofi.mp3
 *
 * Bước 2: Thêm 1 dòng vào mảng TRACKS bên dưới
 *         { key:'lofi', label:'Lofi Chill', icon:'🎧',
 *           file:'soundscape-lofi.mp3', sub:'Nhạc nhẹ' },
 *
 * Bước 3: Commit + push
 *         git add sounds/ dolphin-soundscape.js
 *         git commit -m "[bump] Thêm nhạc Lofi"
 *         git push
 * ═══════════════════════════════════════════════════════════
 */
(function(){
  'use strict';

  // ═══════════════════════════════════════════════════════════
  // 📌 DANH SÁCH BÀI HÁT — THÊM BÀI MỚI VÀO ĐÂY
  // ═══════════════════════════════════════════════════════════
  //   key   — chữ thường, không dấu, không space (dùng nội bộ)
  //   label — tên hiển thị (có dấu OK)
  //   icon  — 1 emoji
  //   file  — tên file MP3 trong folder sounds/
  //   sub   — mô tả ngắn hiển thị dưới tên bài
  // ═══════════════════════════════════════════════════════════
  var TRACKS = [
    { key:'default',       label:'Dolphin',         icon:'🐬', file:'soundscape-default.mp3',       sub:'Quanh năm' },
    { key:'tet',           label:'Tết Nguyên Đán',  icon:'🧧', file:'soundscape-tet.mp3',           sub:'15/1 – 20/2' },
    { key:'valentine',     label:'Valentine',       icon:'💝', file:'soundscape-valentine.mp3',     sub:'10/2 – 15/2' },
    { key:'womenday',      label:'8/3 & 20/10',     icon:'🌷', file:'soundscape-womenday.mp3',      sub:'Ngày Phụ nữ' },
    { key:'reunification', label:'30/4',            icon:'⭐', file:'soundscape-reunification.mp3', sub:'Thống nhất' },
    { key:'children',      label:'1/6',             icon:'🎈', file:'soundscape-children.mp3',      sub:'Thiếu nhi' },
    { key:'nationalday',   label:'2/9',             icon:'⭐', file:'soundscape-nationalday.mp3',   sub:'Quốc khánh' },
    { key:'midautumn',     label:'Trung Thu',       icon:'🏮', file:'soundscape-midautumn.mp3',     sub:'10/9 – 5/10' },
    { key:'halloween',     label:'Halloween',       icon:'🎃', file:'soundscape-halloween.mp3',     sub:'25/10 – 1/11' },
    { key:'christmas',     label:'Giáng Sinh',      icon:'🎄', file:'soundscape-christmas.mp3',     sub:'15/12 – 26/12' },
    { key:'newyear',       label:'Tết Dương',       icon:'🎊', file:'soundscape-newyear.mp3',       sub:'29/12 – 2/1' },
    { key:'spring',        label:'Mùa Xuân',        icon:'🌸', file:'soundscape-spring.mp3',        sub:'Tháng 3 – 5' },
    { key:'summer',        label:'Mùa Hè',          icon:'☀️', file:'soundscape-summer.mp3',        sub:'Tháng 6 – 8' },
    { key:'autumn',        label:'Mùa Thu',         icon:'🍁', file:'soundscape-autumn.mp3',        sub:'Tháng 9 – 11' },
    { key:'winter',        label:'Mùa Đông',        icon:'❄️', file:'soundscape-winter.mp3',        sub:'Tháng 12 – 2' }
  ];
  // ═══════════════════════════════════════════════════════════

  var SOUND_BASE = '/DolphinApp/sounds/';
  var STORAGE_ENABLED = 'dolphin_soundscape';
  var STORAGE_VOL     = 'dolphin_soundscape_vol';
  var STORAGE_ASKED   = 'dolphin_soundscape_asked';
  var STORAGE_MODE    = 'dolphin_sound_mode';
  var STORAGE_PICK    = 'dolphin_sound_pick';
  var STORAGE_POS     = 'dolphin_sound_pos';

  var audio = null;
  var currentKey = null;
  var fadeInterval = null;
  var isFading = false;
  var widgetEl = null, popupEl = null, toastEl = null;
  var initialized = false;
  var systemPaused = false; // true khi bị landing pause vì mở iframe

  // ═══════════════════════ HELPERS ═══════════════════════
  function getEnabled(){ return localStorage.getItem(STORAGE_ENABLED) === '1'; }
  function setEnabledStored(v){ localStorage.setItem(STORAGE_ENABLED, v ? '1' : '0'); }
  function getVol(){ var v = parseFloat(localStorage.getItem(STORAGE_VOL)); return isNaN(v) ? 0.3 : Math.max(0, Math.min(1, v)); }
  function setVolStored(v){ localStorage.setItem(STORAGE_VOL, String(v)); }
  function getAsked(){ return localStorage.getItem(STORAGE_ASKED) === '1'; }
  function setAskedStored(){ localStorage.setItem(STORAGE_ASKED, '1'); }
  function getMode(){ return localStorage.getItem(STORAGE_MODE) === 'manual' ? 'manual' : 'auto'; }
  function setModeStored(m){ localStorage.setItem(STORAGE_MODE, m === 'manual' ? 'manual' : 'auto'); }
  function getPick(){ return localStorage.getItem(STORAGE_PICK) || 'default'; }
  function setPickStored(k){ localStorage.setItem(STORAGE_PICK, k); }

  function findTrack(key){
    for (var i = 0; i < TRACKS.length; i++) if (TRACKS[i].key === key) return TRACKS[i];
    return TRACKS[0];
  }
  function themeKeyExists(k){
    for (var i = 0; i < TRACKS.length; i++) if (TRACKS[i].key === k) return true;
    return false;
  }
  function getThemeKey(){
    try {
      if (window.ThemeSystem && typeof window.ThemeSystem.getCurrent === 'function'){
        return window.ThemeSystem.getCurrent() || 'default';
      }
    } catch(e){}
    var dt = document.body && document.body.getAttribute('data-theme');
    return dt || 'default';
  }
  function resolveCurrentKey(){
    if (getMode() === 'manual') return getPick();
    var tk = getThemeKey();
    return themeKeyExists(tk) ? tk : 'default';
  }

  function isInIframe(){
    try { return window.self !== window.top; } catch(e){ return true; }
  }

  /**
   * Kiểm tra môi trường hiện tại có được phát nhạc không
   * - Landing (không phải iframe)          → cho phép
   * - Iframe có cờ DOLPHIN_ALLOW_SOUND      → cho phép (VD: Giải Trí)
   * - Iframe khác (Lounge/Bungalow/...)     → KHÔNG
   */
  function shouldPlayHere(){
    if (!isInIframe()) return true;
    return !!window.DOLPHIN_ALLOW_SOUND;
  }

  // ═══════════════════════ AUDIO CORE ═══════════════════════
  function ensureAudio(){
    if (audio) return audio;
    audio = new Audio();
    audio.loop = true;
    audio.preload = 'auto';
    audio.volume = getVol();
    audio.addEventListener('error', function(){
      console.warn('[DolphinSound] File lỗi 404:', audio.src);
    });
    audio.addEventListener('loadedmetadata', function(){
      restorePlaybackPos();
    });
    return audio;
  }

  function savePlaybackPos(){
    if (!audio || !currentKey) return;
    try {
      localStorage.setItem(STORAGE_POS, JSON.stringify({
        key: currentKey,
        t: audio.currentTime || 0,
        ts: Date.now()
      }));
    } catch(e){}
  }

  function restorePlaybackPos(){
    if (!audio || !currentKey) return;
    try {
      var raw = localStorage.getItem(STORAGE_POS);
      if (!raw) return;
      var data = JSON.parse(raw);
      if (!data || data.key !== currentKey) return;
      if (Date.now() - (data.ts || 0) > 60000) return;
      var t = parseFloat(data.t) || 0;
      if (audio.duration && t < audio.duration - 1){
        audio.currentTime = t;
      }
    } catch(e){}
  }

  function fadeTo(targetVol, ms, cb){
    if (fadeInterval) clearInterval(fadeInterval);
    if (!audio) return;
    var start = audio.volume;
    var steps = Math.max(1, Math.floor(ms / 30));
    var step = (targetVol - start) / steps;
    var i = 0;
    isFading = true;
    fadeInterval = setInterval(function(){
      i++;
      audio.volume = Math.max(0, Math.min(1, start + step * i));
      if (i >= steps){
        clearInterval(fadeInterval); fadeInterval = null; isFading = false;
        audio.volume = targetVol;
        if (cb) cb();
      }
    }, 30);
  }

  function playKey(key){
    if (!shouldPlayHere()) return;
    var track = findTrack(key);
    ensureAudio();
    var url = SOUND_BASE + track.file;

    // Cùng bài → resume
    if (currentKey === key && audio.src && audio.src.indexOf(track.file) !== -1){
      if (audio.paused){
        fadeTo(getVol(), 1400);
        var p = audio.play();
        if (p && p.catch) p.catch(function(e){ console.warn('[DolphinSound] Play bị chặn:', e); });
      }
      return;
    }

    // Đổi bài
    currentKey = key;
    audio.src = url;
    audio.volume = 0;
    var pr = audio.play();
    if (pr && pr.then){
      pr.then(function(){ fadeTo(getVol(), 1200); })
        .catch(function(e){ console.warn('[DolphinSound] Play bị chặn:', e); audio.volume = getVol(); });
    } else {
      fadeTo(getVol(), 1200);
    }
  }

  function pauseKey(opts){
    opts = opts || {};
    savePlaybackPos();
    if (!audio || audio.paused) return;
    var ms = opts.fast ? 400 : 1400;
    fadeTo(0, ms, function(){ try { audio.pause(); } catch(e){} });
  }

  function resumeKey(){
    if (!audio){ playKey(resolveCurrentKey()); return; }
    if (!audio.src){ playKey(resolveCurrentKey()); return; }
    if (audio.paused){
      fadeTo(getVol(), 1600);
      var p = audio.play();
      if (p && p.catch) p.catch(function(e){ console.warn(e); });
    }
  }

  // ═══════════════════════ PUBLIC API ═══════════════════════
  var API = {
    enable: function(){
      setEnabledStored(true);
      if (shouldPlayHere()) playKey(resolveCurrentKey());
      updateWidgetUI();
    },
    disable: function(){
      setEnabledStored(false);
      pauseKey();
      updateWidgetUI();
    },
    toggle: function(){
      if (getEnabled()) API.disable(); else API.enable();
    },
    isEnabled: function(){ return getEnabled(); },
    isPlaying: function(){ return !!audio && !audio.paused && getEnabled() && shouldPlayHere(); },

    /**
     * Tạm dừng — DÙNG KHI LANDING MỞ IFRAME
     * KHÔNG thay đổi localStorage.enabled
     */
    pause: function(){
      systemPaused = true;
      pauseKey({ fast: true });
    },

    /**
     * Phát lại — DÙNG KHI LANDING ĐÓNG IFRAME, VỀ HOME
     * Chỉ phát nếu enabled + môi trường cho phép
     */
    resume: function(){
      systemPaused = false;
      if (!getEnabled()) return;
      if (!shouldPlayHere()) return;
      var target = resolveCurrentKey();
      if (target !== currentKey){
        playKey(target);
      } else {
        resumeKey();
      }
    },

    setMode: function(m){
      setModeStored(m);
      if (!getEnabled()) setEnabledStored(true);
      if (shouldPlayHere()){
        var key = resolveCurrentKey();
        if (key !== currentKey) playKey(key);
        else if (audio && audio.paused) resumeKey();
      }
      updateWidgetUI();
    },
    getMode: function(){ return getMode(); },

    setTrack: function(key){
      if (!themeKeyExists(key)) key = 'default';
      setModeStored('manual');
      setPickStored(key);
      setEnabledStored(true);
      if (shouldPlayHere()) playKey(key);
      updateWidgetUI();
    },
    getTrack: function(){ return currentKey || resolveCurrentKey(); },
    getTracks: function(){ return TRACKS.slice(); },

    setVolume: function(v){
      v = Math.max(0, Math.min(1, v));
      setVolStored(v);
      if (audio && !isFading) audio.volume = v;
      updateWidgetUI();
    },
    getVolume: function(){ return getVol(); }
  };
  window.DolphinSound = API;

  // ═══════════════════════ WIDGET (chỉ Landing) ═══════════════════════
  function buildWidget(){
    if (window.DOLPHIN_HIDE_SOUND_WIDGET) return;
    if (!shouldPlayHere()) return;
    if (document.getElementById('dolphin-sound-widget')) return;

    var w = document.createElement('div');
    w.id = 'dolphin-sound-widget';
    w.style.cssText = 'position:fixed;top:14px;right:14px;z-index:9997;font-family:inherit';
    w.innerHTML =
      '<button id="dsw-toggle" style="width:44px;height:44px;border-radius:50%;'
      + 'background:rgba(18,54,52,.9);border:2px solid rgba(244,184,66,.7);'
      + 'color:#FBD77A;font-size:20px;cursor:pointer;'
      + 'display:flex;align-items:center;justify-content:center;'
      + 'backdrop-filter:blur(12px);box-shadow:0 6px 20px rgba(0,0,0,.5);'
      + 'transition:transform .15s">🔇</button>'
      + '<div id="dsw-popup" style="display:none;position:absolute;top:52px;right:0;'
      + 'background:rgba(18,54,52,.95);border:2px solid rgba(244,184,66,.5);'
      + 'border-radius:14px;padding:14px;box-shadow:0 12px 40px rgba(0,0,0,.7);'
      + 'min-width:240px;backdrop-filter:blur(16px)">'
      + '<div style="font-size:11px;font-weight:900;color:#FBD77A;text-transform:uppercase;letter-spacing:.1em;margin-bottom:10px">🎵 Nhạc nền</div>'
      + '<div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">'
      + '<span style="font-size:11px;color:#bfe9dc;font-weight:700">Âm lượng</span>'
      + '<input id="dsw-vol" type="range" min="0" max="100" style="flex:1;height:4px;-webkit-appearance:none;background:linear-gradient(90deg,#FBD77A,#F4B842);border-radius:99px;outline:none">'
      + '<span id="dsw-vol-pct" style="font-size:11px;color:#FBD77A;font-weight:900;min-width:32px;text-align:right">30%</span>'
      + '</div>'
      + '<div style="font-size:10px;color:#bfe9dc;opacity:.7;text-align:center;line-height:1.4">'
      + 'Đổi bài hát trong app <b style="color:#FBD77A">🎮 Giải Trí</b>'
      + '</div>'
      + '</div>';

    document.body.appendChild(w);
    widgetEl = w;
    popupEl = document.getElementById('dsw-popup');

    document.getElementById('dsw-toggle').addEventListener('click', function(e){
      e.stopPropagation();
      popupEl.style.display = popupEl.style.display === 'none' ? 'block' : 'none';
    });
    document.getElementById('dsw-vol').addEventListener('input', function(){
      API.setVolume(parseInt(this.value, 10) / 100);
    });
    document.addEventListener('click', function(e){
      if (!widgetEl.contains(e.target)) popupEl.style.display = 'none';
    });

    updateWidgetUI();
  }

  function updateWidgetUI(){
    var btn = document.getElementById('dsw-toggle');
    var vol = document.getElementById('dsw-vol');
    var pct = document.getElementById('dsw-vol-pct');
    if (btn) btn.textContent = getEnabled() ? '🔊' : '🔇';
    if (vol) vol.value = String(Math.round(getVol() * 100));
    if (pct) pct.textContent = Math.round(getVol() * 100) + '%';
    if (typeof window.__giaitriSyncMusicUI === 'function') {
      try { window.__giaitriSyncMusicUI(); } catch(e){}
    }
  }

  // ═══════════════════════ TOAST NHẮC (chỉ Landing) ═══════════════════════
  function maybeShowToast(){
    if (isInIframe()) return;
    if (window.DOLPHIN_HIDE_SOUND_WIDGET) return;
    if (getAsked() || window.DOLPHIN_DISABLE_SOUND_TOAST) return;
    setTimeout(function(){
      if (getAsked() || getEnabled()) return;
      showToast();
    }, 5000);
  }

  function showToast(){
    if (toastEl) return;
    if (!document.getElementById('dsw-anim-style')){
      var style = document.createElement('style');
      style.id = 'dsw-anim-style';
      style.textContent = '@keyframes dsw-slide-up{from{opacity:0;transform:translateX(-50%) translateY(20px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}';
      document.head.appendChild(style);
    }
    toastEl = document.createElement('div');
    toastEl.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);'
      + 'background:linear-gradient(135deg,#1a4a45,#0d2a28);'
      + 'border:2px solid #FBD77A;border-radius:14px;padding:12px 16px;'
      + 'color:#FFE58F;font-size:13px;font-weight:800;'
      + 'box-shadow:0 12px 40px rgba(0,0,0,.6),0 0 40px rgba(244,184,66,.3);'
      + 'z-index:9999;display:flex;align-items:center;gap:12px;'
      + 'max-width:90vw;font-family:inherit;'
      + 'animation:dsw-slide-up .4s cubic-bezier(.16,1,.3,1)';
    toastEl.innerHTML = '<span>🎵 Bật nhạc nền cho không khí thư giãn?</span>'
      + '<button id="dsw-yes" style="background:linear-gradient(135deg,#FBD77A,#F4B842);color:#123634;border:none;padding:6px 12px;border-radius:8px;font-weight:900;font-size:12px;cursor:pointer">Bật ngay</button>'
      + '<button id="dsw-no" style="background:transparent;color:#bfe9dc;border:1px solid rgba(191,233,220,.4);padding:6px 10px;border-radius:8px;font-size:11px;cursor:pointer">Để sau</button>';
    document.body.appendChild(toastEl);

    document.getElementById('dsw-yes').addEventListener('click', function(){
      setAskedStored(); API.enable();
      if (toastEl){ toastEl.remove(); toastEl = null; }
    });
    document.getElementById('dsw-no').addEventListener('click', function(){
      setAskedStored();
      if (toastEl){ toastEl.remove(); toastEl = null; }
    });
    setTimeout(function(){ if (toastEl){ toastEl.remove(); toastEl = null; } }, 15000);
  }

  // ═══════════════════════ LẮNG NGHE SỰ KIỆN ═══════════════════════
  window.addEventListener('dolphin-theme-changed', function(){
    if (getMode() !== 'auto') return;
    if (!getEnabled()) return;
    if (!shouldPlayHere()) return;
    var key = resolveCurrentKey();
    if (key !== currentKey) playKey(key);
  });

  document.addEventListener('visibilitychange', function(){
    if (document.hidden){
      pauseKey({ fast: true });
    } else {
      if (getEnabled() && shouldPlayHere() && !systemPaused){
        resumeKey();
      }
    }
  });

  // ═══════════════════════ INIT ═══════════════════════
  function init(){
    if (initialized) return;
    initialized = true;

    buildWidget();
    maybeShowToast();

    // Tự phát nếu đã bật + môi trường cho phép
    if (getEnabled() && shouldPlayHere()){
      // Browser yêu cầu user gesture → nghe lần click đầu tiên
      var kick = function(){
        if (getEnabled() && shouldPlayHere() && !systemPaused){
          playKey(resolveCurrentKey());
        }
        document.removeEventListener('click', kick);
        document.removeEventListener('touchstart', kick);
        document.removeEventListener('keydown', kick);
      };
      document.addEventListener('click', kick, { once: true });
      document.addEventListener('touchstart', kick, { once: true });
      document.addEventListener('keydown', kick, { once: true });
    }
  }

  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
