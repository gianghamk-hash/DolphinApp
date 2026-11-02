(function(){
'use strict';
const $=id=>document.getElementById(id);
const themes={dark:'Dark',light:'Light',gray:'Gray',default:'🐬 Dolphin',spring:'🌸 Mùa Xuân',summer:'☀️ Mùa Hè',autumn:'🍁 Mùa Thu',winter:'❄️ Mùa Đông',tet:'🧧 Tết',valentine:'💝 Valentine',womenday:'🌷 Phụ Nữ',reunification:'⭐ 30/4',children:'🎈 Thiếu Nhi',nationalday:'⭐ Quốc Khánh',midautumn:'🏮 Trung Thu',halloween:'🎃 Halloween',christmas:'🎄 Giáng Sinh',newyear:'🎊 Tết Dương Lịch'};
const themeLevels={default:8,spring:10,summer:10,autumn:10,winter:10,tet:20,valentine:20,womenday:20,reunification:20,children:20,nationalday:20,midautumn:20,halloween:30,christmas:30,newyear:30};
const rewards=[[1,'Avatar cơ bản · Bronze'],[3,'Tên phát sáng OnFlame · Avatar Khám phá'],[5,'Bộ avatar Ocean'],[6,'Thăng hạng Silver'],[8,'Chủ đề Dolphin'],[10,'Bốn chủ đề mùa · Avatar Phiêu lưu'],[11,'Thăng hạng Gold'],[15,'Bộ avatar Legends'],[20,'Bảy chủ đề ngày lễ · Avatar Lễ hội'],[21,'Thăng hạng Platinum'],[25,'OnFlame cao cấp'],[30,'Halloween · Giáng Sinh · Tết Dương · Avatar Thần tốc'],[31,'Thăng hạng Diamond'],[40,'Bộ avatar Mythic'],[41,'Thăng hạng Legend'],[60,'Cấp độ tối đa']];
const fmt=n=>Number(n||0).toLocaleString('vi-VN',{maximumFractionDigits:2});
const cosmeticOptions={
 frame:[['none','Không dùng',1],['bronze','🥉 Bronze',5],['silver','🥈 Silver',22],['gold','🥇 Gold',40],['mythic','💎 Mythic',60]],
 title:[['none','Không dùng',1],['rookie','⭐ Rookie Star',12],['wave','🏄 Wave Rider',25],['legend','👑 Dolphin Legend',50]],
 banner:[['default','Mặc định',1],['wave','🌊 Sóng Biển',15],['gold','🌟 Ánh Kim',35],['mythic','⚡ Mythic',60]]
};
const titleNames={rookie:'⭐ Rookie Star',wave:'🏄 Wave Rider',legend:'👑 Dolphin Legend'};
let mine=null;
function element(tag,text,className){const node=document.createElement(tag);if(text!==undefined)node.textContent=text;if(className)node.className=className;return node;}
function rewardCatalog(){
 return Array.isArray(mine?.rewardCatalog)&&mine.rewardCatalog.length?
  mine.rewardCatalog:rewards.map(([level,label],i)=>({id:'legacy-'+i,level,label,icon:'🎁'}));
}
function renderRewardHighlights(){
 const box=$('staff-reward-highlights');if(!box)return;
 box.replaceChildren();
 if(!mine){box.append(element('p','Đang tải phần thưởng…','hint'));return;}
 const all=rewardCatalog(),unlocked=all.filter(x=>mine.level>=x.level);
 const next=all.filter(x=>x.level>mine.level).slice(0,3);
 const last=unlocked.slice(-1),items=[...last,...next].slice(0,4);
 for(const r of items){
  const got=mine.level>=r.level;
  const cell=element('div',undefined,'reward-highlight'+(got?' is-open':''));
  cell.append(element('span',r.icon||'🎁','reward-highlight-icon'),
   element('strong',r.label),element('small','Lv.'+r.level+' · '+(got?'Đã mở':'Còn '+fmt(Math.max(0,5000*(r.level-1)**2-mine.xp))+' XP')));
  box.append(cell);
 }
}
function renderRewards(){
 const list=$('staff-reward-list');list.replaceChildren();
 const all=rewardCatalog(),next=all.find(x=>mine&&x.level>mine.level);
 $('reward-next-callout').textContent=next?
   '🎁 Tiếp theo Lv.'+next.level+': '+next.label+' · còn '+fmt(Math.max(0,5000*(next.level-1)**2-mine.xp))+' XP'
   :mine?'🏆 Đã mở toàn bộ mốc phần thưởng!':'Đang kết nối XP…';
 for(const reward of all){
  const open=!!mine&&mine.level>=reward.level,row=element('div',undefined,'reward-row'+(open?' unlocked':'')+(next?.id===reward.id?' is-next':''));
  const body=element('div');body.append(element('strong',reward.label),element('small',fmt(5000*(reward.level-1)**2)+' XP để mở khóa'));
  row.append(element('span','Lv.'+reward.level,'reward-level'),element('span',reward.icon||'🎁','reward-icon'),body,
   element('span',open?'✓ Đã mở':mine?'🔒':'—','reward-state'));
  list.appendChild(row);
 }
 renderRewardHighlights();
}
function renderCosmetics(){
 const dialog=$('style-dialog'),editing=dialog.open;
 for(const [kind,choices] of Object.entries(cosmeticOptions)){
  const select=$('staff-'+kind+'-select'),old=editing?select.value:null,current=mine?.['selected'+kind[0].toUpperCase()+kind.slice(1)];
  select.replaceChildren();
  for(const [id,label,level] of choices){
   const option=document.createElement('option');option.value=id;option.textContent=label+(level>1?' · Lv.'+level:'');
   option.disabled=!mine||mine.level<level;select.append(option);
  }
  select.value=old&&[...select.options].some(o=>o.value===old&&!o.disabled)?old:current||choices[0][0];
  select.disabled=!mine;
 }
 if(!editing)$('staff-gradient-check').checked=!!mine?.nameGradient&&mine.level>=45;
 $('staff-gradient-check').disabled=!mine||mine.level<45;
}
function activeNameTier(){
 if(!mine)return 'none';
 const level=Number(mine.level)||1;
 if(level>=60&&(mine.nameFlame||mine.nameGradient))return 'celestial';
 if(level>=45&&mine.nameGradient)return 'prism';
 if(level>=25&&mine.nameFlame)return 'inferno';
 if(level>=3&&mine.nameFlame)return 'ember';
 return 'none';
}
function renderFxGallery(){
 const active=activeNameTier();
 for(const tile of document.querySelectorAll('.crew-fx-tile[data-unlock-level]')){
  const required=Number(tile.dataset.unlockLevel)||1,unlocked=!!mine&&mine.level>=required;
  const equipped=unlocked&&(tile.dataset.fxKind==='name'?tile.dataset.fxId===active:tile.dataset.fxId===mine?.selectedFrame);
  tile.dataset.locked=String(!unlocked);tile.dataset.equipped=String(equipped);
  const badge=tile.querySelector('.crew-fx-status');
  if(badge)badge.textContent=equipped?'✦ Đang dùng':unlocked?'✓ Đã mở':'🔒 Lv.'+required;
 }
}
function previewCosmetics(){
 $('profile-avatar').dataset.frame=mine?.selectedFrame||'none';
 $('profile-name').dataset.nameFx=activeNameTier();
 $('crew-profile-banner').dataset.banner=mine?.selectedBanner||'default';
 const label=$('profile-title'),title=mine?.selectedTitle||'none';
 label.textContent=titleNames[title]||'';label.hidden=!titleNames[title];
 $('profile-name').classList.toggle('name-gradient',!!mine?.nameGradient&&mine.level>=45);
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
  $('staff-next-reward').textContent='🎁 Đang tải các mốc thưởng…';
 }else{
  $('staff-level-tag').textContent='LEVEL '+mine.level;
  $('staff-xp-summary').textContent=mine.rank+' · '+fmt(mine.xp)+' XP tích lũy';
  const floor=5000*(mine.level-1)**2,ceil=5000*mine.level**2;
  const percent=mine.level>=60?100:Math.max(0,Math.min(100,100*(mine.xp-floor)/(ceil-floor)));
  $('staff-xp-fill').style.width=percent+'%';$('staff-xp-track').setAttribute('aria-valuenow',String(Math.round(percent)));
  $('staff-next-level').textContent=mine.level>=60?'Đã đạt cấp độ tối đa':'Còn '+fmt(Math.max(0,ceil-mine.xp))+' XP đến Lv.'+(mine.level+1);
  const next=rewardCatalog().find(x=>x.level>mine.level);
  $('staff-next-reward').textContent=next?'🎁 Lv.'+next.level+' · '+next.label+' — còn '+fmt(Math.max(0,5000*(next.level-1)**2-mine.xp))+' XP':'🏆 Đã mở toàn bộ phần thưởng!';
 }
 if(!$('style-dialog').open)$('staff-flame-check').checked=!!mine?.nameFlame&&mine.level>=3;
 $('staff-save-style').disabled=!mine;$('staff-flame-check').disabled=!mine||mine.level<3;
 $('profile-name').classList.toggle('onflame',!!mine?.nameFlame&&mine.level>=3);
 $('profile-name').classList.toggle('advanced',!!mine?.nameFlame&&mine.level>=25);
 renderThemes();renderCosmetics();renderRewards();previewCosmetics();renderFxGallery();renderAdminSandbox();
}
function renderAdminSandbox(){
 const panel=$('crew-admin-sandbox');
 if(panel)panel.hidden=!(mine?.testAdmin===true&&mine.employeeId==='DOL-0001');
}
async function adminTestXP(action,amount){
 if(mine?.testAdmin!==true||mine.employeeId!=='DOL-0001')return;
 if(action==='reset'&&!window.confirm('Đặt XP về 0, Level về 1 và khóa lại các hiệu ứng đã mở? Chỉ áp dụng cho DOL-0001.'))return;
 if(action==='add'&&(!Number.isSafeInteger(amount)||amount<1||amount>1000000)){
  $('admin-test-xp-result').textContent='Nhập số XP nguyên từ 1 đến 1.000.000.';return;
 }
 const panel=$('crew-admin-sandbox');
 const buttons=[...panel.querySelectorAll('button')];
 buttons.forEach(b=>b.disabled=true);
 $('admin-test-xp-result').textContent='Đang lưu XP thử nghiệm…';
 try{
  const payload=action==='reset'?{action}:{action,amount};
  mine=await window.DolphinPrestige.call('staffAdjustOwnTestXP',payload);
  $('admin-test-xp-result').textContent=action==='reset'
   ?'Đã đặt lại XP về 0, Level 1. Bạn có thể bắt đầu thử lại.'
   :'Đã cộng '+fmt(amount)+' XP. Hiện tại: '+fmt(mine.xp)+' XP · Lv.'+mine.level;
  renderMine();renderAdminSandbox();
  await window.DolphinPrestige.refresh();
 }catch(e){
  $('admin-test-xp-result').textContent='Không lưu được XP thử nghiệm: '+String(e.message||e.code||e);
 }finally{buttons.forEach(b=>b.disabled=false);}
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
  const wasTester=mine?.testAdmin===true;
  mine=await window.DolphinPrestige.call('staffSetPersonalStyle',{
   theme,nameFlame:$('staff-flame-check').checked,nameGradient:$('staff-gradient-check').checked,
   selectedFrame:$('staff-frame-select').value,selectedTitle:$('staff-title-select').value,
   selectedBanner:$('staff-banner-select').value
  });
  mine.testAdmin=wasTester;
  try{localStorage.setItem('dolphin_personal_theme',mine.personalTheme);}catch(_){}
  window.ThemeSystem?.setTheme(mine.personalTheme);$('staff-style-info').textContent='Đã lưu giao diện theo Staff ID.';renderMine();
 }catch(e){$('staff-style-info').textContent='Không lưu được: '+e.message;}finally{btn.disabled=false;}
}
function init(){
 mine=window.DolphinPrestige?.getMine()||null;
 $('staff-save-style').onclick=save;$('staff-xp-retry').onclick=()=>window.DolphinPrestige?.refresh();
 document.querySelectorAll('[data-admin-test-add]').forEach(button=>{
  button.addEventListener('click',()=>void adminTestXP('add',Number(button.dataset.adminTestAdd)));
 });
 $('admin-test-xp-add')?.addEventListener('click',()=>void adminTestXP('add',Number($('admin-test-xp-amount').value)));
 $('admin-test-xp-reset')?.addEventListener('click',()=>void adminTestXP('reset'));
 renderMine();showStatus();
}
window.addEventListener('dolphin-my-progress-updated',e=>{mine=e.detail;renderMine();showStatus();});
window.addEventListener('dolphin-prestige-status',showStatus);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
