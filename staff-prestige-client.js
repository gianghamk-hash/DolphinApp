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
.onflame{color:#ffd36b!important;text-shadow:0 0 5px #fabe44,0 0 12px #ff9f1c,0 0 22px #ee5b19;animation:onflame 2.4s ease-in-out infinite alternate}
.onflame.advanced{animation-duration:1.5s}
@keyframes onflame{from{text-shadow:0 0 5px #ffd36b,0 0 10px #ffa51f}to{text-shadow:0 0 9px #fff2aa,0 0 18px #ff9f1c,0 0 25px #e85017}}
@media(prefers-reduced-motion:reduce){.onflame{animation:none}}
`;document.head.appendChild(style);
}
async function refresh(){
 if(refreshing||document.hidden)return;refreshing=true;
 status('board','loading');status('mine','loading');
 try{
  const call=await bounded(connect());
  await Promise.all([
   (async()=>{try{
    publicBoard=await bounded(call('staffGetPrestige'));
    window.dispatchEvent(new CustomEvent('dolphin-prestige-updated',{detail:publicBoard}));
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
 if(!/dolphin-profile\.html$|\/ranking\/(?:index\.html)?$/.test(location.pathname))return;
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

async function refreshMyXP(){
 const btn=document.getElementById('staff-xp-reconcile'),label=document.getElementById('staff-xp-status');
 if(btn?.disabled)return;
 if(btn){btn.disabled=true;btn.textContent='Đang làm mới XP…';}
 if(label)label.textContent='Đang tải XP đã được máy chủ xác nhận…';
 try{
  await refresh();
  const state=statuses.mine;
  if(label)label.textContent=state?.state==='ready'
   ?'Đã cập nhật XP từ hồ sơ đã xác minh. XP chỉ phát sinh qua thao tác nghiệp vụ trên máy chủ.'
   :'Chưa tải được XP. Vui lòng kiểm tra kết nối và Staff ID.';
 }finally{if(btn){btn.disabled=false;btn.textContent='Làm mới XP ↻';}}
}
function start(){
 injectStyle();refresh();subscribeProfileSignal();
 document.getElementById('staff-xp-reconcile')?.addEventListener('click',()=>void refreshMyXP());
 // A realtime notification updates visible profiles; two-minute polling is the fallback.
 setInterval(refresh,120000);
 window.addEventListener('dolphin-staff-id-changed',refresh);
 window.addEventListener('focus',refresh);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh();});
 window.addEventListener('pagehide',()=>{signalUnsubscribe?.();signalUnsubscribe=null;});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
