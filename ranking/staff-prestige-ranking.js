/* Ranking app: fixed top-1 tiles and cumulative XP/Level leaderboard.
 * Never creates a floating modal/toast; data is from existing rank rewards + staffGetPrestige.
 */
(function(){
'use strict';
const $=id=>document.getElementById(id);
const fmt=(n,max=2)=>Number(n||0).toLocaleString('vi-VN',{maximumFractionDigits:max});
let board=null,mine=null,expanded=false;
function text(id,value){const e=$(id);if(e)e.textContent=value;}
function displayAvatar(name,id,fallback){return window.DolphinAvatars?.get(name,id)||fallback||'🐬';}
// Resolve profile by verified ID when possible; keep the board's equipped
// style as fallback while the shared avatar directory is still loading.
function equippedFrame(person){
 if(!person)return 'none';
 const profile=window.DolphinAvatars?.profile?.(person.name,person.employeeId);
 const frame=profile?.selectedFrame||person.selectedFrame;
 return ['bronze','silver','gold','mythic','emerald','sapphire','nebula'].includes(frame)?frame:'none';
}
function nameFxTier(person){
 if(person?.selectedNameFx&&person.selectedNameFx!=='none')return person.selectedNameFx;
 const level=Number(person?.level)||1;
 return level>=60&&(person?.nameFlame||person?.nameGradient)?'celestial':
  level>=45&&person?.nameGradient?'prism':
  level>=25&&person?.nameFlame?'inferno':
  level>=3&&person?.nameFlame?'ember':'none';
}
function topTile(kind,nameId,valueId){
 const leader=window.DolphinRankRewards?.current(kind)?.entries?.[0];
 text(nameId,leader?.name||'Chưa có dữ liệu');
 const v=leader?.value;
 text(valueId,v==null?'Tuần này':kind==='revenue'?fmt(v,0)+' đ':fmt(v)+' điểm');
 const icon=$(kind==='revenue'?'leader-revenue-avatar':'leader-work-avatar');
 if(icon){
  const profile=leader?.name?window.DolphinAvatars?.profile?.(leader.name):null;
  if(leader?.name)icon.dataset.staffAvatar='';
  else delete icon.dataset.staffAvatar;
  icon.dataset.staffName=leader?.name||'';
  icon.dataset.staffId=profile?.employeeId||'';
  icon.textContent=leader?.name?displayAvatar(leader.name,profile?.employeeId,kind==='revenue'?'💰':'🏆'):kind==='revenue'?'💰':'🏆';
  icon.dataset.frame=equippedFrame(profile);
 icon.dataset.crewCard=profile?.selectedCardFx||'none';
 }
}
/* Landing Top Level uses the same authoritative list as the Level leaderboard.
   Only the #1 entry and its chosen public cosmetics travel to the parent. */
function publishLandingLevel(){
 if(window.parent===window)return;
 const leader=Array.isArray(board?.leaderboard)?board.leaderboard[0]||null:null;
 const current=leader?.employeeId?window.DolphinAvatars?.profile?.(leader.name,leader.employeeId):null;
 const view=leader?{
  employeeId:leader.employeeId,name:leader.name,avatar:current?.avatar||leader.avatar||'🐬',
  level:leader.level,xp:leader.xp,rank:leader.rank,
  selectedFrame:leader.selectedFrame,selectedAvatarMotion:leader.selectedAvatarMotion,
  selectedAura:leader.selectedAura,selectedTrail:leader.selectedTrail,
  selectedNameFx:leader.selectedNameFx,selectedTitle:leader.selectedTitle,
  selectedBanner:leader.selectedBanner,selectedCardFx:leader.selectedCardFx,
  personalTheme:leader.personalTheme
 }:null;
 try{window.parent.postMessage({type:'dolphin-level-leader',leader:view},location.origin);}
 catch(error){console.warn('[Level podium] sync unavailable:',error?.message||error);}
}

function renderTiles(){
 topTile('revenue','leader-revenue-name','leader-revenue-value');
 topTile('work','leader-work-name','leader-work-value');
 const champion=board?.champion;
 text('leader-emperor-avatar',champion?displayAvatar(champion.name,champion.employeeId,champion.avatar):'👑');
 if(champion)$('leader-emperor-avatar').dataset.staffAvatar='';
 else delete $('leader-emperor-avatar').dataset.staffAvatar;
 $('leader-emperor-avatar').dataset.staffName=champion?.name||'';
 $('leader-emperor-avatar').dataset.staffId=champion?.employeeId||'';
 $('leader-emperor-avatar').dataset.frame=equippedFrame(champion);
 $('leader-emperor-avatar').dataset.avatarMotion=champion?.selectedAvatarMotion||'none';
 $('leader-emperor-avatar').dataset.crewAura=champion?.selectedAura||'none';
 $('leader-emperor-avatar').dataset.crewTrail=champion?.selectedTrail||'none';
 $('leader-emperor-avatar').dataset.crewCard=champion?.selectedCardFx||'none';
 text('leader-emperor-name',champion?.name||'Chưa có danh hiệu');
 if($('leader-emperor-name')){$('leader-emperor-name').dataset.nameFx=nameFxTier(champion);$('leader-emperor-name').dataset.crewTrail=champion?.selectedTrail||'none';}
 const emperorTile=$('leader-emperor-avatar').closest('.leader-tile');
 if(emperorTile){emperorTile.dataset.banner=champion?.selectedBanner||'default';emperorTile.dataset.crewCard=champion?.selectedCardFx||'none';}
 text('leader-emperor-value',champion?'Lv.'+Number(champion.level||1)+' · '+fmt(champion.xp)+' XP':'XP tích lũy');
 window.DolphinFrameFX?.refresh?.();
}
function el(tag,cls,value){
 const e=document.createElement(tag);if(cls)e.className=cls;if(value!==undefined)e.textContent=String(value);
 return e;
}
function renderLevel(){
 const list=$('level-board-list'),more=$('level-board-more'),legends=$('level-legendary-list');
 if(!list||!more||!legends)return;
 const rows=Array.isArray(board?.leaderboard)?board.leaderboard:[];
 list.replaceChildren();
 for(const [i,p] of rows.slice(0,expanded?25:5).entries()){
  const own=p.employeeId===window.DolphinStaffId?.get?.()?.employeeId;
  const item=el('div','level-entry'+(own?' is-me':''));
  const rank=el('span','level-position',i===0?'♛':i+1);
  const avatar=el('span','level-avatar',displayAvatar(p.name,p.employeeId,p.avatar));avatar.setAttribute('aria-hidden','true');avatar.dataset.staffAvatar='';avatar.dataset.staffName=p.name||'';avatar.dataset.staffId=p.employeeId||'';avatar.dataset.frame=equippedFrame(p);avatar.dataset.crewAura=p.selectedAura||'none';avatar.dataset.crewTrail=p.selectedTrail||'none';avatar.dataset.avatarMotion=p.selectedAvatarMotion||'none';avatar.dataset.crewCard=p.selectedCardFx||'none';
  const person=el('span','level-person');
  const nameLabel=el('strong','level-person-name',String(p.name||'Nhân viên')+(own?' · Bạn':''));
  nameLabel.dataset.nameFx=nameFxTier(p);nameLabel.dataset.crewTrail=p.selectedTrail||'none';
  nameLabel.classList.toggle('crew-name-flame',!!p.nameFlame);
  nameLabel.classList.toggle('crew-name-gradient',!!p.nameGradient);
  person.append(nameLabel,el('small','level-person-rank',({rookie:'⭐ Rookie Star',wave:'🏄 Wave Rider',legend:'👑 Dolphin Legend',navigator:'🧭 Ocean Navigator',guardian:'🛡️ Coral Guardian',titan:'⚔️ Tidal Titan',emperor:'👑 Abyss Emperor'})[p.selectedTitle]||p.rank||'Dolphin Crew'));
  const score=el('span','level-score','Lv.'+Number(p.level||1));
  score.append(el('small','level-score-xp',fmt(p.xp)+' XP'));
  item.append(rank,avatar,person,score);list.append(item);
 }
 if(!rows.length)list.append(el('p','empty',board?'Chưa có XP được ghi nhận.':'Đang tải bảng xếp hạng Level…'));
 more.hidden=rows.length<=5;
 more.textContent=expanded?'Thu gọn':'Xem thêm '+(Math.min(25,rows.length)-5)+' nhân viên';
 legends.replaceChildren();
 const history=Array.isArray(board?.legends)?board.legends:[];
 for(const p of history){
  const item=el('div','legendary-entry');
  item.append(el('span','',String(p.avatar||'🏅')+' '+String(p.name||'Nhân viên')+' · Lv.'+Number(p.level||1)));
  const when=Number(p.firstAt||0),date=when?new Date(when).toLocaleDateString('vi-VN'):'';
  item.append(el('small','',date?'Lần đầu dẫn đầu · '+date:'Đã được vinh danh'));
  legends.append(item);
 }
 if(!history.length)legends.append(el('p','empty','Chưa có nhân viên được ghi danh.'));
 window.DolphinFrameFX?.refresh?.();
}
function init(){
 document.querySelectorAll('[data-rank-target]').forEach(button=>{
  button.addEventListener('click',()=>window.switchMain?.(button.dataset.rankTarget));
 });
 $('level-board-more')?.addEventListener('click',()=>{expanded=!expanded;renderLevel();});
 board=window.DolphinPrestige?.getBoard?.()||null;
 mine=window.DolphinPrestige?.getMine?.()||null;
 renderTiles();renderLevel();publishLandingLevel();
}
window.addEventListener('dolphinRankRewardsUpdated',renderTiles);
window.DolphinAvatars?.subscribe?.(()=>{renderTiles();renderLevel();publishLandingLevel();});
window.addEventListener('dolphin-prestige-updated',event=>{board=event.detail;renderTiles();renderLevel();publishLandingLevel();});
window.addEventListener('dolphin-my-progress-updated',event=>{mine=event.detail;renderLevel();});
window.addEventListener('dolphin-prestige-status',event=>{
 if(event.detail?.scope==='board'&&event.detail.state==='error'&&!board){
  text('leader-emperor-name','Chưa thể tải');
  const list=$('level-board-list');if(list)list.textContent='Chưa tải được Level/XP. Hãy thử tải lại trang.';
 }
});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
