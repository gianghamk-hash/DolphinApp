/* Dolphin Staff Prestige: public champion card, private progress and profile perks. */
(function(){
'use strict';
let api=null,me=null,publicBoard=null,refreshing=false,signalUnsubscribe=null;
const statuses={};
function status(scope,state,message=''){
 statuses[scope]={scope,state,message};
 window.dispatchEvent(new CustomEvent('dolphin-prestige-status',{detail:statuses[scope]}));
}
function bounded(task){
 let timer;
 return Promise.race([task,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Hết thời gian kết nối. Vui lòng thử lại.')),15000);})]).finally(()=>clearTimeout(timer));
}
function failed(scope,error){
 console.warn('[Prestige] chưa lấy được dữ liệu',error.message);
 status(scope,'error','Chưa tải được dữ liệu từ máy chủ. Vui lòng thử lại sau.');
}
const profileUrl=new URL('dolphin-profile.html',document.currentScript?.src||location.href).href;
const escape=s=>String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','"':'&quot;',"'":'&#39;'}[c]));
async function connect(){
 if(api)return api;
 // Share Staff ID auth state, never independently mint a second anonymous UID.
 if(window.DolphinStaffId?.ready)await window.DolphinStaffId.ready();
 const [fb,au,fn]=await Promise.all([
  import('https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js'),
  import('https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js'),
  import('https://www.gstatic.com/firebasejs/10.12.2/firebase-functions.js')]);
 const cfg={apiKey:'AIzaSyAtBNp9WBnyIkCiVjXfUpjH2d7-9dbg-JQ',authDomain:'dolphin-f6d67.firebaseapp.com',projectId:'dolphin-f6d67'};
 let app;try{app=fb.getApp('staff-identity-app');}catch(e){app=fb.initializeApp(cfg,'staff-identity-app');}
 const auth=au.getAuth(app);if(auth.authStateReady)await auth.authStateReady();
 if(!auth.currentUser)await au.signInAnonymously(auth);
 const functions=fn.getFunctions(app,'asia-southeast1');api=(name,payload)=>fn.httpsCallable(functions,name)(payload||{}).then(r=>r.data);return api;
}
function injectStyle(){
 if(document.getElementById('prestige-style'))return;
 const style=document.createElement('style');style.id='prestige-style';
 style.textContent=`
.dolphin-prestige{position:fixed;right:12px;bottom:calc(76px + env(safe-area-inset-bottom));z-index:95;border:1px solid #ffd78099;background:linear-gradient(135deg,#112d2c,#081a21);border-radius:15px;box-shadow:0 6px 22px #0008;color:#fff;max-width:230px;padding:9px 12px;font:700 12px/1.5 system-ui;cursor:pointer}
.dolphin-prestige small{display:block;color:#ffd780;font-size:10px}.dolphin-prestige .prestige-champion{color:#ffe3a2;font-weight:900}
.dolphin-prestige .prestige-stats{color:#b9d9d0;font-size:11px}
.dolphin-prestige .prestige-avatar{display:inline-flex;width:26px;height:26px;align-items:center;justify-content:center;margin-right:7px;border:2px solid #ffd780;border-radius:50%;box-shadow:0 0 9px #e7a63388}
.onflame{color:#ffd36b!important;text-shadow:0 0 5px #fabe44,0 0 12px #ff9f1c,0 0 22px #ee5b19;animation:onflame 2.4s ease-in-out infinite alternate}
.onflame.advanced{animation-duration:1.5s}
@keyframes onflame{from{text-shadow:0 0 5px #ffd36b,0 0 10px #ffa51f}to{text-shadow:0 0 9px #fff2aa,0 0 18px #ff9f1c,0 0 25px #e85017}}
@media(prefers-reduced-motion:reduce){.onflame{animation:none}}
`;document.head.appendChild(style);
}
function banner(){
 if(document.querySelector('.dolphin-prestige'))return;
 const node=document.createElement('button');node.className='dolphin-prestige';node.type='button';node.title='Xem Đại sảnh danh vọng';
 node.onclick=()=>{location.assign(profileUrl+'#hall-of-fame');};
 document.body.appendChild(node);
}
function updateBanner(){
 const ch=publicBoard?.champion;
 if(!ch)return;
 injectStyle();banner();
 const node=document.querySelector('.dolphin-prestige');
 node.innerHTML='<small>👑 DOLPHIN EMPEROR · 🐬✨</small><span class="prestige-avatar">'+escape(ch.avatar||'🐬')+'</span><span class="prestige-champion onflame">'+escape(ch.name)+'</span><span class="prestige-stats"> · Lv. '+Number(ch.level||1)+' · '+Number(ch.xp||0).toLocaleString('vi-VN')+' XP</span>';
}
function notifyChampion(){
 const a=publicBoard?.announcement;
 if(!a?.id||Date.now()-Number(a.at||0)>24*3600000)return;
 const key='dolphin-prestige-announcement';
 try{if(localStorage.getItem(key)===a.id)return;localStorage.setItem(key,a.id);}catch(e){}
 const node=document.createElement('div');
 node.style.cssText='position:fixed;top:18px;left:50%;transform:translateX(-50%);z-index:10000;background:#132e2d;color:#ffe1a1;border:1px solid #ffd780;border-radius:12px;padding:14px 18px;max-width:92vw;text-align:center;font:700 14px system-ui;box-shadow:0 8px 30px #000a';
 node.textContent=a.text||'Dolphin Emperor mới';document.body.appendChild(node);
 setTimeout(()=>node.remove(),6500);
}
async function refresh(){
 if(refreshing||document.hidden)return;refreshing=true;
 status('board','loading');status('mine','loading');
 try{
  const call=await bounded(connect());
  await Promise.all([
   (async()=>{try{
    publicBoard=await bounded(call('staffGetPrestige'));
    updateBanner();notifyChampion();window.dispatchEvent(new CustomEvent('dolphin-prestige-updated',{detail:publicBoard}));
    status('board','ready');
   }catch(e){failed('board',e);}})(),
   (async()=>{try{
   if(!window.DolphinStaffId?.get()?.employeeId){
    me=null;window.dispatchEvent(new CustomEvent('dolphin-my-progress-updated',{detail:null}));
    status('mine','unlinked','Đăng ký hoặc liên kết hồ sơ nhân viên để xem XP.');return;
   }
   me=await bounded(call('staffGetMyProgress'));
   if(me.personalTheme&&localStorage.getItem('dolphin_personal_theme')!==me.personalTheme){
    localStorage.setItem('dolphin_personal_theme',me.personalTheme);
    window.ThemeSystem?.setTheme(me.personalTheme);
   }
   window.dispatchEvent(new CustomEvent('dolphin-my-progress-updated',{detail:me}));
   status('mine','ready');
   }catch(e){failed('mine',e);}})()
  ]);
 }catch(e){failed('board',e);failed('mine',e);}
 finally{refreshing=false;}
}
window.DolphinPrestige={refresh,getBoard:()=>publicBoard,getMine:()=>me,getStatus:()=>statuses,call:async(name,data)=>(await connect())(name,data)};
async function subscribeProfileSignal(){
 if(!/dolphin-profile\.html$/.test(location.pathname))return;
 try{
  await connect();
  const [fb,fs]=await Promise.all([
   import('https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js'),
   import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js')]);
  const app=fb.getApp('staff-identity-app');
  let last=null;
  signalUnsubscribe=fs.onSnapshot(fs.doc(fs.getFirestore(app),'staff_xp_updates','public'),snap=>{
   const next=Number(snap.data()?.updatedAt||0);
   if(last===null){last=next;return;}
   if(next&&next!==last){last=next;refresh();}
  },e=>console.warn('[Prestige] Live signal unavailable; periodic refresh remains active.',e.code||e.message));
 }catch(e){console.warn('[Prestige] Live subscription unavailable:',e.message);}
}

async function recoverMyXP(manual=false){
 const btn=document.getElementById('staff-xp-reconcile'),label=document.getElementById('staff-xp-status');
 if(!window.DolphinStaffId?.get?.()?.employeeId)return;
 if(btn?.disabled)return;
 if(btn){btn.disabled=true;btn.textContent='Đang kiểm tra XP…';}
 if(label&&manual)label.textContent='Đang đối chiếu bàn và đơn hoàn thành hôm nay…';
 try{
  const result=await window.DolphinStaffId.recoverTodayXP();
  if(label)label.textContent=result.addedXP>0
    ?'Đã cộng thêm '+result.addedXP.toLocaleString('vi-VN')+' XP từ '+result.awards+' hoạt động.'
    :result.unmatched>0?'Có '+result.unmatched+' hoạt động chưa đối chiếu được nhân viên. Kiểm tra tên hoặc Staff ID trên bàn/đơn.'
    :result.checked===0?'Chưa tìm thấy bàn/đơn hoàn thành hôm nay ghi theo tên hồ sơ này.':'XP hôm nay đã được ghi nhận hoặc chưa đủ điều kiện.';
  if(result.addedXP>0)await refresh();
 }catch(e){
  if(label)label.textContent=e?.code==='functions/resource-exhausted'?'Vừa kiểm tra XP. Thử lại sau 2 phút.':'Không đối chiếu được XP: '+String(e?.message||e?.code||'Lỗi kết nối').slice(0,110);
  console.warn('[Prestige] Recovery check failed:',e?.code||e?.message||e);
 }finally{if(btn){btn.disabled=false;btn.textContent='Kiểm tra XP hôm nay ↻';}}
}
let recoveredZeroToday=false;

function start(){
 injectStyle();refresh();subscribeProfileSignal();
 document.getElementById('staff-xp-reconcile')?.addEventListener('click',()=>recoverMyXP(true));
 window.addEventListener('dolphin-my-progress-updated',e=>{
  if(recoveredZeroToday||Number(e.detail?.xp)!==0||!e.detail?.employeeId)return;
  const key='dolphin-xp-zero-reconcile-'+e.detail.employeeId+'-'+new Date().toLocaleDateString('en-CA');
  const last=Number(localStorage.getItem(key)||0);
  if(last&&Date.now()-last<4*3600000)return;
  recoveredZeroToday=true;
  try{localStorage.setItem(key,String(Date.now()));}catch(_){}
  void recoverMyXP(false);
 });
 // A realtime notification updates visible profiles; two-minute polling is the fallback.
 setInterval(refresh,120000);
 window.addEventListener('dolphin-staff-id-changed',refresh);
 window.addEventListener('focus',refresh);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh();});
 window.addEventListener('pagehide',()=>{signalUnsubscribe?.();signalUnsubscribe=null;});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
