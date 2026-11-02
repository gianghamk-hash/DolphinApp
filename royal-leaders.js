(function(){
'use strict';
const css=document.createElement('style');
css.textContent=`
/* Three compact transparent Top 1 cards; no generic flames or crown.
 * All visual effects come from the employee's equipped Crew Club profile. */
#dolphin-royal-leaders{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px;width:100%;max-width:860px;margin:13px auto 18px;align-items:center;overflow:visible}
.drl-card{position:relative;min-width:0;isolation:isolate;overflow:visible;padding:8px 4px;border:none!important;box-shadow:none!important;background:transparent!important;text-align:center;backdrop-filter:none!important;-webkit-backdrop-filter:none!important;transition:transform .28s ease}
.drl-title{font-size:10px;letter-spacing:.045em;font-weight:900;color:#ffe3a8;text-shadow:0 0 7px #fbd77a66}
.drl-name{position:relative;display:inline-block;max-width:100%;margin:1px auto;padding:0 2px;font-size:14px;line-height:1.25;font-weight:900;color:#f8fffd;overflow-wrap:anywhere;animation:none;text-shadow:none}
.drl-name::before,.drl-name::after{content:none}
@media(prefers-reduced-motion:reduce){.drl-card{transition:none!important}}
/* Third champion podium: Level in the centre, elevated over Revenue and Work. */
#dolphin-royal-leaders{grid-template-columns:minmax(0,1fr) minmax(0,1.3fr) minmax(0,1fr);grid-template-areas:"revenue level work";align-items:center;max-width:950px;margin-top:30px;overflow:visible}
#drl-revenue{grid-area:revenue}#drl-work{grid-area:work}
#drl-level{grid-area:level;z-index:3;transform:translateY(-17px);padding:9px 8px;overflow:visible}
:is(#drl-level,#drl-revenue,#drl-work) .drl-level-surface{position:relative;isolation:isolate;min-height:248px;padding:14px 15px 17px;overflow:visible;border:1px solid #e8c47eaa;border-radius:23px;background:radial-gradient(ellipse at 50% 14%,color-mix(in srgb,var(--drl-accent,#ffe1a2) 25%,transparent),transparent 62%),linear-gradient(150deg,#153b39,#132121)!important;box-shadow:0 0 24px #ffd88933,inset 0 0 19px #e3b99418}
:is(#drl-level,#drl-revenue,#drl-work) .drl-level-surface::before{content:'';position:absolute;inset:7px;border:1px solid #ffffff21;border-radius:17px;pointer-events:none;z-index:0}
:is(#drl-level,#drl-revenue,#drl-work) .drl-level-surface::after{content:'';position:absolute;inset:-5px;border-radius:inherit;pointer-events:none;z-index:-1;background:radial-gradient(ellipse at 12% 15%,var(--drl-accent,#e3c37b),transparent 62%),radial-gradient(ellipse at 85% 90%,var(--drl-accent2,#8deaff),transparent 58%);filter:blur(15px);opacity:.27}
:is(#drl-level,#drl-revenue,#drl-work) [data-banner="wave"]{background:radial-gradient(ellipse at top,#66d9ed42,transparent 66%),repeating-linear-gradient(168deg,#0d3857 0 10px,#10465e 11px 23px)!important}
:is(#drl-level,#drl-revenue,#drl-work) [data-banner="gold"]{background:radial-gradient(ellipse at top,#fff1a556,transparent 63%),linear-gradient(145deg,#483916,#151f27 70%,#694d24)!important}
:is(#drl-level,#drl-revenue,#drl-work) [data-banner="mythic"]{background:radial-gradient(ellipse at 50% 10%,#bd8aff85,transparent 58%),conic-gradient(from 40deg at 50% 60%,#24244f,#174855,#5c286c,#302142,#24244f)!important}
:is(#drl-level,#drl-revenue,#drl-work) [data-crew-card="soft"]{box-shadow:0 0 24px #8cdeff66,inset 0 0 17px #b8f7f633!important}
:is(#drl-level,#drl-revenue,#drl-work) [data-crew-card="energy"]{border:2px solid #8deafc!important;box-shadow:0 0 26px #80dcff99,inset 0 0 23px #aa7bff66!important}
:is(#drl-level,#drl-revenue,#drl-work) [data-crew-card="mythic"]{border:3px solid #efd4ff!important;box-shadow:inset 0 0 25px #a485efaa,0 0 28px #b879ffdd,0 0 46px #83dfff88!important}
.drl-level-eyebrow{position:relative;z-index:3;color:#ffe4a6;font-size:11px;font-weight:1000;letter-spacing:.12em;text-shadow:0 0 10px #fbd77a9a}

.drl-level-avatar-stage{position:relative;display:flex;align-items:center;justify-content:center;min-height:107px;margin:12px auto 6px;overflow:visible}
:is(#drl-level,#drl-revenue,#drl-work) .drl-level-avatar.hero-avatar{position:relative;display:grid;place-items:center;flex-shrink:0;width:73px;height:73px;margin:0;border:2px solid #e1ba80;border-radius:23px;background:radial-gradient(circle at 32% 20%,#34756e,#143033 85%);font-size:42px;line-height:1;isolation:isolate;overflow:visible!important;box-shadow:0 0 18px #ffe3a966}
.drl-level-glyph{position:relative;z-index:1;display:block;line-height:1;pointer-events:none}
.drl-level-name-wrap{position:relative;z-index:4;max-width:100%;overflow:visible}
:is(#drl-level,#drl-revenue,#drl-work) .drl-name{display:inline-block;position:relative;max-width:100%;margin:1px auto;padding:0 2px;font-size:19px;line-height:1.35;letter-spacing:.01em;color:#f8fffd;text-shadow:none;animation:none;filter:none}
:is(#drl-level,#drl-revenue,#drl-work) .drl-name::before,:is(#drl-level,#drl-revenue,#drl-work) .drl-name::after{content:none!important;display:none!important}
:is(#drl-level,#drl-revenue,#drl-work) .drl-name[data-name-fx="prism"]{animation:crew-prism-shift 4.5s linear infinite}
:is(#drl-level,#drl-revenue,#drl-work) .drl-name[data-name-fx="celestial"]{animation:crew-prism-shift 3.5s linear infinite}
.drl-level-title{position:relative;z-index:3;color:#ffe2a0;font-weight:800;letter-spacing:.04em;font-size:11px;line-height:1.4;margin-top:6px}
.drl-level-score{position:relative;z-index:3;color:#dffdf5;font-weight:950;font-size:12px;margin-top:7px}
.drl-level-theme{position:relative;z-index:3;font-size:9px;color:#d2efe7;letter-spacing:.02em;margin-top:6px;opacity:.86}
:is(#drl-level,#drl-revenue,#drl-work)[data-status="empty"] .drl-level-avatar-stage,:is(#drl-level,#drl-revenue,#drl-work)[data-status="empty"] .drl-level-title{opacity:.62}
@media(hover:hover){#drl-level:hover{transform:translateY(-20px)}}
@media(max-width:700px){
 #dolphin-royal-leaders{grid-template-areas:"level level" "revenue work";grid-template-columns:repeat(2,minmax(0,1fr));gap:0 10px;margin:15px auto 15px}
 #drl-level{width:min(100%,340px);justify-self:center;transform:translateY(-8px);padding:6px}
 :is(#drl-level,#drl-revenue,#drl-work) .drl-level-surface{min-height:236px;padding:11px 12px 13px}
 #drl-revenue,#drl-work{margin-top:-5px;padding:12px 7px 13px}
}
@media(max-width:360px){#dolphin-royal-leaders{grid-template-columns:repeat(2,minmax(0,1fr))}#drl-level{width:min(100%,280px)}:is(#drl-level,#drl-revenue,#drl-work) .drl-name{font-size:17px}}


/* The unique ID selector on the podium must not suppress equipped name tiers. */
:is(#drl-level,#drl-revenue,#drl-work) .drl-name[data-name-fx="ember"]{color:#ffe1a0!important;-webkit-text-fill-color:#ffe1a0;text-shadow:0 0 3px #fff0bd,0 0 10px #ffa323,0 0 21px #e3551a;animation:none}
:is(#drl-level,#drl-revenue,#drl-work) .drl-name[data-name-fx="inferno"]{background:linear-gradient(180deg,#fff9da 0%,#ffe36d 37%,#ff762c 76%,#fb3344 100%);background-clip:text;-webkit-background-clip:text;color:transparent!important;-webkit-text-fill-color:transparent!important;text-shadow:0 0 13px #ff761b90,0 0 28px #d8321790;filter:drop-shadow(0 0 5px #ffb24c);animation:none}
:is(#drl-level,#drl-revenue,#drl-work) .drl-name[data-name-fx="prism"]{background:linear-gradient(100deg,#eaffff,#77eaff,#b9a1ff,#ffacdd,#eaffff);background-size:250% 100%;background-clip:text;-webkit-background-clip:text;color:transparent!important;-webkit-text-fill-color:transparent!important;text-shadow:0 0 12px #8bdbff80,0 0 22px #b791ff70;animation:crew-prism-shift 4.5s linear infinite}
:is(#drl-level,#drl-revenue,#drl-work) .drl-name[data-name-fx="celestial"]{background:linear-gradient(95deg,#fffadc,#89f4ff,#ffd36b,#f0a7ff,#fffadc);background-size:280% 100%;background-clip:text;-webkit-background-clip:text;color:transparent!important;-webkit-text-fill-color:transparent!important;text-shadow:0 0 11px #fff0b880,0 0 26px #73eaffad;filter:drop-shadow(0 0 7px #f1b5ff);animation:crew-prism-shift 3.5s linear infinite}

/* Keep the same glowing sigil used by the equipped Inferno/Celestial name tiers. */
:is(#drl-level,#drl-revenue,#drl-work) .drl-name[data-name-fx="inferno"]::after,:is(#drl-level,#drl-revenue,#drl-work) .drl-name[data-name-fx="celestial"]::after{position:absolute;right:-.7em;top:-.4em;left:auto;bottom:auto;z-index:2;width:auto;height:auto;display:block!important;pointer-events:none;filter:none;opacity:1;animation:crew-sigil-float 2.6s ease-in-out infinite alternate}
:is(#drl-level,#drl-revenue,#drl-work) .drl-name[data-name-fx="inferno"]::after{content:'✦'!important;color:#ffab3d;-webkit-text-fill-color:#ffab3d;text-shadow:0 0 11px #ffab3d}
:is(#drl-level,#drl-revenue,#drl-work) .drl-name[data-name-fx="celestial"]::after{content:'✧'!important;color:#c5f5ff;-webkit-text-fill-color:#c5f5ff;text-shadow:0 0 11px #c5f5ff}

/* Compact three-way Landing podium, matching Revenue and Work at every viewport.
 * Keep the background transparent: equipped theme/banner are soft light
 * accents, never an opaque panel that dominates the home screen. */
#dolphin-royal-leaders{grid-template-columns:repeat(3,minmax(0,1fr));grid-template-areas:"revenue level work";align-items:center;column-gap:9px;max-width:860px;margin:13px auto 18px}
#drl-level{width:100%;min-width:0;grid-area:level;transform:translateY(-12px);padding:8px 4px;z-index:3}
:is(#drl-level,#drl-revenue,#drl-work) .drl-level-surface{min-height:0;padding:8px 5px 10px;border:1px solid #e8c47e2b;border-radius:18px;background:transparent!important;box-shadow:none;backdrop-filter:none!important;-webkit-backdrop-filter:none!important}
:is(#drl-level,#drl-revenue,#drl-work) .drl-level-surface[data-banner]{background:transparent!important}
:is(#drl-level,#drl-revenue,#drl-work) .drl-level-surface::before{inset:2px;border:0;border-radius:15px;background:radial-gradient(ellipse at 50% 8%,var(--drl-accent,#ffe1a2),transparent 68%);opacity:.095;pointer-events:none;z-index:0}
:is(#drl-level,#drl-revenue,#drl-work) .drl-level-surface[data-banner="wave"]::before{background:repeating-linear-gradient(155deg,#46d9f0 0 8px,transparent 8px 22px);opacity:.08}
:is(#drl-level,#drl-revenue,#drl-work) .drl-level-surface[data-banner="gold"]::before{background:radial-gradient(circle at 50% 8%,#ffe48f,transparent 72%);opacity:.14}
:is(#drl-level,#drl-revenue,#drl-work) .drl-level-surface[data-banner="mythic"]::before{background:conic-gradient(from 20deg at 50% 30%,#c68bff,#65dfff,#f5d48f,#c68bff);opacity:.12;animation:drl-level-banner-flow 10s linear infinite}
:is(#drl-level,#drl-revenue,#drl-work) .drl-level-surface::after{inset:-2px;opacity:.18;filter:blur(12px)}
@keyframes drl-level-banner-flow{to{filter:hue-rotate(360deg)}}
:is(#drl-level,#drl-revenue,#drl-work) .drl-level-eyebrow{font-size:10px;letter-spacing:.04em}

:is(#drl-level,#drl-revenue,#drl-work) .drl-level-avatar-stage{min-height:63px;margin:5px auto 3px}
:is(#drl-level,#drl-revenue,#drl-work) .drl-level-avatar.hero-avatar{width:51px;height:51px;border-radius:15px;font-size:29px}
:is(#drl-level,#drl-revenue,#drl-work) .drl-level-name-wrap{width:100%;min-width:0}
:is(#drl-level,#drl-revenue,#drl-work) .drl-name{font-size:14px;line-height:1.2;overflow-wrap:anywhere;max-width:100%}
:is(#drl-level,#drl-revenue,#drl-work) .drl-level-title{font-size:9px;line-height:1.2;margin-top:3px}
:is(#drl-level,#drl-revenue,#drl-work) .drl-level-score{font-size:10px;line-height:1.3;margin-top:5px}
:is(#drl-level,#drl-revenue,#drl-work) .drl-level-theme{font-size:8px;line-height:1.3;margin-top:3px}
:is(#drl-level,#drl-revenue,#drl-work)[data-status="loading"] .drl-level-surface,:is(#drl-level,#drl-revenue,#drl-work)[data-status="empty"] .drl-level-surface{opacity:.76}
@media(hover:hover){#drl-level:hover{transform:translateY(-15px)}}
@media(max-width:700px){
 #dolphin-royal-leaders{grid-template-columns:repeat(3,minmax(0,1fr));grid-template-areas:"revenue level work";gap:5px;margin:10px auto 13px}
 #drl-level{width:100%;justify-self:stretch;transform:translateY(-9px);padding:5px 1px}
 :is(#drl-level,#drl-revenue,#drl-work) .drl-level-surface{height:154px;min-height:0;max-height:154px;box-sizing:border-box;padding:5px 3px;border-radius:15px;display:flex;flex-direction:column;align-items:center;justify-content:center}
 :is(#drl-level,#drl-revenue,#drl-work) .drl-level-eyebrow{font-size:9px;letter-spacing:0}

 :is(#drl-level,#drl-revenue,#drl-work) .drl-level-avatar-stage{min-height:49px;margin:2px auto 1px}
 :is(#drl-level,#drl-revenue,#drl-work) .drl-level-avatar.hero-avatar{width:42px;height:42px;border-radius:13px;font-size:25px}
 :is(#drl-level,#drl-revenue,#drl-work) .drl-name{font-size:12px;line-height:1.22}
 :is(#drl-level,#drl-revenue,#drl-work) .drl-level-title{font-size:8px;margin-top:1px}
 :is(#drl-level,#drl-revenue,#drl-work) .drl-level-score{font-size:9px;margin-top:2px}
 :is(#drl-level,#drl-revenue,#drl-work) .drl-level-theme{display:none}
 #drl-revenue,#drl-work{margin-top:0;padding:11px 4px;min-height:164px;box-sizing:border-box}
 #drl-revenue .drl-name,#drl-work .drl-name{font-size:13px}
 #drl-revenue .drl-crown,#drl-work .drl-crown{font-size:25px}
 #drl-revenue .drl-tag,#drl-work .drl-tag{font-size:9px}
 #drl-revenue .drl-value,#drl-work .drl-value{font-size:10px}
}
@media(max-width:360px){
 #dolphin-royal-leaders{grid-template-columns:repeat(3,minmax(0,1fr));gap:3px}
 #drl-level{width:100%;padding-inline:0}
 :is(#drl-level,#drl-revenue,#drl-work) .drl-name{font-size:11px}
 #drl-revenue,#drl-work{padding-inline:2px}
 #drl-revenue .drl-name,#drl-work .drl-name{font-size:12px}
 :is(#drl-level,#drl-revenue,#drl-work) .drl-level-avatar.hero-avatar{width:42px;height:42px;font-size:23px}
}
@media(prefers-reduced-motion:reduce){:is(#drl-level,#drl-revenue,#drl-work) .drl-level-surface::before{animation:none!important}}

/* The three visible cards share exactly the same profile cosmetics surface.
 * Their differing position is layout-only, not a special FX tier. */
#drl-revenue,#drl-work{grid-area:auto;min-width:0;transform:none;padding:8px 4px;min-height:0}
#drl-revenue{grid-area:revenue}#drl-work{grid-area:work}
:is(#drl-level,#drl-revenue,#drl-work) .drl-level-surface{
 height:171px;min-height:0;max-height:171px;box-sizing:border-box;
 padding:7px 4px 9px;display:flex;flex-direction:column;align-items:center;justify-content:center;
 background:transparent!important;border:1px solid #e8c47e25;border-radius:17px;box-shadow:none;
 backdrop-filter:none!important;-webkit-backdrop-filter:none!important;
}
:is(#drl-level,#drl-revenue,#drl-work) .drl-level-eyebrow{font-size:10px;letter-spacing:.015em;line-height:1.2;white-space:normal}
:is(#drl-level,#drl-revenue,#drl-work) .drl-level-avatar-stage{min-height:56px;margin:5px auto 3px}
:is(#drl-level,#drl-revenue,#drl-work) .drl-level-avatar.hero-avatar{width:48px;height:48px;border-radius:15px;font-size:28px}
:is(#drl-level,#drl-revenue,#drl-work) .drl-name{font-size:13px;line-height:1.2;max-width:100%;overflow-wrap:anywhere}
:is(#drl-level,#drl-revenue,#drl-work) .drl-level-title{font-size:9px;margin-top:2px;line-height:1.25}
:is(#drl-level,#drl-revenue,#drl-work) .drl-level-score{font-size:10px;line-height:1.3;margin-top:3px}
:is(#drl-level,#drl-revenue,#drl-work) .drl-level-theme{display:none}
:is(#drl-revenue,#drl-work)[data-status="empty"] .drl-level-avatar-stage{opacity:.55}
@media(max-width:700px){
 #dolphin-royal-leaders{grid-template-columns:repeat(3,minmax(0,1fr));grid-template-areas:"revenue level work";gap:5px}
 #drl-revenue,#drl-work{margin-top:0;padding:5px 1px;min-height:0}
 :is(#drl-level,#drl-revenue,#drl-work) .drl-level-surface{height:154px;min-height:0;max-height:154px;padding:5px 2px 7px;border-radius:15px}
 :is(#drl-level,#drl-revenue,#drl-work) .drl-level-eyebrow{font-size:9px;letter-spacing:0}
 :is(#drl-level,#drl-revenue,#drl-work) .drl-level-avatar-stage{min-height:49px;margin:3px auto 1px}
 :is(#drl-level,#drl-revenue,#drl-work) .drl-level-avatar.hero-avatar{width:42px;height:42px;border-radius:13px;font-size:25px}
 :is(#drl-level,#drl-revenue,#drl-work) .drl-name{font-size:12px}
 :is(#drl-level,#drl-revenue,#drl-work) .drl-level-title{font-size:8px}
 :is(#drl-level,#drl-revenue,#drl-work) .drl-level-score{font-size:9px}
}
@media(max-width:360px){
 #dolphin-royal-leaders{grid-template-columns:repeat(3,minmax(0,1fr));gap:3px}
 :is(#drl-level,#drl-revenue,#drl-work) .drl-name{font-size:11px}
}
`;document.head.appendChild(css);
const e=s=>String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const rankSnapshots={revenue:null,work:null};
function draw(type,data){
 if(type!=='revenue'&&type!=='work')return;
 rankSnapshots[type]=data||null;
 const entries=Array.isArray(data?.entries)?data.entries:[];
 const top=entries[0],el=document.getElementById('drl-'+type);
 if(!el)return;
 // Staff ID wins; if the operational leaderboard only contains a name,
 // display cosmetics ONLY when that name uniquely resolves in the verified
 // staff directory. Never copy a different employee's premium cosmetics.
 const name=typeof top?.name==='string'?top.name:'';
 const employeeId=typeof top?.employeeId==='string'?top.employeeId:
  typeof top?.staffId==='string'?top.staffId:'';
 const profile=name?window.DolphinAvatars?.profile?.(name,employeeId):null;
 const actor=top?{...profile,name:profile?.name||name,avatar:profile?.avatar||'🐬'}:null;
 renderAppearance(type,actor);
 const score=$('drl-'+type+'-score');
 const amount=Number(top?.value);
 score.textContent=top&&Number.isFinite(amount)?
  amount.toLocaleString('vi-VN',{maximumFractionDigits:type==='revenue'?0:2})+
  (type==='revenue'?' đ':' điểm'):'—';
 el.dataset.status=top?'ready':'empty';
 el.setAttribute('aria-label','Top 1 '+(type==='revenue'?'Doanh thu':'Công việc')+
  ': '+(top?(actor.name+', '+score.textContent):'chưa có dữ liệu'));
}

const $=id=>document.getElementById(id);
const allowed={
 frame:['none','bronze','silver','gold','mythic'],
 avatarMotion:['none','pulse','float','wave','orbit','prism','ascension'],
 aura:['none','spark','dual','celestial'],
 trail:['none','wave','comet','nova'],
 nameFx:['none','ember','inferno','prism','celestial'],
 banner:['default','wave','gold','mythic'],
 cardFx:['none','soft','energy','mythic']
};
const titles={none:'',rookie:'⭐ Rookie Star',wave:'🌊 Wave Rider',legend:'👑 Dolphin Legend'};
const themeColors={
 dark:['#fbd77a','#76e9dd','Dark'],light:['#f3e4ba','#8ddce8','Light'],gray:['#c7d2e5','#7cdacf','Gray'],
 default:['#fbd77a','#71e3d5','Dolphin'],spring:['#b6ee9b','#8fdbfc','Spring'],summer:['#ffd87f','#58e9cf','Summer'],
 autumn:['#f4af79','#d9c36e','Autumn'],winter:['#b0dbff','#95c3ec','Winter'],tet:['#ff8f89','#ffe17a','Tết'],
 valentine:['#ff9fc7','#e4a3ff','Valentine'],womenday:['#e1b6ff','#f2c1dc','Women’s Day'],
 reunification:['#ffb867','#fbea7a','30/4'],children:['#83e8fa','#fec0b6','Children'],
 nationalday:['#ffb76f','#ffe978','Quốc Khánh'],midautumn:['#f7d58c','#c9a9ff','Trung Thu'],
 halloween:['#ffa45b','#b282f7','Halloween'],christmas:['#8aebbb','#ef9aa7','Christmas'],
 newyear:['#c7abff','#87eaff','New Year']
};
const safe=(kind,value,fallback)=>allowed[kind].includes(value)?value:fallback;
let levelBoardLoaded=false;
function renderAppearance(type,leader){
 const surface=$('drl-'+type+'-surface'),avatar=$('drl-'+type+'-avatar');
 if(!surface||!avatar)return;
 const valid=leader&&typeof leader.name==='string'&&leader.name.trim();
 const theme=valid&&Object.hasOwn(themeColors,leader.personalTheme)?leader.personalTheme:'dark';
 surface.style.setProperty('--drl-accent',themeColors[theme][0]);
 surface.style.setProperty('--drl-accent2',themeColors[theme][1]);
 surface.dataset.personalTheme=theme;
 surface.dataset.banner=safe('banner',valid?leader.selectedBanner:null,'default');
 surface.dataset.crewCard=safe('cardFx',valid?leader.selectedCardFx:null,'none');
 avatar.dataset.frame=safe('frame',valid?leader.selectedFrame:null,'none');
 avatar.dataset.avatarMotion=safe('avatarMotion',valid?leader.selectedAvatarMotion:null,'none');
 avatar.dataset.crewAura=safe('aura',valid?leader.selectedAura:null,'none');
 $('drl-'+type+'-glyph').textContent=valid?String(leader.avatar||'🐬').slice(0,24):'🐬';
 const name=$('drl-'+type+'-name');
 name.textContent=valid?leader.name.trim().slice(0,120):'Chưa có dữ liệu';
 name.dataset.nameFx=safe('nameFx',valid?leader.selectedNameFx:null,'none');
 $('drl-'+type+'-name-wrap').dataset.crewTrail=safe('trail',valid?leader.selectedTrail:null,'none');
 const title=$('drl-'+type+'-title');
 title.textContent=valid?(titles[leader.selectedTitle]|| (type==='level'?String(leader.rank||'Dolphin Crew'):'')):'';
 title.hidden=!title.textContent;
 const themeHint=$('drl-'+type+'-theme');
 if(themeHint)themeHint.textContent=valid?'✦ Chủ đề '+themeColors[theme][2]:'';
 // Same frame/motion/orbit renderer as Crew Club Personal Profile.
 window.DolphinFrameFX?.decorate?.(avatar);
}
function drawLevel(leader){
 const card=$('drl-level');
 if(!card)return;
 const valid=leader&&typeof leader==='object'&&
  /^DOL-(?:[0-9]{4,6}|[A-F0-9]{10})$/.test(String(leader.employeeId||''))&&
  typeof leader.name==='string'&&leader.name.trim();
 renderAppearance('level',valid?leader:null);
 card.dataset.status=valid?'ready':levelBoardLoaded?'empty':'loading';
 if(!valid){
  $('drl-level-name').textContent=levelBoardLoaded?'Chưa có nhân viên':'Đang tải Level…';
  $('drl-level-title').textContent=levelBoardLoaded?'Bảng Level công khai đang trống':'Đang đồng bộ bảng Level · XP';
  $('drl-level-title').hidden=false;
  $('drl-level-score').textContent='LEVEL — · XP —';
  card.setAttribute('aria-label',levelBoardLoaded?'Top 1 Level: bảng công khai chưa có nhân viên':'Top 1 Level: đang tải dữ liệu');
  return;
 }
 const score=$('drl-level-score');
 score.textContent='Lv.'+Math.min(60,Math.max(1,Number(leader.level)||1))+
  ' · '+Number(leader.xp||0).toLocaleString('vi-VN',{maximumFractionDigits:2})+' XP';
 card.setAttribute('aria-label','Top 1 Level: '+leader.name+', '+score.textContent);
}

function ready(){
 const landing=document.getElementById('landing');if(!landing)return;
 const banner=document.createElement('section');banner.id='dolphin-royal-leaders';banner.setAttribute('aria-label','Vinh danh nhân viên xuất sắc');
 // The profile styling layer is identical for Revenue, Level and Work.
 const podium=(type,heading)=>'<article class="drl-card drl-level" id="drl-'+type+'" data-status="loading" aria-label="'+heading+'">'+
 '<div class="drl-level-surface" id="drl-'+type+'-surface" data-banner="default" data-crew-card="none">'+
 '<div class="drl-level-eyebrow">'+heading+'</div>'+
 '<div class="drl-level-avatar-stage"><span class="hero-avatar drl-level-avatar" id="drl-'+type+'-avatar" data-frame="none" data-avatar-motion="none" data-crew-aura="none" aria-hidden="true"><span class="drl-level-glyph" id="drl-'+type+'-glyph">🐬</span></span></div>'+
 '<div class="drl-level-name-wrap" id="drl-'+type+'-name-wrap" data-crew-trail="none"><span class="drl-name leader-tile-name" id="drl-'+type+'-name" data-name-fx="none">Đang tải…</span></div>'+
 '<div class="drl-level-title" id="drl-'+type+'-title"></div>'+
 '<div class="drl-level-score" id="drl-'+type+'-score">—</div><div class="drl-level-theme" id="drl-'+type+'-theme"></div></div></article>';
 banner.innerHTML=podium('revenue','TOP 1 DOANH THU')+podium('level','✦ TOP 1 LEVEL ✦')+podium('work','TOP 1 CÔNG VIỆC');
 const ann=document.getElementById('announcementBar');
 if(ann&&ann.parentNode)ann.parentNode.insertBefore(banner,ann);else landing.appendChild(banner);
 draw('revenue',null);draw('work',null);
 window.addEventListener('dolphin-avatars-updated',()=>{
  // Rehydrate top sellers/workers when the verified Staff ID directory arrives
  // or their equipped cosmetics change, without restarting ranking listeners.
  draw('revenue',rankSnapshots.revenue);draw('work',rankSnapshots.work);
 });
 // The Landing already has DolphinPrestige; use its authoritative public
 // leaderboard directly. The invisible ranking frame only supplies the
 // Revenue/Work leader snapshots, never the Level leaderboard.
 function applyLevelBoard(board){
  levelBoardLoaded=!!board;
  const top=Array.isArray(board?.leaderboard)?board.leaderboard[0]||null:null;
  drawLevel(top);
 }
 applyLevelBoard(window.DolphinPrestige?.getBoard?.()||null);
 window.addEventListener('dolphin-prestige-updated',event=>applyLevelBoard(event.detail));
 window.addEventListener('dolphin-prestige-status',event=>{
  if(event.detail?.scope==='board'&&event.detail.state==='error'&&!levelBoardLoaded){
   $('drl-level-name').textContent='Chưa thể đồng bộ';
   $('drl-level-title').textContent='Không tải được dữ liệu Level';
  }
 });
 // A single same-origin background ranking document owns the Firestore listeners.
 // The landing does not open duplicate ranking listeners itself.
 const frame=document.createElement('iframe');frame.src='ranking/';frame.title='Đồng bộ bảng xếp hạng';
 frame.setAttribute('aria-hidden','true');frame.tabIndex=-1;
 frame.style.cssText='position:absolute;width:0;height:0;border:0;opacity:0;pointer-events:none';
 landing.appendChild(frame);
 window.addEventListener('message',function(event){
  if(event.origin!==location.origin||event.source!==frame.contentWindow)return;
  if(!event.data)return;
  if(event.data.type==='dolphin-rank-leaders'){draw('revenue',event.data.revenue);draw('work',event.data.work);}
  // Ignore Level messages from an iframe: only the Landing's own authenticated
  // DolphinPrestige response may choose a Level champion.
 });
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready);else ready();
})();