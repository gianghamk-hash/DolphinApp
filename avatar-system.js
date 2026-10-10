/* ============================================================
   👤 AVATAR SYSTEM — Nhân viên chọn avatar cá nhân
   - 60 avatar chia 6 nhóm
   - Lưu Firebase (staff_profiles/{name})
   - Hiển thị khắp nơi: Chat, Caro, Ranking
   - Fallback: chữ cái đầu
   ============================================================ */
(function(){
  'use strict';

  var FIREBASE_CONFIG = {
    apiKey: "AIzaSyAtBNp9WBnyIkCiVjXfUpjH2d7-9dbg-JQ",
    authDomain: "dolphin-f6d67.firebaseapp.com",
    projectId: "dolphin-f6d67"
  };

  var COL_PROFILES = 'staff_profiles';
  var AVATAR_KEY = 'dolphinAvatar';

  // 60 avatar chia 6 nhóm
  var AVATARS = {
    'Động vật biển':    ['🐬','🐳','🐋','🦈','🐠','🐟','🐡','🦑','🐙','🦐','🦞','🦀','🐚','🐢','🐊'],
    'Động vật':         ['🐯','🦁','🐺','🐻','🐼','🐨','🦊','🐰','🐭','🐹','🐮','🐷','🐸','🐵','🦝'],
    'Chim & Côn trùng': ['🦅','🦉','🦜','🦚','🦢','🦆','🐦','🐧','🕊️','🦇','🦋','🐝','🐞','🐜','🦗'],
    'Người & Nghề':     ['👨‍🍳','👩‍🍳','👨‍💼','👩‍💼','👮','🕵️','👷','👨‍🌾','👩‍🌾','👨‍🎓','👩‍🎓','👨‍⚕️','👩‍⚕️','🧑‍🚀','🧑‍✈️'],
    'Vui nhộn':         ['😎','🤠','🥳','🤓','😇','🤩','😺','😸','🐲','🦄','🐉','👽','🤖','🎃','👻'],
    'Biểu tượng':       ['⭐','🌟','✨','💎','🔥','⚡','🌈','🌊','🌺','🌸','🍀','🎯','🏆','👑','💫']
  };

  var state = {
    currentAvatar: null,
    cache: {},
    unsub: null
  };

  function getStaffName(){
    try {
      if (typeof window.getSyncedStaffName === 'function'){
        var n = window.getSyncedStaffName();
        if (n && n.trim()) return n.trim();
      }
      return localStorage.getItem('dolphinStaffName') || '';
    } catch(e){ return ''; }
  }

  function getLocalAvatar(){
    try {
      var saved = localStorage.getItem(AVATAR_KEY);
      if (saved) return saved;
    } catch(e){}
    return null;
  }

  function setLocalAvatar(emoji){
    try { localStorage.setItem(AVATAR_KEY, emoji); } catch(e){}
    state.currentAvatar = emoji;
    try {
      window.dispatchEvent(new CustomEvent('dolphinAvatarChanged', {
        detail: { name: getStaffName(), avatar: emoji }
      }));
    } catch(e){}
  }

  function getInitial(name){
    if (!name) return '?';
    return name.charAt(0).toUpperCase();
  }

  // ═══════ CSS ═══════
  function injectStyles(){
    if (document.getElementById('avatar-styles')) return;
    var s = document.createElement('style');
    s.id = 'avatar-styles';
    s.textContent = `
      /* Avatar hiển thị */
      .avt{display:inline-flex;align-items:center;justify-content:center;
        border-radius:50%;font-weight:900;flex-shrink:0;text-align:center;
        background:linear-gradient(135deg,#2a6e65,#194743);
        border:2px solid rgba(244,184,66,.4);
        color:#FBD77A;font-family:'Nunito',sans-serif;
        line-height:1;overflow:hidden;
        box-shadow:0 2px 8px rgba(0,0,0,.3)}
      .avt.avt-sm{width:28px;height:28px;font-size:14px}
      .avt.avt-md{width:36px;height:36px;font-size:18px}
      .avt.avt-lg{width:48px;height:48px;font-size:24px}
      .avt.avt-xl{width:64px;height:64px;font-size:32px}
      .avt.avt-mine{background:linear-gradient(135deg,#FBD77A,#F4B842);color:#123634;border-color:transparent}

      /* Nút mở avatar picker */
      #avatarFab{position:fixed;bottom:88px;left:15px;z-index:1100;
        width:54px;height:54px;border-radius:50%;
        background:linear-gradient(135deg,#2a6e65,#194743);
        border:2px solid #FBD77A;color:#FBD77A;font-size:24px;
        display:flex;align-items:center;justify-content:center;cursor:pointer;
        box-shadow:0 6px 20px rgba(244,184,66,.4),0 2px 8px rgba(0,0,0,.3);
        transition:transform .2s,box-shadow .2s;user-select:none;-webkit-user-select:none;
        -webkit-tap-highlight-color:transparent;touch-action:none}
      #avatarFab:active{transform:scale(.92)}
      #avatarFab.dragging{cursor:grabbing;transform:scale(1.08);
        box-shadow:0 10px 30px rgba(0,0,0,.6),0 0 0 4px rgba(244,184,66,.35);transition:none}
      #avatarFab .avatar-emoji{font-size:26px;line-height:1}

      /* Modal picker */
      #avatarModal{position:fixed;inset:0;z-index:1300;background:rgba(10,31,29,.9);
        backdrop-filter:blur(12px);display:none;align-items:flex-end;justify-content:center;
        font-family:'Nunito',sans-serif;padding:0}
      #avatarModal.open{display:flex}
      .avt-panel{background:linear-gradient(180deg,#0a1f1d 0%,#061412 100%);
        border-top:2px solid #FBD77A;border-top-left-radius:22px;border-top-right-radius:22px;
        width:100%;max-width:640px;max-height:88vh;display:flex;flex-direction:column;
        transform:translateY(100%);transition:transform .35s cubic-bezier(.16,1,.3,1);
        box-shadow:0 -20px 60px rgba(0,0,0,.7),0 0 80px rgba(244,184,66,.15)}
      #avatarModal.open .avt-panel{transform:translateY(0)}
      .avt-header{padding:14px 18px;border-bottom:1px solid rgba(244,184,66,.25);
        display:flex;align-items:center;justify-content:space-between;gap:10px;flex-shrink:0}
      .avt-header-title{color:#FBD77A;font-weight:900;font-size:15px;text-transform:uppercase;
        letter-spacing:.08em;display:flex;align-items:center;gap:10px}
      .avt-header-title .icon{font-size:22px}
      .avt-header-title .sub{color:#98dccb;font-size:10px;font-weight:700;display:block;margin-top:2px;text-transform:none;letter-spacing:0}
      .avt-close{width:36px;height:36px;border-radius:10px;background:rgba(239,83,80,.15);
        border:1px solid rgba(239,83,80,.4);color:#ef5350;font-size:18px;cursor:pointer;
        display:flex;align-items:center;justify-content:center;flex-shrink:0}
      .avt-current{padding:14px 18px;background:rgba(10,30,28,.5);display:flex;align-items:center;gap:14px;
        border-bottom:1px solid rgba(244,184,66,.2);flex-shrink:0}
      .avt-current-avatar{width:64px;height:64px;border-radius:50%;
        background:linear-gradient(135deg,#FBD77A,#F4B842);color:#123634;
        display:flex;align-items:center;justify-content:center;font-size:32px;
        border:3px solid rgba(244,184,66,.6);box-shadow:0 0 30px rgba(244,184,66,.5)}
      .avt-current-info{flex:1;min-width:0}
      .avt-current-name{color:#fff;font-weight:900;font-size:15px;margin-bottom:3px}
      .avt-current-hint{color:#98dccb;font-size:11px;font-weight:700;opacity:.8}
      .avt-tabs{padding:12px 18px;display:flex;gap:6px;overflow-x:auto;flex-shrink:0;
        border-bottom:1px solid rgba(244,184,66,.15)}
      .avt-tab{padding:7px 14px;border-radius:999px;font-size:11px;font-weight:800;
        border:1px solid rgba(55,137,123,.4);background:rgba(25,71,67,.55);color:#bfe9dc;
        cursor:pointer;white-space:nowrap;font-family:inherit;transition:all .15s}
      .avt-tab.active{background:linear-gradient(135deg,#FBD77A,#F4B842);color:#123634;border-color:transparent}
      .avt-body{flex:1;overflow-y:auto;padding:14px 18px}
      .avt-body::-webkit-scrollbar{width:5px}
      .avt-body::-webkit-scrollbar-thumb{background:#37897b;border-radius:99px}
      .avt-section{margin-bottom:18px}
      .avt-section-title{font-size:10px;font-weight:900;color:#FBD77A;text-transform:uppercase;
        letter-spacing:.1em;margin-bottom:10px;opacity:.85}
      .avt-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(52px,1fr));gap:8px}
      .avt-pick{aspect-ratio:1;border-radius:12px;background:rgba(25,71,67,.4);
        border:2px solid transparent;display:flex;align-items:center;justify-content:center;
        font-size:26px;cursor:pointer;transition:all .15s;user-select:none;-webkit-user-select:none;
        -webkit-tap-highlight-color:transparent}
      .avt-pick:hover{background:rgba(25,71,67,.7);transform:scale(1.08)}
      .avt-pick:active{transform:scale(.92)}
      .avt-pick.selected{background:linear-gradient(135deg,#FBD77A,#F4B842);
        border-color:#FBD77A;box-shadow:0 0 20px rgba(244,184,66,.6)}
      .avt-empty{text-align:center;padding:24px 20px;color:#98dccb;font-size:12.5px;opacity:.7}

      @media(min-width:768px){
        #avatarModal{align-items:center}
        .avt-panel{border-radius:22px;max-height:80vh;margin:auto}
        .avt-grid{grid-template-columns:repeat(auto-fill,minmax(60px,1fr))}
        .avt-pick{font-size:30px}
      }
    `;
    document.head.appendChild(s);
  }

  // ═══════ INJECT UI ═══════
  function injectUI(){
    if (document.getElementById('avatarFab')) return;

    var fab = document.createElement('button');
    fab.id = 'avatarFab';
    var curAvt = getLocalAvatar();
    fab.innerHTML = '<span class="avatar-emoji">' + (curAvt || getInitial(getStaffName()) || '👤') + '</span>';
    fab.title = 'Chọn avatar';
    document.body.appendChild(fab);

    var modal = document.createElement('div');
    modal.id = 'avatarModal';
    modal.innerHTML = ''
      + '<div class="avt-panel">'
      +   '<div class="avt-header">'
      +     '<div class="avt-header-title">'
      +       '<span class="icon">👤</span>'
      +       '<div>CHỌN AVATAR<span class="sub">Avatar hiển thị trong chat và xếp hạng</span></div>'
      +     '</div>'
      +     '<button class="avt-close" onclick="AvatarSystem.close()">✕</button>'
      +   '</div>'
      +   '<div class="avt-current">'
      +     '<div class="avt-current-avatar" id="avtCurrentIcon">👤</div>'
      +     '<div class="avt-current-info">'
      +       '<div class="avt-current-name" id="avtCurrentName">Chưa có tên</div>'
      +       '<div class="avt-current-hint" id="avtCurrentHint">Bấm avatar bên dưới để chọn</div>'
      +     '</div>'
      +   '</div>'
      +   '<div class="avt-tabs" id="avtTabs"></div>'
      +   '<div class="avt-body" id="avtBody"></div>'
      + '</div>';
    document.body.appendChild(modal);

    renderTabs();
    renderAvatars();
    updateCurrentDisplay();
    setupFabDrag(fab);
  }

  function renderTabs(){
    var tabs = document.getElementById('avtTabs');
    if (!tabs) return;
    var keys = Object.keys(AVATARS);
    tabs.innerHTML = keys.map(function(k, i){
      return '<button class="avt-tab ' + (i === 0 ? 'active' : '') + '" data-key="' + k + '">' + k + '</button>';
    }).join('');
    tabs.querySelectorAll('.avt-tab').forEach(function(btn){
      btn.onclick = function(){
        tabs.querySelectorAll('.avt-tab').forEach(function(b){ b.classList.remove('active'); });
        btn.classList.add('active');
        document.getElementById('avtBody').innerHTML = '';
        renderAvatarSection(btn.dataset.key);
      };
    });
  }

  function renderAvatars(){
    var body = document.getElementById('avtBody');
    if (!body) return;
    var firstKey = Object.keys(AVATARS)[0];
    renderAvatarSection(firstKey);
  }

  function renderAvatarSection(key){
    var body = document.getElementById('avtBody');
    if (!body) return;
    var list = AVATARS[key] || [];
    var current = state.currentAvatar || getLocalAvatar();
    var section = document.createElement('div');
    section.className = 'avt-section';
    section.innerHTML = '<div class="avt-section-title">' + key + '</div>'
      + '<div class="avt-grid">' + list.map(function(emoji){
        var sel = emoji === current ? 'selected' : '';
        return '<div class="avt-pick ' + sel + '" data-emoji="' + emoji + '">' + emoji + '</div>';
      }).join('') + '</div>';
    body.innerHTML = '';
    body.appendChild(section);

    body.querySelectorAll('.avt-pick').forEach(function(el){
      el.onclick = function(){
        var emoji = el.dataset.emoji;
        selectAvatar(emoji);
      };
    });
  }

  function updateCurrentDisplay(){
    var name = getStaffName();
    var avt = state.currentAvatar || getLocalAvatar();
    var iconEl = document.getElementById('avtCurrentIcon');
    var nameEl = document.getElementById('avtCurrentName');
    var hintEl = document.getElementById('avtCurrentHint');
    if (iconEl) iconEl.textContent = avt || getInitial(name) || '👤';
    if (nameEl) nameEl.textContent = name || '⚠️ Chưa có tên (vào Lễ Tân để nhập)';
    if (hintEl) hintEl.textContent = avt ? 'Đã chọn avatar' : 'Bấm avatar bên dưới để chọn';
  }

  function selectAvatar(emoji){
    var name = getStaffName();
    if (!name){
      alert('Vui lòng nhập tên nhân viên trước!\n(Vào Lễ Tân hoặc bấm Đổi tên)');
      return;
    }
    setLocalAvatar(emoji);
    // Đổi nút
    var fab = document.getElementById('avatarFab');
    if (fab){
      var el = fab.querySelector('.avatar-emoji');
      if (el) el.textContent = emoji;
    }
    // Đổi hiển thị trong modal
    var iconEl = document.getElementById('avtCurrentIcon');
    if (iconEl) iconEl.textContent = emoji;
    var hintEl = document.getElementById('avtCurrentHint');
    if (hintEl) hintEl.textContent = '✅ Đã chọn: ' + emoji;
    // Đánh dấu selected
    document.querySelectorAll('.avt-pick').forEach(function(el){
      el.classList.toggle('selected', el.dataset.emoji === emoji);
    });
    // Lưu Firebase
    saveToFirebase(name, emoji);
  }

  function saveToFirebase(name, emoji){
    fetch('https://firestore.googleapis.com/v1/projects/dolphin-f6d67/databases/(default)/documents/' + COL_PROFILES + '/' + encodeURIComponent(name) + '?key=' + FIREBASE_CONFIG.apiKey, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fields: {
          name: { stringValue: name },
          avatar: { stringValue: emoji },
          updatedAt: { integerValue: String(Date.now()) }
        }
      })
    }).then(function(){
      console.log('[Avatar] Saved to Firebase:', name, emoji);
    }).catch(function(e){
      console.warn('[Avatar] Save error:', e);
    });
  }

  // ═══════ FETCH CACHE AVATARS ═══════
  function fetchAllAvatars(){
    fetch('https://firestore.googleapis.com/v1/projects/dolphin-f6d67/databases/(default)/documents/' + COL_PROFILES + '?key=' + FIREBASE_CONFIG.apiKey + '&pageSize=200', { cache: 'no-store' })
      .then(function(r){ if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(function(data){
        var cache = {};
        if (data && data.documents){
          data.documents.forEach(function(d){
            if (d.fields && d.fields.name && d.fields.avatar){
              cache[d.fields.name.stringValue] = d.fields.avatar.stringValue;
            }
          });
        }
        state.cache = cache;
        try {
          window.dispatchEvent(new CustomEvent('dolphinAvatarCacheUpdated', {
            detail: { cache: cache }
          }));
        } catch(e){}
      })
      .catch(function(e){ console.warn('[Avatar] fetch error', e); });
  }

  function getAvatarFor(name){
    if (!name) return null;
    // Ưu tiên cache
    if (state.cache[name]) return state.cache[name];
    // Fallback localStorage nếu là mình
    if (name === getStaffName()){
      var local = getLocalAvatar();
      if (local) return local;
    }
    return null;
  }

  // ═══════ FAB DRAG ═══════
  var FAB_POS_KEY = 'dolphinAvatarFabPos';
  function setupFabDrag(fab){
    function savePos(x, y){
      try { localStorage.setItem(FAB_POS_KEY, JSON.stringify({ x: x, y: y })); } catch(e){}
    }
    function loadPos(){
      try {
        var s = localStorage.getItem(FAB_POS_KEY);
        return s ? JSON.parse(s) : null;
      } catch(e){ return null; }
    }
    function clamp(x, y){
      var vw = window.innerWidth, vh = window.innerHeight;
      var w = fab.offsetWidth || 54, h = fab.offsetHeight || 54;
      return {
        x: Math.max(4, Math.min(x, vw - w - 4)),
        y: Math.max(4, Math.min(y, vh - h - 4))
      };
    }
    function applyPos(x, y){
      fab.style.left = x + 'px';
      fab.style.top = y + 'px';
      fab.style.bottom = 'auto';
      fab.style.right = 'auto';
    }
    var saved = loadPos();
    if (saved){
      var c = clamp(saved.x, saved.y);
      applyPos(c.x, c.y);
    }
    var drag = { active: false, moved: false, startX: 0, startY: 0, origX: 0, origY: 0, startTime: 0 };
    function getPoint(e){
      if (e.touches && e.touches[0]) return { x: e.touches[0].clientX, y: e.touches[0].clientY };
      if (e.changedTouches && e.changedTouches[0]) return { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY };
      return { x: e.clientX, y: e.clientY };
    }
    function onStart(e){
      var p = getPoint(e);
      drag.active = true;
      drag.moved = false;
      drag.startX = p.x;
      drag.startY = p.y;
      drag.origX = fab.offsetLeft;
      drag.origY = fab.offsetTop;
      drag.startTime = Date.now();
      fab.classList.add('dragging');
      fab.style.transition = '';
    }
    function onMove(e){
      if (!drag.active) return;
      var p = getPoint(e);
      var dx = p.x - drag.startX;
      var dy = p.y - drag.startY;
      if (!drag.moved && Math.abs(dx) + Math.abs(dy) < 8) return;
      drag.moved = true;
      if (e.cancelable) e.preventDefault();
      var c = clamp(drag.origX + dx, drag.origY + dy);
      applyPos(c.x, c.y);
    }
    function onEnd(){
      if (!drag.active) return;
      drag.active = false;
      fab.classList.remove('dragging');
      if (!drag.moved){
        var elapsed = Date.now() - drag.startTime;
        if (elapsed < 500) window.AvatarSystem.open();
        return;
      }
      // Snap to edge
      var vw = window.innerWidth;
      var w = fab.offsetWidth || 54;
      var snapLeft = fab.offsetLeft < (vw - w) / 2;
      var nx = snapLeft ? 12 : (vw - w - 12);
      var c = clamp(nx, fab.offsetTop);
      fab.style.transition = 'left .3s cubic-bezier(.16,1,.3,1), top .3s cubic-bezier(.16,1,.3,1)';
      applyPos(c.x, c.y);
      setTimeout(function(){ fab.style.transition = ''; }, 320);
      savePos(c.x, c.y);
    }
    fab.addEventListener('touchstart', onStart, { passive: true });
    document.addEventListener('touchmove', onMove, { passive: false });
    document.addEventListener('touchend', onEnd);
    document.addEventListener('touchcancel', onEnd);
    fab.addEventListener('mousedown', function(e){ onStart(e); e.preventDefault(); });
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onEnd);
    window.addEventListener('resize', function(){
      var p = loadPos();
      if (!p) return;
      var c = clamp(p.x, p.y);
      applyPos(c.x, c.y);
    });
  }

  // ═══════ INIT ═══════
  function init(){
    injectStyles();
    state.currentAvatar = getLocalAvatar();
    // Đợi DOM
    if (document.readyState === 'loading'){
      document.addEventListener('DOMContentLoaded', function(){
        setTimeout(function(){
          injectUI();
          fetchAllAvatars();
        }, 800);
      });
    } else {
      setTimeout(function(){
        injectUI();
        fetchAllAvatars();
      }, 800);
    }
    // Refresh cache mỗi 5 phút
    setInterval(fetchAllAvatars, 5 * 60 * 1000);
    // Listen name change
    window.addEventListener('dolphinStaffNameChanged', updateCurrentDisplay);
  }

  window.AvatarSystem = {
    open: function(){
      var m = document.getElementById('avatarModal');
      if (m){
        m.classList.add('open');
        updateCurrentDisplay();
      }
    },
    close: function(){
      var m = document.getElementById('avatarModal');
      if (m) m.classList.remove('open');
    },
    getAvatar: getAvatarFor,
    getMine: function(){ return state.currentAvatar || getLocalAvatar(); },
    renderAvatarHtml: function(name, size){
      size = size || 'md';
      var emoji = getAvatarFor(name);
      var isMine = name === getStaffName();
      var content = emoji || getInitial(name);
      var cls = 'avt avt-' + size + (isMine ? ' avt-mine' : '');
      return '<div class="' + cls + '">' + content + '</div>';
    },
    refresh: fetchAllAvatars
  };

  init();

  console.log('%c👤 AVATAR SYSTEM LOADED', 'background:#4ade80;color:#0a1f1d;font-size:12px;padding:3px 8px;border-radius:4px;font-weight:900');
})();
