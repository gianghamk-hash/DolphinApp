/* Dolphin Display Modes — only Dark, Light and Gray. */
(function(){
'use strict';
const KEY='dolphin_theme';
const THEMES={
 dark:{name:'Dark Mode',accent:'#FBD77A',accent2:'#9de4d7',bg1:'#133b38',bg2:'#081c1b',surface:'#123b37',text:'#f7faf9',muted:'#a9d4ca',border:'rgba(244,184,66,.48)',borderSoft:'rgba(146,216,202,.2)',glow:'rgba(244,184,66,.2)'},
 light:{name:'Light Mode',accent:'#006f74',accent2:'#006f74',bg1:'#f3f9f8',bg2:'#eff6f4',surface:'#ffffff',text:'#103b3c',muted:'#446966',border:'rgba(0,111,116,.4)',borderSoft:'rgba(0,100,104,.18)',glow:'rgba(0,119,118,.14)'},
 gray:{name:'Gray Mode',accent:'#d1d5db',accent2:'#d1d5db',bg1:'#3a3e43',bg2:'#23272b',surface:'#343a40',text:'#f0f1f3',muted:'#b6c0c8',border:'rgba(180,189,198,.46)',borderSoft:'rgba(173,184,193,.24)',glow:'rgba(170,179,189,.12)'}
};
let current='dark',unsubscribe=null,preview=false;
function normalize(key){return Object.prototype.hasOwnProperty.call(THEMES,key)?key:'dark';}
function render(key,broadcast){
 key=normalize(key);
 const t=THEMES[key];current=key;
 const root=document.documentElement;
 for(const [prop,value] of Object.entries({
 '--theme-border':t.border,'--theme-border-soft':t.borderSoft,'--theme-glow':t.glow,
 '--theme-accent':t.accent,'--theme-accent2':t.accent2,'--theme-bg1':t.bg1,'--theme-bg2':t.bg2,
 '--theme-radius':'18px','--theme-aurora1':'transparent','--theme-aurora2':'transparent','--theme-aurora3':'transparent',
 '--mode-text':t.text,'--mode-muted':t.muted,'--mode-surface':t.surface
 }))root.style.setProperty(prop,value);
 root.style.backgroundColor=t.bg2;
 document.body.dataset.theme=key;
 document.documentElement.style.colorScheme=key==='light'?'light':'dark';
 const obsolete=document.getElementById('themeBigIcon');if(obsolete)obsolete.remove();
 const oldBadge=document.getElementById('themeBadge');if(oldBadge)oldBadge.remove();
 try{localStorage.setItem(KEY,key);}catch(e){}
 if(broadcast)try{(window.__dolphinThemeBC||(window.__dolphinThemeBC=new BroadcastChannel('dolphin-theme'))).postMessage({type:'theme',key});}catch(e){}
 try{window.dispatchEvent(new CustomEvent('dolphin-theme-changed',{detail:{key}}));}catch(e){}
}
function inject(){
 if(document.getElementById('dolphin-display-modes'))return;
 const style=document.createElement('style');style.id='dolphin-display-modes';
 style.textContent=`
body[data-theme]{background:var(--theme-bg2)!important;color:var(--mode-text)!important;transition:background-color .25s,color .25s}
body[data-theme]::before{background:linear-gradient(145deg,var(--theme-bg1),var(--theme-bg2))!important;animation:none!important}
body[data-theme] :is(.glass-card,.glass,.menu-card,.order-card,.order-slot,.stat-card,.outlet-card,.week-bar,.settings-panel,.modal-content,.app-header){border-color:var(--theme-border-soft)!important}
body[data-theme] :is(.glass-card,.glass,.menu-card,.order-card,.stat-card,.outlet-card,.settings-panel){background:var(--mode-surface)!important;color:var(--mode-text)!important}
body[data-theme] :is(.week-bar,.tab-btn){border-color:var(--theme-border-soft)!important}
body[data-theme] .tab-btn.active{background:var(--theme-accent)!important;color:var(--theme-bg2)!important}
body[data-theme] :is(.brand-title,.week-bar .value,.val.gold){color:var(--theme-accent)!important}
body[data-theme="light"] :is(.glass,.glass-card,.menu-card,.order-card,.order-slot,.stat-card,.outlet-card,.week-bar,.row,.settings-panel,.modal-content,.app-header,.tab-btn){background:#fff!important;color:#103b3c!important;border-color:rgba(0,100,104,.2)!important}
body[data-theme="light"] :is(.name,.val,.sub-count,.week-bar .label,.week-bar .stat,.text-white,.text-teal-300,.text-teal-400,.text-gold-400){color:#104f50!important;text-shadow:none!important}
body[data-theme="light"] .tab-btn.active{background:#006f74!important;color:#fff!important}
body[data-theme="light"] .row.r1{background:#e4f5ef!important}
body[data-theme="light"] :is(input,textarea,select){color:#103b3c!important}
body[data-theme="gray"] :is(.glass,.glass-card,.menu-card,.order-card,.order-slot,.stat-card,.outlet-card,.row,.week-bar,.settings-panel){background:#343a40!important;color:#f0f1f3!important}
body[data-theme="gray"] .tab-btn.active{background:#aebac2!important;color:#182025!important}
body[data-theme="gray"] .val{color:#d5e5df!important}
body[data-theme] #themeBigIcon,body[data-theme] #themeBadge{display:none!important}
@media(prefers-reduced-motion:reduce){body[data-theme],body[data-theme] *{transition-duration:0ms!important}}
`;
 document.head.appendChild(style);
}
function initFirebase(){
 if(preview)return;
 Promise.all([
 import('https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js'),
 import('https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js'),
 import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js')
 ]).then(async ([fb,authMod,store])=>{
  const cfg={apiKey:'AIzaSyAtBNp9WBnyIkCiVjXfUpjH2d7-9dbg-JQ',authDomain:'dolphin-f6d67.firebaseapp.com',projectId:'dolphin-f6d67'};
  let app;try{app=fb.getApp('display-modes');}catch(e){app=fb.initializeApp(cfg,'display-modes');}
  const auth=authMod.getAuth(app);
  if(!auth.currentUser)await authMod.signInAnonymously(auth);
  const db=store.getFirestore(app);
  unsubscribe=store.onSnapshot(store.doc(db,'master_config','theme'),snap=>{
   const v=snap.exists()?(snap.data().themeKey||snap.data().theme):'dark';
   render(normalize(v),false);
  },err=>console.warn('[DisplayMode] Firestore unavailable; using saved mode',err));
 }).catch(err=>console.warn('[DisplayMode] Firebase unavailable; using saved mode',err));
}
function init(){
 inject();
 const params=new URLSearchParams(location.search);
 preview=THEMES[params.get('theme')]!==undefined;
 let stored;try{stored=localStorage.getItem(KEY);}catch(e){}
 render(preview?params.get('theme'):normalize(stored),false);
 window.addEventListener('storage',e=>{if(e.key===KEY&&!preview)render(normalize(e.newValue),false);});
 try{const bc=window.__dolphinThemeBC||(window.__dolphinThemeBC=new BroadcastChannel('dolphin-theme'));bc.addEventListener('message',e=>{if(!preview&&e.data&&e.data.type==='theme')render(normalize(e.data.key),false);});}catch(e){}
 initFirebase();
}
window.ThemeSystem={version:'8.0',setTheme:key=>render(normalize(key),true),getCurrent:()=>current,listThemes:()=>Object.keys(THEMES),detect:()=> 'dark',getThemes:()=>THEMES};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();