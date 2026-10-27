(function(){
'use strict';
const css=document.createElement('style');
css.textContent=`
#dolphin-royal-leaders{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;width:100%;max-width:760px;margin:12px auto 20px}
.drl-card{position:relative;overflow:hidden;padding:13px 10px;border-radius:17px;text-align:center;background:linear-gradient(145deg,#183e38,#0a201f 72%);border:2px solid #c49b46;box-shadow:inset 0 0 20px #e3c06f15,0 4px 20px #0005}
.drl-card:before{content:'✦';position:absolute;color:#fbd77a;left:12px;top:8px;opacity:.65}
.drl-title{font-size:11px;font-weight:900;color:#fbd77a;letter-spacing:.05em}
.drl-crown{font-size:24px;filter:drop-shadow(0 0 6px #ffd9697d)}
.drl-name{font-size:15px;font-weight:900;color:#fff2bb;margin-top:3px;overflow-wrap:anywhere}
.drl-tag{font-size:9px;color:#f8d789;font-weight:800;letter-spacing:.09em}
.drl-value{font-size:12px;color:#bff9df;font-weight:800;margin-top:5px}
@media(max-width:390px){#dolphin-royal-leaders{gap:6px}.drl-card{padding:9px 6px}.drl-title{font-size:9px}.drl-name{font-size:12px}}
`;document.head.appendChild(css);
const e=s=>String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function draw(type,data){
 const el=document.getElementById('drl-'+type);
 if(!el)return;
 const top=data&&data.entries&&data.entries[0],sales=type==='revenue';
 el.innerHTML='<div class="drl-title">'+(sales?'👑 VUA DOANH THU':'🏆 VUA CÔNG VIỆC')+'</div><div class="drl-crown">👑</div>'+
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