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
function topTile(kind,nameId,valueId){
 const leader=window.DolphinRankRewards?.current(kind)?.entries?.[0];
 text(nameId,leader?.name||'Chưa có dữ liệu');
 const v=leader?.value;
 text(valueId,v==null?'Tuần này':kind==='revenue'?fmt(v,0)+' đ':fmt(v)+' điểm');
 const icon=$(kind==='revenue'?'leader-revenue-avatar':'leader-work-avatar');
 if(icon){
  const profile=leader?.name?window.DolphinAvatars?.profile?.(leader.name):null;
  icon.dataset.staffName=leader?.name||'';
  icon.dataset.staffId=profile?.employeeId||'';
  icon.textContent=leader?.name?displayAvatar(leader.name,profile?.employeeId,kind==='revenue'?'💰':'🏆'):kind==='revenue'?'💰':'🏆';
 }
}
function renderTiles(){
 topTile('revenue','leader-revenue-name','leader-revenue-value');
 topTile('work','leader-work-name','leader-work-value');
 const champion=board?.champion;
 text('leader-emperor-avatar',champion?displayAvatar(champion.name,champion.employeeId,champion.avatar):'👑');
 text('leader-emperor-name',champion?.name||'Chưa có danh hiệu');
 text('leader-emperor-value',champion?'Lv.'+Number(champion.level||1)+' · '+fmt(champion.xp)+' XP':'XP tích lũy');
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
  const avatar=el('span','level-avatar',displayAvatar(p.name,p.employeeId,p.avatar));avatar.setAttribute('aria-hidden','true');avatar.dataset.staffAvatar='';avatar.dataset.staffName=p.name||'';avatar.dataset.staffId=p.employeeId||'';avatar.dataset.frame=p.selectedFrame||'none';
  const person=el('span','level-person');
  person.append(el('strong','level-person-name',String(p.name||'Nhân viên')+(own?' · Bạn':'')),el('small','level-person-rank',({rookie:'⭐ Rookie Star',wave:'🏄 Wave Rider',legend:'👑 Dolphin Legend'})[p.selectedTitle]||p.rank||'Dolphin Crew'));
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
}
function init(){
 document.querySelectorAll('[data-rank-target]').forEach(button=>{
  button.addEventListener('click',()=>window.switchMain?.(button.dataset.rankTarget));
 });
 $('level-board-more')?.addEventListener('click',()=>{expanded=!expanded;renderLevel();});
 board=window.DolphinPrestige?.getBoard?.()||null;
 mine=window.DolphinPrestige?.getMine?.()||null;
 renderTiles();renderLevel();
}
window.addEventListener('dolphinRankRewardsUpdated',renderTiles);
window.DolphinAvatars?.subscribe?.(()=>{renderTiles();renderLevel();});
window.addEventListener('dolphin-prestige-updated',event=>{board=event.detail;renderTiles();renderLevel();});
window.addEventListener('dolphin-my-progress-updated',event=>{mine=event.detail;renderLevel();});
window.addEventListener('dolphin-prestige-status',event=>{
 if(event.detail?.scope==='board'&&event.detail.state==='error'&&!board){
  text('leader-emperor-name','Chưa thể tải');
  const list=$('level-board-list');if(list)list.textContent='Chưa tải được Level/XP. Hãy thử tải lại trang.';
 }
});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
