(function(){
'use strict';
const $=id=>document.getElementById(id);
const themes={dark:'Dark',light:'Light',gray:'Gray',default:'🐬 Dolphin',spring:'🌸 Mùa Xuân',summer:'☀️ Mùa Hè',autumn:'🍁 Mùa Thu',winter:'❄️ Mùa Đông',tet:'🧧 Tết',valentine:'💝 Valentine',womenday:'🌷 Phụ Nữ',reunification:'⭐ 30/4',children:'🎈 Thiếu Nhi',nationalday:'⭐ Quốc Khánh',midautumn:'🏮 Trung Thu',halloween:'🎃 Halloween',christmas:'🎄 Giáng Sinh',newyear:'🎊 Tết Dương Lịch'};
const themeLevels={default:8,spring:10,summer:10,autumn:10,winter:10,tet:20,valentine:20,womenday:20,reunification:20,children:20,nationalday:20,midautumn:20,halloween:30,christmas:30,newyear:30};
const rewards=[[1,'Avatar cơ bản · Bronze'],[3,'Tên phát sáng OnFlame · Avatar Khám phá'],[5,'Bộ avatar Ocean'],[6,'Thăng hạng Silver'],[8,'Chủ đề Dolphin'],[10,'Bốn chủ đề mùa · Avatar Phiêu lưu'],[11,'Thăng hạng Gold'],[15,'Bộ avatar Legends'],[20,'Bảy chủ đề ngày lễ · Avatar Lễ hội'],[21,'Thăng hạng Platinum'],[25,'OnFlame cao cấp'],[30,'Halloween · Giáng Sinh · Tết Dương · Avatar Thần tốc'],[31,'Thăng hạng Diamond'],[40,'Bộ avatar Mythic'],[41,'Thăng hạng Legend'],[60,'Cấp độ tối đa']];
const fmt=n=>Number(n||0).toLocaleString('vi-VN',{maximumFractionDigits:2});
let mine=null;
function element(tag,text,className){const node=document.createElement(tag);if(text!==undefined)node.textContent=text;if(className)node.className=className;return node;}
function renderRewards(){
 $('staff-reward-list').replaceChildren();
 for(const [level,label] of rewards){
  const open=!!mine&&mine.level>=level,row=element('div',undefined,'reward-row'+(open?' unlocked':''));
  const body=element('div');body.append(element('strong',label),element('small',fmt(5000*(level-1)**2)+' XP tích lũy'));
  row.append(element('span','Lv.'+level,'reward-level'),body,element('span',open?'Đã mở':mine?'Chưa mở':'—','reward-state'));
  $('staff-reward-list').appendChild(row);
 }
}
function renderThemes(){
 const chosen=document.querySelector('input[name="staff-theme"]:checked')?.value;
 const preserve=$('style-dialog').open&&chosen;
 $('staff-theme-grid').replaceChildren();
 for(const [id,label] of Object.entries(themes)){
  const level=themeLevels[id]||1,open=!!mine&&mine.level>=level;
  const item=element('label',undefined,'theme-option'+(open?'':' is-locked'));
  const input=document.createElement('input');input.type='radio';input.name='staff-theme';input.value=id;input.disabled=!open;
  input.checked=(preserve?chosen:mine?.personalTheme||'dark')===id;
  const copy=element('span',label);copy.appendChild(element('small',open?'Đã mở':level===1?'Cần liên kết hồ sơ':'Mở tại Lv.'+level));
  item.append(input,copy);$('staff-theme-grid').appendChild(item);
 }
}
function renderMine(){
 if(!mine){
  $('staff-level-tag').textContent='LEVEL —';$('staff-next-level').textContent='XP được lưu theo Staff ID';
  $('staff-xp-fill').style.width='0%';$('staff-xp-track').setAttribute('aria-valuenow','0');
 }else{
  $('staff-level-tag').textContent='LEVEL '+mine.level;
  $('staff-xp-summary').textContent=mine.rank+' · '+fmt(mine.xp)+' XP tích lũy';
  const floor=5000*(mine.level-1)**2,ceil=5000*mine.level**2;
  const percent=mine.level>=60?100:Math.max(0,Math.min(100,100*(mine.xp-floor)/(ceil-floor)));
  $('staff-xp-fill').style.width=percent+'%';$('staff-xp-track').setAttribute('aria-valuenow',String(Math.round(percent)));
  $('staff-next-level').textContent=mine.level>=60?'Đã đạt cấp độ tối đa':'Còn '+fmt(Math.max(0,ceil-mine.xp))+' XP đến Lv.'+(mine.level+1);
 }
 if(!$('style-dialog').open)$('staff-flame-check').checked=!!mine?.nameFlame&&mine.level>=3;
 $('staff-save-style').disabled=!mine;$('staff-flame-check').disabled=!mine||mine.level<3;
 $('profile-name').classList.toggle('onflame',!!mine?.nameFlame&&mine.level>=3);
 $('profile-name').classList.toggle('advanced',!!mine?.nameFlame&&mine.level>=25);
 renderThemes();renderRewards();
}
function showStatus(){
 const states=window.DolphinPrestige?.getStatus?.()||{},errors=Object.values(states).filter(x=>x.state==='error');
 $('staff-xp-retry').hidden=!errors.length;$('staff-xp-retry').disabled=Object.values(states).some(x=>x.state==='loading');
 $('staff-xp-status').textContent=errors.length?'Chưa cập nhật được dữ liệu. Vui lòng thử lại.':'';
 const personal=states.mine;
 if(personal?.state==='error'||personal?.state==='unlinked')$('staff-xp-summary').textContent=personal.message;
 $('staff-save-style').disabled=!mine||personal?.state!=='ready';
 $('staff-flame-check').disabled=!mine||mine.level<3||personal?.state!=='ready';
}
async function save(){
 if(!mine)return;
 const theme=document.querySelector('input[name="staff-theme"]:checked')?.value||mine.personalTheme||'dark';
 const btn=$('staff-save-style');btn.disabled=true;
 try{
  mine=await window.DolphinPrestige.call('staffSetPersonalStyle',{theme,nameFlame:$('staff-flame-check').checked});
  try{localStorage.setItem('dolphin_personal_theme',mine.personalTheme);}catch(_){}
  window.ThemeSystem?.setTheme(mine.personalTheme);$('staff-style-info').textContent='Đã lưu giao diện theo Staff ID.';renderMine();
 }catch(e){$('staff-style-info').textContent='Không lưu được: '+e.message;}finally{btn.disabled=false;}
}
function init(){
 mine=window.DolphinPrestige?.getMine()||null;
 $('staff-save-style').onclick=save;$('staff-xp-retry').onclick=()=>window.DolphinPrestige?.refresh();
 renderMine();showStatus();
}
window.addEventListener('dolphin-my-progress-updated',e=>{mine=e.detail;renderMine();showStatus();});
window.addEventListener('dolphin-prestige-status',showStatus);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
