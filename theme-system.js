/* Dolphin Display Modes — only Dark, Light and Gray. */
(function(){
'use strict';
const KEY='dolphin_theme';
const THEMES={
 dark:{name:'Dark Mode',accent:'#FBD77A',accent2:'#9de4d7',bg1:'#050505',bg2:'#000000',surface:'#090909',text:'#f7faf9',muted:'#a9d4ca',border:'rgba(244,184,66,.48)',borderSoft:'rgba(146,216,202,.2)',glow:'rgba(244,184,66,.2)'},
 light:{name:'Light Mode',accent:'#006f74',accent2:'#006f74',bg1:'#f3f9f8',bg2:'#eff6f4',surface:'#ffffff',text:'#103b3c',muted:'#446966',border:'rgba(0,111,116,.4)',borderSoft:'rgba(0,100,104,.18)',glow:'rgba(0,119,118,.14)'},
 gray:{name:'Gray Mode',accent:'#d1d5db',accent2:'#d1d5db',bg1:'#3a3e43',bg2:'#23272b',surface:'#343a40',text:'#f0f1f3',muted:'#b6c0c8',border:'rgba(180,189,198,.46)',borderSoft:'rgba(173,184,193,.24)',glow:'rgba(170,179,189,.12)'}
};
const HERITAGE_THEMES={"default":{"name":"Dolphin","accent":"#FBD77A","accent2":"#bfe9dc","bg1":"#0f3d38","bg2":"#0a2b28","border":"rgba(244,184,66,.55)","borderSoft":"rgba(244,184,66,.25)","glow":"rgba(244,184,66,.30)","icon":"🕐"},"tet":{"name":"Tết","accent":"#FFD166","accent2":"#FFC1B0","bg1":"#3a0e0e","bg2":"#1a0505","border":"rgba(255,107,53,.80)","borderSoft":"rgba(255,107,53,.28)","glow":"rgba(255,107,53,.32)","icon":"🧧"},"valentine":{"name":"Valentine","accent":"#FFB3C6","accent2":"#FFD1DC","bg1":"#3a0a1a","bg2":"#1a0508","border":"rgba(255,77,109,.80)","borderSoft":"rgba(255,77,109,.28)","glow":"rgba(255,77,109,.32)","icon":"💝"},"womenday":{"name":"Quốc Tế Phụ Nữ","accent":"#FFC1E3","accent2":"#FFE0F0","bg1":"#3a1030","bg2":"#1a0515","border":"rgba(217,70,166,.80)","borderSoft":"rgba(217,70,166,.28)","glow":"rgba(217,70,166,.32)","icon":"🌷"},"reunification":{"name":"30/4","accent":"#FFD700","accent2":"#FFECB3","bg1":"#2a0505","bg2":"#0a0202","border":"rgba(218,37,29,.85)","borderSoft":"rgba(218,37,29,.30)","glow":"rgba(218,37,29,.35)","icon":"⭐"},"children":{"name":"Tết Thiếu Nhi","accent":"#FFD1DC","accent2":"#B5EAD7","bg1":"#0e1e3a","bg2":"#050a1a","border":"rgba(78,205,196,.80)","borderSoft":"rgba(78,205,196,.28)","glow":"rgba(78,205,196,.32)","icon":"🎈"},"nationalday":{"name":"Quốc Khánh","accent":"#FFD700","accent2":"#FFF4B0","bg1":"#2a0505","bg2":"#0a0202","border":"rgba(218,37,29,.85)","borderSoft":"rgba(218,37,29,.30)","glow":"rgba(255,215,0,.32)","icon":"⭐"},"midautumn":{"name":"Trung Thu","accent":"#FFE8A0","accent2":"#FFD1DC","bg1":"#2a0e2a","bg2":"#0a0310","border":"rgba(240,192,96,.80)","borderSoft":"rgba(240,192,96,.28)","glow":"rgba(240,192,96,.32)","icon":"🏮"},"halloween":{"name":"Halloween","accent":"#FFB84D","accent2":"#B388FF","bg1":"#1a0a2a","bg2":"#050108","border":"rgba(255,149,0,.80)","borderSoft":"rgba(255,149,0,.28)","glow":"rgba(255,149,0,.32)","icon":"🎃"},"christmas":{"name":"Giáng Sinh","accent":"#FFE8A0","accent2":"#B8E8C8","bg1":"#0a1a2e","bg2":"#050a14","border":"rgba(196,30,58,.85)","borderSoft":"rgba(196,30,58,.30)","glow":"rgba(10,125,61,.35)","icon":"🎄"},"newyear":{"name":"Tết Dương","accent":"#FFD700","accent2":"#E0B0FF","bg1":"#1a0a3a","bg2":"#050110","border":"rgba(255,215,0,.85)","borderSoft":"rgba(255,215,0,.30)","glow":"rgba(139,0,255,.35)","icon":"🎊"},"spring":{"name":"Mùa Xuân","accent":"#FFD1DC","accent2":"#B5EAD7","bg1":"#1a2a1a","bg2":"#0a140a","border":"rgba(255,182,193,.80)","borderSoft":"rgba(255,182,193,.28)","glow":"rgba(255,182,193,.32)","icon":"🌸"},"summer":{"name":"Mùa Hè","accent":"#FFE58F","accent2":"#A0E8E0","bg1":"#0a1a3a","bg2":"#030814","border":"rgba(255,176,0,.80)","borderSoft":"rgba(255,176,0,.28)","glow":"rgba(255,176,0,.32)","icon":"☀️"},"autumn":{"name":"Mùa Thu","accent":"#FFD1A0","accent2":"#FFB87A","bg1":"#2a1505","bg2":"#0a0502","border":"rgba(210,105,30,.80)","borderSoft":"rgba(210,105,30,.28)","glow":"rgba(210,105,30,.32)","icon":"🍁"},"winter":{"name":"Mùa Đông","accent":"#E0F0FF","accent2":"#B8D8F0","bg1":"#0a1428","bg2":"#03060f","border":"rgba(184,216,240,.80)","borderSoft":"rgba(184,216,240,.28)","glow":"rgba(184,216,240,.32)","icon":"❄️"}};
Object.assign(HERITAGE_THEMES,{"abyss":{name:"🌊 Vực Sâu",accent:"#4ce6e4",accent2:"#b3fdff",bg1:"#071e38",bg2:"#010612",border:"#4ce6e4bb",borderSoft:"#4ce6e435",glow:"#4ce6e440",icon:"🌊"},"aurora":{name:"🌌 Cực Quang",accent:"#a6f7e2",accent2:"#d8bbff",bg1:"#09283a",bg2:"#080c29",border:"#a6f7e2bb",borderSoft:"#a6f7e235",glow:"#a6f7e240",icon:"🌌"},"coral":{name:"🪸 San Hô",accent:"#ffac9d",accent2:"#ffd49d",bg1:"#43222a",bg2:"#1a0c18",border:"#ffac9dbb",borderSoft:"#ffac9d35",glow:"#ffac9d40",icon:"🪸"},"neon":{name:"💠 Cyber Neon",accent:"#5dffdf",accent2:"#e287ff",bg1:"#170c40",bg2:"#06041e",border:"#5dffdfbb",borderSoft:"#5dffdf35",glow:"#5dffdf40",icon:"💠"},"cosmic":{name:"🪐 Ngân Hà",accent:"#a9bfff",accent2:"#e8a0ff",bg1:"#1c1244",bg2:"#05051d",border:"#a9bfffbb",borderSoft:"#a9bfff35",glow:"#a9bfff40",icon:"🪐"},"royal":{name:"👑 Hoàng Gia",accent:"#ffdf80",accent2:"#fff6d1",bg1:"#3e153c",bg2:"#160720",border:"#ffdf80bb",borderSoft:"#ffdf8035",glow:"#ffdf8040",icon:"👑"},"obsidian":{name:"🖤 Obsidian",accent:"#f2dcff",accent2:"#77dbff",bg1:"#171928",bg2:"#03040d",border:"#f2dcffbb",borderSoft:"#f2dcff35",glow:"#f2dcff40",icon:"🖤"}});
const ALL_THEMES={...THEMES,...Object.fromEntries(Object.entries(HERITAGE_THEMES).map(([id,t])=>[id,{...THEMES.dark,...t,surface:t.bg1,text:'#f7faf9',muted:'#d2e0dc'}]))};
let current='dark',unsubscribe=null,preview=false;
function normalize(key){return Object.prototype.hasOwnProperty.call(ALL_THEMES,key)?key:'dark';}
function render(key,broadcast){
 key=normalize(key);
 const t=ALL_THEMES[key];current=key;
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
body[data-theme="dark"]{background:#000!important}
body[data-theme="dark"]::before{background:#000!important;box-shadow:none!important;filter:none!important}
body[data-theme="dark"] #halongClock{background:transparent!important;border:none!important;box-shadow:none!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important}
body[data-theme="dark"] #halongClock .hclock-glow{display:none!important}
body[data-theme="dark"] #landing{background:transparent!important}
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
   const preferred=localStorage.getItem('dolphin_personal_theme');render(normalize(preferred||v),false);
  },err=>console.warn('[DisplayMode] Firestore unavailable; using saved mode',err));
 }).catch(err=>console.warn('[DisplayMode] Firebase unavailable; using saved mode',err));
}
function init(){
 inject();
 const params=new URLSearchParams(location.search);
 preview=ALL_THEMES[params.get('theme')]!==undefined;
 let stored;try{stored=localStorage.getItem(KEY);}catch(e){}
 render(preview?params.get('theme'):normalize(localStorage.getItem('dolphin_personal_theme')||stored),false);
 window.addEventListener('storage',e=>{if(e.key===KEY&&!preview)render(normalize(e.newValue),false);});
 try{const bc=window.__dolphinThemeBC||(window.__dolphinThemeBC=new BroadcastChannel('dolphin-theme'));bc.addEventListener('message',e=>{if(!preview&&e.data&&e.data.type==='theme')render(normalize(e.data.key),false);});}catch(e){}
 initFirebase();
}
window.ThemeSystem={version:'8.0',setTheme:key=>render(normalize(key),true),getCurrent:()=>current,listThemes:()=>Object.keys(ALL_THEMES),detect:()=> 'dark',getThemes:()=>ALL_THEMES};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();