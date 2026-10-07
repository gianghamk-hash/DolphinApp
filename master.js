/* ============================================================
   👑 MASTER DEVICE SYSTEM v3 — Đổi mã chủ động qua Firebase
   File này được load tự động bởi 5 file HTML.
   Cung cấp: bypass PIN, đổi mã chủ, đồng bộ nhiều thiết bị.
   ============================================================ */
(function(){
  'use strict';

  // ============ CONFIG ============
  var FIREBASE_PROJECT = 'dolphin-f6d67';
  var FIREBASE_API_KEY = 'AIzaSyAtBNp9WBnyIkCiVjXfUpjH2d7-9dbg-JQ';
  var MASTER_KEY = 'dolphinMasterDevice';
  var MASTER_CODE_CACHE = 'dolphinMasterCodeCache';
  var AUTH_TOKEN_KEY = 'dolphinMasterAuthToken';
  var DEFAULT_MASTER_CODE = 'DOLPHIN-MASTER-2026';

  var masterCodeCache = null;
  var authToken = null;

  // ============ LOCAL STORAGE HELPERS ============
  function isMasterDevice(){
    try { return localStorage.getItem(MASTER_KEY) === 'true'; } catch(e){ return false; }
  }

  function getCachedCode(){
    try { return localStorage.getItem(MASTER_CODE_CACHE); } catch(e){ return null; }
  }

  function cacheCode(code){
    try { localStorage.setItem(MASTER_CODE_CACHE, code); } catch(e){}
  }

  function verifyMasterCode(input){
    var expected = masterCodeCache || getCachedCode() || DEFAULT_MASTER_CODE;
    return input === expected;
  }

  // ============ FIREBASE REST API ============
  async function signInAnonymous(){
    // Tái sử dụng token cũ nếu còn hạn
    try {
      var saved = JSON.parse(localStorage.getItem(AUTH_TOKEN_KEY) || 'null');
      if (saved && saved.expiresAt > Date.now() && saved.idToken) {
        authToken = saved.idToken;
        return saved.idToken;
      }
    } catch(e){}

    var res = await fetch(
      'https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=' + FIREBASE_API_KEY,
      {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ returnSecureToken: true })
      }
    );
    var data = await res.json();
    if (!data.idToken) throw new Error('Sign-in failed');
    authToken = data.idToken;
    try {
      localStorage.setItem(AUTH_TOKEN_KEY, JSON.stringify({
        idToken: data.idToken,
        refreshToken: data.refreshToken,
        expiresAt: Date.now() + (parseInt(data.expiresIn || 3600) * 1000) - 60000
      }));
    } catch(e){}
    return data.idToken;
  }

  async function fetchMasterCode(){
    try {
      var token = await signInAnonymous();
      var url = 'https://firestore.googleapis.com/v1/projects/' + FIREBASE_PROJECT +
                '/databases/(default)/documents/master_config/dolphin';
      var res = await fetch(url, { headers: { 'Authorization': 'Bearer ' + token } });
      if (res.status === 404) {
        masterCodeCache = DEFAULT_MASTER_CODE;
        cacheCode(DEFAULT_MASTER_CODE);
        return DEFAULT_MASTER_CODE;
      }
      var data = await res.json();
      var code = (data && data.fields && data.fields.masterCode && data.fields.masterCode.stringValue)
                 || DEFAULT_MASTER_CODE;
      masterCodeCache = code;
      cacheCode(code);
      return code;
    } catch(e) {
      // Offline: dùng cache
      var cached = getCachedCode();
      if (cached) masterCodeCache = cached;
      return masterCodeCache || DEFAULT_MASTER_CODE;
    }
  }

  async function updateMasterCodeInFirebase(oldCode, newCode, staffName){
    if (!verifyMasterCode(oldCode)) return { ok: false, msg: 'Mã cũ không đúng!' };
    if (!newCode || newCode.length < 6) return { ok: false, msg: 'Mã mới phải từ 6 ký tự!' };
    if (newCode === oldCode) return { ok: false, msg: 'Mã mới phải khác mã cũ!' };

    try {
      var token = await signInAnonymous();
      var url = 'https://firestore.googleapis.com/v1/projects/' + FIREBASE_PROJECT +
                '/databases/(default)/documents/master_config/dolphin';
      var updateUrl = url + '?updateMask.fieldPaths=masterCode&updateMask.fieldPaths=updatedAt&updateMask.fieldPaths=updatedBy';
      var body = {
        fields: {
          masterCode: { stringValue: newCode },
          updatedAt: { integerValue: String(Date.now()) },
          updatedBy: { stringValue: staffName || 'Master' }
        }
      };
      var res = await fetch(updateUrl, {
        method: 'PATCH',
        headers: {
          'Authorization': 'Bearer ' + token,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      masterCodeCache = newCode;
      cacheCode(newCode);
      return { ok: true, msg: 'Đã đổi mã chủ!' };
    } catch(e) {
      return { ok: false, msg: 'Lỗi: ' + e.message };
    }
  }

  // ============ GHI ĐÈ CÁC HÀM VERIFY ============
  function overrideVerifyFunctions(){
    // Chỉ ghi đè khi trang có hàm gốc
    var hooked = false;

    // 1. requestPinAccess — entry point của mọi role
    if (typeof window.requestPinAccess === 'function') {
      var _origReq = window.requestPinAccess;
      window.requestPinAccess = function(role){
        if (isMasterDevice()) {
          try {
            if (typeof window.hasStaffName === 'function' && !window.hasStaffName() &&
                typeof window.requireStaffName === 'function') {
              window.requireStaffName(role);
            } else if (typeof window.changeRole === 'function') {
              window.changeRole(role);
            }
          } catch(e) { console.warn('[Master] requestPinAccess:', e); }
          return;
        }
        return _origReq.apply(this, arguments);
      };
      hooked = true;
    }

    // 2. verifyPin — fallback
    if (typeof window.verifyPin === 'function') {
      var _origVerify = window.verifyPin;
      window.verifyPin = function(){
        if (isMasterDevice()) {
          if (typeof window.closePinModal === 'function') window.closePinModal();
          // Lấy pending role từ hook nếu có
          try {
            if (window.__masterGetPendingRole) {
              var r = window.__masterGetPendingRole();
              if (r) {
                if (typeof window.hasStaffName === 'function' && !window.hasStaffName() &&
                    typeof window.requireStaffName === 'function') {
                  window.requireStaffName(r);
                } else if (typeof window.changeRole === 'function') {
                  window.changeRole(r);
                }
              }
            }
          } catch(e) {}
          return;
        }
        return _origVerify.apply(this, arguments);
      };
      hooked = true;
    }

    // 3. verifyManagerAuth — lounge, restaurant
    if (typeof window.verifyManagerAuth === 'function') {
      var _origMgr = window.verifyManagerAuth;
      window.verifyManagerAuth = async function(){
        if (isMasterDevice()) {
          if (typeof window.closeManagerAuthModal === 'function') window.closeManagerAuthModal();
          try {
            if (window.__masterExecuteManagerAction) {
              await window.__masterExecuteManagerAction();
            }
          } catch(e) { console.warn('[Master] managerAuth:', e); }
          return;
        }
        return _origMgr.apply(this, arguments);
      };
      hooked = true;
    }

    // 4. verifyClearAllPin — lounge, restaurant
    if (typeof window.verifyClearAllPin === 'function') {
      var _origClear = window.verifyClearAllPin;
      window.verifyClearAllPin = async function(){
        if (isMasterDevice()) {
          if (typeof window.closeClearAllModal === 'function') window.closeClearAllModal();
          try {
            if (window.__masterExecuteClearAll) {
              await window.__masterExecuteClearAll();
            }
          } catch(e) { console.warn('[Master] clearAll:', e); }
          return;
        }
        return _origClear.apply(this, arguments);
      };
      hooked = true;
    }

    // 5. verifyPass — show
    if (typeof window.verifyPass === 'function') {
      var _origPass = window.verifyPass;
      window.verifyPass = function(){
        if (isMasterDevice()) {
          if (typeof window.closeM === 'function') window.closeM('m-pass');
          try {
            if (window.__masterExecutePass) {
              window.__masterExecutePass();
            }
          } catch(e) { console.warn('[Master] pass:', e); }
          return;
        }
        return _origPass.apply(this, arguments);
      };
      hooked = true;
    }

    return hooked;
  }

  // ============ UI: BADGE VƯƠNG MIỆN ============
  function injectCrownBadge(){
    if (!isMasterDevice()) return;
    if (document.getElementById('masterCrownBadge')) return;

    var badge = document.createElement('div');
    badge.id = 'masterCrownBadge';
    badge.textContent = '👑';
    badge.title = 'MÁY CHỦ — Bấm để quản lý';
    badge.style.cssText = [
      'position:fixed', 'top:8px', 'right:8px', 'z-index:99999',
      'width:38px', 'height:38px', 'display:flex',
      'align-items:center', 'justify-content:center',
      'background:linear-gradient(135deg,#FBD77A,#F4B842)',
      'border:2px solid #123634', 'border-radius:50%',
      'font-size:19px', 'cursor:pointer',
      'box-shadow:0 4px 16px rgba(244,184,66,.7)',
      'animation:masterCrownPulse 2s ease-in-out infinite',
      'user-select:none', '-webkit-user-select:none'
    ].join(';');
    badge.onclick = openMasterModal;
    document.body.appendChild(badge);

    if (!document.getElementById('masterCrownPulseStyle')) {
      var style = document.createElement('style');
      style.id = 'masterCrownPulseStyle';
      style.textContent = '@keyframes masterCrownPulse{0%,100%{transform:scale(1)}50%{transform:scale(1.12)}}';
      document.head.appendChild(style);
    }
  }

  // ============ UI: MODAL QUẢN LÝ ============
  function injectModal(){
    if (document.getElementById('masterModal')) return;
    var modal = document.createElement('div');
    modal.id = 'masterModal';
    modal.style.cssText = [
      'position:fixed', 'inset:0', 'z-index:99998',
      'background:rgba(10,22,40,.92)', 'backdrop-filter:blur(16px)',
      'display:none', 'align-items:center', 'justify-content:center',
      'padding:16px', 'font-family:system-ui,-apple-system,sans-serif',
      'color:#fff'
    ].join(';');
    modal.innerHTML = ''
      + '<div style="background:linear-gradient(135deg,#1a4a45,#123634);border:1px solid #FBD77A;border-radius:18px;max-width:440px;width:100%;padding:24px;position:relative;box-shadow:0 20px 60px rgba(0,0,0,.7)">'
      +   '<button id="masterModalClose" style="position:absolute;top:8px;right:8px;background:transparent;border:none;color:#FBD77A;font-size:20px;cursor:pointer;padding:8px;line-height:1">✕</button>'
      +   '<div style="text-align:center;font-size:38px;margin-bottom:8px">🔑</div>'
      +   '<h3 style="color:#FBD77A;text-align:center;margin:0 0 18px;font-size:16px;text-transform:uppercase;letter-spacing:.08em;font-weight:900">Quản Lý Mã Chủ</h3>'
      +   '<div style="background:rgba(10,50,45,.7);border:1px solid rgba(251,215,122,.35);border-radius:12px;padding:12px;margin-bottom:18px;text-align:center">'
      +     '<div style="font-size:10px;color:#98dccb;text-transform:uppercase;margin-bottom:6px;font-weight:700;letter-spacing:.1em">Mã chủ hiện tại</div>'
      +     '<div id="masterCodeDisplay" style="color:#FBD77A;font-family:monospace;font-weight:900;font-size:15px;word-break:break-all">••••••••</div>'
      +   '</div>'
      +   '<label style="display:block;font-size:10px;color:#98dccb;text-transform:uppercase;margin-bottom:6px;font-weight:700">Mã mới</label>'
      +   '<input id="masterNewCode" type="text" placeholder="Ít nhất 6 ký tự..." style="width:100%;background:rgba(10,50,45,.8);border:1px solid rgba(152,220,203,.35);border-radius:10px;padding:11px;color:#fff;font-family:monospace;font-size:13px;box-sizing:border-box;margin-bottom:12px;outline:none">'
      +   '<label style="display:block;font-size:10px;color:#98dccb;text-transform:uppercase;margin-bottom:6px;font-weight:700">Xác nhận</label>'
      +   '<input id="masterNewCodeConfirm" type="text" placeholder="Nhập lại..." style="width:100%;background:rgba(10,50,45,.8);border:1px solid rgba(152,220,203,.35);border-radius:10px;padding:11px;color:#fff;font-family:monospace;font-size:13px;box-sizing:border-box;margin-bottom:12px;outline:none">'
      +   '<div id="masterModalMsg" style="font-size:11.5px;margin-bottom:12px;display:none;padding:9px;border-radius:8px;text-align:center;font-weight:700"></div>'
      +   '<div style="display:flex;gap:8px">'
      +     '<button id="masterModalCancel" style="flex:1;background:rgba(10,50,45,.9);border:1px solid rgba(152,220,203,.35);color:#98dccb;padding:13px;border-radius:10px;font-weight:700;cursor:pointer;font-size:12px">Hủy</button>'
      +     '<button id="masterModalSave" style="flex:2;background:linear-gradient(135deg,#FBD77A,#F4B842);border:none;color:#123634;padding:13px;border-radius:10px;font-weight:900;text-transform:uppercase;cursor:pointer;font-size:12px;letter-spacing:.04em">💾 Lưu mã mới</button>'
      +   '</div>'
      +   '<button id="masterModalDeactivate" style="width:100%;margin-top:12px;background:transparent;border:1px solid rgba(239,83,80,.5);color:#ef5350;padding:11px;border-radius:10px;font-weight:700;font-size:11px;text-transform:uppercase;cursor:pointer">❌ Tắt Máy Chủ trên thiết bị này</button>'
      + '</div>';
    document.body.appendChild(modal);

    document.getElementById('masterModalClose').onclick = closeMasterModal;
    document.getElementById('masterModalCancel').onclick = closeMasterModal;
    document.getElementById('masterModalSave').onclick = saveNewCode;
    document.getElementById('masterModalDeactivate').onclick = deactivate;
    modal.addEventListener('click', function(e){
      if (e.target === modal) closeMasterModal();
    });
  }

  function openMasterModal(){
    if (!isMasterDevice()) { alert('Chỉ Máy Chủ mới có quyền này!'); return; }
    injectModal();
    var modal = document.getElementById('masterModal');
    modal.style.display = 'flex';
    document.getElementById('masterCodeDisplay').textContent =
      masterCodeCache || getCachedCode() || DEFAULT_MASTER_CODE;
    document.getElementById('masterNewCode').value = '';
    document.getElementById('masterNewCodeConfirm').value = '';
    document.getElementById('masterModalMsg').style.display = 'none';
  }

  function closeMasterModal(){
    var m = document.getElementById('masterModal');
    if (m) m.style.display = 'none';
  }

  async function saveNewCode(){
    var nc = document.getElementById('masterNewCode').value.trim();
    var cc = document.getElementById('masterNewCodeConfirm').value.trim();
    var msg = document.getElementById('masterModalMsg');

    if (nc !== cc) { showMsg(msg, 'error', '❌ Hai mã không khớp!'); return; }
    if (nc.length < 6) { showMsg(msg, 'error', '❌ Mã phải từ 6 ký tự!'); return; }

    var oc = masterCodeCache || getCachedCode() || DEFAULT_MASTER_CODE;
    var staff = (typeof window.getStaffName === 'function' && window.getStaffName()) || 'Master';

    showMsg(msg, 'info', '⏳ Đang lưu lên Firebase...');
    var result = await updateMasterCodeInFirebase(oc, nc, staff);

    if (result.ok) {
      showMsg(msg, 'success', '✅ ' + result.msg);
      document.getElementById('masterCodeDisplay').textContent = nc;
      setTimeout(function(){
        closeMasterModal();
        alert('🔑 ĐÃ ĐỔI MÃ CHỦ!\n\nMã mới: ' + nc + '\n\nMọi thiết bị khác sẽ tự động nhận mã mới qua Firebase trong vài giây.');
      }, 800);
    } else {
      showMsg(msg, 'error', '❌ ' + result.msg);
    }
  }

  function showMsg(el, type, text){
    el.style.display = 'block';
    el.textContent = text;
    if (type === 'error') {
      el.style.background = 'rgba(239,83,80,.15)';
      el.style.color = '#ef5350';
      el.style.border = '1px solid rgba(239,83,80,.4)';
    } else if (type === 'success') {
      el.style.background = 'rgba(16,185,129,.15)';
      el.style.color = '#10b981';
      el.style.border = '1px solid rgba(16,185,129,.4)';
    } else {
      el.style.background = 'rgba(251,215,122,.1)';
      el.style.color = '#FBD77A';
      el.style.border = '1px solid rgba(251,215,122,.3)';
    }
  }

  function deactivate(){
    if (!confirm('❌ TẮT MÁY CHỦ TRÊN THIẾT BỊ NÀY?\n\nSau khi tắt, máy này phải nhập PIN bình thường.\n\nMã chủ trên Firebase vẫn giữ nguyên.')) return;
    localStorage.removeItem(MASTER_KEY);
    alert('Đã tắt Máy Chủ trên thiết bị này.');
    location.reload();
  }

  // ============ BẮT SỰ KIỆN BẤM 5 LẦN VÀO LOGO ============
  var tapCount = 0, tapTimer = null;
  function handleLogoTap(){
    tapCount++;
    clearTimeout(tapTimer);
    tapTimer = setTimeout(function(){ tapCount = 0; }, 1500);

    if (tapCount >= 5) {
      tapCount = 0;
      if (isMasterDevice()) {
        openMasterModal();
      } else {
        var code = prompt('👑 KÍCH HOẠT MÁY CHỦ\n\nNhập mã chủ:');
        if (code === null) return;
        if (verifyMasterCode(code)) {
          localStorage.setItem(MASTER_KEY, 'true');
          alert('✅ ĐÃ KÍCH HOẠT MÁY CHỦ!\n\nBấm logo DOLPHIN 5 lần để quản lý mã chủ.');
          location.reload();
        } else {
          alert('❌ Mã chủ không đúng!\n\nLiên hệ quản trị viên để lấy mã.');
        }
      }
    }
  }

  document.addEventListener('click', function(e){
    var t = e.target;
    if (!t) return;
    var cls = t.className || '';
    if (typeof cls === 'string' && cls.indexOf('brand-title') >= 0) {
      handleLogoTap();
    }
  }, true);

  // ============ KHỞI TẠO ============
  async function init(){
    // Đọc mã chủ từ Firebase (hoặc cache)
    await fetchMasterCode();

    // Đợi module script chạy xong rồi ghi đè
    var attempts = 0;
    var interval = setInterval(function(){
      attempts++;
      var done = overrideVerifyFunctions();
      if (done || attempts > 60) {
        clearInterval(interval);
        injectCrownBadge();
      }
    }, 150);

    // Pre-inject modal nếu là Master (để sẵn sàng)
    if (isMasterDevice()) {
      setTimeout(injectModal, 800);
    }
  }

  // Public API cho HTML hooks
  window.MasterSystem = {
    isMaster: isMasterDevice,
    verifyCode: verifyMasterCode,
    openModal: openMasterModal,
    changeCode: updateMasterCodeInFirebase,
    syncFromCloud: fetchMasterCode
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
