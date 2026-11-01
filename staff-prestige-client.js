/* Dolphin Staff Prestige: public champion card, private progress and profile perks. */
(function(){
'use strict';
let api=null,me=null,publicBoard=null,refreshing=false;
const profileUrl=new URL('dolphin-profile.html',document.currentScript?.src||location.href).href;
const escape=s=>String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','"':'&quot;',"'":'&#39;'}[c]));
async function connect(){
 if(api)return api;
 const [fb,au,fn]=await Promise.all([
  import('https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js'),
  import('https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js'),
  import('https://www.gstatic.com/firebasejs/10.12.2/firebase-functions.js')]);
 const cfg={apiKey:'AIzaSyAtBNp9WBnyIkCiVjXfUpjH2d7-9dbg-JQ',authDomain:'dolphin-f6d67.firebaseapp.com',projectId:'dolphin-f6d67'};
 let app;try{app=fb.getApp('staff-prestige-ui');}catch(e){app=fb.initializeApp(cfg,'staff-prestige-ui');}
 const auth=au.getAuth(app);if(!auth.currentUser)await au.signInAnonymously(auth);
 const functions=fn.getFunctions(app,'asia-southeast1');api=(name,payload)=>fn.httpsCallable(functions,name)(payload||{}).then(r=>r.data);return api;
}
function injectStyle(){
 if(document.getElementById('prestige-style'))return;
 const style=document.createElement('style');style.id='prestige-style';
 style.textContent=`
.dolphin-prestige{position:fixed;right:12px;bottom:calc(76px + env(safe-area-inset-bottom));z-index:95;border:1px solid #ffd78099;background:linear-gradient(135deg,#112d2c,#081a21);border-radius:15px;box-shadow:0 6px 22px #0008;color:#fff;max-width:230px;padding:9px 12px;font:700 12px/1.5 system-ui;cursor:pointer}
.dolphin-prestige small{display:block;color:#ffd780;font-size:10px}.dolphin-prestige .prestige-champion{color:#ffe3a2;font-weight:900}
.dolphin-prestige .prestige-stats{color:#b9d9d0;font-size:11px}
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
 node.innerHTML='<small>👑 DOLPHIN EMPEROR</small><span class="prestige-champion onflame">'+escape(ch.name)+'</span><span class="prestige-stats"> · Lv. '+Number(ch.level||1)+' · '+Number(ch.xp||0).toLocaleString('vi-VN')+' XP</span>';
}
async function refresh(){
 if(refreshing||document.hidden)return;refreshing=true;
 try{
  const call=await connect();publicBoard=await call('staffGetPrestige');
  updateBanner();window.dispatchEvent(new CustomEvent('dolphin-prestige-updated',{detail:publicBoard}));
  if(window.DolphinStaffId?.get()?.employeeId){
   me=await call('staffGetMyProgress');
   if(me.personalTheme&&localStorage.getItem('dolphin_personal_theme')!==me.personalTheme){
    localStorage.setItem('dolphin_personal_theme',me.personalTheme);
    window.ThemeSystem?.setTheme(me.personalTheme);
   }
   window.dispatchEvent(new CustomEvent('dolphin-my-progress-updated',{detail:me}));
  }
 }catch(e){console.warn('[Prestige] chưa lấy được dữ liệu',e.message);}
 finally{refreshing=false;}
}
window.DolphinPrestige={refresh,getBoard:()=>publicBoard,getMine:()=>me,call:async(name,data)=>(await connect())(name,data)};
function start(){refresh();setInterval(refresh,120000);window.addEventListener('dolphin-staff-id-changed',refresh);}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
