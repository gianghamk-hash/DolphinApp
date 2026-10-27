/* ============================================================
   👥 STAFF NAME SYNC — Đồng bộ tên nhân viên toàn hệ thống
   - Tất cả phân hệ dùng chung key localStorage
   - Tự động migrate từ key cũ (dolphinShowSeller)
   - Override các hàm getStaffName/setStaffName
   ============================================================ */
(function(){
  'use strict';

  var MAIN_KEY = 'dolphinStaffName';
  var LOCK_KEY = 'dolphinStaffNameLockedV1';
  var LEGACY_KEYS = ['dolphinShowSeller'];

  // ════════ ĐỌC TÊN ════════
  function readName(){
    try {
      var v = localStorage.getItem(MAIN_KEY);
      if (v && v.trim()) return v.trim();
      // Thử key cũ → migrate
      for (var i = 0; i < LEGACY_KEYS.length; i++){
        var lv = localStorage.getItem(LEGACY_KEYS[i]);
        if (lv && lv.trim()){
          try { localStorage.setItem(MAIN_KEY, lv.trim()); } catch(e){}
          return lv.trim();
        }
      }
      return '';
    } catch(e) { return ''; }
  }

  // ════════ KHÓA TÊN SAU LẦN XÁC NHẬN ĐẦU ════════
  function locked(){try{return localStorage.getItem(LOCK_KEY)==='1';}catch(e){return false;}}
  function notify(message){
    if(typeof window.showToast==='function')window.showToast(message,'🔒');
    else if(typeof window.alert==='function')window.alert(message);
  }
  function writeName(name){
    var trimmed=String(name||'').trim().replace(/\\s+/g,' ');
    if(!trimmed)return false;
    var old=readName();
    if(locked()){
      if(old!==trimmed){notify('Tên nhân viên đã khóa: '+old+'. Liên hệ quản lý nếu cần chỉnh sửa.');return false;}
      return true;
    }
    // Existing employees get one final confirmation/change. New staff enter once.
    var message=old
      ?'Tên hiện tại: '+old+'\\nTên xác nhận: '+trimmed+'\\n\\nĐây là lần đổi/xác nhận cuối cùng. Sau khi lưu sẽ không thể tự sửa tên. Tiếp tục?'
      :'Xác nhận tên nhân viên: '+trimmed+'?\\n\\nTên sẽ bị khóa sau khi lưu và không thể tự chỉnh sửa.';
    if(typeof window.confirm==='function'&&!window.confirm(message))return false;
    try {
      localStorage.setItem(MAIN_KEY,trimmed);
      LEGACY_KEYS.forEach(function(k){localStorage.setItem(k,trimmed);});
      localStorage.setItem(LOCK_KEY,'1');
      window.dispatchEvent(new CustomEvent('dolphinStaffNameChanged',{detail:{name:trimmed,locked:true}}));
      window.dispatchEvent(new CustomEvent('dolphinStaffNameLocked',{detail:{name:trimmed}}));
      return true;
    }catch(e){notify('Không lưu được trạng thái khóa tên. Vui lòng thử lại.');return false;}
  }
  function syncLockedInputs(){
    if(!locked())return;
    var name=readName();
    ['staff-name-input','seller-me'].forEach(function(id){
      var el=document.getElementById(id);
      if(el&&name){el.value=name;el.readOnly=true;el.title='Tên nhân viên đã được khóa';}
    });
  }

  // ════════ EXPOSE API ════════
  window.getSyncedStaffName = readName;
  window.setSyncedStaffName = writeName;
  window.isStaffNameLocked = locked;

  // ════════ OVERRIDE HÀM CŨ ════════
  function hookCoreFunctions(){
    try { window.getStaffName = readName; } catch(e){}
    try { window.setStaffName = writeName; } catch(e){}
    try { window.hasStaffName = function(){ return !!readName(); }; } catch(e){}
  }

  // ════════ OVERRIDE saveSeller (SHOW) ════════
  function hookShowSaveSeller(){
    if (typeof window.saveSeller !== 'function' || window.saveSeller.__synced) return false;
    var _orig = window.saveSeller;
    var newFn = function(){
      try {
        var input = document.getElementById('seller-me');
        if (input && input.value && input.value.trim()){
          if(!writeName(input.value))return;
          input.value=readName();
        }
      } catch(e){}
      var result=_orig.apply(this, arguments);
      syncLockedInputs();
      return result;
    };
    newFn.__synced = true;
    window.saveSeller = newFn;
    return true;
  }

  // ════════ OVERRIDE confirmStaffAction ════════
  function hookConfirmStaffAction(){
    if (typeof window.confirmStaffAction !== 'function' || window.confirmStaffAction.__synced) return false;
    var _orig = window.confirmStaffAction;
    var newFn = function(){
      try {
        var input = document.getElementById('staff-name-input');
        if (input && input.value && input.value.trim()){
          writeName(input.value);
        }
      } catch(e){}
      return _orig.apply(this, arguments);
    };
    newFn.__synced = true;
    window.confirmStaffAction = newFn;
    return true;
  }

  // ════════ AUTO-FILL INPUT SELLER-ME (SHOW) ════════
  function autoFillShowSeller(){
    try {
      var input = document.getElementById('seller-me');
      if (input && !input.value){
        var name = readName();
        if (name) input.value = name;
      }
      syncLockedInputs();
    } catch(e){}
  }

  // ════════ KHỞI ĐỘNG ════════
  function init(){
    readName(); // Migrate ngay
    hookCoreFunctions();

    var tries = 0;
    var timer = setInterval(function(){
      tries++;
      hookCoreFunctions();
      hookShowSaveSeller();
      hookConfirmStaffAction();
      autoFillShowSeller();
      syncLockedInputs();
      if (tries > 200) clearInterval(timer);
    }, 100);

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', autoFillShowSeller);
    } else {
      setTimeout(autoFillShowSeller, 500);
    }
  }

  init();

  console.log('%c👥 STAFF SYNC LOADED', 'background:#4ade80;color:#0a1f1d;font-size:12px;padding:3px 8px;border-radius:4px;font-weight:900');
})();
