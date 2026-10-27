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
`;document.head.appendChild(css);
const e=s=>String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function draw(type,data){
 const el=document.getElementById('drl-'+type);
 if(!el)return;
 const top=data&&data.entries&&data.entries[0],sales=type==='revenue';
 el.innerHTML='<div class="drl-title">'+'TOP 1'+'</div><div class="drl-crown">👑</div>'+
 (top?'<div class="drl-name">'+e(top.name)+'</div><div class="drl-tag">'+(sales?'KING OF SALES':'WORK CHAMPION')+'</div><div class="drl-value">'+(sales?Number(top.value).toLocaleString('vi-VN')+' đ':Number(top.value).toLocaleString('vi-VN')+' điểm')+'</div>':'<div class="drl-name" style="opacity:.65">Chưa có dữ liệu</div>');
}
function ready(){
 const landing=document.getElementById('landing');if(!landing)return;
 const banner=document.createElement('section');banner.id='dolphin-royal-leaders';banner.setAttribute('aria-label','Vinh danh nhân viên xuất sắc');
 banner.innerHTML='<div class="drl-card" id="drl-revenue"></div><div class="drl-card" id="drl-work"></div>';
 const ann=document.getElementById('announcementBar');
 if(ann&&ann.parentNode)ann.parentNode.insertBefore(banner,ann);else landing.appendChild(banner);
 draw('revenue',null);draw('work',null);
 // A single same-origin background ranking document owns the Firestore listeners.
 // The landing does not open duplicate ranking listeners itself.
 const frame=document.createElement('iframe');frame.src='ranking/';frame.title='Đồng bộ bảng xếp hạng';
 frame.setAttribute('aria-hidden','true');frame.tabIndex=-1;
 frame.style.cssText='position:absolute;width:0;height:0;border:0;opacity:0;pointer-events:none';
 landing.appendChild(frame);
 window.addEventListener('message',function(event){
  if(event.origin!==location.origin||event.source!==frame.contentWindow)return;
  if(!event.data||event.data.type!=='dolphin-rank-leaders')return;
  draw('revenue',event.data.revenue);draw('work',event.data.work);
 });
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready);else ready();
})();