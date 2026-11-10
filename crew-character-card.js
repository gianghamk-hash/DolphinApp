/* DOLPHIN CREW CLUB 2.0 — read-only Character Card presentation.
 * Never writes to Firebase, local XP, equipped styles or Staff IDs.
 * The existing Prestige engine and staff-profile scripts own all those values.
 */
(function(root){
 'use strict';
 const XP_COEFFICIENT=2450,MAX_LEVEL=60;
 const rankNames=Object.freeze(['bronze','silver','gold','platinum','diamond','legend']);
 const rankBands=Object.freeze([{min:41,name:'legend'},{min:31,name:'diamond'},{min:21,name:'platinum'},
  {min:11,name:'gold'},{min:6,name:'silver'},{min:1,name:'bronze'}]);
 const equipment=Object.freeze({
  frame:Object.freeze({none:'Chưa chọn',bronze:'Bronze',silver:'Silver',gold:'Gold',mythic:'Mythic',emerald:'Emerald',sapphire:'Sapphire',nebula:'Nebula'}),
  aura:Object.freeze({none:'Chưa chọn',spark:'Spark Ring',dual:'Dual Halo',celestial:'Celestial',ripple:'Ripple',nebula:'Nebula',stardust:'Stardust'}),
  motion:Object.freeze({none:'Chưa chọn',pulse:'Soft Pulse',float:'Floating',wave:'Wave Spin',orbit:'Energy Orbit',prism:'Prism',ascension:'Ascension',comet:'Comet Dash',tide:'Tidal Surge',vortex:'Vortex',phoenix:'Phoenix',supernova:'Supernova'}),
  title:Object.freeze({none:'Chưa chọn',rookie:'Rookie Star',wave:'Wave Rider',legend:'Dolphin Legend',navigator:'Ocean Navigator',guardian:'Coral Guardian',titan:'Tidal Titan',emperor:'Abyss Emperor'})
 });
 const $=id=>document.getElementById(id);
 const value=(v,fallback)=>typeof v==='string'&&v.trim()?v:fallback;
 const safeNumber=v=>typeof v==='number'&&Number.isFinite(v)&&v>=0?v:0;
 const xpAt=level=>XP_COEFFICIENT*(level-1)*(level-1);
 function model(profile){
  if(!profile||typeof profile!=='object'||!profile.employeeId)
   return {ready:false,level:0,rank:'bronze',rankName:'BRONZE',percent:0,preserved:false,
    equipped:{frame:'Chưa trang bị',aura:'Chưa trang bị',motion:'Chưa trang bị',title:'Chưa trang bị'}};
  const xp=safeNumber(profile.xp);
  const level=Math.min(MAX_LEVEL,Math.max(1,Math.trunc(Number(profile.level)||1)));
  const official=String(profile.rank||'').toLowerCase();
  const rank=rankNames.includes(official)?official:rankBands.find(t=>level>=t.min).name;
  const highestLevel=Math.min(MAX_LEVEL,Math.max(level,Number(profile.highestLevel||profile.levelPeak)||1));
  const preserved=highestLevel>level;
  const progress=level===MAX_LEVEL?100:Math.max(0,Math.min(100,
   100*(xp-xpAt(level))/(xpAt(level+1)-xpAt(level))));
  const selected={frame:value(profile.selectedFrame,'none'),aura:value(profile.selectedAura,'none'),
   motion:value(profile.selectedAvatarMotion,'none'),title:value(profile.selectedTitle,'none')};
  const equipped={};
  for(const type of Object.keys(selected))equipped[type]=equipment[type][selected[type]]||'Chưa chọn';
  return {ready:true,level,rank,rankName:rank.toUpperCase(),percent:Math.round(progress),
   preserved,highestLevel,xp,employeeId:String(profile.employeeId),equipped};
 }
 function set(id,text){const el=$(id);if(el)el.textContent=text;}
 function render(profile){
  const host=$('crew-profile-banner');if(!host)return;
  const staff=root.DolphinStaffId?.get?.();
  // Switching devices/accounts cannot show an old employee's premium card.
  if(profile?.employeeId&&staff?.employeeId&&profile.employeeId!==staff.employeeId)profile=null;
  const state=model(profile);
  host.dataset.crewRank=state.rank;
  set('crew-card-rank-badge',state.ready?state.rankName+' RANK':'CREW CARD');
  set('crew-card-rank-name',state.ready?state.rankName:'BRONZE');
  set('crew-card-level-number',state.ready?String(state.level):'—');
  set('crew-card-portrait-bottom',state.ready?state.rankName+' CREW':'CREW MEMBER');
  for(const type of Object.keys(state.equipped))set('crew-card-equipped-'+type,state.equipped[type]);
  const dial=$('crew-card-xp-dial');
  if(dial){
   dial.style.setProperty('--crew-progress',state.percent+'%');
   dial.title=state.preserved?'Level hiện tại theo XP. Mốc cao nhất từng đạt: Level '+state.highestLevel+'. Hiệu ứng vượt cấp hiện bị khóa và sẽ mở lại khi đủ XP.':
    state.ready?'Đã hoàn thành '+state.percent+'% tiến độ đến cấp kế tiếp.':'Đang tải XP đã xác minh.';
  }
  const percent=$('crew-card-xp-percent');
  if(percent)percent.textContent=state.ready?(state.level===MAX_LEVEL?'MAX · 60':state.percent+'%'):'0%';
  host.setAttribute('aria-label',state.ready?
   'Thẻ Dolphin Crew Club, '+state.rankName+', Level '+state.level+', '+state.employeeId:
   'Thẻ Dolphin Crew Club, chưa tải được hồ sơ đã xác minh');
 }
 function renderCurrent(){render(root.DolphinPrestige?.getMine?.()||null);}
 root.DolphinCrewCharacter=Object.freeze({model,render});
 root.addEventListener('dolphin-my-progress-updated',event=>render(event.detail));
 root.addEventListener('dolphin-staff-id-changed',()=>{
  // Identity and progress are refreshed independently; avoid momentary mismatch.
  renderCurrent();
 });
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',renderCurrent);
 else renderCurrent();
})(window);
