(function(){
'use strict';
const css=document.createElement('style');
css.textContent=`
#dolphin-royal-leaders{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;width:100%;max-width:860px;margin:14px auto 22px}
.drl-card{position:relative;isolation:isolate;overflow:visible;padding:17px 14px 19px;border-radius:24px;text-align:center;background:transparent!important;border:none!important;box-shadow:none!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important;transition:transform .28s ease,border-color .28s ease}
.drl-card:hover{transform:translateY(-3px);border:none!important;box-shadow:none!important}
.drl-card::before,.drl-card::after{content:none!important;display:none!important}
.drl-title{position:relative;display:inline-block;margin:0 0 8px;padding:0 5px;font-size:12px;font-weight:1000;letter-spacing:.11em;color:#ffe9a2;text-transform:uppercase;text-shadow:0 0 6px #ffeebd,0 0 15px #ffab48,0 0 29px #ff5e18;animation:drlFireFlicker 1.05s infinite alternate ease-in-out}
.drl-title::before{content:'🔥';position:absolute;left:-24px;top:-5px;font-size:17px;filter:drop-shadow(0 0 8px #ff8e30);animation:drlFireDance .95s infinite alternate ease-in-out}
.drl-title::after{content:'🔥';position:absolute;right:-24px;top:-5px;font-size:17px;filter:drop-shadow(0 0 8px #ff8e30);animation:drlFireDance 1.2s .25s infinite alternate-reverse ease-in-out}
.drl-crown{position:relative;width:max-content;margin:3px auto 5px;font-size:32px;line-height:1.3;filter:drop-shadow(0 0 10px rgba(255,221,110,.9));animation:drlCrownFloat 2.5s ease-in-out infinite}
.drl-crown::before,.drl-crown::after{content:'✦';position:absolute;font-size:14px;color:#fff5bf;text-shadow:0 0 8px #ffe46a,0 0 16px #ffae47;animation:drlTwinkle 1.35s infinite alternate ease-in-out}
.drl-crown::before{left:-13px;top:-3px}.drl-crown::after{right:-15px;bottom:0;animation-delay:.6s}
.drl-name{position:relative;z-index:1;width:fit-content;max-width:100%;margin:7px auto 5px;padding:2px 10px 5px;font-size:19px;font-weight:1000;line-height:1.4;color:#fff9d6;overflow-wrap:anywhere;text-shadow:0 0 3px #fff8cd,0 -3px 8px #ffda62,0 -7px 15px #ff8b18,0 -12px 25px #f14505,0 -17px 36px rgba(198,29,0,.78);animation:drlNameFlame 1.15s infinite alternate ease-in-out}
.drl-name::before,.drl-name::after{content:'';position:absolute;pointer-events:none;z-index:-1;left:12%;right:12%;bottom:15%;height:105%;background:radial-gradient(ellipse at 25% 100%,rgba(255,209,56,.6),transparent 48%),radial-gradient(ellipse at 75% 95%,rgba(255,102,0,.5),transparent 55%);filter:blur(11px);opacity:.75;transform-origin:center bottom;animation:drlNameAura 1.45s infinite alternate ease-in-out}
.drl-name::after{left:23%;right:23%;height:135%;filter:blur(16px);opacity:.45;animation-duration:1.9s;animation-delay:-.7s}
@keyframes drlNameFlame{0%{text-shadow:0 0 3px #fff8cf,0 -3px 9px #ffce4e,0 -8px 16px #ff831b,0 -13px 28px #e83a00,0 -19px 38px rgba(201,28,0,.65);transform:translateY(1px)}33%{text-shadow:0 0 5px #fff6bf,0 -5px 13px #ffe36e,0 -11px 22px #ff730d,0 -18px 32px #ff3b00,0 -25px 46px rgba(208,31,0,.78);transform:translateY(-1px)}70%{text-shadow:0 0 4px #fffbe4,0 -4px 10px #ffcf4e,0 -10px 20px #ff981b,0 -16px 30px #e94b00,0 -22px 42px rgba(196,35,0,.72);transform:translateY(.5px)}100%{text-shadow:0 0 6px #fff9d5,0 -6px 16px #ffd246,0 -13px 24px #ff6b06,0 -21px 39px #f03300,0 -30px 53px rgba(206,31,0,.75);transform:translateY(-1.5px)}}
@keyframes drlNameAura{from{transform:translateY(3px) scaleX(.82) scaleY(.77);opacity:.35}to{transform:translateY(-6px) scaleX(1.15) scaleY(1.18);opacity:.78}}
.drl-tag{position:relative;font-size:10px;color:#ffe1a0;font-weight:850;letter-spacing:.1em;margin-top:5px}
.drl-value{position:relative;font-size:14px;color:#c9fff0;font-weight:900;margin-top:8px;text-shadow:0 0 14px rgba(89,234,220,.3)}
@keyframes drlFireFlicker{0%{text-shadow:0 0 4px #ffe9b0,0 0 12px #ffb34f,0 0 21px #ff620d;transform:translateY(0)}35%{text-shadow:0 0 9px #fff4c8,0 0 20px #ffb448,0 0 37px #ff4000;transform:translateY(-1px)}75%{text-shadow:0 0 5px #ffecb2,0 0 18px #ff8b1a,0 0 32px #ef4400;transform:translateY(1px)}100%{text-shadow:0 0 8px #fff3c1,0 0 23px #ffc35e,0 0 42px #ff4d00;transform:translateY(-.5px)}}
@keyframes drlFireDance{from{transform:translateY(2px) rotate(-8deg) scale(.92);opacity:.75}to{transform:translateY(-5px) rotate(9deg) scale(1.2);opacity:1}}
@keyframes drlTwinkle{from{opacity:.25;transform:scale(.55) rotate(0deg)}to{opacity:1;transform:scale(1.3) rotate(60deg)}}
@keyframes drlCrownFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}
@media(max-width:600px){#dolphin-royal-leaders{gap:8px}.drl-card{padding:12px 8px 15px}.drl-title{font-size:10px;letter-spacing:.03em}.drl-title::before{left:-17px;font-size:12px}.drl-title::after{right:-17px;font-size:12px}.drl-name{font-size:16px;padding-inline:2px}.drl-value{font-size:12px}}
@media(max-width:360px){#dolphin-royal-leaders{grid-template-columns:1fr}.drl-title{font-size:12px}}
@media(prefers-reduced-motion:reduce){.drl-card,.drl-title,.drl-title::before,.drl-title::after,.drl-crown,.drl-crown::before, .drl-crown::after,.drl-name,.drl-name::before,.drl-name::after{animation:none!important;transition:none!important}}

/* Third champion podium: Level in the centre, elevated over Revenue and Work. */
#dolphin-royal-leaders{grid-template-columns:minmax(0,1fr) minmax(0,1.3fr) minmax(0,1fr);grid-template-areas:"revenue level work";align-items:center;max-width:950px;margin-top:30px;overflow:visible}
#drl-revenue{grid-area:revenue}#drl-work{grid-area:work}
#drl-level{grid-area:level;z-index:3;transform:translateY(-17px);padding:9px 8px;overflow:visible}
#drl-level .drl-level-surface{position:relative;isolation:isolate;min-height:248px;padding:14px 15px 17px;overflow:visible;border:1px solid #e8c47eaa;border-radius:23px;background:radial-gradient(ellipse at 50% 14%,color-mix(in srgb,var(--drl-accent,#ffe1a2) 25%,transparent),transparent 62%),linear-gradient(150deg,#153b39,#132121)!important;box-shadow:0 0 24px #ffd88933,inset 0 0 19px #e3b99418}
#drl-level .drl-level-surface::before{content:'';position:absolute;inset:7px;border:1px solid #ffffff21;border-radius:17px;pointer-events:none;z-index:0}
#drl-level .drl-level-surface::after{content:'';position:absolute;inset:-5px;border-radius:inherit;pointer-events:none;z-index:-1;background:radial-gradient(ellipse at 12% 15%,var(--drl-accent,#e3c37b),transparent 62%),radial-gradient(ellipse at 85% 90%,var(--drl-accent2,#8deaff),transparent 58%);filter:blur(15px);opacity:.27}
#drl-level [data-banner="wave"]{background:radial-gradient(ellipse at top,#66d9ed42,transparent 66%),repeating-linear-gradient(168deg,#0d3857 0 10px,#10465e 11px 23px)!important}
#drl-level [data-banner="gold"]{background:radial-gradient(ellipse at top,#fff1a556,transparent 63%),linear-gradient(145deg,#483916,#151f27 70%,#694d24)!important}
#drl-level [data-banner="mythic"]{background:radial-gradient(ellipse at 50% 10%,#bd8aff85,transparent 58%),conic-gradient(from 40deg at 50% 60%,#24244f,#174855,#5c286c,#302142,#24244f)!important}
#drl-level [data-crew-card="soft"]{box-shadow:0 0 24px #8cdeff66,inset 0 0 17px #b8f7f633!important}
#drl-level [data-crew-card="energy"]{border:2px solid #8deafc!important;box-shadow:0 0 26px #80dcff99,inset 0 0 23px #aa7bff66!important}
#drl-level [data-crew-card="mythic"]{border:3px solid #efd4ff!important;box-shadow:inset 0 0 25px #a485efaa,0 0 28px #b879ffdd,0 0 46px #83dfff88!important}
.drl-level-eyebrow{position:relative;z-index:3;color:#ffe4a6;font-size:11px;font-weight:1000;letter-spacing:.12em;text-shadow:0 0 10px #fbd77a9a}
.drl-level-crown{position:relative;z-index:3;display:block;font-size:27px;line-height:1.2;margin:3px auto 0;animation:drlCrownFloat 3s ease-in-out infinite}
.drl-level-avatar-stage{position:relative;display:flex;align-items:center;justify-content:center;min-height:107px;margin:12px auto 6px;overflow:visible}
#drl-level .drl-level-avatar.hero-avatar{position:relative;display:grid;place-items:center;flex-shrink:0;width:73px;height:73px;margin:0;border:2px solid #e1ba80;border-radius:23px;background:radial-gradient(circle at 32% 20%,#34756e,#143033 85%);font-size:42px;line-height:1;isolation:isolate;overflow:visible!important;box-shadow:0 0 18px #ffe3a966}
.drl-level-glyph{position:relative;z-index:1;display:block;line-height:1;pointer-events:none}
.drl-level-name-wrap{position:relative;z-index:4;max-width:100%;overflow:visible}
#drl-level .drl-name{display:inline-block;position:relative;max-width:100%;margin:1px auto;padding:0 2px;font-size:19px;line-height:1.35;letter-spacing:.01em;color:#f8fffd;text-shadow:none;animation:none;filter:none}
#drl-level .drl-name::before,#drl-level .drl-name::after{content:none!important;display:none!important}
#drl-level .drl-name[data-name-fx="prism"]{animation:crew-prism-shift 4.5s linear infinite}
#drl-level .drl-name[data-name-fx="celestial"]{animation:crew-prism-shift 3.5s linear infinite}
.drl-level-title{position:relative;z-index:3;color:#ffe2a0;font-weight:800;letter-spacing:.04em;font-size:11px;line-height:1.4;margin-top:6px}
.drl-level-score{position:relative;z-index:3;color:#dffdf5;font-weight:950;font-size:12px;margin-top:7px}
.drl-level-theme{position:relative;z-index:3;font-size:9px;color:#d2efe7;letter-spacing:.02em;margin-top:6px;opacity:.86}
#drl-level[data-status="empty"] .drl-level-avatar-stage,#drl-level[data-status="empty"] .drl-level-title{opacity:.62}
@media(hover:hover){#drl-level:hover{transform:translateY(-20px)}}
@media(max-width:700px){
 #dolphin-royal-leaders{grid-template-areas:"level level" "revenue work";grid-template-columns:repeat(2,minmax(0,1fr));gap:0 10px;margin:15px auto 15px}
 #drl-level{width:min(100%,340px);justify-self:center;transform:translateY(-8px);padding:6px}
 #drl-level .drl-level-surface{min-height:236px;padding:11px 12px 13px}
 #drl-revenue,#drl-work{margin-top:-5px;padding:12px 7px 13px}
}
@media(max-width:360px){#dolphin-royal-leaders{grid-template-columns:repeat(2,minmax(0,1fr))}#drl-level{width:min(100%,280px)}#drl-level .drl-name{font-size:17px}}
@media(prefers-reduced-motion:reduce){#drl-level .drl-level-crown,#drl-level .drl-name{animation:none!important;transition:none!important}}

/* The unique ID selector on the podium must not suppress equipped name tiers. */
#drl-level .drl-name[data-name-fx="ember"]{color:#ffe1a0!important;-webkit-text-fill-color:#ffe1a0;text-shadow:0 0 3px #fff0bd,0 0 10px #ffa323,0 0 21px #e3551a;animation:none}
#drl-level .drl-name[data-name-fx="inferno"]{background:linear-gradient(180deg,#fff9da 0%,#ffe36d 37%,#ff762c 76%,#fb3344 100%);background-clip:text;-webkit-background-clip:text;color:transparent!important;-webkit-text-fill-color:transparent!important;text-shadow:0 0 13px #ff761b90,0 0 28px #d8321790;filter:drop-shadow(0 0 5px #ffb24c);animation:none}
#drl-level .drl-name[data-name-fx="prism"]{background:linear-gradient(100deg,#eaffff,#77eaff,#b9a1ff,#ffacdd,#eaffff);background-size:250% 100%;background-clip:text;-webkit-background-clip:text;color:transparent!important;-webkit-text-fill-color:transparent!important;text-shadow:0 0 12px #8bdbff80,0 0 22px #b791ff70;animation:crew-prism-shift 4.5s linear infinite}
#drl-level .drl-name[data-name-fx="celestial"]{background:linear-gradient(95deg,#fffadc,#89f4ff,#ffd36b,#f0a7ff,#fffadc);background-size:280% 100%;background-clip:text;-webkit-background-clip:text;color:transparent!important;-webkit-text-fill-color:transparent!important;text-shadow:0 0 11px #fff0b880,0 0 26px #73eaffad;filter:drop-shadow(0 0 7px #f1b5ff);animation:crew-prism-shift 3.5s linear infinite}
`;document.head.appendChild(css);
const e=s=>String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function draw(type,data){
 const el=document.getElementById('drl-'+type);
 if(!el)return;
 const top=data&&data.entries&&data.entries[0],sales=type==='revenue';
 el.innerHTML='<div class="drl-title">'+'TOP 1'+'</div><div class="drl-crown">👑</div>'+
 (top?'<div class="drl-name">'+e(top.name)+'</div><div class="drl-tag">'+(sales?'KING OF SALES':'WORK CHAMPION')+'</div><div class="drl-value">'+(sales?Number(top.value).toLocaleString('vi-VN')+' đ':Number(top.value).toLocaleString('vi-VN')+' điểm')+'</div>':'<div class="drl-name" style="opacity:.65">Chưa có dữ liệu</div>');
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
function drawLevel(leader){
 const card=$('drl-level'),surface=$('drl-level-surface'),avatar=$('drl-level-avatar');
 if(!card||!surface||!avatar)return;
 const valid=leader&&typeof leader==='object'&&/^DOL-(?:[0-9]{4,6}|[A-F0-9]{10})$/.test(String(leader.employeeId||''))&&typeof leader.name==='string'&&leader.name.trim();
 card.dataset.status=valid?'ready':'empty';
 if(!valid){
  surface.style.removeProperty('--drl-accent');surface.style.removeProperty('--drl-accent2');surface.dataset.personalTheme='dark';
  $('drl-level-glyph').textContent='🐬';
  avatar.dataset.frame='none';avatar.dataset.avatarMotion='none';avatar.dataset.crewAura='none';
  surface.dataset.banner='default';surface.dataset.crewCard='none';
  $('drl-level-name').textContent='Chưa có dữ liệu';$('drl-level-name').dataset.nameFx='none';
  $('drl-level-name-wrap').dataset.crewTrail='none';
  $('drl-level-title').textContent='Đang chờ bảng Level · XP';
  $('drl-level-score').textContent='LEVEL — · XP —';
  $('drl-level-theme').textContent='';
  card.setAttribute('aria-label','Top 1 Level: chưa có dữ liệu');
  window.DolphinFrameFX?.decorate?.(avatar);
  return;
 }
 const theme=Object.hasOwn(themeColors,leader.personalTheme)?leader.personalTheme:'dark';
 surface.style.setProperty('--drl-accent',themeColors[theme][0]);
 surface.style.setProperty('--drl-accent2',themeColors[theme][1]);
 surface.dataset.personalTheme=theme;
 surface.dataset.banner=safe('banner',leader.selectedBanner,'default');
 surface.dataset.crewCard=safe('cardFx',leader.selectedCardFx,'none');
 avatar.dataset.frame=safe('frame',leader.selectedFrame,'none');
 avatar.dataset.avatarMotion=safe('avatarMotion',leader.selectedAvatarMotion,'none');
 avatar.dataset.crewAura=safe('aura',leader.selectedAura,'none');
 $('drl-level-glyph').textContent=String(leader.avatar||'🐬').slice(0,24);
 const name=$('drl-level-name');
 name.textContent=leader.name.trim().slice(0,120);
 name.dataset.nameFx=safe('nameFx',leader.selectedNameFx,'none');
 $('drl-level-name-wrap').dataset.crewTrail=safe('trail',leader.selectedTrail,'none');
 $('drl-level-title').textContent=titles[leader.selectedTitle]||String(leader.rank||'Dolphin Crew');
 $('drl-level-score').textContent='Lv.'+Math.min(60,Math.max(1,Number(leader.level)||1))+' · '+Number(leader.xp||0).toLocaleString('vi-VN',{maximumFractionDigits:2})+' XP';
 $('drl-level-theme').textContent='✦ Chủ đề '+themeColors[theme][2]+' · Top Level tích lũy';
 card.setAttribute('aria-label','Top 1 Level: '+name.textContent+', '+$('drl-level-score').textContent);
 // Shared animator reuses the same exact equipped rarity layers as Profile.
 window.DolphinFrameFX?.decorate?.(avatar);
}

function ready(){
 const landing=document.getElementById('landing');if(!landing)return;
 const banner=document.createElement('section');banner.id='dolphin-royal-leaders';banner.setAttribute('aria-label','Vinh danh nhân viên xuất sắc');
 banner.innerHTML='<div class="drl-card" id="drl-revenue"></div>'+
 '<article class="drl-card drl-level" id="drl-level" data-status="empty" aria-label="Top 1 Level"><div class="drl-level-surface" id="drl-level-surface" data-banner="default" data-crew-card="none">'+
 '<div class="drl-level-eyebrow">✦ TOP 1 LEVEL ✦</div><div class="drl-level-crown" aria-hidden="true">👑</div>'+
 '<div class="drl-level-avatar-stage"><span class="hero-avatar drl-level-avatar" id="drl-level-avatar" data-frame="none" data-avatar-motion="none" data-crew-aura="none" aria-hidden="true"><span class="drl-level-glyph" id="drl-level-glyph">🐬</span></span></div>'+
 '<div class="drl-level-name-wrap" id="drl-level-name-wrap" data-crew-trail="none"><span class="drl-name leader-tile-name" id="drl-level-name" data-name-fx="none">Đang tải…</span></div>'+
 '<div class="drl-level-title" id="drl-level-title">DOLPHIN CREW CLUB</div><div class="drl-level-score" id="drl-level-score">LEVEL — · XP —</div><div class="drl-level-theme" id="drl-level-theme"></div></div></article>'+
 '<div class="drl-card" id="drl-work"></div>';
 const ann=document.getElementById('announcementBar');
 if(ann&&ann.parentNode)ann.parentNode.insertBefore(banner,ann);else landing.appendChild(banner);
 draw('revenue',null);drawLevel(null);draw('work',null);
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
  if(event.data.type==='dolphin-level-leader')drawLevel(event.data.leader);
 });
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready);else ready();
})();