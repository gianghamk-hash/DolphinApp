/* ============================================================
   👥 STAFF NAME SYNC — Đồng bộ tên nhân viên toàn hệ thống
   - Tất cả phân hệ dùng chung key localStorage
   - Tự động migrate từ key cũ (dolphinShowSeller)
   - Override các hàm getStaffName/setStaffName
   ============================================================ */
(function(){
  'use strict';

  var MAIN_KEY = 'dolphinStaffName';
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

  // ════════ GHI TÊN ════════
  function writeName(name){
    if (!name) return;
    var trimmed = String(name).trim();
    if (!trimmed) return;
    try {
      localStorage.setItem(MAIN_KEY, trimmed);
      // Đồng bộ sang các key cũ để tương thích
      LEGACY_KEYS.forEach(function(k){
        try { localStorage.setItem(k, trimmed); } catch(e){}
      });
      try {
        window.dispatchEvent(new CustomEvent('dolphinStaffNameChanged', {
          detail: { name: trimmed }
        }));
      } catch(e){}
    } catch(e){}
  }

  // ════════ EXPOSE API ════════
  window.getSyncedStaffName = readName;
  window.setSyncedStaffName = writeName;

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
          writeName(input.value);
        }
      } catch(e){}
      return _orig.apply(this, arguments);
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
