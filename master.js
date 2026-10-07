/* ============================================================
   👑 MASTER DEVICE SYSTEM v5 — Auto-fill PIN (không cần hook)
   ============================================================ */
(function(){
  'use strict';

  var FIREBASE_PROJECT = 'dolphin-f6d67';
  var FIREBASE_API_KEY = 'AIzaSyAtBNp9WBnyIkCiVjXfUpjH2d7-9dbg-JQ';
  var MASTER_KEY = 'dolphinMasterDevice';
  var MASTER_CODE_CACHE = 'dolphinMasterCodeCache';
  var AUTH_TOKEN_KEY = 'dolphinMasterAuthToken';
  var DEFAULT_MASTER_CODE = 'DOLPHIN-MASTER-2026';

  var masterCodeCache = null;
  var authToken = null;

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

  async function signInAnonymous(){
    try {
      var saved = JSON.parse(localStorage.getItem(AUTH_TOKEN_KEY) || 'null');
      if (saved && saved.expiresAt > Date.now() && saved.idToken) {
        authToken = saved.idToken;
        return saved.idToken;
      }
    } catch(e){}
    var res = await fetch(
      'https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=' + FIREBASE_API_KEY,
      { method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ returnSecureToken: true }) }
    );
    var data = await res.json();
    if (!data.idToken) throw new Error('Sign-in failed');
    authToken = data.idToken;
    try {
      localStorage.setItem(AUTH_TOKEN_KEY, JSON.stringify({
        idToken: data.idToken, refreshToken: data.refreshToken,
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
      if (res.status === 404) { masterCodeCache = DEFAULT_MASTER_CODE; cacheCode(DEFAULT_MASTER_CODE); return DEFAULT_MASTER_CODE; }
      var data = await res.json();
      var code = (data && data.fields && data.fields.masterCode && data.fields.masterCode.stringValue) || DEFAULT_MASTER_CODE;
      masterCodeCache = code;
      cacheCode(code);
      return code;
    } catch(e) {
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
      var body = { fields: {
        masterCode: { stringValue: newCode },
        updatedAt: { integerValue: String(Date.now()) },
        updatedBy: { stringValue: staffName || 'Master' }
      }};
      var res = await fetch(updateUrl, {
        method: 'PATCH',
        headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
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

  // ============================================================
  // OVERRIDE CÁC HÀM VERIFY — DÙNG AUTO-FILL PIN
  // ============================================================
  function overrideVerifyFunctions(){
    var hooked = false;

    // 1. requestPinAccess — bỏ qua PIN, vào thẳng role
    if (typeof window.requestPinAccess === 'function' && !window.requestPinAccess.__masterHooked) {
      var _origReq = window.requestPinAccess;
      var newReq = function(role){
        if (isMasterDevice()) {
          try {
            if (typeof window.hasStaffName === 'function' && !window.hasStaffName() &&
                typeof window.requireStaffName === 'function') {
              window.requireStaffName(role);
            } else if (typeof window.changeRole === 'function') {
              window.changeRole(role);
            }
          } catch(e){}
          return;
        }
        return _origReq.apply(this, arguments);
      };
      newReq.__masterHooked = true;
      window.requestPinAccess = newReq;
      hooked = true;
    }

    // 2. verifyPin — auto-fill 8888 hoặc 1111
    if (typeof window.verifyPin === 'function' && !window.verifyPin.__masterHooked) {
      var _origVerify = window.verifyPin;
      var newVerify = function(){
        if (isMasterDevice()) {
          var input = document.getElementById('pin-input');
          var modal = document.getElementById('modal-pin');
          if (input) {
            // Thử 8888 trước
            input.value = '8888';
            try { _origVerify.call(this); } catch(e){}
            if (modal && !modal.classList.contains('hidden')) {
              // Không thành công → thử 1111
              input.value = '1111';
              try { _origVerify.call(this); } catch(e){}
            }
          }
          return;
        }
        return _origVerify.apply(this, arguments);
      };
      newVerify.__masterHooked = true;
      window.verifyPin = newVerify;
      hooked = true;
    }

    // 3. verifyManagerAuth — auto-fill 451994 (mật khẩu Quản Lý)
    if (typeof window.verifyManagerAuth === 'function' && !window.verifyManagerAuth.__masterHooked) {
      var _origMgr = window.verifyManagerAuth;
      var newMgr = async function(){
        if (isMasterDevice()) {
          var input = document.getElementById('manager-auth-pin');
          if (input) {
            input.value = '451994';
            return _origMgr.call(this);
          }
        }
        return _origMgr.apply(this, arguments);
      };
      newMgr.__masterHooked = true;
      window.verifyManagerAuth = newMgr;
      hooked = true;
    }

    // 4. verifyClearAllPin — auto-fill 1234
    if (typeof window.verifyClearAllPin === 'function' && !window.verifyClearAllPin.__masterHooked) {
      var _origClear = window.verifyClearAllPin;
      var newClear = async function(){
        if (isMasterDevice()) {
          var input = document.getElementById('clear-all-pin');
          if (input) {
            input.value = '1234';
            return _origClear.call(this);
          }
        }
        return _origClear.apply(this, arguments);
      };
      newClear.__masterHooked = true;
      window.verifyClearAllPin = newClear;
      hooked = true;
    }

    // 5. verifyCustomerPwd — mật khẩu bàn (L1, L2...) — KHÔNG override
    // 6. verifyPass — show.html (dùng hook)
    if (typeof window.verifyPass === 'function' && !window.verifyPass.__masterHooked) {
      var _origPass = window.verifyPass;
      var newPass = function(){
        if (isMasterDevice()) {
          // Thử auto-fill nếu hook không có
          if (window.__masterExecutePass) {
            try { window.__masterExecutePass(); } catch(e){}
            if (typeof window.closeM === 'function') window.closeM('m-pass');
            return;
          }
        }
        return _origPass.apply(this, arguments);
      };
      newPass.__masterHooked = true;
      window.verifyPass = newPass;
      hooked = true;
    }

    return hooked;
  }

  // ============================================================
  // MODAL STYLES
  // ============================================================
  function buildModalStyles(){
    return ''
      + 'position:fixed;inset:0;z-index:9999998;background:rgba(10,22,40,.94);'
      + 'backdrop-filter:blur(16px);display:flex;align-items:center;justify-content:center;'
      + 'padding:16px;font-family:system-ui,-apple-system,sans-serif;color:#fff';
  }

  function showMsg(el, type, text){
    el.style.display = 'block';
    el.textContent = text;
    if (type === 'error') {
      el.style.background = 'rgba(239,83,80,.15)'; el.style.color = '#ef5350';
      el.style.border = '1px solid rgba(239,83,80,.4)';
    } else if (type === 'success') {
      el.style.background = 'rgba(16,185,129,.15)'; el.style.color = '#10b981';
      el.style.border = '1px solid rgba(16,185,129,.4)';
    } else {
      el.style.background = 'rgba(251,215,122,.1)'; el.style.color = '#FBD77A';
      el.style.border = '1px solid rgba(251,215,122,.3)';
    }
  }

  // ============================================================
  // MODAL KÍCH HOẠT
  // ============================================================
  function showActivateModal(){
    var old = document.getElementById('masterActivateModal');
    if (old) old.remove();
    var modal = document.createElement('div');
    modal.id = 'masterActivateModal';
    modal.style.cssText = buildModalStyles();
    modal.innerHTML = ''
      + '<div style="background:linear-gradient(135deg,#1a4a45,#123634);border:1px solid #FBD77A;border-radius:18px;max-width:420px;width:100%;padding:26px;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,.7)">'
      +   '<div style="font-size:44px;margin-bottom:8px">👑</div>'
      +   '<h3 style="color:#FBD77A;margin:0 0 8px;font-size:17px;text-transform:uppercase;font-weight:900">Kích Hoạt Máy Chủ</h3>'
      +   '<p style="color:#98dccb;font-size:12.5px;margin:0 0 20px;line-height:1.5">Nhập mã chủ để biến thiết bị này thành <b style="color:#FBD77A">MÁY CHỦ</b>.</p>'
      +   '<input id="masterActivateInput" type="text" placeholder="Nhập mã chủ..." autocomplete="off" style="width:100%;background:rgba(10,50,45,.8);border:1px solid rgba(251,215,122,.5);border-radius:10px;padding:14px;color:#FBD77A;font-family:monospace;font-size:15px;box-sizing:border-box;margin-bottom:14px;outline:none;text-align:center;font-weight:700">'
      +   '<div id="masterActivateMsg" style="font-size:11.5px;margin-bottom:12px;display:none;padding:9px;border-radius:8px;text-align:center;font-weight:700"></div>'
      +   '<div style="display:flex;gap:10px">'
      +     '<button id="masterActivateCancel" style="flex:1;background:rgba(10,50,45,.9);border:1px solid rgba(152,220,203,.35);color:#98dccb;padding:14px;border-radius:10px;font-weight:700;cursor:pointer;font-size:13px">Hủy</button>'
      +     '<button id="masterActivateOK" style="flex:2;background:linear-gradient(135deg,#FBD77A,#F4B842);border:none;color:#123634;padding:14px;border-radius:10px;font-weight:900;text-transform:uppercase;cursor:pointer;font-size:13px">👑 Kích Hoạt</button>'
      +   '</div>'
      + '</div>';
    document.body.appendChild(modal);
    var input = document.getElementById('masterActivateInput');
    var msg = document.getElementById('masterActivateMsg');
    setTimeout(function(){ input.focus(); }, 200);
    function submit(){
      var code = input.value.trim();
      if (!code) { showMsg(msg, 'error', 'Vui lòng nhập mã!'); return; }
      if (verifyMasterCode(code)) {
        try { localStorage.setItem(MASTER_KEY, 'true'); } catch(e){}
        showMsg(msg, 'success', '✅ ĐÃ KÍCH HOẠT! Đang tải lại...');
        setTimeout(function(){ modal.remove(); location.reload(); }, 900);
      } else {
        showMsg(msg, 'error', '❌ Mã chủ không đúng!');
        input.value = ''; input.focus();
      }
    }
    document.getElementById('masterActivateCancel').onclick = function(){ modal.remove(); };
    document.getElementById('masterActivateOK').onclick = submit;
    input.addEventListener('keydown', function(e){
      if (e.key === 'Enter') { e.preventDefault(); submit(); }
      if (e.key === 'Escape') { modal.remove(); }
    });
  }

  // ============================================================
  // BADGE VƯƠNG MIỆN
  // ============================================================
  function injectCrownBadge(){
    if (!isMasterDevice()) return;
    if (document.getElementById('masterCrownBadge')) return;
    var badge = document.createElement('div');
    badge.id = 'masterCrownBadge';
    badge.textContent = '👑';
    badge.title = 'MÁY CHỦ';
    badge.style.cssText = 'position:fixed;top:8px;right:8px;z-index:99999;width:38px;height:38px;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#FBD77A,#F4B842);border:2px solid #123634;border-radius:50%;font-size:19px;cursor:pointer;box-shadow:0 4px 16px rgba(244,184,66,.7);animation:masterCrownPulse 2s ease-in-out infinite';
    badge.onclick = openMasterModal;
    document.body.appendChild(badge);
    if (!document.getElementById('masterCrownPulseStyle')) {
      var style = document.createElement('style');
      style.id = 'masterCrownPulseStyle';
      style.textContent = '@keyframes masterCrownPulse{0%,100%{transform:scale(1)}50%{transform:scale(1.12)}}';
      document.head.appendChild(style);
    }
  }

  // ============================================================
  // MODAL QUẢN LÝ
  // ============================================================
  function injectModal(){
    if (document.getElementById('masterModal')) return;
    var modal = document.createElement('div');
    modal.id = 'masterModal';
    modal.style.cssText = buildModalStyles();
    modal.innerHTML = ''
      + '<div style="background:linear-gradient(135deg,#1a4a45,#123634);border:1px solid #FBD77A;border-radius:18px;max-width:440px;width:100%;padding:24px;position:relative;box-shadow:0 20px 60px rgba(0,0,0,.7)">'
      +   '<button id="masterModalClose" style="position:absolute;top:8px;right:8px;background:transparent;border:none;color:#FBD77A;font-size:20px;cursor:pointer;padding:8px">✕</button>'
      +   '<div style="text-align:center;font-size:38px;margin-bottom:8px">🔑</div>'
      +   '<h3 style="color:#FBD77A;text-align:center;margin:0 0 18px;font-size:16px;text-transform:uppercase;font-weight:900">Quản Lý Mã Chủ</h3>'
      +   '<div style="background:rgba(10,50,45,.7);border:1px solid rgba(251,215,122,.35);border-radius:12px;padding:12px;margin-bottom:18px;text-align:center">'
      +     '<div style="font-size:10px;color:#98dccb;text-transform:uppercase;margin-bottom:6px;font-weight:700">Mã chủ hiện tại</div>'
      +     '<div id="masterCodeDisplay" style="color:#FBD77A;font-family:monospace;font-weight:900;font-size:15px;word-break:break-all">••••••••</div>'
      +   '</div>'
      +   '<label style="display:block;font-size:10px;color:#98dccb;text-transform:uppercase;margin-bottom:6px;font-weight:700">Mã mới</label>'
      +   '<input id="masterNewCode" type="text" placeholder="Ít nhất 6 ký tự..." style="width:100%;background:rgba(10,50,45,.8);border:1px solid rgba(152,220,203,.35);border-radius:10px;padding:11px;color:#fff;font-family:monospace;font-size:13px;box-sizing:border-box;margin-bottom:12px;outline:none">'
      +   '<label style="display:block;font-size:10px;color:#98dccb;text-transform:uppercase;margin-bottom:6px;font-weight:700">Xác nhận</label>'
      +   '<input id="masterNewCodeConfirm" type="text" placeholder="Nhập lại..." style="width:100%;background:rgba(10,50,45,.8);border:1px solid rgba(152,220,203,.35);border-radius:10px;padding:11px;color:#fff;font-family:monospace;font-size:13px;box-sizing:border-box;margin-bottom:12px;outline:none">'
      +   '<div id="masterModalMsg" style="font-size:11.5px;margin-bottom:12px;display:none;padding:9px;border-radius:8px;text-align:center;font-weight:700"></div>'
      +   '<div style="display:flex;gap:8px">'
      +     '<button id="masterModalCancel" style="flex:1;background:rgba(10,50,45,.9);border:1px solid rgba(152,220,203,.35);color:#98dccb;padding:13px;border-radius:10px;font-weight:700;cursor:pointer;font-size:12px">Hủy</button>'
      +     '<button id="masterModalSave" style="flex:2;background:linear-gradient(135deg,#FBD77A,#F4B842);border:none;color:#123634;padding:13px;border-radius:10px;font-weight:900;text-transform:uppercase;cursor:pointer;font-size:12px">💾 Lưu mã mới</button>'
      +   '</div>'
      +   '<button id="masterModalDeactivate" style="width:100%;margin-top:12px;background:transparent;border:1px solid rgba(239,83,80,.5);color:#ef5350;padding:11px;border-radius:10px;font-weight:700;font-size:11px;text-transform:uppercase;cursor:pointer">❌ Tắt Máy Chủ</button>'
      + '</div>';
    document.body.appendChild(modal);
    document.getElementById('masterModalClose').onclick = closeMasterModal;
    document.getElementById('masterModalCancel').onclick = closeMasterModal;
    document.getElementById('masterModalSave').onclick = saveNewCode;
    document.getElementById('masterModalDeactivate').onclick = deactivate;
    modal.addEventListener('click', function(e){ if (e.target === modal) closeMasterModal(); });
  }

  function openMasterModal(){
    if (!isMasterDevice()) { showActivateModal(); return; }
    injectModal();
    var modal = document.getElementById('masterModal');
    modal.style.display = 'flex';
    document.getElementById('masterCodeDisplay').textContent = masterCodeCache || getCachedCode() || DEFAULT_MASTER_CODE;
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
        var cfm = document.createElement('div');
        cfm.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:#123634;border:2px solid #FBD77A;color:#FBD77A;padding:20px 30px;border-radius:14px;font-weight:900;font-size:14px;z-index:99999999;text-align:center;font-family:system-ui;box-shadow:0 20px 60px rgba(0,0,0,.8)';
        cfm.innerHTML = '🔑 ĐÃ ĐỔI MÃ CHỦ!<br><br><span style="font-size:16px;color:#fff">Mã mới: ' + nc + '</span>';
        document.body.appendChild(cfm);
        setTimeout(function(){ cfm.remove(); }, 5000);
      }, 800);
    } else {
      showMsg(msg, 'error', '❌ ' + result.msg);
    }
  }

  function deactivate(){
    var cfm = document.createElement('div');
    cfm.style.cssText = buildModalStyles();
    cfm.innerHTML = ''
      + '<div style="background:linear-gradient(135deg,#4a1a1a,#3a0e0e);border:1px solid #ef5350;border-radius:18px;max-width:400px;width:100%;padding:26px;text-align:center">'
      +   '<div style="font-size:40px;margin-bottom:10px">⚠️</div>'
      +   '<h3 style="color:#ef5350;margin:0 0 12px;font-size:16px;font-weight:900;text-transform:uppercase">Tắt Máy Chủ?</h3>'
      +   '<p style="color:#fecaca;font-size:12.5px;margin:0 0 20px">Sau khi tắt, máy này phải nhập PIN bình thường.</p>'
      +   '<div style="display:flex;gap:10px">'
      +     '<button id="cfmCancel" style="flex:1;background:rgba(10,50,45,.9);border:1px solid rgba(152,220,203,.35);color:#98dccb;padding:13px;border-radius:10px;font-weight:700;cursor:pointer;font-size:12px">Hủy</button>'
      +     '<button id="cfmOK" style="flex:1;background:#ef5350;border:none;color:#fff;padding:13px;border-radius:10px;font-weight:900;cursor:pointer;font-size:12px;text-transform:uppercase">Tắt</button>'
      +   '</div>'
      + '</div>';
    document.body.appendChild(cfm);
    document.getElementById('cfmCancel').onclick = function(){ cfm.remove(); };
    document.getElementById('cfmOK').onclick = function(){
      try { localStorage.removeItem(MASTER_KEY); } catch(e){}
      cfm.remove(); location.reload();
    };
  }

  // ============================================================
  // BẤM 5 LẦN VÀO LOGO
  // ============================================================
  var tapCount = 0, tapTimer = null;
  function handleLogoTap(){
    tapCount++;
    clearTimeout(tapTimer);
    tapTimer = setTimeout(function(){ tapCount = 0; }, 1500);
    if (tapCount >= 5) {
      tapCount = 0;
      if (isMasterDevice()) openMasterModal();
      else showActivateModal();
    }
  }

  document.addEventListener('click', function(e){
    var t = e.target;
    if (!t) return;
    var cls = (typeof t.className === 'string') ? t.className : '';
    var inBrand = cls.indexOf('brand-title') >= 0
              || cls.indexOf('brand-sub') >= 0
              || (t.closest && (t.closest('.brand-title') || t.closest('.brand-sub') || t.closest('#landing h1')));
    var txt = (t.textContent || '').toUpperCase();
    var isDolphinText = txt.indexOf('DOLPHIN') >= 0 && txt.length < 50;
    var y = (e.clientY !== undefined) ? e.clientY : 0;
    var inTopZone = y > 0 && y < window.innerHeight * 0.30;
    if (inBrand || isDolphinText || inTopZone) handleLogoTap();
  }, true);

  // ============================================================
  // KHỞI TẠO
  // ============================================================
  async function init(){    // DEBUG
    setTimeout(function(){
      var dbg = document.createElement('div');
      dbg.textContent = '👑 master.js đã load';
      dbg.style.cssText = 'position:fixed;top:70px;left:50%;transform:translateX(-50%);background:#FBD77A;color:#123634;padding:10px 20px;border-radius:20px;font-weight:900;font-size:14px;z-index:9999999;font-family:system-ui';
      document.body.appendChild(dbg);
      setTimeout(function(){ dbg.remove(); }, 6000);
    }, 1500);
    // END DEBUG
    var attempts = 0;
    var interval = setInterval(function(){
      attempts++;
      var done = overrideVerifyFunctions();
      if (done || attempts > 60) {
        clearInterval(interval);
        injectCrownBadge();
      }
    }, 150);
    if (isMasterDevice()) setTimeout(injectModal, 800);
    fetchMasterCode().catch(function(e){ console.warn('[Master] fetch:', e); });
  }

  window.MasterSystem = {
    isMaster: isMasterDevice,
    verifyCode: verifyMasterCode,
    openModal: openMasterModal,
    activate: showActivateModal,
    changeCode: updateMasterCodeInFirebase,
    syncFromCloud: fetchMasterCode
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
