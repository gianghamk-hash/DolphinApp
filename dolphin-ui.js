/* ============================================================
   DOLPHIN UI EXTRAS v8.0 (Dark Luxury - Theme-aware)
   ─────────────────────────────────────────────────────────────
   • N6: Global Toast System
   • A4: Alert đơn quá 5 phút trên Landing
   • C2: Empty State Illustrations
   • D1: Mini Dashboard cho Manager
   • v8.0: Dùng var(--gold, #D4AF37) → tự đổi màu theo theme
   ============================================================ */
(function(){
'use strict';

var FIREBASE_CONFIG={apiKey:"AIzaSyAtBNp9WBnyIkCiVjXfUpjH2d7-9dbg-JQ",authDomain:"dolphin-f6d67.firebaseapp.com",projectId:"dolphin-f6d67"};

var AREAS=[
  {key:'lounge',col:'lounge_orders',label:'Lounge',icon:'🍸',app:'lounge'},
  {key:'bungalow',col:'bun_orders',label:'Bungalow',icon:'🌴',app:'bungalow'},
  {key:'restaurant',col:'res_orders',label:'Restaurant',icon:'🍽️',app:'restaurant'}
];

var DELAY_MS=5*60*1000,ALERT_POLL_MS=20000,DASH_POLL_MS=30000;
var TOAST_MAX=5,TOAST_DEFAULT_MS=3200,TOAST_ERR_MS=5200,TOAST_LOADING_MS=0;

function hasLanding(){return!!document.getElementById('landing')}
function isIframe(){try{return window.parent!==window}catch(e){return false}}
function isManager(){return navigator.userAgent.indexOf('DolphinManager')>=0}

function escapeHtml(s){if(s==null)return'';return String(s).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}

function detectArea(){
  var p=(location.pathname||'').toLowerCase();
  if(p.indexOf('lounge')>=0)return'lounge';
  if(p.indexOf('bungalow')>=0)return'bungalow';
  if(p.indexOf('restaurant')>=0)return'restaurant';
  if(p.indexOf('ranking')>=0)return'ranking';
  if(p.indexOf('caro')>=0)return'caro';
  if(p.indexOf('show')>=0)return'show';
  if(p.indexOf('dashboard')>=0)return'manager';
  return'default';
}

var ToastSystem=(function(){
  var container=null,activeToasts=[];
  function injectStyles(){
    if(document.getElementById('dolphinToastStyles'))return;
    var s=document.createElement('style');
    s.id='dolphinToastStyles';
    s.textContent=[
      '#dtoastContainer{position:fixed;top:20px;right:20px;z-index:9999;display:flex;flex-direction:column;gap:12px;pointer-events:none;max-width:min(92vw,420px);width:max-content;font-family:"Nunito",-apple-system,BlinkMacSystemFont,sans-serif}',
      '@media(max-width:640px){#dtoastContainer{top:16px;left:16px;right:16px;max-width:none;width:auto;align-items:stretch}}',
      '.dtoast{position:relative;display:flex;align-items:center;gap:14px;padding:14px 16px;border-radius:16px;color:#F4F4F5;font-size:14px;font-weight:700;letter-spacing:.02em;background:rgba(20,20,20,.95);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);border:1px solid rgba(255,255,255,.1);box-shadow:0 15px 35px rgba(0,0,0,.6),inset 0 1px 0 rgba(255,255,255,.05);pointer-events:auto;cursor:default;overflow:hidden;will-change:transform,opacity;transform-origin:top right;opacity:0;transform:translateX(120%) scale(.95);transition:opacity .3s cubic-bezier(.16,1,.3,1),transform .4s cubic-bezier(.16,1,.3,1)}',
      '.dtoast.show{opacity:1;transform:translateX(0) scale(1)}',
      '.dtoast.hide{opacity:0;transform:translateX(120%) scale(.95)}',
      '@media(max-width:640px){.dtoast{transform-origin:top center;transform:translateY(-120%) scale(.95)}.dtoast.show{transform:translateY(0) scale(1)}.dtoast.hide{transform:translateY(-120%) scale(.95)}}',
      '.dtoast[data-type="success"]{border-left:4px solid #10B981}',
      '.dtoast[data-type="success"] .dt-icon{color:#10B981;text-shadow:0 0 12px rgba(16,185,129,.5)}',
      '.dtoast[data-type="error"]{border-left:4px solid #EF4444}',
      '.dtoast[data-type="error"] .dt-icon{color:#EF4444;text-shadow:0 0 12px rgba(239,68,68,.5)}',
      '.dtoast[data-type="warning"]{border-left:4px solid #F59E0B}',
      '.dtoast[data-type="warning"] .dt-icon{color:#F59E0B;text-shadow:0 0 12px rgba(245,158,11,.5)}',
      '.dtoast[data-type="info"]{border-left:4px solid #0EA5E9}',
      '.dtoast[data-type="info"] .dt-icon{color:#0EA5E9;text-shadow:0 0 12px rgba(14,165,233,.5)}',
      '.dtoast[data-type="loading"]{border-left:4px solid var(--gold,#D4AF37)}',
      '.dtoast[data-type="loading"] .dt-icon{color:var(--gold,#D4AF37);text-shadow:0 0 12px var(--gold-glow,rgba(212,175,55,.5))}',
      '.dtoast .dt-icon{font-size:22px;line-height:1;flex-shrink:0;display:flex;align-items:center;justify-content:center;width:28px;height:28px}',
      '.dtoast[data-type="loading"] .dt-icon{animation:dtSpin 1.4s linear infinite}',
      '@keyframes dtSpin{to{transform:rotate(360deg)}}',
      '.dtoast .dt-body{flex:1;min-width:0;display:flex;flex-direction:column;gap:4px}',
      '.dtoast .dt-title{font-weight:900;font-size:14px;letter-spacing:.03em;line-height:1.3;word-break:break-word}',
      '.dtoast .dt-sub{font-size:12px;font-weight:600;color:#94A3B8;letter-spacing:.02em;line-height:1.4;word-break:break-word}',
      '.dtoast .dt-close{flex-shrink:0;width:24px;height:24px;border-radius:50%;border:none;background:rgba(255,255,255,.05);color:#94A3B8;font-size:12px;font-weight:900;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0;transition:all .2s;font-family:inherit;line-height:1}',
      '.dtoast .dt-close:hover{background:rgba(255,255,255,.1);color:#fff;transform:scale(1.1)}',
      '.dtoast .dt-progress{position:absolute;left:0;right:0;bottom:0;height:2px;background:rgba(255,255,255,.05);overflow:hidden}',
      '.dtoast .dt-progress::before{content:"";position:absolute;inset:0;background:linear-gradient(90deg,transparent,rgba(255,255,255,.5),transparent);transform:translateX(-100%);animation:dtProgress 3.2s linear forwards}',
      '@keyframes dtProgress{to{transform:translateX(100%)}}',
      '@media(prefers-reduced-motion:reduce){.dtoast{transition:opacity .01s;transform:none!important}.dtoast.show{opacity:1}.dtoast.hide{opacity:0}.dtoast .dt-progress::before{animation:none}.dtoast[data-type="loading"] .dt-icon{animation:none}}'
    ].join('\n');
    document.head.appendChild(s);
  }
  function ensureContainer(){
    if(container)return container;
    container=document.getElementById('dtoastContainer');if(container)return container;
    container=document.createElement('div');container.id='dtoastContainer';
    container.setAttribute('role','region');container.setAttribute('aria-label','Thông báo');container.setAttribute('aria-live','polite');
    document.body.appendChild(container);return container;
  }
  function createToast(opts){
    var type=opts.type||'info';
    var duration=typeof opts.duration==='number'?opts.duration:TOAST_DEFAULT_MS;
    var el=document.createElement('div');
    el.className='dtoast';el.dataset.type=type;el.setAttribute('role',type==='error'?'alert':'status');
    var defaultIcons={success:'✅',error:'❌',warning:'⚠️',info:'ℹ️',loading:'⏳'};
    var iconHtml;
    if(opts.icon!=null&&opts.icon!==''){iconHtml='<span class="dt-icon">'+escapeHtml(opts.icon)+'</span>'}
    else{iconHtml='<span class="dt-icon">'+defaultIcons[type]+'</span>'}
    var titleHtml=opts.title?'<div class="dt-title">'+escapeHtml(opts.title)+'</div>':'';
    var bodyHtml;
    if(opts.title){bodyHtml=titleHtml+(opts.message?'<div class="dt-sub">'+escapeHtml(opts.message)+'</div>':'')}
    else{bodyHtml='<div class="dt-title">'+escapeHtml(opts.message||'')+'</div>'}
    var closeHtml=opts.dismissible===false?'':'<button class="dt-close" type="button" aria-label="Đóng">✕</button>';
    var progressHtml=(duration>0&&opts.showProgress!==false)?'<div class="dt-progress" style="animation-duration:'+duration+'ms"></div>':'';
    el.innerHTML=iconHtml+'<div class="dt-body">'+bodyHtml+'</div>'+closeHtml+progressHtml;
    var closeBtn=el.querySelector('.dt-close');
    if(closeBtn){closeBtn.addEventListener('click',function(e){e.stopPropagation();dismiss(el)})}
    if(type!=='loading'&&opts.clickToDismiss!==false){el.addEventListener('click',function(e){if(e.target.closest('.dt-close'))return;dismiss(el)})}
    return{el:el,duration:duration,type:type};
  }
  function show(opts){
    if(!opts||(!opts.message&&!opts.title))return null;
    injectStyles();var c=ensureContainer();
    while(activeToasts.length>=TOAST_MAX){
      var oldest=activeToasts.shift();
      if(oldest&&oldest.el&&oldest.el.parentNode){oldest.el.classList.add('hide');(function(el){setTimeout(function(){if(el.parentNode)el.parentNode.removeChild(el)},320)})(oldest.el)}
      if(oldest&&oldest.timer)clearTimeout(oldest.timer);
    }
    var obj=createToast(opts);c.appendChild(obj.el);activeToasts.push(obj);
    requestAnimationFrame(function(){requestAnimationFrame(function(){obj.el.classList.add('show')})});
    if(obj.duration>0){obj.timer=setTimeout(function(){dismiss(obj.el)},obj.duration)}
    return{el:obj.el,dismiss:function(){dismiss(obj.el)},update:function(newOpts){updateToast(obj.el,newOpts)}};
  }
  function dismiss(el){
    if(!el||!el.parentNode)return;
    var idx=-1;for(var i=0;i<activeToasts.length;i++){if(activeToasts[i].el===el){idx=i;break}}
    if(idx>=0){var obj=activeToasts[idx];if(obj.timer)clearTimeout(obj.timer);activeToasts.splice(idx,1)}
    el.classList.remove('show');el.classList.add('hide');
    setTimeout(function(){if(el.parentNode)el.parentNode.removeChild(el)},320);
  }
  function updateToast(el,opts){
    if(!el||!el.parentNode||!opts)return;
    var type=opts.type||el.dataset.type||'info';el.dataset.type=type;
    var defaultIcons={success:'✅',error:'❌',warning:'⚠️',info:'ℹ️',loading:'⏳'};
    var iconEl=el.querySelector('.dt-icon');
    if(iconEl){iconEl.textContent=(opts.icon!=null&&opts.icon!=='')?opts.icon:defaultIcons[type]}
    var bodyEl=el.querySelector('.dt-body');
    if(bodyEl){
      var titleHtml=opts.title?'<div class="dt-title">'+escapeHtml(opts.title)+'</div>':'';
      var bodyHtml;
      if(opts.title){bodyHtml=titleHtml+(opts.message?'<div class="dt-sub">'+escapeHtml(opts.message)+'</div>':'')}
      else{bodyHtml='<div class="dt-title">'+escapeHtml(opts.message||'')+'</div>'}
      bodyEl.innerHTML=bodyHtml;
    }
    var obj=null;for(var i=0;i<activeToasts.length;i++){if(activeToasts[i].el===el){obj=activeToasts[i];break}}
    if(obj){
      if(obj.timer)clearTimeout(obj.timer);
      var dur=typeof opts.duration==='number'?opts.duration:(type==='error'?TOAST_ERR_MS:TOAST_DEFAULT_MS);
      var prog=el.querySelector('.dt-progress');
      if(prog&&dur>0){prog.style.animationDuration=dur+'ms';prog.style.display='none';void prog.offsetWidth;prog.style.display=''}
      if(dur>0){obj.timer=setTimeout(function(){dismiss(el)},dur)}
    }
  }
  function success(msg,opts){opts=opts||{};opts.type='success';opts.message=msg;return show(opts)}
  function error(msg,opts){opts=opts||{};opts.type='error';opts.message=msg;if(typeof opts.duration!=='number')opts.duration=TOAST_ERR_MS;return show(opts)}
  function warning(msg,opts){opts=opts||{};opts.type='warning';opts.message=msg;return show(opts)}
  function info(msg,opts){opts=opts||{};opts.type='info';opts.message=msg;return show(opts)}
  function loading(msg,opts){opts=opts||{};opts.type='loading';opts.message=msg;opts.duration=TOAST_LOADING_MS;opts.dismissible=opts.dismissible!==false;return show(opts)}
  function dismissAll(){var copy=activeToasts.slice();copy.forEach(function(t){dismiss(t.el)})}
  var LEGACY_ICON_TYPE_MAP={'✅':'success','🟢':'success','🎉':'success','✨':'success','🚀':'success','🏝️':'success','👋':'success','📝':'info','❌':'error','🚫':'error','⛔':'error','⚠️':'warning','🚨':'warning','🔔':'warning','⏳':'loading','☁️':'loading','ℹ️':'info','🛎️':'info','🍸':'info','🏆':'info'};
  function legacy(msg,icon){
    var type=LEGACY_ICON_TYPE_MAP[icon]||'info';
    var opts={type:type,message:msg,icon:icon||null,duration:type==='error'?TOAST_ERR_MS:type==='loading'?TOAST_LOADING_MS:TOAST_DEFAULT_MS};
    return show(opts);
  }
  return{show:show,success:success,error:error,warning:warning,info:info,loading:loading,dismiss:dismiss,dismissAll:dismissAll,update:updateToast,legacy:legacy};
})();

window.UI=window.UI||{};
window.UI.toast=ToastSystem;

var _originalShowToast=window.showToast;
window.showToast=function(msg,icon){
  try{ToastSystem.legacy(msg,icon)}
  catch(e){
    if(_originalShowToast&&_originalShowToast!==window.showToast){try{_originalShowToast(msg,icon)}catch(err){}}
    console.warn('[Toast] error:',e);
  }
};

function injectAlertStyles(){
  if(document.getElementById('delayAlertStyles'))return;
  var s=document.createElement('style');s.id='delayAlertStyles';
  s.textContent=[
    '#delayAlert{position:fixed;top:24px;left:50%;transform:translateX(-50%) translateY(-150%);z-index:9997;max-width:min(92vw,600px);opacity:0;pointer-events:none;transition:transform .5s cubic-bezier(.16,1,.3,1),opacity .3s ease;font-family:"Nunito",sans-serif}',
    '#delayAlert.show{transform:translateX(-50%) translateY(0);opacity:1;pointer-events:auto}',
    '#delayAlert .da-inner{display:flex;align-items:center;gap:16px;padding:14px 20px;background:rgba(20,20,20,.95);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);border:1px solid rgba(239,68,68,.5);border-radius:20px;box-shadow:0 20px 40px rgba(0,0,0,.6),inset 0 1px 0 rgba(255,255,255,.05)}',
    '#delayAlert .da-icon{font-size:28px;flex-shrink:0;animation:daShake 1s ease-in-out infinite;filter:drop-shadow(0 0 12px rgba(239,68,68,.8))}',
    '@keyframes daShake{0%,100%{transform:rotate(-8deg)}50%{transform:rotate(8deg)}}',
    '#delayAlert .da-body{flex:1;min-width:0}',
    '#delayAlert .da-title{color:#FCA5A5;font-size:14px;font-weight:900;letter-spacing:.05em;text-transform:uppercase;line-height:1.2}',
    '#delayAlert .da-sub{color:#94A3B8;font-size:12px;font-weight:600;margin-top:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '#delayAlert .da-sub .area-hl{display:inline-block;background:rgba(239,68,68,.15);color:#FCA5A5;padding:2px 8px;border-radius:6px;font-weight:800;margin:0 4px}',
    '#delayAlert .da-btn{background:linear-gradient(135deg,#EF4444,#B91C1C);color:#fff;font-weight:900;font-size:12px;padding:10px 18px;border:none;border-radius:12px;cursor:pointer;white-space:nowrap;text-transform:uppercase;letter-spacing:.05em;box-shadow:0 4px 12px rgba(239,68,68,.4);transition:transform .15s;font-family:inherit}',
    '#delayAlert .da-btn:hover{transform:translateY(-1px);filter:brightness(1.1)}',
    '#delayAlert .da-btn:active{transform:scale(.95)}',
    '@media(max-width:520px){#delayAlert .da-inner{padding:12px 16px;gap:12px;border-radius:16px}#delayAlert .da-icon{font-size:24px}#delayAlert .da-title{font-size:13px}#delayAlert .da-sub{font-size:11px}#delayAlert .da-btn{padding:8px 12px;font-size:11px}}',
    '@media(prefers-reduced-motion:reduce){#delayAlert .da-icon{animation:none}}'
  ].join('\n');
  document.head.appendChild(s);
}

function ensureAlertEl(){
  var el=document.getElementById('delayAlert');if(el)return el;
  el=document.createElement('div');el.id='delayAlert';
  el.innerHTML='<div class="da-inner"><span class="da-icon">⚠️</span><div class="da-body"><div class="da-title" id="daTitle">CÓ ĐƠN QUÁ 5 PHÚT</div><div class="da-sub" id="daSub"></div></div><button class="da-btn" id="daBtn" type="button">Xem ngay</button></div>';
  document.body.appendChild(el);
  el.querySelector('#daBtn').addEventListener('click',function(e){e.stopPropagation();var areaKey=el.dataset.targetArea;if(areaKey&&window.openApp)window.openApp(areaKey);el.classList.remove('show')});
  el.addEventListener('click',function(e){if(e.target.id==='daBtn')return;var areaKey=el.dataset.targetArea;if(areaKey&&window.openApp)window.openApp(areaKey)});
  return el;
}

var delayedCache={};
function updateDelayAlert(){
  var total=0,breakdown=[],topArea=null,topCount=0;
  AREAS.forEach(function(a){
    var c=delayedCache[a.key]?delayedCache[a.key].count:0;
    total+=c;
    if(c>0){breakdown.push({label:a.label,icon:a.icon,count:c,app:a.app});if(c>topCount){topCount=c;topArea=a.app}}
  });
  var el=ensureAlertEl();if(!el)return;
  if(total===0){el.classList.remove('show');return}
  document.getElementById('daTitle').textContent='⚠️ CÓ '+total+' ĐƠN QUÁ 5 PHÚT!';
  document.getElementById('daSub').innerHTML=breakdown.map(function(b){return'<span class="area-hl">'+b.icon+' '+b.label+' · '+b.count+'</span>'}).join('');
  el.dataset.targetArea=topArea||AREAS[0].app;
  el.classList.add('show');
}

function injectDashboardStyles(){
  if(document.getElementById('mgrDashStyles'))return;
  var s=document.createElement('style');s.id='mgrDashStyles';
  s.textContent=[
    '#mgrDash{display:none;margin:2rem auto 1rem;max-width:min(92vw,900px);background:rgba(20,20,20,.7);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);border:1px solid rgba(255,255,255,.08);border-radius:24px;padding:18px 22px;box-shadow:0 20px 40px rgba(0,0,0,.4),inset 0 1px 0 rgba(255,255,255,.05);font-family:"Nunito",sans-serif}',
    '#mgrDash.show{display:block;animation:mgrIn .6s cubic-bezier(.16,1,.3,1)}',
    '@keyframes mgrIn{from{opacity:0;transform:translateY(-10px)}to{opacity:1;transform:translateY(0)}}',
    '#mgrDash .mgr-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:16px;padding-bottom:12px;border-bottom:1px solid rgba(255,255,255,.08)}',
    '#mgrDash .mgr-title{font-size:13px;font-weight:900;color:var(--gold,#D4AF37);text-transform:uppercase;letter-spacing:.1em;display:flex;align-items:center;gap:8px}',
    '#mgrDash .mgr-time{font-size:12px;font-weight:700;color:#94A3B8;font-variant-numeric:tabular-nums}',
    '#mgrDash .mgr-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}',
    '@media(min-width:640px){#mgrDash .mgr-grid{grid-template-columns:repeat(5,1fr)}}',
    '#mgrDash .mgr-item{position:relative;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.06);border-radius:16px;padding:12px 10px;text-align:center;cursor:pointer;transition:all .3s cubic-bezier(.16,1,.3,1)}',
    '#mgrDash .mgr-item:hover{background:rgba(255,255,255,.06);border-color:rgba(255,255,255,.15);transform:translateY(-2px);box-shadow:0 8px 20px rgba(0,0,0,.3)}',
    '#mgrDash .mgr-item.no-click{cursor:default}',
    '#mgrDash .mgr-item.no-click:hover{transform:none;background:rgba(255,255,255,.03);box-shadow:none;border-color:rgba(255,255,255,.06)}',
    '#mgrDash .mgr-label{font-size:10px;font-weight:800;color:#94A3B8;text-transform:uppercase;letter-spacing:.05em;margin-bottom:6px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '#mgrDash .mgr-value{font-family:"Fraunces",serif;font-size:24px;font-weight:900;line-height:1;color:#F4F4F5;font-variant-numeric:tabular-nums}',
    '#mgrDash .mgr-value.danger{color:#EF4444;text-shadow:0 0 12px rgba(239,68,68,.4)}',
    '#mgrDash .mgr-value.ok{color:#10B981}',
    '#mgrDash .mgr-sub{font-size:10px;font-weight:700;color:#94A3B8;margin-top:4px}',
    '@media(max-width:520px){#mgrDash{padding:16px 14px;margin-top:1.5rem;border-radius:20px}#mgrDash .mgr-title{font-size:12px}#mgrDash .mgr-value{font-size:20px}#mgrDash .mgr-item{padding:10px 8px;border-radius:12px}}'
  ].join('\n');
  document.head.appendChild(s);
}

function ensureDashEl(){
  var el=document.getElementById('mgrDash');if(el)return el;
  el=document.createElement('div');el.id='mgrDash';
  el.innerHTML='<div class="mgr-head"><div class="mgr-title">📊 TỔNG QUAN HÔM NAY</div><div class="mgr-time" id="mgrTime">--:--</div></div><div class="mgr-grid" id="mgrGrid"></div>';
  var areaGrid=document.querySelector('.area-grid');
  if(areaGrid&&areaGrid.parentNode){if(areaGrid.nextSibling){areaGrid.parentNode.insertBefore(el,areaGrid.nextSibling)}else{areaGrid.parentNode.appendChild(el)}}
  else{var container=document.querySelector('#landing > div > div');if(container)container.appendChild(el);else document.body.appendChild(el)}
  return el;
}

var dashStats={lounge:{total:0,pending:0,preparing:0,done:0,delayed:0},bungalow:{total:0,pending:0,preparing:0,done:0,delayed:0},restaurant:{total:0,pending:0,preparing:0,done:0,delayed:0},staffOnline:0};

function renderDashboard(){
  var el=document.getElementById('mgrDash');if(!el||!el.classList.contains('show'))return;
  var t=new Date();var timeEl=document.getElementById('mgrTime');
  if(timeEl)timeEl.textContent=String(t.getHours()).padStart(2,'0')+':'+String(t.getMinutes()).padStart(2,'0');
  var totalAll=0,pendingAll=0,delayedAll=0;
  AREAS.forEach(function(a){var s=dashStats[a.key];if(!s)return;totalAll+=s.total;pendingAll+=s.pending;delayedAll+=s.delayed});
  document.getElementById('mgrGrid').innerHTML=
    '<div class="mgr-item no-click"><div class="mgr-label">📦 Tổng đơn</div><div class="mgr-value">'+totalAll+'</div><div class="mgr-sub">'+pendingAll+' chờ xử lý</div></div>'+
    '<div class="mgr-item" onclick="openApp(\'lounge\')"><div class="mgr-label">🍸 Lounge</div><div class="mgr-value">'+dashStats.lounge.total+'</div><div class="mgr-sub">'+dashStats.lounge.pending+' chờ</div></div>'+
    '<div class="mgr-item" onclick="openApp(\'bungalow\')"><div class="mgr-label">🌴 Bungalow</div><div class="mgr-value">'+dashStats.bungalow.total+'</div><div class="mgr-sub">'+dashStats.bungalow.pending+' chờ</div></div>'+
    '<div class="mgr-item" onclick="openApp(\'restaurant\')"><div class="mgr-label">🍽️ Restaurant</div><div class="mgr-value">'+dashStats.restaurant.total+'</div><div class="mgr-sub">'+dashStats.restaurant.pending+' chờ</div></div>'+
    '<div class="mgr-item no-click"><div class="mgr-label">⚠️ Trễ / 🟢 Online</div><div class="mgr-value '+(delayedAll>0?'danger':'ok')+'">'+delayedAll+' <span style="font-size:14px;opacity:.5;">/</span> '+dashStats.staffOnline+'</div><div class="mgr-sub">quá 5 phút · nhân viên</div></div>';
}

var EMPTY_EMOJI={lounge:['🍸','🥂','✨'],bungalow:['🌴','🥥','🏝️'],restaurant:['🍽️','🥂','✨'],ranking:['🏆','👑','⭐'],caro:['🎮','🎯','✨'],show:['🎭','🌟','✨'],manager:['📊','📈','✨'],default:['🌊','✨','💫']};

function injectEmptyStates(){
  var area=detectArea();var icons=EMPTY_EMOJI[area]||EMPTY_EMOJI.default;
  var s=document.createElement('style');s.id='emptyStatesStyles';
  s.textContent=[
    '.empty-state{padding:64px 24px!important;text-align:center;position:relative}',
    '.empty-state::before{content:"'+icons[0]+'";display:block;font-size:72px;line-height:1;margin-bottom:20px;opacity:.9;filter:drop-shadow(0 0 30px var(--gold-glow,rgba(212,175,55,.35)));animation:esFloat 3.5s ease-in-out infinite;transform-origin:center}',
    '.empty-state::after{content:"'+icons[1]+'   '+icons[2]+'";display:block;font-size:24px;line-height:1;margin-top:16px;opacity:.4;letter-spacing:.6em;filter:drop-shadow(0 0 12px var(--gold-glow,rgba(212,175,55,.25)));animation:esSparkle 2.5s ease-in-out infinite;animation-delay:-1.2s}',
    '@keyframes esFloat{0%,100%{transform:translateY(0) rotate(-3deg) scale(1)}50%{transform:translateY(-12px) rotate(3deg) scale(1.05)}}',
    '@keyframes esSparkle{0%,100%{opacity:.2;transform:scale(1)}50%{opacity:.7;transform:scale(1.1)}}',
    'table .empty-state::before,table .empty-state::after{display:none}',
    '.empty-state h4{font-size:16px!important;font-weight:900!important;color:var(--gold,#D4AF37)!important;letter-spacing:.05em;margin-bottom:8px!important}',
    '.empty-state p{font-size:13px!important;font-weight:600!important;color:#94A3B8!important;opacity:.9!important;line-height:1.6!important;max-width:320px;margin:0 auto}',
    '@media(prefers-reduced-motion:reduce){.empty-state::before,.empty-state::after{animation:none!important}}',
    '@media(max-width:520px){.empty-state::before{font-size:56px;margin-bottom:16px}.empty-state::after{font-size:18px}.empty-state h4{font-size:15px!important}.empty-state p{font-size:12px!important}}'
  ].join('\n');
  document.head.appendChild(s);
}

function initFirebase(){
  Promise.all([
    import("https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js"),
    import("https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js"),
    import("https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js")
  ]).then(function(mods){
    var fbApp=mods[0],fbAuth=mods[1],fbStore=mods[2];
    var app;
    try{app=fbApp.getApp('dolphin-ui')}
    catch(e){app=fbApp.initializeApp(FIREBASE_CONFIG,'dolphin-ui')}
    var auth=fbAuth.getAuth(app),db=fbStore.getFirestore(app);
    function onReady(){
      if(hasLanding()&&!isIframe()){
        listenOrders(fbStore,db);
        if(isManager())listenStaff(fbStore,db);
      }
    }
    if(auth.currentUser)onReady();
    else fbAuth.signInAnonymously(auth).then(onReady).catch(function(err){console.warn('[DolphinUI] auth error:',err)});
  }).catch(function(err){console.warn('[DolphinUI] Firebase init fail:',err)});
}

function listenOrders(fbStore,db){
  AREAS.forEach(function(a){
    fbStore.onSnapshot(fbStore.collection(db,a.col),function(snap){
      var now=Date.now(),total=0,pending=0,preparing=0,done=0,delayed=0;
      snap.forEach(function(doc){
        var o=doc.data()||{};total++;
        if(o.status==='pending'){pending++;if(o.timestamp&&(now-o.timestamp)>DELAY_MS)delayed++}
        else if(o.status==='preparing')preparing++;
        else if(o.status==='completed')done++;
      });
      delayedCache[a.key]={count:delayed};
      dashStats[a.key]={total:total,pending:pending,preparing:preparing,done:done,delayed:delayed};
      updateDelayAlert();
      var d=document.getElementById('mgrDash');
      if(d&&d.classList.contains('show'))renderDashboard();
    },function(err){console.warn('[DolphinUI] listen error',a.col,err)});
  });
  setInterval(updateDelayAlert,ALERT_POLL_MS);
}

function listenStaff(fbStore,db){
  fbStore.onSnapshot(fbStore.collection(db,'staff_online'),function(snap){
    var now=Date.now(),count=0;
    snap.forEach(function(doc){var d=doc.data()||{};if(d.lastSeen&&(now-d.lastSeen)<90000)count++});
    dashStats.staffOnline=count;
    var el=document.getElementById('mgrDash');
    if(el&&el.classList.contains('show'))renderDashboard();
  },function(err){console.warn('[DolphinUI] staff listen error:',err)});
}

function hideManagerWidgets(){
  if(!isManager())return;
  if(!document.getElementById('mgrHideWidgetsStyle')){
    var s=document.createElement('style');s.id='mgrHideWidgetsStyle';
    s.textContent=[
      '#sound-widget,#soundWidget,.sound-widget,#dolphin-sound-widget,#dolphinSoundWidget,',
      '[data-dolphin="sound-widget"],[data-dolphin="sound"],[class*="soundscape-widget"],[class*="sound-widget"],',
      '#notif-toggle,#notifToggle,.notif-toggle,#notification-toggle,#notificationToggle,',
      '.notification-toggle,[data-dolphin="notification"],[class*="notif-toggle"],[id*="notif-toggle"],',
      '#music-btn,#musicBtn,.music-play-btn,#play-music,#playMusicBtn,[data-dolphin="music"],',
      '[class*="music-play"],[id*="music-play"],[id*="musicBtn"],[class*="musicBtn"]{display:none!important;visibility:hidden!important;pointer-events:none!important;opacity:0!important}',
      'button[onclick*="sound"],button[onclick*="Sound"],button[onclick*="music"],button[onclick*="Music"],button[onclick*="notif"],button[onclick*="Notif"]{display:none!important}'
    ].join(' ');
    document.head.appendChild(s);
  }
  var selectors=['#sound-widget','#soundWidget','.sound-widget','#dolphin-sound-widget','#dolphinSoundWidget','#notif-toggle','#notifToggle','#notification-toggle','.notif-toggle','.notification-toggle','#music-btn','#musicBtn','#play-music','#playMusicBtn','.music-play-btn'];
  function hideAll(){
    selectors.forEach(function(sel){try{document.querySelectorAll(sel).forEach(function(el){el.style.setProperty('display','none','important');el.style.setProperty('visibility','hidden','important');el.setAttribute('aria-hidden','true')})}catch(e){}});
    try{
      document.querySelectorAll('button,div[role="button"]').forEach(function(el){
        var txt=(el.textContent||'').trim();
        var hasEmoji=/[🔕🔔🔊🎵🎶🎧]/.test(txt);
        if(hasEmoji&&txt.length<10)el.style.setProperty('display','none','important');
      });
    }catch(e){}
  }
  hideAll();
  [500,1500,3000,6000].forEach(function(t){setTimeout(hideAll,t)});
  try{
    var obs=new MutationObserver(function(muts){var needs=false;muts.forEach(function(m){if(m.addedNodes&&m.addedNodes.length)needs=true});if(needs)hideAll()});
    obs.observe(document.body,{childList:true,subtree:true});
    setTimeout(function(){obs.disconnect()},15000);
  }catch(e){}
}

function init(){
  if(hasLanding()&&!isIframe()){
    if(isManager())hideManagerWidgets();
    injectAlertStyles();
    injectDashboardStyles();
    ensureAlertEl();
    if(isManager()){
      var d=ensureDashEl();d.classList.add('show');
      setInterval(function(){var el=document.getElementById('mgrDash');if(el&&el.classList.contains('show'))renderDashboard()},DASH_POLL_MS);
    }
    initFirebase();
  }else{
    injectEmptyStates();
  }
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);
else init();

console.log('%c🎨 DOLPHIN UI v8.0 (Theme-aware) LOADED','background:linear-gradient(90deg,#D4AF37,#B8860B);color:#050505;font-size:11px;padding:3px 8px;border-radius:4px;font-weight:900');
})();
