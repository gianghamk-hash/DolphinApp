/* ============================================================
   💬 COMMUNITY CHAT — Chat cộng đồng nhân viên
   - Floating button + panel slide-up
   - Auto-delete tin cũ lúc 00:00 VN
   - Chỉ giữ 100 tin gần nhất
   - Đồng bộ tên qua staff-sync.js
   ============================================================ */
(function(){
  'use strict';

  var FIREBASE_CONFIG = {
    apiKey: "AIzaSyAtBNp9WBnyIkCiVjXfUpjH2d7-9dbg-JQ",
    authDomain: "dolphin-f6d67.firebaseapp.com",
    projectId: "dolphin-f6d67"
  };
  var CHAT_COLLECTION = 'community_chat';
  var MAX_MESSAGES = 100;
  var DATE_KEY = 'dolphinChatDate';
  var CLEANUP_KEY = 'dolphinChatLastCleanup';

  var state = {
    isOpen: false,
    messages: [],
    unread: 0,
    db: null,
    auth: null,
    initialized: false,
    modules: null
  };

  // ═══════ HELPERS ═══════
  function getVNDateStr(){
    var parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Ho_Chi_Minh',
      year: 'numeric', month: '2-digit', day: '2-digit'
    }).formatToParts(new Date());
    var o = {};
    parts.forEach(function(p){ if (p.type !== 'literal') o[p.type] = p.value; });
    return o.year + '-' + o.month + '-' + o.day;
  }

  function getVNTimeStr(ts){
    var d = ts ? new Date(ts) : new Date();
    return new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Ho_Chi_Minh',
      hour12: false,
      hour: '2-digit', minute: '2-digit'
    }).format(d);
  }

  // ═══════ ĐỒNG BỘ TÊN VỚI STAFF-SYNC ═══════
  function getStaffName(){
    try {
      if (typeof window.getSyncedStaffName === 'function'){
        var n = window.getSyncedStaffName();
        if (n && n.trim()) return n.trim();
      }
      var v = localStorage.getItem('dolphinStaffName');
      if (v && v.trim()) return v.trim();
      var lv = localStorage.getItem('dolphinShowSeller');
      if (lv && lv.trim()) return lv.trim();
      return '';
    } catch(e){ return ''; }
  }

  window.addEventListener('dolphinStaffNameChanged', function(){
    renderMessages();
  });

  function escapeHtml(s){
    return String(s).replace(/[&<>"']/g, function(c){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
    });
  }

  // ═══════ CSS ═══════
  function injectStyles(){
    if (document.getElementById('chat-styles')) return;
    var s = document.createElement('style');
    s.id = 'chat-styles';
    s.textContent = `
            #chatFab{position:fixed;bottom:20px;left:15px;z-index:1100;width:54px;height:54px;border-radius:50%;
        background:linear-gradient(135deg,#FBD77A 0%,#F4B842 100%);border:2px solid #123634;color:#123634;
        font-size:24px;display:flex;align-items:center;justify-content:center;cursor:grab;
        box-shadow:0 6px 20px rgba(244,184,66,.5),0 2px 8px rgba(0,0,0,.3);
        transition:transform .15s,box-shadow .15s;user-select:none;-webkit-user-select:none;
        -webkit-tap-highlight-color:transparent;touch-action:none}
      #chatFab:active{cursor:grabbing}
      #chatFab.dragging{transform:scale(1.08);
        box-shadow:0 10px 30px rgba(0,0,0,.6),0 0 0 4px rgba(244,184,66,.35);
        transition:none}
      #chatFab .chat-badge{position:absolute;top:-4px;right:-4px;min-width:22px;height:22px;padding:0 6px;
        border-radius:11px;background:#dc2626;color:#fff;font-size:11px;font-weight:900;
        display:flex;align-items:center;justify-content:center;font-family:'Nunito',sans-serif;
        border:2px solid #0a1f1d;animation:chat-badge-pulse 1.5s ease-in-out infinite}
      #chatFab .chat-badge.hidden{display:none}
      @keyframes chat-badge-pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.15)}}
      #chatPanel{position:fixed;inset:0;z-index:1200;background:rgba(10,31,29,0);
        backdrop-filter:blur(0);-webkit-backdrop-filter:blur(0);pointer-events:none;transition:all .3s ease}
      #chatPanel.open{background:rgba(10,31,29,.7);backdrop-filter:blur(8px);
        -webkit-backdrop-filter:blur(8px);pointer-events:auto}
      #chatPanel .chat-container{position:absolute;bottom:0;left:0;right:0;height:85vh;max-height:700px;
        background:linear-gradient(180deg,#0a1f1d 0%,#061412 100%);border-top:2px solid #FBD77A;
        border-top-left-radius:20px;border-top-right-radius:20px;transform:translateY(100%);
        transition:transform .35s cubic-bezier(.16,1,.3,1);display:flex;flex-direction:column;
        box-shadow:0 -20px 60px rgba(0,0,0,.6),0 0 60px rgba(244,184,66,.15);font-family:'Nunito',sans-serif}
      #chatPanel.open .chat-container{transform:translateY(0)}
      .chat-header{padding:14px 16px;border-bottom:1px solid rgba(244,184,66,.25);
        display:flex;align-items:center;justify-content:space-between;gap:10px;flex-shrink:0}
      .chat-header .chat-title{display:flex;align-items:center;gap:10px;flex:1;min-width:0}
      .chat-header .chat-title-icon{font-size:24px;flex-shrink:0}
      .chat-header .chat-title-main{color:#FBD77A;font-weight:900;font-size:15px;text-transform:uppercase;
        letter-spacing:.08em;line-height:1.1}
      .chat-header .chat-title-sub{color:#98dccb;font-size:10px;font-weight:700;margin-top:2px;opacity:.8}
      .chat-header .chat-close{width:36px;height:36px;border-radius:10px;background:rgba(239,83,80,.15);
        border:1px solid rgba(239,83,80,.4);color:#ef5350;font-size:18px;cursor:pointer;
        display:flex;align-items:center;justify-content:center;flex-shrink:0}
      .chat-messages{flex:1;overflow-y:auto;padding:12px 14px;display:flex;flex-direction:column;
        gap:8px;-webkit-overflow-scrolling:touch}
      .chat-messages::-webkit-scrollbar{width:4px}
      .chat-messages::-webkit-scrollbar-thumb{background:#37897b;border-radius:99px}
      .chat-msg{display:flex;gap:8px;max-width:88%;animation:chat-msg-in .25s ease-out}
      @keyframes chat-msg-in{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
      .chat-msg.mine{align-self:flex-end;flex-direction:row-reverse}
      .chat-msg.system{align-self:center;max-width:95%}
      .chat-msg .chat-avatar{width:32px;height:32px;border-radius:50%;
        background:linear-gradient(135deg,#2a6e65,#194743);border:1px solid rgba(244,184,66,.35);
        color:#FBD77A;display:flex;align-items:center;justify-content:center;font-size:13px;
        font-weight:900;flex-shrink:0}
      .chat-msg.mine .chat-avatar{background:linear-gradient(135deg,#FBD77A,#F4B842);color:#123634;border-color:transparent}
      .chat-msg .chat-body{flex:1;min-width:0}
      .chat-msg .chat-sender{font-size:10.5px;color:#98dccb;font-weight:800;margin-bottom:3px;
        display:flex;align-items:center;gap:6px}
      .chat-msg.mine .chat-sender{justify-content:flex-end}
      .chat-msg .chat-time{font-size:9.5px;opacity:.6;font-weight:600}
      .chat-msg .chat-bubble{background:rgba(25,71,67,.6);border:1px solid rgba(255,255,255,.08);
        color:#fff;padding:8px 12px;border-radius:12px;font-size:13.5px;line-height:1.4;
        word-wrap:break-word;word-break:break-word}
      .chat-msg.mine .chat-bubble{background:linear-gradient(135deg,#FBD77A,#F4B842);color:#123634;
        border-color:transparent;font-weight:700}
      .chat-msg.system .chat-bubble{background:linear-gradient(135deg,rgba(244,184,66,.15),rgba(244,184,66,.05));
        border:1px solid rgba(244,184,66,.4);color:#FBD77A;font-size:12px;font-weight:800;
        text-align:center;padding:8px 14px;border-radius:99px;display:flex;align-items:center;
        justify-content:center;gap:6px}
      .chat-msg.system .chat-body{width:100%;text-align:center}
      .chat-input-area{padding:12px 14px;padding-bottom:max(12px,env(safe-area-inset-bottom));
        border-top:1px solid rgba(244,184,66,.25);display:flex;gap:8px;flex-shrink:0;
        background:rgba(10,31,29,.95)}
      .chat-input-area input{flex:1;background:rgba(25,71,67,.6);border:1px solid rgba(244,184,66,.35);
        border-radius:12px;padding:12px 14px;color:#fff;font-size:14px;font-family:inherit;
        outline:none;transition:border-color .2s}
      .chat-input-area input:focus{border-color:#FBD77A;box-shadow:0 0 0 3px rgba(244,184,66,.15)}
      .chat-input-area input::placeholder{color:#6cc7b3;opacity:.7}
      .chat-input-area .chat-send{width:46px;height:46px;border-radius:12px;
        background:linear-gradient(135deg,#FBD77A,#F4B842);border:none;color:#123634;font-size:20px;
        cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0}
      .chat-input-area .chat-send:active{transform:scale(.92)}
      .chat-input-area .chat-send:disabled{opacity:.5;cursor:not-allowed}
      .chat-empty{text-align:center;padding:40px 20px;color:#98dccb;font-size:12.5px;
        font-weight:700;opacity:.6}
      .chat-empty .chat-empty-icon{font-size:48px;margin-bottom:12px;opacity:.5}
    `;
    document.head.appendChild(s);
  }

  function injectHTML(){
    if (document.getElementById('chatFab')) return;

    var fab = document.createElement('button');
    fab.id = 'chatFab';
    fab.innerHTML = '💬<span class="chat-badge hidden" id="chatBadge">0</span>';
    fab.title = 'Chat nội bộ';
    fab.onclick = openChat;
    document.body.appendChild(fab);

    var panel = document.createElement('div');
    panel.id = 'chatPanel';
    panel.innerHTML = ''
      + '<div class="chat-container">'
      +   '<div class="chat-header">'
      +     '<div class="chat-title">'
      +       '<span class="chat-title-icon">💬</span>'
      +       '<div class="chat-title-text">'
      +         '<div class="chat-title-main">CHAT NỘI BỘ</div>'
      +         '<div class="chat-title-sub" id="chatSubtitle">Đang kết nối...</div>'
      +       '</div>'
      +     '</div>'
      +     '<button class="chat-close" onclick="ChatSystem.close()">✕</button>'
      +   '</div>'
      +   '<div class="chat-messages" id="chatMessages">'
      +     '<div class="chat-empty"><div class="chat-empty-icon">💬</div>Chưa có tin nhắn nào hôm nay</div>'
      +   '</div>'
      +   '<div class="chat-input-area">'
      +     '<input type="text" id="chatInput" placeholder="Nhập tin nhắn..." maxlength="500" autocomplete="off">'
      +     '<button class="chat-send" id="chatSend" onclick="ChatSystem.send()">➤</button>'
      +   '</div>'
      + '</div>';
    document.body.appendChild(panel);

    var inputEl = document.getElementById('chatInput');
    if (inputEl){
      inputEl.addEventListener('keydown', function(e){
        if (e.key === 'Enter' && !e.shiftKey){
          e.preventDefault();
          window.ChatSystem.send();
        }
      });
    }
  }

  function openChat(){
    var panel = document.getElementById('chatPanel');
    if (!panel) return;
    panel.classList.add('open');
    state.isOpen = true;
    state.unread = 0;
    updateBadge();
    setTimeout(function(){
      var el = document.getElementById('chatMessages');
      if (el) el.scrollTop = el.scrollHeight;
    }, 300);
  }

  function closeChat(){
    var panel = document.getElementById('chatPanel');
    if (!panel) return;
    panel.classList.remove('open');
    state.isOpen = false;
  }

  function updateBadge(){
    var badge = document.getElementById('chatBadge');
    if (!badge) return;
    if (state.unread > 0){
      badge.textContent = state.unread > 99 ? '99+' : state.unread;
      badge.classList.remove('hidden');
    } else {
      badge.classList.add('hidden');
    }
  }

  function renderMessages(){
    var el = document.getElementById('chatMessages');
    if (!el) return;

    if (!state.messages.length){
      el.innerHTML = '<div class="chat-empty"><div class="chat-empty-icon">💬</div>Chưa có tin nhắn nào hôm nay</div>';
      return;
    }

    var myName = getStaffName();
    el.innerHTML = state.messages.map(function(m){
      var isMine = m.sender && myName && m.sender === myName;
      var isSystem = m.type === 'system';

      if (isSystem){
        return '<div class="chat-msg system"><div class="chat-body">'
          + '<div class="chat-bubble">' + (m.systemIcon || '🔔') + ' ' + escapeHtml(m.text) + '</div>'
          + '</div></div>';
      }

      var initial = (m.sender || '?').charAt(0).toUpperCase();
      var time = getVNTimeStr(m.timestamp);
      return '<div class="chat-msg ' + (isMine ? 'mine' : '') + '">'
        + '<div class="chat-avatar">' + initial + '</div>'
        + '<div class="chat-body">'
        +   '<div class="chat-sender"><span>' + escapeHtml(m.sender || 'Ẩn danh') + '</span>'
        +   '<span class="chat-time">' + time + '</span></div>'
        +   '<div class="chat-bubble">' + escapeHtml(m.text || '') + '</div>'
        + '</div>'
        + '</div>';
    }).join('');

    if (state.isOpen){
      requestAnimationFrame(function(){
        el.scrollTop = el.scrollHeight;
      });
    }
  }

  function initFirebase(){
    if (state.initialized) return;
    state.initialized = true;

    Promise.all([
      import("https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js"),
      import("https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js"),
      import("https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js")
    ]).then(function(mods){
      state.modules = { app: mods[0], auth: mods[1], db: mods[2] };
      var app = mods[0].initializeApp(FIREBASE_CONFIG, 'chat-app');
      var auth = mods[1].getAuth(app);
      var db = mods[2].getFirestore(app);
      state.auth = auth;
      state.db = db;

      mods[1].signInAnonymously(auth).then(function(){
        setSubtitle('Online · Nhóm chung');
        setupListener();
        setTimeout(cleanupOldMessages, 2000);
      }).catch(function(err){
        console.warn('[Chat] Auth error:', err);
        setSubtitle('Lỗi kết nối');
      });
    }).catch(function(err){
      console.warn('[Chat] Init error:', err);
      setSubtitle('Không thể kết nối');
    });
  }

  function setSubtitle(text){
    var el = document.getElementById('chatSubtitle');
    if (el) el.textContent = text;
  }

  var listenerStarted = false;
  function setupListener(){
    if (listenerStarted) return;
    listenerStarted = true;

    var db = state.db, m = state.modules;
    var today = getVNDateStr();

    var q = m.db.query(
      m.db.collection(db, CHAT_COLLECTION),
      m.db.where('dateVN', '==', today),
      m.db.limit(MAX_MESSAGES)
    );

    m.db.onSnapshot(q, function(snap){
      var msgs = [];
      snap.forEach(function(d){ msgs.push(Object.assign({ id: d.id }, d.data())); });
      msgs.sort(function(a, b){ return (a.timestamp || 0) - (b.timestamp || 0); });

      var prevCount = state.messages.length;
      var newCount = msgs.length;
      if (newCount > prevCount && !state.isOpen){
        var diff = newCount - prevCount;
        var myName = getStaffName();
        var newMsgs = msgs.slice(-diff);
        var unreadAdd = newMsgs.filter(function(m){
          return m.type !== 'system' && m.sender !== myName;
        }).length;
        state.unread += unreadAdd;
        updateBadge();
      }

      state.messages = msgs;
      renderMessages();
    }, function(err){
      console.warn('[Chat] Listen error:', err);
      setSubtitle('Lỗi tải tin nhắn');
    });
  }

  function sendMessage(){
    var input = document.getElementById('chatInput');
    if (!input) return;
    var text = input.value.trim();
    if (!text) return;

    var sender = getStaffName();
    if (!sender){
      alert('Vui lòng nhập tên nhân viên trước khi chat!\n(Vào Lễ Tân hoặc bấm nút Đổi tên)');
      return;
    }

    if (!state.db){ alert('Chưa kết nối. Vui lòng thử lại sau.'); return; }

    var sendBtn = document.getElementById('chatSend');
    if (sendBtn) sendBtn.disabled = true;

    var m = state.modules;
    var msgData = {
      sender: sender,
      text: text,
      timestamp: Date.now(),
      dateVN: getVNDateStr(),
      type: 'text'
    };

    m.db.addDoc(m.db.collection(state.db, CHAT_COLLECTION), msgData)
      .then(function(){ input.value = ''; input.focus(); })
      .catch(function(err){
        console.warn('[Chat] Send error:', err);
        alert('Không gửi được. Vui lòng thử lại.');
      })
      .finally(function(){
        if (sendBtn) sendBtn.disabled = false;
      });
  }

  function pushSystemMessage(text, icon){
    if (!state.db || !state.modules){
      setTimeout(function(){ pushSystemMessage(text, icon); }, 1000);
      return;
    }
    var m = state.modules;
    var msgData = {
      sender: 'HỆ THỐNG',
      text: text,
      systemIcon: icon || '🔔',
      timestamp: Date.now(),
      dateVN: getVNDateStr(),
      type: 'system'
    };
    m.db.addDoc(m.db.collection(state.db, CHAT_COLLECTION), msgData).catch(function(err){
      console.warn('[Chat] Push system error:', err);
    });
  }

  function cleanupOldMessages(){
    if (!state.db || !state.modules) return;

    var today = getVNDateStr();
    var storedDate = '';
    try { storedDate = localStorage.getItem(DATE_KEY) || ''; } catch(e){}
    if (storedDate === today) return;

    var m = state.modules;
    var q = m.db.query(
      m.db.collection(state.db, CHAT_COLLECTION),
      m.db.where('dateVN', '!=', today)
    );

    m.db.getDocs(q).then(function(snap){
      if (snap.empty){
        try { localStorage.setItem(DATE_KEY, today); } catch(e){}
        try { localStorage.setItem(CLEANUP_KEY, String(Date.now())); } catch(e){}
        return;
      }
      var tasks = [];
      snap.forEach(function(d){
        tasks.push(m.db.deleteDoc(m.db.doc(state.db, CHAT_COLLECTION, d.id)));
      });
      Promise.all(tasks).then(function(){
        try { localStorage.setItem(DATE_KEY, today); } catch(e){}
        try { localStorage.setItem(CLEANUP_KEY, String(Date.now())); } catch(e){}
        console.log('[Chat] Cleaned ' + tasks.length + ' old messages');
      });
    });
  }

  function scheduleMidnightCleanup(){
    function check(){
      var today = getVNDateStr();
      var stored = '';
      try { stored = localStorage.getItem(DATE_KEY) || ''; } catch(e){}
      if (stored && stored !== today){
        state.messages = [];
        state.unread = 0;
        updateBadge();
        renderMessages();
        listenerStarted = false;
        setTimeout(function(){
          cleanupOldMessages();
          setupListener();
        }, 1000);
      }
    }
    setInterval(check, 60 * 1000);
  }

  window.ChatSystem = {
    open: openChat,
    close: closeChat,
    send: sendMessage,
    pushSystemMessage: pushSystemMessage,
    cleanup: cleanupOldMessages,
    reload: function(){ listenerStarted = false; setupListener(); },
    getUnread: function(){ return state.unread; },
    resetUnread: function(){ state.unread = 0; updateBadge(); }
  };

  function init(){
    injectStyles();
    injectHTML();
    initFirebase();
    scheduleMidnightCleanup();
    console.log('%c💬 CHAT SYSTEM LOADED', 'background:#FBD77A;color:#123634;font-size:12px;padding:3px 8px;border-radius:4px;font-weight:900');
  }

  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
