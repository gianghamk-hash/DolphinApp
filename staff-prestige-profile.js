(function(){
'use strict';
const $=id=>document.getElementById(id);
const themes={dark:'Dark',light:'Light',gray:'Gray',default:'🐬 Dolphin',spring:'🌸 Mùa Xuân',summer:'☀️ Mùa Hè',autumn:'🍁 Mùa Thu',winter:'❄️ Mùa Đông',tet:'🧧 Tết',valentine:'💝 Valentine',womenday:'🌷 Phụ Nữ',reunification:'⭐ 30/4',children:'🎈 Thiếu Nhi',nationalday:'⭐ Quốc Khánh',midautumn:'🏮 Trung Thu',halloween:'🎃 Halloween',christmas:'🎄 Giáng Sinh',newyear:'🎊 Tết Dương Lịch',abyss:'🌊 Vực Sâu',aurora:'🌌 Cực Quang',coral:'🪸 San Hô',neon:'💠 Cyber Neon',cosmic:'🪐 Ngân Hà',royal:'👑 Hoàng Gia',obsidian:'🖤 Obsidian'};
const themeLevels={default:8,spring:10,summer:10,autumn:10,winter:10,tet:20,valentine:20,womenday:20,reunification:20,children:20,nationalday:20,midautumn:20,halloween:30,christmas:30,newyear:30,abyss:4,aurora:12,coral:18,neon:28,cosmic:36,royal:48,obsidian:55};
const rewards=[[1,'Avatar cơ bản · Bronze'],[3,'Tên phát sáng OnFlame · Avatar Khám phá'],[5,'Bộ avatar Ocean'],[6,'Thăng hạng Silver'],[8,'Chủ đề Dolphin'],[10,'Bốn chủ đề mùa · Avatar Phiêu lưu'],[11,'Thăng hạng Gold'],[15,'Bộ avatar Legends'],[20,'Bảy chủ đề ngày lễ · Avatar Lễ hội'],[21,'Thăng hạng Platinum'],[25,'OnFlame cao cấp'],[30,'Halloween · Giáng Sinh · Tết Dương · Avatar Thần tốc'],[31,'Thăng hạng Diamond'],[40,'Bộ avatar Mythic'],[41,'Thăng hạng Legend'],[60,'Cấp độ tối đa']];
const XP_RATE=2450; // Must match functions/staff-xp-engine.cjs
const xpAt=level=>XP_RATE*(level-1)**2;
const fmt=n=>Number(n||0).toLocaleString('vi-VN',{maximumFractionDigits:2});
const cosmeticOptions={avatarMotion:[['none','Tắt chuyển động',1],['pulse','💗 Soft Pulse',3],['float','🪶 Floating',10],['wave','🌊 Wave Spin',20],['orbit','🪐 Energy Orbit',30],['prism','🌈 Prism Flicker',45],['ascension','👑 Mythic Ascension',60],['comet','☄️ Comet Dash',6],['tide','🌊 Tidal Surge',14],['vortex','🌀 Vortex Gate',24],['phoenix','🔥 Phoenix Rebirth',36],['supernova','🌠 Supernova Burst',52]],frame:[['none','Không dùng',1],['bronze','🥉 Bronze',5],['silver','🥈 Silver',22],['gold','🥇 Gold',40],['mythic','💎 Mythic',60],['emerald','🟢 Emerald',12],['sapphire','🔷 Sapphire',28],['nebula','🌌 Nebula',48]],title:[['none','Không dùng',1],['rookie','⭐ Rookie Star',12],['wave','🏄 Wave Rider',25],['legend','👑 Dolphin Legend',50],['navigator','🧭 Ocean Navigator',7],['guardian','🛡️ Coral Guardian',20],['titan','⚔️ Tidal Titan',36],['emperor','👑 Abyss Emperor',55]],banner:[['default','Mặc định',1],['wave','🌊 Sóng Biển',15],['gold','🌟 Ánh Kim',35],['mythic','⚡ Mythic',60],['abyss','🌊 Deep Sea',4],['aurora','🌌 Aurora',12],['neon','💠 Cyber Neon',28],['cosmic','🪐 Cosmic',48]],nameFx:[['none','Tắt hiệu ứng tên',1],['ember','🔥 Lửa nhỏ',3],['inferno','🔥 Hỏa diệm',25],['prism','🌈 Quang phổ',45],['celestial','✨ Thiên quang',60],['tide','🌊 Tidal Glow',12],['nova','🌟 Nova',36],['royal','👑 Royal',55]],aura:[['none','Tắt hào quang',1],['spark','💫 Spark Ring I',3],['dual','💫 Dual Halo II',25],['celestial','💫 Celestial Pulse III',60],['ripple','💠 Ripple',6],['nebula','🌌 Nebula',36],['stardust','✨ Stardust',52]],trail:[['none','Tắt vệt sao',1],['wave','☄️ Wave Shine I',3],['comet','☄️ Twin Comet II',25],['nova','☄️ Royal Nova III',60],['stardust','✨ Stardust',12],['meteor','☄️ Meteor',36],['starfall','🌠 Starfall',55]],cardFx:[['none','Tắt thẻ hiệu ứng',1],['soft','✨ Soft Glow I',3],['energy','✨ Energy Border II',25],['mythic','✨ Mythic Shimmer III',60],['ocean','🌊 Ocean Edge',12],['prism','🌈 Prism Edge',36],['aurora','🌌 Aurora Edge',52]]};
const titleNames={rookie:'⭐ Rookie Star',wave:'🏄 Wave Rider',legend:'👑 Dolphin Legend',navigator:'🧭 Ocean Navigator',guardian:'🛡️ Coral Guardian',titan:'⚔️ Tidal Titan',emperor:'👑 Abyss Emperor'};
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
   element('strong',r.label),element('small','Lv.'+r.level+' · '+(got?'Đã mở':'Còn '+fmt(Math.max(0,xpAt(r.level)-mine.xp))+' XP')));
  box.append(cell);
 }
}
function renderRewards(){
 const list=$('staff-reward-list');list.replaceChildren();
 const all=rewardCatalog(),next=all.find(x=>mine&&x.level>mine.level);
 $('reward-next-callout').textContent=next?
   '🎁 Tiếp theo Lv.'+next.level+': '+next.label+' · còn '+fmt(Math.max(0,xpAt(next.level)-mine.xp))+' XP'
   :mine?'🏆 Đã mở toàn bộ mốc phần thưởng!':'Đang kết nối XP…';
 for(const reward of all){
  const open=!!mine&&mine.level>=reward.level,row=element('div',undefined,'reward-row'+(open?' unlocked':'')+(next?.id===reward.id?' is-next':''));
  const body=element('div');body.append(element('strong',reward.label),element('small',fmt(xpAt(reward.level))+' XP để mở khóa'));
  row.append(element('span','Lv.'+reward.level,'reward-level'),element('span',reward.icon||'🎁','reward-icon'),body,
   element('span',open?'✓ Đã mở':mine?'🔒':'—','reward-state'));
  list.appendChild(row);
 }
 renderRewardHighlights();
}
function renderCosmetics(){
 const dialog=$('style-dialog'),editing=dialog.open;
 for(const [kind,choices] of Object.entries(cosmeticOptions)){
  const select=$('staff-'+kind+'-select');if(!select)continue;
  const old=editing?select.value:null,current=mine?.['selected'+kind[0].toUpperCase()+kind.slice(1)];
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
 if(typeof mine.selectedNameFx==='string')return mine.selectedNameFx;
 const level=Number(mine.level)||1;
 if(level>=60&&(mine.nameFlame||mine.nameGradient))return 'celestial';
 if(level>=45&&mine.nameGradient)return 'prism';
 if(level>=25&&mine.nameFlame)return 'inferno';
 if(level>=3&&mine.nameFlame)return 'ember';
 return 'none';
}
/* Render every option as a real animated preview, irrespective of Level.
 * The hidden select remains the single selection source for the existing
 * validated staffSetPersonalStyle Cloud Function; cards replace dropdown UI. */
const effectLabels={
 nameFx:'Tên phát sáng',trail:'Vệt sao',frame:'Khung Avatar',avatarMotion:'Chuyển động Avatar',
 aura:'Hào quang Avatar',title:'Danh hiệu',banner:'Banner',cardFx:'Viền thẻ'
};
function makeEffectPreview(kind,id,label){
 const stage=element('span',undefined,'crew-fx-stage');
 let preview;
 if(kind==='frame'){
  preview=element('span','🐬','fx-frame-preview');
  preview.dataset.frame=id;
 }else if(kind==='nameFx'){
  preview=element('span','Dolphin','fx-name-preview');
  preview.dataset.nameFx=id;
 }else if(kind==='trail'){
  preview=element('span','Dolphin','fx-name-preview fx-trail-preview');
  preview.dataset.crewTrail=id;
 }else if(kind==='avatarMotion'){
  preview=element('span','🐬','fx-aura-preview fx-motion-preview');
  preview.dataset.avatarMotion=id;
 }else if(kind==='aura'){
  preview=element('span','🐬','fx-aura-preview');
  preview.dataset.crewAura=id;
 }else if(kind==='cardFx'){
  preview=element('span','DOLPHIN','fx-card-preview');
  preview.dataset.crewCard=id;
 }else if(kind==='banner'){
  preview=element('span','🐬 DOLPHIN','fx-banner-preview');
  preview.dataset.banner=id;
 }else{
  preview=element('span',id==='none'?'Không danh hiệu':label,'fx-title-preview');
  preview.dataset.title=id;
 }
 preview.setAttribute('aria-hidden','true');
 stage.append(preview);
 return stage;
}
function initEffectLibrary(){
 for(const [kind,choices] of Object.entries(cosmeticOptions)){
  const gallery=document.querySelector('[data-crew-gallery="'+kind+'"]');
  if(!gallery)continue;
  gallery.replaceChildren();
  for(const [id,label,level] of choices){
   const tile=element('button',undefined,'crew-fx-tile crew-fx-choice');
   tile.type='button';
   tile.dataset.unlockLevel=String(level);
   tile.dataset.fxKind=kind;
   tile.dataset.fxId=id;
   tile.setAttribute('aria-pressed','false');
   tile.setAttribute('aria-label',effectLabels[kind]+': '+label+(level>1?', mở ở Level '+level:''));
   tile.append(makeEffectPreview(kind,id,label),element('strong',label,'crew-fx-label'));
   tile.append(element('small',level>1?'Lv.'+level+' · Xem trước trực tiếp':'Mặc định · Xem trước trực tiếp','crew-fx-level'));
   tile.append(element('span','🔒 Lv.'+level,'crew-fx-status'));
   tile.addEventListener('click',()=>{
    const unlocked=!!mine&&mine.level>=level;
    if(!unlocked){
     $('crew-effect-selection-status').textContent=!mine?
      'Đăng ký hoặc liên kết Staff ID để trang bị hiệu ứng.':
      '🔒 '+label+' mở ở Level '+level+'. Bạn có thể xem trước hiệu ứng nhưng chưa trang bị được.';
     return;
    }
    const select=$('staff-'+kind+'-select');
    if(!select)return;
    select.value=id;
    renderFxGallery();
    $('crew-effect-selection-status').textContent='✓ Đã chọn '+label+' — bấm Lưu giao diện để áp dụng trên mọi thiết bị.';
   });
   gallery.append(tile);
  }
 }
 for(const tab of document.querySelectorAll('[data-crew-tab]')){
  tab.addEventListener('click',()=>showEffectTab(tab.dataset.crewTab));
  tab.addEventListener('keydown',event=>{
   if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
   event.preventDefault();
   const tabs=[...document.querySelectorAll('[data-crew-tab]')],i=tabs.indexOf(tab);
   const next=event.key==='Home'?0:event.key==='End'?tabs.length-1:
    (i+(event.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;
   tabs[next].focus();showEffectTab(tabs[next].dataset.crewTab);
  });
 }
 showEffectTab('name');
 window.DolphinFrameFX?.refresh?.();
}
function showEffectTab(group){
 for(const tab of document.querySelectorAll('[data-crew-tab]')){
  const active=tab.dataset.crewTab===group;
  tab.setAttribute('aria-selected',String(active));
  tab.tabIndex=active?0:-1;
 }
 for(const panel of document.querySelectorAll('[data-crew-panel]'))
  panel.hidden=panel.dataset.crewPanel!==group;
 window.DolphinFrameFX?.refresh?.();
}
function renderFxGallery(){
 for(const tile of document.querySelectorAll('.crew-fx-choice[data-unlock-level]')){
  const kind=tile.dataset.fxKind,id=tile.dataset.fxId;
  const level=Number(tile.dataset.unlockLevel)||1;
  const unlocked=!!mine&&mine.level>=level;
  const selected=$('staff-'+kind+'-select')?.value===id;
  const equipped=unlocked&&selected;
  tile.dataset.locked=String(!unlocked);
  tile.dataset.equipped=String(equipped);
  tile.setAttribute('aria-pressed',String(equipped));
  const badge=tile.querySelector('.crew-fx-status');
  if(badge)badge.textContent=equipped?'✦ Đã chọn':unlocked?'✓ Đã mở':'🔒 Lv.'+level+' · Xem trước';
 }
}

function previewCosmetics(){
 $('profile-avatar').dataset.frame=mine?.selectedFrame||'none';
 $('profile-avatar').dataset.avatarMotion=mine?.selectedAvatarMotion||'none';
 $('profile-avatar').dataset.crewAura=mine?.selectedAura||'none';
 $('profile-avatar').dataset.crewTrail=mine?.selectedTrail||'none';
 $('crew-profile-banner').dataset.crewCard=mine?.selectedCardFx||'none';
 // Refresh V4 orbital layers immediately after the equipped frame changes.
 window.DolphinFrameFX?.refresh?.();
 $('profile-name').dataset.nameFx=activeNameTier();
 $('profile-name').dataset.crewTrail=mine?.selectedTrail||'none';
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

// Daily quests use the same server-confirmed identity and progress as Level/XP.
let dailyCheckinBusy=false;
function showDailyStatus(message,error=false){
 const node=$('staff-daily-message');
 if(node){node.textContent=message;node.dataset.error=String(error);}
}
function dailyElement(tag,value,className){
 return element(tag,value,className);
}
function renderDailyMissions(){
 const list=$('staff-daily-list');
 if(!list)return;
 list.replaceChildren();
 const daily=mine?.dailyMissions;
 if(daily?.dailyTopUpXP>0)showDailyStatus('✅ Đã tự động bù +'+fmt(daily.dailyTopUpXP)+' XP cho các nhiệm vụ trong ngày theo mức thưởng mới.');
 if(!daily||!Array.isArray(daily.tasks)){
  const empty=dailyElement('p',mine?'Máy chủ đang cập nhật nhiệm vụ hằng ngày. Vui lòng thử lại.':'Đăng ký và xác minh Staff ID để nhận nhiệm vụ.','hint');
  list.append(empty);
  $('staff-daily-counter').textContent='0/8';
  $('staff-daily-track').setAttribute('aria-valuenow','0');
  $('staff-daily-fill').style.width='0%';
  $('staff-daily-streak').textContent='🔥 Chuỗi điểm danh: —';
  $('staff-daily-earned').textContent='⭐ +0 XP hôm nay';
  return;
 }
 const count=Math.max(0,Math.min(daily.total||8,Number(daily.completedCount)||0));
 $('staff-daily-counter').textContent=count+'/'+(daily.total||8);
 $('staff-daily-fill').style.width=(100*count/(daily.total||8))+'%';
 $('staff-daily-track').setAttribute('aria-valuenow',String(count));
 $('staff-daily-streak').textContent='🔥 Chuỗi: '+daily.streak+' ngày · Kỷ lục '+daily.bestStreak;
 $('staff-daily-earned').textContent='⭐ +'+fmt(daily.todayXP)+' XP hôm nay';
 for(const task of daily.tasks){
  const item=dailyElement('div',undefined,'daily-task');item.dataset.done=String(task.done);
  const icon=dailyElement('span',task.icon,'daily-task-icon');
  icon.setAttribute('aria-hidden','true');
  const body=dailyElement('div',undefined,'daily-task-body');
  body.append(dailyElement('strong',task.title),dailyElement('small',task.description));
  const right=dailyElement('div',undefined,'daily-task-right');
  right.append(dailyElement('span','+'+fmt(task.xp)+' XP','daily-task-xp'));
  if(task.id==='checkin'&&!task.done){
   const button=dailyElement('button','Điểm danh','daily-task-checkin');
   button.type='button';button.disabled=dailyCheckinBusy;
   button.setAttribute('aria-label','Điểm danh để nhận '+fmt(task.xp)+' XP');
   button.addEventListener('click',()=>void checkInDaily());
   right.append(button);
  }else if(['snake_100','game2048_1000'].includes(task.id)&&!task.done){
    const link=dailyElement('a','Chơi ngay','daily-task-checkin');
    link.href=task.id==='snake_100'?'./giaitri/games/snake.html':'./giaitri/games/game2048.html';
    link.setAttribute('aria-label','Chơi '+task.title+' để nhận '+fmt(task.xp)+' XP');
    right.append(link);
   }else right.append(dailyElement('span',task.done?'✓ Hoàn thành':'Chưa hoàn thành','daily-task-state'));
  item.append(icon,body,right);list.append(item);
 }
}
async function checkInDaily(){
 if(dailyCheckinBusy||!mine?.employeeId)return;
 dailyCheckinBusy=true;renderDailyMissions();showDailyStatus('Đang xác nhận điểm danh…');
 try{
  const result=await window.DolphinPrestige.call('staffCheckInDaily',{});
  if(result?.missions){
   mine={...mine,dailyMissions:result.missions};
   renderDailyMissions();
  }
  showDailyStatus(result?.awarded
   ?'🎉 Điểm danh thành công! +'+fmt(result.addedXP)+' XP. Chuỗi hiện tại: '+result.missions.streak+' ngày.'
   :'Hôm nay đã điểm danh. Hãy quay lại vào ngày mai.');
  await window.DolphinPrestige.refresh();
 }catch(e){showDailyStatus('Không thể điểm danh: '+String(e.message||e.code||'Lỗi kết nối').slice(0,130),true);}
 finally{dailyCheckinBusy=false;renderDailyMissions();}
}
function vietnamToday(){
 return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Ho_Chi_Minh',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
}

function renderMine(){
 if(!mine){
  $('staff-level-tag').textContent='LEVEL —';$('staff-next-level').textContent='XP được lưu theo Staff ID';
  $('staff-xp-fill').style.width='0%';$('staff-xp-track').setAttribute('aria-valuenow','0');
  $('staff-next-reward').textContent='🎁 Đang tải các mốc thưởng…';
 }else{
  $('staff-level-tag').textContent='LEVEL '+mine.level;
  $('staff-xp-summary').textContent=mine.rank+' · '+fmt(mine.xp)+' XP tích lũy';
  const floor=xpAt(mine.level),ceil=xpAt(mine.level+1);
  const percent=mine.level>=60?100:Math.max(0,Math.min(100,100*(mine.xp-floor)/(ceil-floor)));
  $('staff-xp-fill').style.width=percent+'%';$('staff-xp-track').setAttribute('aria-valuenow',String(Math.round(percent)));
  $('staff-next-level').textContent=mine.level>=60?'Đã đạt cấp độ tối đa':'Còn '+fmt(Math.max(0,ceil-mine.xp))+' XP đến Lv.'+(mine.level+1);
  const next=rewardCatalog().find(x=>x.level>mine.level);
  $('staff-next-reward').textContent=next?'🎁 Lv.'+next.level+' · '+next.label+' — còn '+fmt(Math.max(0,xpAt(next.level)-mine.xp))+' XP':'🏆 Đã mở toàn bộ phần thưởng!';
 }
 if(!$('style-dialog').open)$('staff-flame-check').checked=!!mine?.nameFlame&&mine.level>=3;
 $('staff-save-style').disabled=!mine;$('staff-flame-check').disabled=!mine||mine.level<3;
 $('profile-name').classList.toggle('onflame',!!mine?.nameFlame&&mine.level>=3);
 $('profile-name').classList.toggle('advanced',!!mine?.nameFlame&&mine.level>=25);
 renderThemes();renderCosmetics();renderRewards();renderDailyMissions();previewCosmetics();renderFxGallery();renderAdminSandbox();
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
   theme,nameFlame:$('staff-nameFx-select').value!=='none',nameGradient:['prism','celestial'].includes($('staff-nameFx-select').value),
   selectedFrame:$('staff-frame-select').value,selectedAvatarMotion:$('staff-avatarMotion-select').value,selectedTitle:$('staff-title-select').value,
   selectedBanner:$('staff-banner-select').value,
   selectedNameFx:$('staff-nameFx-select').value,selectedAura:$('staff-aura-select').value,
   selectedTrail:$('staff-trail-select').value,selectedCardFx:$('staff-cardFx-select').value
  });
  mine.testAdmin=wasTester;
  try{localStorage.setItem('dolphin_personal_theme',mine.personalTheme);}catch(_){}
  window.ThemeSystem?.setTheme(mine.personalTheme);$('staff-style-info').textContent='Đã lưu giao diện theo Staff ID.';renderMine();
 }catch(e){$('staff-style-info').textContent='Không lưu được: '+e.message;}finally{btn.disabled=false;}
}
function init(){
 mine=window.DolphinPrestige?.getMine()||null;
 initEffectLibrary();
 $('staff-save-style').onclick=save;$('staff-xp-retry').onclick=()=>window.DolphinPrestige?.refresh();
 document.querySelectorAll('[data-admin-test-add]').forEach(button=>{
  button.addEventListener('click',()=>void adminTestXP('add',Number(button.dataset.adminTestAdd)));
 });
 $('admin-test-xp-add')?.addEventListener('click',()=>void adminTestXP('add',Number($('admin-test-xp-amount').value)));
 $('admin-test-xp-reset')?.addEventListener('click',()=>void adminTestXP('reset'));
 renderMine();showStatus();
 setInterval(()=>{if(!document.hidden&&mine?.dailyMissions?.date&&mine.dailyMissions.date!==vietnamToday())void window.DolphinPrestige?.refresh();},30000);
}
window.addEventListener('dolphin-my-progress-updated',e=>{mine=e.detail;renderMine();showStatus();});
window.addEventListener('dolphin-prestige-status',showStatus);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
