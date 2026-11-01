(function(){
'use strict';
const $=id=>document.getElementById(id);
const themeNames={default:'🐬 Dolphin',spring:'🌸 Mùa Xuân',summer:'☀️ Mùa Hè',autumn:'🍁 Mùa Thu',winter:'❄️ Mùa Đông',tet:'🧧 Tết',valentine:'💝 Valentine',womenday:'🌷 Phụ Nữ',reunification:'⭐ 30/4',children:'🎈 Thiếu Nhi',nationalday:'⭐ Quốc Khánh',midautumn:'🏮 Trung Thu',halloween:'🎃 Halloween',christmas:'🎄 Giáng Sinh',newyear:'🎊 Tết Dương Lịch'};
const themeLevels={default:8,spring:10,summer:10,autumn:10,winter:10,tet:20,valentine:20,womenday:20,reunification:20,children:20,nationalday:20,midautumn:20,halloween:30,christmas:30,newyear:30};
let mine=null,board=null;
const fmt=n=>Number(n||0).toLocaleString('vi-VN',{maximumFractionDigits:2});
function markup(){
 if($('staff-progress-card'))return;
 const el=document.createElement('section');el.className='card';el.id='staff-progress-card';
 el.style.cssText='margin-top:20px';
 el.innerHTML='<h2>⭐ Dolphin Level & Rewards</h2><div id="staff-xp-summary">Đang tải cấp độ...</div>'+
 '<div id="staff-xp-track" style="background:#ffffff23;border-radius:10px;height:12px;margin:12px 0;overflow:hidden"><div id="staff-xp-fill" style="height:100%;width:0;background:linear-gradient(90deg,#f4b842,#fff1a4)"></div></div>'+
 '<h2 style="margin-top:24px">🔥 Tên phát sáng</h2><label style="display:flex;gap:10px;align-items:center"><input id="staff-flame-check" type="checkbox"> Kích hoạt OnFlame (mở ở Lv.3)</label>'+
 '<h2 style="margin-top:24px">🎨 Kho chủ đề</h2><p>Dark, Light, Gray luôn miễn phí. Các chủ đề gốc mở khóa theo Level và lưu riêng theo Staff ID.</p><div id="staff-theme-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(136px,1fr));gap:9px"></div>'+
 '<button type="button" class="primary" id="staff-save-style" style="margin-top:12px" disabled>Lưu đặc quyền</button><p id="staff-style-info" aria-live="polite"></p>'+
 '<p id="staff-xp-status" role="status"></p><button type="button" class="secondary" id="staff-xp-retry" hidden>Thử tải lại XP và bảng vinh danh</button>'+
 '<h2 id="hall-of-fame" style="margin-top:24px">👑 Dolphin Hall of Fame</h2><div id="staff-champion-info">Đang tải...</div>'+
 '<h2 style="margin-top:20px">🏆 Bảng Level cao nhất</h2><div id="staff-rank-board"></div>'+ 
 '<h2 style="margin-top:20px">🏅 Legendary Wall</h2><p>Những nhân viên từng đứng đầu Dolphin.</p><div id="staff-legend-board"></div>';
 document.querySelector('main')?.appendChild(el);
 $('staff-save-style').onclick=save;
 $('staff-flame-check').disabled=true;
 $('staff-xp-retry').onclick=()=>window.DolphinPrestige?.refresh();
 for(const value of Object.values(window.DolphinPrestige?.getStatus?.()||{}))showStatus(value);
}
function showStatus(value){
 if(!$('staff-progress-card'))return;
 const states=window.DolphinPrestige?.getStatus?.()||{};
 const errors=Object.values(states).filter(x=>x.state==='error');
 $('staff-xp-retry').hidden=!errors.length;
 $('staff-xp-retry').disabled=Object.values(states).some(x=>x.state==='loading');
 $('staff-xp-status').textContent=errors.length?'Chưa cập nhật được dữ liệu. Bạn có thể thử tải lại.':'';
 if(value.scope==='mine'){
  $('staff-save-style').disabled=value.state!=='ready';
  $('staff-flame-check').disabled=value.state!=='ready'||!mine||mine.level<3;
  if(value.state==='error'||value.state==='unlinked')$('staff-xp-summary').textContent=value.message;
  else if(value.state==='loading'&&!mine)$('staff-xp-summary').textContent='Đang tải cấp độ...';
 }
 if(value.scope==='board'){
  if(value.state==='error')$('staff-champion-info').textContent=value.message;
  else if(value.state==='loading'&&!board)$('staff-champion-info').textContent='Đang tải...';
 }
}
function render(){
 markup();
 if(mine){
  $('staff-xp-summary').textContent='Lv. '+mine.level+' · '+mine.rank+' · '+fmt(mine.xp)+' XP tích lũy vĩnh viễn';
  const floor=5000*(mine.level-1)**2,ceil=5000*mine.level**2;
  $('staff-xp-fill').style.width=mine.level>=60?'100%':Math.max(0,Math.min(100,100*(mine.xp-floor)/(ceil-floor)))+'%';
  $('staff-flame-check').disabled=mine.level<3;
  $('staff-flame-check').checked=mine.nameFlame&&mine.level>=3;
  const themes={dark:'Dark',light:'Light',gray:'Gray',...themeNames};
  $('staff-theme-grid').replaceChildren();
  const selected=mine.personalTheme||'dark';
  for(const [id,label] of Object.entries(themes)){
   const level=themeLevels[id]||1,open=mine.level>=level;
   const input=document.createElement('input');input.type='radio';input.name='staff-theme';input.value=id;input.disabled=!open;input.checked=selected===id;
   const item=document.createElement('label');item.style.cssText='border:1px solid #ffffff39;border-radius:12px;padding:10px;display:flex;gap:7px;align-items:center;font-size:12px;cursor:pointer';
   const span=document.createElement('span');span.textContent=label+(open?'':' 🔒 Lv.'+level);item.append(input,span);$('staff-theme-grid').append(item);
  }
  const p=$('profile-name');if(p)p.classList.toggle('onflame',mine.nameFlame&&mine.level>=3);
 }
 if(!board)return;
 const ch=board?.champion;
 $('staff-champion-info').textContent=ch?'👑 '+ch.name+' · Lv. '+ch.level+' · '+fmt(ch.xp)+' XP':'Chưa có nhân viên được vinh danh.';
 $('staff-rank-board').replaceChildren();
 for(const [i,p] of (board?.leaderboard||[]).slice(0,10).entries()){
  const row=document.createElement('div');row.style.cssText='padding:9px 2px;border-bottom:1px solid #ffffff25;font-size:13px';
  row.textContent=(i===0?'👑':(i+1)+'.')+' '+p.avatar+' '+p.name+' · Lv.'+p.level+' · '+fmt(p.xp)+' XP';
  $('staff-rank-board').appendChild(row);
 }
 $('staff-legend-board').replaceChildren();
 for(const legend of (board?.legends||[])){
  const el=document.createElement('div');el.style.cssText='border-bottom:1px solid #ffffff20;padding:8px 0;font-size:12px';
  el.textContent='🏅 '+legend.avatar+' '+legend.name+' · Lv.'+legend.level+' · '+new Date(legend.firstAt).toLocaleDateString('vi-VN');
  $('staff-legend-board').appendChild(el);
 }
}
async function save(){
 if(!mine)return;
 const theme=document.querySelector('input[name="staff-theme"]:checked')?.value||'dark';
 const btn=$('staff-save-style');btn.disabled=true;
 try{
  const data=await window.DolphinPrestige.call('staffSetPersonalStyle',{theme,nameFlame:$('staff-flame-check').checked});
  mine=data;localStorage.setItem('dolphin_personal_theme',data.personalTheme);
  if(window.ThemeSystem?.setTheme)window.ThemeSystem.setTheme(data.personalTheme);
  $('staff-style-info').textContent='✓ Đã lưu đặc quyền theo Staff ID.';
  render();
 }catch(e){$('staff-style-info').textContent='Không lưu được: '+e.message;}finally{btn.disabled=false;}
}
window.addEventListener('dolphin-my-progress-updated',e=>{mine=e.detail;render();});
window.addEventListener('dolphin-prestige-updated',e=>{board=e.detail;render();});
window.addEventListener('dolphin-prestige-status',e=>{markup();showStatus(e.detail);});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',markup);else markup();
})();
