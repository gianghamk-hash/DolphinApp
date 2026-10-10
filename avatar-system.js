/* ============================================================
   👤 AVATAR SYSTEM v2 — Đổi qua chat (bỏ nút FAB)
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
    editingName: null,
    cache: {}
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
    try { return localStorage.getItem(AVATAR_KEY) || null; } catch(e){ return null; }
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

      /* Clickable sender name in chat */
      .chat-sender{cursor:pointer;transition:all .15s;border-radius:6px;padding:2px 4px;margin:-2px -4px}
      .chat-sender:hover{background:rgba(244,184,66,.15)}
      .chat-sender:active{transform:scale(.97)}
      .chat-sender span:first-child{text-decoration:underline;text-decoration-style:dotted;text-decoration-color:rgba(244,184,66,.4);text-underline-offset:3px}

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

      @media(min-width:768px){
        #avatarModal{align-items:center}
        .avt-panel{border-radius:22px;max-height:80vh;margin:auto}
        .avt-grid{grid-template-columns:repeat(auto-fill,minmax(60px,1fr))}
        .avt-pick{font-size:30px}
      }
    `;
    document.head.appendChild(s);
  }

  // ═══════ MODAL ═══════
  function injectModal(){
    if (document.getElementById('avatarModal')) return;
    var modal = document.createElement('div');
    modal.id = 'avatarModal';
    modal.innerHTML = ''
      + '<div class="avt-panel">'
      +   '<div class="avt-header">'
      +     '<div class="avt-header-title">'
      +       '<span class="icon">👤</span>'
      +       '<div>CHỌN AVATAR<span class="sub">Bấm vào tên trong chat để đổi avatar</span></div>'
      +     '</div>'
      +     '<button class="avt-close" onclick="AvatarSystem.close()">✕</button>'
      +   '</div>'
      +   '<div class="avt-current">'
      +     '<div class="avt-current-avatar" id="avtCurrentIcon">👤</div>'
      +     '<div class="avt-current-info">'
      +       '<div class="avt-current-name" id="avtCurrentName">--</div>'
      +       '<div class="avt-current-hint" id="avtCurrentHint">Chọn avatar bên dưới</div>'
      +     '</div>'
      +   '</div>'
      +   '<div class="avt-tabs" id="avtTabs"></div>'
      +   '<div class="avt-body" id="avtBody"></div>'
      + '</div>';
    document.body.appendChild(modal);
    renderTabs();
    renderAvatars();
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
        renderAvatarSection(btn.dataset.key);
      };
    });
  }

  function renderAvatars(){
    var firstKey = Object.keys(AVATARS)[0];
    renderAvatarSection(firstKey);
  }

  function renderAvatarSection(key){
    var body = document.getElementById('avtBody');
    if (!body) return;
    var list = AVATARS[key] || [];
    var current = getAvatarFor(state.editingName);
    body.innerHTML = '<div class="avt-section"><div class="avt-section-title">' + key + '</div>'
      + '<div class="avt-grid">' + list.map(function(emoji){
        var sel = emoji === current ? 'selected' : '';
        return '<div class="avt-pick ' + sel + '" data-emoji="' + emoji + '">' + emoji + '</div>';
      }).join('') + '</div></div>';

    body.querySelectorAll('.avt-pick').forEach(function(el){
      el.onclick = function(){ selectAvatar(el.dataset.emoji); };
    });
  }

  function updateCurrentDisplay(){
    var name = state.editingName;
    var avt = getAvatarFor(name);
    var iconEl = document.getElementById('avtCurrentIcon');
    var nameEl = document.getElementById('avtCurrentName');
    var hintEl = document.getElementById('avtCurrentHint');
    if (iconEl) iconEl.textContent = avt || getInitial(name) || '👤';
    if (nameEl) nameEl.textContent = name || '--';
    if (hintEl){
      var isMe = name === getStaffName();
      hintEl.textContent = isMe ? 'Đây là avatar của bạn' : 'Đang đổi avatar cho nhân viên khác';
      hintEl.style.color = isMe ? '#98dccb' : '#fbbf24';
    }
  }

  function selectAvatar(emoji){
    var name = state.editingName;
    if (!name) return;

    // Nếu là avatar của chính mình → lưu localStorage
    if (name === getStaffName()){
      setLocalAvatar(emoji);
    }

    // Update cache ngay lập tức
    state.cache[name] = emoji;

    // Cập nhật display
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

    // Thông báo
    if (window.ChatSystem && window.ChatSystem.pushSystemMessage && name === getStaffName()){
      // Không cần thông báo cho toàn hệ thống
    }
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
    }).then(function(r){
      if (!r.ok) throw new Error('HTTP ' + r.status);
      console.log('[Avatar] Saved:', name, emoji);
      // Trigger refresh cho tất cả UI
      try {
        window.dispatchEvent(new CustomEvent('dolphinAvatarCacheUpdated', {
          detail: { cache: state.cache }
        }));
      } catch(e){}
    }).catch(function(e){
      console.warn('[Avatar] Save error:', e);
      alert('Không lưu được avatar. Vui lòng thử lại.');
    });
  }

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
    if (state.cache[name]) return state.cache[name];
    if (name === getStaffName()){
      var local = getLocalAvatar();
      if (local) return local;
    }
    return null;
  }

  // ═══════ CLICK CHAT SENDER → MỞ PICKER ═══════
  function bindChatClicks(){
    document.addEventListener('click', function(e){
      var sender = e.target.closest('.chat-sender');
      if (!sender) return;
      // Lấy tên từ span đầu tiên
      var nameSpan = sender.querySelector('span:first-child');
      if (!nameSpan) return;
      var name = (nameSpan.textContent || '').trim();
      if (!name || name === 'HỆ THỐNG' || name === 'Ẩn danh') return;
      openPickerFor(name);
    });
  }

  // ═══════ OPEN / CLOSE ═══════
  function openPickerFor(name){
    if (!name) return;
    state.editingName = name;
    injectModal();
    var m = document.getElementById('avatarModal');
    if (!m) return;
    m.classList.add('open');
    renderAvatars();
    renderTabs();
    updateCurrentDisplay();
  }

  function open(){
    openPickerFor(getStaffName());
  }

  function close(){
    var m = document.getElementById('avatarModal');
    if (m) m.classList.remove('open');
    state.editingName = null;
  }

  // ═══════ INIT ═══════
  function init(){
    injectStyles();
    state.currentAvatar = getLocalAvatar();

    var start = function(){
      setTimeout(function(){
        injectModal();
        bindChatClicks();
        fetchAllAvatars();
      }, 600);
    };

    if (document.readyState === 'loading'){
      document.addEventListener('DOMContentLoaded', start);
    } else {
      start();
    }

    setInterval(fetchAllAvatars, 5 * 60 * 1000);
  }

  window.AvatarSystem = {
    open: open,
    openFor: openPickerFor,
    close: close,
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

  console.log('%c👤 AVATAR SYSTEM v2 LOADED (chat-click)', 'background:#4ade80;color:#0a1f1d;font-size:12px;padding:3px 8px;border-radius:4px;font-weight:900');
})();
