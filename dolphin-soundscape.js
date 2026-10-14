/**
 * Dolphin Soundscape v2.4
 *
 * CHANGELOG:
 *   v2.4 — Fetch manifest.json tĩnh (không rate limit)
 *          Bỏ widget tự động — nút nhạc nằm trong clock ở index.html
 *          Bỏ toast nhắc — user tự khám phá nút nhạc
 *   v2.3 — GitHub API (đã bỏ do rate limit)
 *   v2.2 — pause/resume API
 *   v2.1 — mode auto/manual
 *   v2.0 — 15 theme MP3
 *
 * ═══════════════════════════════════════════════════════════
 * 📌 CÁCH THÊM NHẠC MỚI
 * ═══════════════════════════════════════════════════════════
 * 1. Upload file MP3 vào folder sounds/
 *    Đặt tên: soundscape-<key>.mp3
 *    VD: soundscape-lofi.mp3
 *
 * 2. Push lên GitHub → GitHub Action tự quét
 *
 * 3. (Tuỳ chọn) Muốn tên đẹp + icon → mở file này, thêm
 *    1 dòng vào TRACKS_META:
 *    'lofi': { label:'Lofi Chill', icon:'🎧', sub:'Nhạc nhẹ' },
 * ═══════════════════════════════════════════════════════════
 */
(function(){
  'use strict';

  // ═══════════════════════════════════════════════════════════
  // 📌 METADATA ĐẸP CHO TỪNG BÀI
  // ═══════════════════════════════════════════════════════════
  var TRACKS_META = {
    'default':       { label:'Dolphin',         icon:'🐬', sub:'Quanh năm' },
    'tet':           { label:'Tết Nguyên Đán',  icon:'🧧', sub:'15/1 – 20/2' },
    'valentine':     { label:'Valentine',       icon:'💝', sub:'10/2 – 15/2' },
    'womenday':      { label:'8/3 & 20/10',     icon:'🌷', sub:'Ngày Phụ nữ' },
    'reunification': { label:'30/4',            icon:'⭐', sub:'Thống nhất' },
    'children':      { label:'1/6',             icon:'🎈', sub:'Thiếu nhi' },
    'nationalday':   { label:'2/9',             icon:'⭐', sub:'Quốc khánh' },
    'midautumn':     { label:'Trung Thu',       icon:'🏮', sub:'10/9 – 5/10' },
    'halloween':     { label:'Halloween',       icon:'🎃', sub:'25/10 – 1/11' },
    'christmas':     { label:'Giáng Sinh',      icon:'🎄', sub:'15/12 – 26/12' },
    'newyear':       { label:'Tết Dương',       icon:'🎊', sub:'29/12 – 2/1' },
    'spring':        { label:'Mùa Xuân',        icon:'🌸', sub:'Tháng 3 – 5' },
    'summer':        { label:'Mùa Hè',          icon:'☀️', sub:'Tháng 6 – 8' },
    'autumn':        { label:'Mùa Thu',         icon:'🍁', sub:'Tháng 9 – 11' },
    'winter':        { label:'Mùa Đông',        icon:'❄️', sub:'Tháng 12 – 2' }
  };

  var TRACKS_ORDER = [
    'default','tet','valentine','womenday','reunification','children',
    'nationalday','midautumn','halloween','christmas','newyear',
    'spring','summer','autumn','winter'
  ];

  // Fallback nếu fetch manifest fail
  var TRACKS_FALLBACK = [
    { key:'default',       file:'soundscape-default.mp3' },
    { key:'tet',           file:'soundscape-tet.mp3' },
    { key:'valentine',     file:'soundscape-valentine.mp3' },
    { key:'womenday',      file:'soundscape-womenday.mp3' },
    { key:'reunification', file:'soundscape-reunification.mp3' },
    { key:'children',      file:'soundscape-children.mp3' },
    { key:'nationalday',   file:'soundscape-nationalday.mp3' },
    { key:'midautumn',     file:'soundscape-midautumn.mp3' },
    { key:'halloween',     file:'soundscape-halloween.mp3' },
    { key:'christmas',     file:'soundscape-christmas.mp3' },
    { key:'newyear',       file:'soundscape-newyear.mp3' },
    { key:'spring',        file:'soundscape-spring.mp3' },
    { key:'summer',        file:'soundscape-summer.mp3' },
    { key:'autumn',        file:'soundscape-autumn.mp3' },
    { key:'winter',        file:'soundscape-winter.mp3' }
  ];

  // ═══════════════════════ CONFIG ═══════════════════════
  var SOUND_BASE     = '/DolphinApp/sounds/';
  var MANIFEST_URL   = SOUND_BASE + 'manifest.json';
  var CACHE_KEY      = 'dolphin_sound_tracks_cache_v2';
  var CACHE_TTL      = 24 * 60 * 60 * 1000;
  var FETCH_TIMEOUT  = 10000;

  var STORAGE_ENABLED = 'dolphin_soundscape';
  var STORAGE_VOL     = 'dolphin_soundscape_vol';
  var STORAGE_MODE    = 'dolphin_sound_mode';
  var STORAGE_PICK    = 'dolphin_sound_pick';
  var STORAGE_POS     = 'dolphin_sound_pos';

  // ═══════════════════════ RUNTIME ═══════════════════════
  var TRACKS = TRACKS_FALLBACK.map(enrichTrack);
  var audio = null;
  var currentKey = null;
  var fadeInterval = null;
  var isFading = false;
  var systemPaused = false;
  var initialized = false;

  // ═══════════════════════ HELPERS ═══════════════════════
  function getEnabled(){ return localStorage.getItem(STORAGE_ENABLED) === '1'; }
  function setEnabledStored(v){ localStorage.setItem(STORAGE_ENABLED, v ? '1' : '0'); }
  function getVol(){
    var v = parseFloat(localStorage.getItem(STORAGE_VOL));
    return isNaN(v) ? 0.3 : Math.max(0, Math.min(1, v));
  }
  function setVolStored(v){ localStorage.setItem(STORAGE_VOL, String(v)); }
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
  function shouldPlayHere(){
    if (!isInIframe()) return true;
    return !!window.DOLPHIN_ALLOW_SOUND;
  }

  // ═══════════════════════ ENRICH ═══════════════════════
  function enrichTrack(t){
    var meta = TRACKS_META[t.key];
    if (meta){
      return {
        key: t.key,
        file: t.file,
        label: meta.label || t.key,
        icon: meta.icon || '🎵',
        sub: meta.sub || ''
      };
    }
    var label = t.key.replace(/[-_]/g, ' ').replace(/\b\w/g, function(c){ return c.toUpperCase(); });
    return {
      key: t.key,
      file: t.file,
      label: label,
      icon: '🎵',
      sub: 'Bài hát tùy chỉnh'
    };
  }

  function sortTracks(tracks){
    return tracks.sort(function(a, b){
      var ia = TRACKS_ORDER.indexOf(a.key);
      var ib = TRACKS_ORDER.indexOf(b.key);
      if (ia === -1 && ib === -1) return a.key.localeCompare(b.key);
      if (ia === -1) return 1;
      if (ib === -1) return -1;
      return ia - ib;
    });
  }

  // ═══════════════════════ MANIFEST FETCH ═══════════════════════
  function loadCache(){
    try {
      var raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      var data = JSON.parse(raw);
      if (!data || !data.tracks || !data.ts) return null;
      if (Date.now() - data.ts > CACHE_TTL) return null;
      return data.tracks;
    } catch(e){ return null; }
  }

  function saveCache(tracks){
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({ tracks: tracks, ts: Date.now() }));
    } catch(e){}
  }

  function clearCache(){
    try { localStorage.removeItem(CACHE_KEY); } catch(e){}
  }

  function fetchManifest(bustCache){
    var url = MANIFEST_URL + (bustCache ? '?t=' + Date.now() : '');
    var controller = new AbortController();
    var timer = setTimeout(function(){ controller.abort(); }, FETCH_TIMEOUT);

    return fetch(url, {
      signal: controller.signal,
      cache: bustCache ? 'no-store' : 'default'
    }).then(function(r){
      clearTimeout(timer);
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    }).then(function(data){
      if (!data || !Array.isArray(data.tracks) || !data.tracks.length){
        throw new Error('Manifest rỗng hoặc sai format');
      }
      var tracks = data.tracks
        .filter(function(t){ return t && t.key && t.file; })
        .map(enrichTrack);
      return sortTracks(tracks);
    }).catch(function(err){
      clearTimeout(timer);
      throw err;
    });
  }

  function refreshTracks(force, silent){
    if (!force){
      var cached = loadCache();
      if (cached && cached.length){
        TRACKS = cached;
        notifyUITracksChanged();
        return Promise.resolve(cached);
      }
    }
    return fetchManifest(force)
      .then(function(tracks){
        TRACKS = tracks;
        saveCache(tracks);
        notifyUITracksChanged();
        if (!silent) console.log('[Soundscape] Đã tải ' + tracks.length + ' bài từ manifest');
        return tracks;
      })
      .catch(function(err){
        console.warn('[Soundscape] Manifest fail:', err.message);
        var fallback = loadCache();
        if (fallback && fallback.length){
          TRACKS = fallback;
        } else {
          TRACKS = TRACKS_FALLBACK.map(enrichTrack);
        }
        notifyUITracksChanged();
        return TRACKS;
      });
  }

  function notifyUITracksChanged(){
    if (typeof window.__giaitriSyncMusicUI === 'function'){
      try { window.__giaitriSyncMusicUI(); } catch(e){}
    }
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
        key: currentKey, t: audio.currentTime || 0, ts: Date.now()
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
      if (audio.duration && t < audio.duration - 1) audio.currentTime = t;
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
    if (!track){ console.warn('[Soundscape] Không có bài:', key); return; }
    ensureAudio();
    var url = SOUND_BASE + track.file;

    if (currentKey === key && audio.src && audio.src.indexOf(track.file) !== -1){
      if (audio.paused){
        fadeTo(getVol(), 1400);
        var p = audio.play();
        if (p && p.catch) p.catch(function(e){ console.warn('[DolphinSound] Play bị chặn:', e); });
      }
      return;
    }

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
      notifyUITracksChanged();
      syncClockBtn();
    },
    disable: function(){
      setEnabledStored(false);
      pauseKey();
      notifyUITracksChanged();
      syncClockBtn();
    },
    toggle: function(){
      if (getEnabled()) API.disable(); else API.enable();
    },
    isEnabled: function(){ return getEnabled(); },
    isPlaying: function(){ return !!audio && !audio.paused && getEnabled() && shouldPlayHere(); },

    pause: function(){
      systemPaused = true;
      pauseKey({ fast: true });
    },
    resume: function(){
      systemPaused = false;
      if (!getEnabled()) return;
      if (!shouldPlayHere()) return;
      var target = resolveCurrentKey();
      if (target !== currentKey) playKey(target);
      else resumeKey();
    },

    setMode: function(m){
      setModeStored(m);
      if (!getEnabled()) setEnabledStored(true);
      if (shouldPlayHere()){
        var key = resolveCurrentKey();
        if (key !== currentKey) playKey(key);
        else if (audio && audio.paused) resumeKey();
      }
      notifyUITracksChanged();
      syncClockBtn();
    },
    getMode: function(){ return getMode(); },

    setTrack: function(key){
      if (!themeKeyExists(key)) key = 'default';
      setModeStored('manual');
      setPickStored(key);
      setEnabledStored(true);
      if (shouldPlayHere()) playKey(key);
      notifyUITracksChanged();
      syncClockBtn();
    },
    getTrack: function(){ return currentKey || resolveCurrentKey(); },
    getTracks: function(){ return TRACKS.slice(); },

    setVolume: function(v){
      v = Math.max(0, Math.min(1, v));
      setVolStored(v);
      if (audio && !isFading) audio.volume = v;
      notifyUITracksChanged();
    },
    getVolume: function(){ return getVol(); },

    refreshTracks: function(){
      clearCache();
      return refreshTracks(true, false);
    }
  };
  window.DolphinSound = API;

  function syncClockBtn(){
    var btn = document.getElementById('clockSoundBtn');
    if (!btn) return;
    btn.textContent = getEnabled() ? '🔊' : '🔇';
    btn.classList.toggle('active', getEnabled());
  }

  // ═══════════════════════ SỰ KIỆN ═══════════════════════
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
      if (getEnabled() && shouldPlayHere() && !systemPaused) resumeKey();
    }
  });

  // ═══════════════════════ INIT ═══════════════════════
  function init(){
    if (initialized) return;
    initialized = true;

    // Fetch manifest trong nền
    refreshTracks(false, true).catch(function(){});

    // Sync UI nút nhạc
    syncClockBtn();
    setInterval(syncClockBtn, 2000);

    // Tự phát nếu đã bật + môi trường cho phép
    if (getEnabled() && shouldPlayHere()){
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
