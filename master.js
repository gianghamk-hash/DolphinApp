/* ============================================================
   👑 MASTER DEVICE SYSTEM v8 — Fix verifyManagerAuth recursion
   ============================================================ */
(function(){
  'use strict';

  var MASTER_KEY = 'dolphinMasterDevice';
  var MASTER_CODE_CACHE = 'dolphinMasterCodeCache';
  var DEFAULT_MASTER_CODE = 'DOLPHIN-MASTER-2026';
  var FIREBASE_PROJECT = 'dolphin-f6d67';
  var FIREBASE_API_KEY = 'AIzaSyAtBNp9WBnyIkCiVjXfUpjH2d7-9dbg-JQ';
  var AUTH_TOKEN_KEY = 'dolphinMasterAuthToken';

  var masterCodeCache = null;
  var authToken = null;

  function isMasterDevice(){
    try { return localStorage.getItem(MASTER_KEY) === 'true'; } catch(e){ return false; }
  }
  function getCachedCode(){
    try { return localStorage.getItem(MASTER_CODE_CACHE); } catch(e){ return null; }
  }
  function cacheCode(c){
    try { localStorage.setItem(MASTER_CODE_CACHE, c); } catch(e){}
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
      if (res.status === 404) {
        masterCodeCache = DEFAULT_MASTER_CODE;
        cacheCode(DEFAULT_MASTER_CODE);
        return;
      }
      var data = await res.json();
      var code = (data && data.fields && data.fields.masterCode && data.fields.masterCode.stringValue) || DEFAULT_MASTER_CODE;
      masterCodeCache = code;
      cacheCode(code);
    } catch(e) {
      var cached = getCachedCode();
      if (cached) masterCodeCache = cached;
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
      masterCodeCache = newCode; cacheCode(newCode);
      return { ok: true, msg: 'Đã đổi mã chủ!' };
    } catch(e) {
      return { ok: false, msg: 'Lỗi: ' + e.message };
    }
  }

  // ============ AUTO-FILL PIN ĐÚNG CÁCH ============
  // Hàm này chỉ set giá trị input + click nút. KHÔNG gọi lại hàm verify.
  function autoFillAndSubmit(inputId, btnSelector, pin){
    var input = document.getElementById(inputId);
    var btn = document.querySelector(btnSelector);
    if (!input || !btn) return false;
    input.value = pin;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    btn.click();
    return true;
  }

  // ============ HOOK CÁC HÀM VERIFY ============
  // Nguyên tắc: hàm gốc LUÔN được gọi. Chỉ auto-fill PIN vào input trước.
  // Cách này tránh đệ quy vô tận.

  // 1. requestPinAccess — entry point, modal sẽ mở. Sau đó auto-fill PIN.
  function hookRequestPinAccess(){
    if (typeof window.requestPinAccess !== 'function' || window.requestPinAccess.__masterHooked) return false;
    var _orig = window.requestPinAccess;
    var newFn = function(role){
      _orig.apply(this, arguments);  // mở modal
      if (isMasterDevice()) {
        var pins = (role === 'reception') ? ['1111', '8888'] : ['8888', '1111'];
        var attempts = 0;
        var timer = setInterval(function(){
          attempts++;
          var modal = document.getElementById('modal-pin');
          if (!modal || modal.classList.contains('hidden')) { clearInterval(timer); return; }
          var input = document.getElementById('pin-input');
          if (!input) return;
          var pin = pins[Math.min(attempts-1, pins.length-1)] || pins[pins.length-1];
          input.value = pin;
          var btn = document.querySelector('#modal-pin button[onclick*="verifyPin"]');
          if (btn) btn.click();
          if (attempts > 30) clearInterval(timer);
        }, 100);
      }
    };
    newFn.__masterHooked = true;
    window.requestPinAccess = newFn;
    return true;
  }

  // 2. verifyPin — auto-fill nếu input rỗng, sau đó GỌI HÀM GỐC
  function hookVerifyPin(){
    if (typeof window.verifyPin !== 'function' || window.verifyPin.__masterHooked) return false;
    var _orig = window.verifyPin;
    var newFn = function(){
      if (isMasterDevice()) {
        var input = document.getElementById('pin-input');
        if (input && !input.value) {
          // Thử PIN tùy role
          var modal = document.getElementById('modal-pin');
          var title = document.getElementById('pin-modal-title');
          var isReception = title && title.innerText && title.innerText.indexOf('Lễ Tân') >= 0;
          input.value = isReception ? '1111' : '8888';
          input.dispatchEvent(new Event('input', { bubbles: true }));
        }
      }
      return _orig.apply(this, arguments);
    };
    newFn.__masterHooked = true;
    window.verifyPin = newFn;
    return true;
  }

  // 3. promptManagerAuth — modal sẽ mở. Auto-fill PIN 451994 và click nút.
  function hookPromptManagerAuth(){
    if (typeof window.promptManagerAuth !== 'function' || window.promptManagerAuth.__masterHooked) return false;
    var _orig = window.promptManagerAuth;
    var newFn = function(){
      _orig.apply(this, arguments);  // mở modal
      if (isMasterDevice()) {
        setTimeout(function(){
          var input = document.getElementById('manager-auth-pin');
          if (input) {
            input.value = '451994';
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));
          }
          var btn = document.querySelector('#modal-manager-auth button[onclick*="verifyManagerAuth"]');
          if (btn) btn.click();
        }, 200);
      }
    };
    newFn.__masterHooked = true;
    window.promptManagerAuth = newFn;
    return true;
  }

  // 4. verifyManagerAuth — auto-fill nếu input rỗng, sau đó GỌI HÀM GỐC
  function hookVerifyManagerAuth(){
    if (typeof window.verifyManagerAuth !== 'function' || window.verifyManagerAuth.__masterHooked) return false;
    var _orig = window.verifyManagerAuth;
    var newFn = function(){
      if (isMasterDevice()) {
        var input = document.getElementById('manager-auth-pin');
        if (input && input.value !== '451994') {
          input.value = '451994';
          input.dispatchEvent(new Event('input', { bubbles: true }));
        }
      }
      return _orig.apply(this, arguments);
    };
    newFn.__masterHooked = true;
    window.verifyManagerAuth = newFn;
    return true;
  }

  // 5. promptClearAllCustomers — modal mở. Auto-fill PIN 1234 và click.
  function hookPromptClearAllCustomers(){
    if (typeof window.promptClearAllCustomers !== 'function' || window.promptClearAllCustomers.__masterHooked) return false;
    var _orig = window.promptClearAllCustomers;
    var newFn = function(){
      _orig.apply(this, arguments);
      if (isMasterDevice()) {
        setTimeout(function(){
          var input = document.getElementById('clear-all-pin');
          if (input) {
            input.value = '1234';
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));
          }
          var btn = document.querySelector('#modal-clear-all button[onclick*="verifyClearAllPin"]');
          if (btn) btn.click();
        }, 200);
      }
    };
    newFn.__masterHooked = true;
    window.promptClearAllCustomers = newFn;
    return true;
  }

  // 6. verifyClearAllPin — auto-fill nếu rỗng, sau đó GỌI HÀM GỐC
  function hookVerifyClearAllPin(){
    if (typeof window.verifyClearAllPin !== 'function' || window.verifyClearAllPin.__masterHooked) return false;
    var _orig = window.verifyClearAllPin;
    var newFn = function(){
      if (isMasterDevice()) {
        var input = document.getElementById('clear-all-pin');
        if (input && input.value !== '1234') {
          input.value = '1234';
          input.dispatchEvent(new Event('input', { bubbles: true }));
        }
      }
      return _orig.apply(this, arguments);
    };
    newFn.__masterHooked = true;
    window.verifyClearAllPin = newFn;
    return true;
  }

  // 7. verifyPass (show) — không bypass được vì dùng hash
  function hookVerifyPass(){
    if (typeof window.verifyPass !== 'function' || window.verifyPass.__masterHooked) return false;
    var _orig = window.verifyPass;
    var newFn = function(){
      return _orig.apply(this, arguments);
    };
    newFn.__masterHooked = true;
    window.verifyPass = newFn;
    return true;
  }

  // ============ BADGE VƯƠNG MIỆN ============
  function injectCrownBadge(){
    if (!isMasterDevice()) return;
    if (document.getElementById('masterCrownBadge')) return;
    if (!document.body) return;
    var badge = document.createElement('div');
    badge.id = 'masterCrownBadge';
    badge.textContent = '👑';
    badge.title = 'MÁY CHỦ — Bấm để quản lý';
    badge.style.cssText = 'position:fixed;top:8px;right:8px;z-index:99999;width:38px;height:38px;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#FBD77A,#F4B842);border:2px solid #123634;border-radius:50%;font-size:19px;cursor:pointer;box-shadow:0 4px 16px rgba(244,184,66,.7);animation:masterCrownPulse 2s ease-in-out infinite;user-select:none;-webkit-user-select:none';
    badge.onclick = openMasterModal;
    document.body.appendChild(badge);
    if (!document.getElementById('masterCrownPulseStyle')) {
      var s = document.createElement('style');
      s.id = 'masterCrownPulseStyle';
      s.textContent = '@keyframes masterCrownPulse{0%,100%{transform:scale(1)}50%{transform:scale(1.12)}}';
      document.head.appendChild(s);
    }
  }

  // ============ NÚT FLOATING KÍCH HOẠT ============
  function injectActivateButton(){
    if (isMasterDevice()) return;
    if (document.getElementById('masterActivateBtn')) return;
    if (!document.body) return;
    var btn = document.createElement('div');
    btn.id = 'masterActivateBtn';
    btn.textContent = '👑';
    btn.title = 'Bấm để kích hoạt Máy Chủ';
    btn.style.cssText = 'position:fixed;bottom:20px;right:20px;z-index:99998;width:44px;height:44px;display:flex;align-items:center;justify-content:center;background:rgba(18,54,52,.55);border:1px solid rgba(244,184,66,.35);border-radius:50%;font-size:20px;cursor:pointer;opacity:.5;box-shadow:0 4px 14px rgba(0,0,0,.35);transition:opacity .3s,transform .3s;user-select:none';
    btn.onclick = function(){ showActivateModal(); };
    btn.addEventListener('mouseenter', function(){ btn.style.opacity = '1'; btn.style.transform = 'scale(1.1)'; });
    btn.addEventListener('mouseleave', function(){ btn.style.opacity = '.5'; btn.style.transform = 'scale(1)'; });
    document.body.appendChild(btn);
  }

  // ============ MODAL ============
  function modalBase(){
    return 'position:fixed;inset:0;z-index:9999998;background:rgba(10,22,40,.94);backdrop-filter:blur(16px);display:flex;align-items:center;justify-content:center;padding:16px;font-family:system-ui,-apple-system,sans-serif;color:#fff';
  }

  function showActivateModal(){
    var old = document.getElementById('masterActivateModal');
    if (old) old.remove();
    var modal = document.createElement('div');
    modal.id = 'masterActivateModal';
    modal.style.cssText = modalBase();
    modal.innerHTML = '<div style="background:linear-gradient(135deg,#1a4a45,#123634);border:1px solid #FBD77A;border-radius:18px;max-width:420px;width:100%;padding:26px;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,.7)">'
      + '<div style="font-size:44px;margin-bottom:8px">👑</div>'
      + '<h3 style="color:#FBD77A;margin:0 0 8px;font-size:17px;text-transform:uppercase;font-weight:900">Kích Hoạt Máy Chủ</h3>'
      + '<p style="color:#98dccb;font-size:12.5px;margin:0 0 20px;line-height:1.5">Nhập mã chủ để biến thiết bị này thành <b style="color:#FBD77A">MÁY CHỦ</b> — bỏ qua mọi PIN.</p>'
      + '<input id="masterActivateInput" type="text" placeholder="Nhập mã chủ..." autocomplete="off" spellcheck="false" autocorrect="off" autocapitalize="off" style="width:100%;background:rgba(10,50,45,.8);border:1px solid rgba(251,215,122,.5);border-radius:10px;padding:14px;color:#FBD77A;font-family:monospace;font-size:15px;box-sizing:border-box;margin-bottom:14px;outline:none;text-align:center;font-weight:700">'
      + '<div id="masterActivateMsg" style="font-size:11.5px;margin-bottom:12px;display:none;padding:9px;border-radius:8px;text-align:center;font-weight:700"></div>'
      + '<div style="display:flex;gap:10px">'
      + '<button id="masterActivateCancel" style="flex:1;background:rgba(10,50,45,.9);border:1px solid rgba(152,220,203,.35);color:#98dccb;padding:14px;border-radius:10px;font-weight:700;cursor:pointer;font-size:13px">Hủy</button>'
      + '<button id="masterActivateOK" style="flex:2;background:linear-gradient(135deg,#FBD77A,#F4B842);border:none;color:#123634;padding:14px;border-radius:10px;font-weight:900;text-transform:uppercase;cursor:pointer;font-size:13px">👑 Kích Hoạt</button>'
      + '</div></div>';
    document.body.appendChild(modal);
    var input = document.getElementById('masterActivateInput');
    var msg = document.getElementById('masterActivateMsg');
    setTimeout(function(){ input.focus(); }, 200);
    function showMsg(type, text){
      msg.style.display = 'block'; msg.textContent = text;
      msg.style.background = type === 'error' ? 'rgba(239,83,80,.15)' : 'rgba(16,185,129,.15)';
      msg.style.color = type === 'error' ? '#ef5350' : '#10b981';
      msg.style.border = '1px solid ' + (type === 'error' ? 'rgba(239,83,80,.4)' : 'rgba(16,185,129,.4)');
    }
    function submit(){
      var code = input.value.trim();
      if (!code) { showMsg('error', 'Vui lòng nhập mã!'); return; }
      if (verifyMasterCode(code)) {
        try { localStorage.setItem(MASTER_KEY, 'true'); } catch(e){}
        showMsg('success', '✅ ĐÃ KÍCH HOẠT! Đang tải lại...');
        setTimeout(function(){ modal.remove(); location.reload(); }, 900);
      } else {
        showMsg('error', '❌ Mã chủ không đúng!');
        input.value = ''; input.focus();
      }
    }
    document.getElementById('masterActivateCancel').onclick = function(){ modal.remove(); };
    document.getElementById('masterActivateOK').onclick = submit;
    input.addEventListener('keydown', function(e){
      if (e.key === 'Enter') { e.preventDefault(); submit(); }
      if (e.key === 'Escape') modal.remove();
    });
  }

  function injectManageModal(){
    if (document.getElementById('masterManageModal')) return;
    var modal = document.createElement('div');
    modal.id = 'masterManageModal';
    modal.style.cssText = modalBase();
    modal.innerHTML = '<div style="background:linear-gradient(135deg,#1a4a45,#123634);border:1px solid #FBD77A;border-radius:18px;max-width:440px;width:100%;padding:24px;position:relative;box-shadow:0 20px 60px rgba(0,0,0,.7)">'
      + '<button id="masterMClose" style="position:absolute;top:8px;right:8px;background:transparent;border:none;color:#FBD77A;font-size:20px;cursor:pointer;padding:8px">✕</button>'
      + '<div style="text-align:center;font-size:38px;margin-bottom:8px">🔑</div>'
      + '<h3 style="color:#FBD77A;text-align:center;margin:0 0 18px;font-size:16px;text-transform:uppercase;font-weight:900">Quản Lý Mã Chủ</h3>'
      + '<div style="background:rgba(10,50,45,.7);border:1px solid rgba(251,215,122,.35);border-radius:12px;padding:12px;margin-bottom:18px;text-align:center">'
      + '<div style="font-size:10px;color:#98dccb;text-transform:uppercase;margin-bottom:6px;font-weight:700">Mã chủ hiện tại</div>'
      + '<div id="masterCodeDisplay" style="color:#FBD77A;font-family:monospace;font-weight:900;font-size:15px;word-break:break-all">••••••••</div>'
      + '</div>'
      + '<label style="display:block;font-size:10px;color:#98dccb;text-transform:uppercase;margin-bottom:6px;font-weight:700">Mã mới</label>'
      + '<input id="masterNewCode" type="text" placeholder="Ít nhất 6 ký tự..." spellcheck="false" autocorrect="off" autocapitalize="off" style="width:100%;background:rgba(10,50,45,.8);border:1px solid rgba(152,220,203,.35);border-radius:10px;padding:11px;color:#fff;font-family:monospace;font-size:13px;box-sizing:border-box;margin-bottom:12px;outline:none">'
      + '<label style="display:block;font-size:10px;color:#98dccb;text-transform:uppercase;margin-bottom:6px;font-weight:700">Xác nhận</label>'
      + '<input id="masterNewCodeConfirm" type="text" placeholder="Nhập lại..." spellcheck="false" autocorrect="off" autocapitalize="off" style="width:100%;background:rgba(10,50,45,.8);border:1px solid rgba(152,220,203,.35);border-radius:10px;padding:11px;color:#fff;font-family:monospace;font-size:13px;box-sizing:border-box;margin-bottom:12px;outline:none">'
      + '<div id="masterManageMsg" style="font-size:11.5px;margin-bottom:12px;display:none;padding:9px;border-radius:8px;text-align:center;font-weight:700"></div>'
      + '<div style="display:flex;gap:8px">'
      + '<button id="masterMCancel" style="flex:1;background:rgba(10,50,45,.9);border:1px solid rgba(152,220,203,.35);color:#98dccb;padding:13px;border-radius:10px;font-weight:700;cursor:pointer;font-size:12px">Hủy</button>'
      + '<button id="masterMSave" style="flex:2;background:linear-gradient(135deg,#FBD77A,#F4B842);border:none;color:#123634;padding:13px;border-radius:10px;font-weight:900;text-transform:uppercase;cursor:pointer;font-size:12px">💾 Lưu mã mới</button>'
      + '</div>'
      + '<button id="masterMDeactivate" style="width:100%;margin-top:12px;background:transparent;border:1px solid rgba(239,83,80,.5);color:#ef5350;padding:11px;border-radius:10px;font-weight:700;font-size:11px;text-transform:uppercase;cursor:pointer">❌ Tắt Máy Chủ trên thiết bị này</button>'
      + '</div>';
    document.body.appendChild(modal);
    document.getElementById('masterMClose').onclick = function(){ modal.style.display = 'none'; };
    document.getElementById('masterMCancel').onclick = function(){ modal.style.display = 'none'; };
    document.getElementById('masterMDeactivate').onclick = deactivate;
    document.getElementById('masterMSave').onclick = async function(){
      var nc = document.getElementById('masterNewCode').value.trim();
      var cc = document.getElementById('masterNewCodeConfirm').value.trim();
      var msg = document.getElementById('masterManageMsg');
      function showMsg(type, text){
        msg.style.display = 'block'; msg.textContent = text;
        msg.style.background = type === 'error' ? 'rgba(239,83,80,.15)' : (type === 'success' ? 'rgba(16,185,129,.15)' : 'rgba(251,215,122,.1)');
        msg.style.color = type === 'error' ? '#ef5350' : (type === 'success' ? '#10b981' : '#FBD77A');
        msg.style.border = '1px solid ' + (type === 'error' ? 'rgba(239,83,80,.4)' : (type === 'success' ? 'rgba(16,185,129,.4)' : 'rgba(251,215,122,.3)'));
      }
      if (nc !== cc) return showMsg('error', '❌ Hai mã không khớp!');
      if (nc.length < 6) return showMsg('error', '❌ Mã phải từ 6 ký tự!');
      var oc = masterCodeCache || getCachedCode() || DEFAULT_MASTER_CODE;
      var staff = (typeof window.getStaffName === 'function' && window.getStaffName()) || 'Master';
      showMsg('info', '⏳ Đang lưu lên Firebase...');
      var r = await updateMasterCodeInFirebase(oc, nc, staff);
      if (r.ok) {
        showMsg('success', '✅ ' + r.msg);
        document.getElementById('masterCodeDisplay').textContent = nc;
        setTimeout(function(){ modal.style.display = 'none'; }, 800);
      } else {
        showMsg('error', '❌ ' + r.msg);
      }
    };
  }

  function openMasterModal(){
    if (!isMasterDevice()) { showActivateModal(); return; }
    injectManageModal();
    var modal = document.getElementById('masterManageModal');
    modal.style.display = 'flex';
    document.getElementById('masterCodeDisplay').textContent = masterCodeCache || getCachedCode() || DEFAULT_MASTER_CODE;
    document.getElementById('masterNewCode').value = '';
    document.getElementById('masterNewCodeConfirm').value = '';
    document.getElementById('masterManageMsg').style.display = 'none';
  }

  function deactivate(){
    if (!confirm('❌ TẮT MÁY CHỦ TRÊN THIẾT BỊ NÀY?\n\nSau khi tắt, máy này phải nhập PIN bình thường.')) return;
    try { localStorage.removeItem(MASTER_KEY); } catch(e){}
    location.reload();
  }

  // ============ BẤM 5 LẦN VÀO LOGO ============
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
              || cls.indexOf('logo-shimmer') >= 0
              || (t.closest && (t.closest('.brand-title') || t.closest('.brand-sub') || t.closest('.logo-shimmer') || t.closest('#landing h1')));
    var txt = (t.textContent || '').toUpperCase();
    var isDolphinText = txt.indexOf('DOLPHIN') >= 0 && txt.length < 50;
    var y = (e.clientY !== undefined) ? e.clientY : 0;
    var inTopZone = y > 0 && y < window.innerHeight * 0.30;
    if (inBrand || isDolphinText || inTopZone) handleLogoTap();
  }, true);

  // ============ KHỞI TẠO ============
  function startHooking(){
    var tries = 0;
    var timer = setInterval(function(){
      tries++;
      hookRequestPinAccess();
      hookVerifyPin();
      hookPromptManagerAuth();
      hookVerifyManagerAuth();
      hookPromptClearAllCustomers();
      hookVerifyClearAllPin();
      hookVerifyPass();
      if (tries > 200) clearInterval(timer);
    }, 150);
  }

  function init(){
    fetchMasterCode().catch(function(e){ console.warn('[Master]', e); });
    startHooking();
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function(){
        setTimeout(injectCrownBadge, 600);
        setTimeout(injectActivateButton, 600);
      });
    } else {
      setTimeout(injectCrownBadge, 600);
      setTimeout(injectActivateButton, 600);
    }
  }

  window.MasterSystem = {
    isMaster: isMasterDevice,
    verifyCode: verifyMasterCode,
    openModal: openMasterModal,
    activate: showActivateModal,
    changeCode: updateMasterCodeInFirebase,
    syncFromCloud: fetchMasterCode
  };

  init();
})();
