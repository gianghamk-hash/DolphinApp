/* Dolphin Crew Club 2.0 — cinematic, read-only Level Up.
 * Never changes XP/Level/cosmetics or acknowledges rewards in Firebase.
 * Reuses the existing per-Staff-ID 'dolphin_level_seen:' checkpoint.
 */
(function(root){
 'use strict';
 const MAX_LEVEL=60,seenPrefix='dolphin_level_seen:',momentPrefix='dolphin_level_moment:';
 const sessionSeen=new Map(),sessionMoments=new Map();
 const rankBands=[{min:41,name:'Legend'},{min:31,name:'Diamond'},{min:21,name:'Platinum'},
  {min:11,name:'Gold'},{min:6,name:'Silver'},{min:1,name:'Bronze'}];
 const rankAt=lv=>rankBands.find(x=>lv>=lv.min).name;
 const validStaff=id=>typeof id==='string'&&/^DOL-(?:[0-9]{4,6}|[A-F0-9]{10})$/.test(id);
 const between=(n,a,b)=>Number.isInteger(n)&&n>=a&&n<=b;
 function getItem(k){try{return root.localStorage?.getItem(k)??sessionSeen.get(k)??null;}catch(_){return sessionSeen.get(k)??null;}}
 function setItem(k,v){sessionSeen.set(k,v);try{root.localStorage?.setItem(k,v);}catch(_){}}
 function removeItem(k){sessionSeen.delete(k);try{root.localStorage?.removeItem(k);}catch(_){}}
 function readMoment(id){
  const raw=(()=>{try{return root.localStorage?.getItem(momentPrefix+id)||sessionMoments.get(id)||null;}catch(_){return sessionMoments.get(id)||null;}})();
  if(!raw)return null;
  try{
   const x=JSON.parse(raw);
   if(!between(x.from,1,MAX_LEVEL)||!between(x.to,1,MAX_LEVEL)||x.from>=x.to||
      !Array.isArray(x.rewards)||x.rewards.length>30||x.rewards.some(y=>typeof y!=='string'||y.length>180))return null;
   return x;
  }catch(_){return null;}
 }
 function saveMoment(id,x){
  const raw=JSON.stringify(x);sessionMoments.set(id,raw);
  try{root.localStorage?.setItem(momentPrefix+id,raw);}catch(_){}
 }
 function clearMoment(id){
  sessionMoments.delete(id);
  try{root.localStorage?.removeItem(momentPrefix+id);}catch(_){}
 }
 const el=(tag,copy,cls)=>{
  const node=document.createElement(tag);
  if(copy!==undefined)node.textContent=copy;
  if(cls)node.className=cls;
  return node;
 };
 function tier(from,to){
  if(to===60)return 'mythic';
  if(rankAt(from)!==rankAt(to))return 'rank';
  if([10,20,30,40,50].some(m=>m>from&&m<=to))return 'milestone';
  return 'normal';
 }
 function createMoment(next,from){
  const to=Math.min(60,next.level);
  const all=[...(Array.isArray(next.rewardCatalog)?next.rewardCatalog:[]),
   ...(Array.isArray(next.perkCatalog)?next.perkCatalog:[])
    .filter(x=>typeof x.id==='string'&&x.id.startsWith('avatar-'))
    .map(x=>({...x,label:x.name}))];
  const rewards=[];
  for(const item of all){
   if(!between(item.level,1,60)||item.level<=from||item.level>to)continue;
   const name=String(item.label||'').trim().slice(0,180);
   if(name&&!rewards.includes(name)&&rewards.length<30)rewards.push(name);
  }
  return {from,to,rank:rankAt(to),tier:tier(from,to),
   avatar:String(next.avatar||'🐬').slice(0,8),
   rewards};
 }
 function updateReplay(){
  const btn=document.getElementById('crew-levelup-replay');
  if(!btn)return;
  const id=root.DolphinPrestige?.getMine?.()?.employeeId;
  btn.hidden=!validStaff(id)||!readMoment(id);
 }
 function display(moment,preview=false){
  if(document.hidden||document.querySelector('dialog[open]'))return false;
  const dialog=el('dialog',undefined,'crew-lc-dialog');dialog.id='crew-levelup-cinematic';
  dialog.dataset.tier=moment.tier;
  dialog.setAttribute('aria-labelledby','crew-lc-title');
  dialog.setAttribute('aria-describedby','crew-lc-message');
  const scene=el('div',undefined,'crew-lc-scene');
  const ambient=el('div',undefined,'crew-lc-ambient');
  const stars=el('div',undefined,'crew-lc-stars');
  for(let i=0;i<9;i++){const star=el('span','✦','crew-lc-star');star.style.setProperty('--i',String(i));stars.append(star);}
  const head=el('div',undefined,'crew-lc-header');
  head.append(el('span','✦ DOLPHIN CREW CLUB · ASCENSION','crew-lc-brand'),
   el('span',preview?'XEM LẠI':'LEVEL UP','crew-lc-flag'));
  const portal=el('div',undefined,'crew-lc-portal');
  portal.append(el('div',undefined,'crew-lc-halo'),
   el('span',moment.avatar||'🐬','crew-lc-avatar'));
  const label=el('div',moment.tier==='mythic'?'MYTHIC ASCENSION':
   moment.tier==='rank'?'RANK TRANSFORMATION':
   moment.tier==='milestone'?'OCEAN MILESTONE':'NEW LEVEL ACHIEVED','crew-lc-overline');
  const number=el('div',undefined,'crew-lc-level');
  number.append(el('span','LV.'+moment.from,'crew-lc-from'),el('span','→','crew-lc-arrow'),
   el('strong',String(moment.to),'crew-lc-to'));
  const title=el('h2',moment.tier==='mythic'?'ĐỈNH CAO ĐẠI DƯƠNG':
    moment.tier==='rank'?'THĂNG HẠNG THÀNH CÔNG':
    moment.tier==='milestone'?'CHINH PHỤC CỘT MỐC':'CHÚC MỪNG LÊN CẤP','crew-lc-title');
  title.id='crew-lc-title';
  const message=el('p',
   'Bạn đã đạt Level '+moment.to+' · '+moment.rank+'.'+
   (moment.to===60?' Hành trình 60 cấp đã hoàn thành!':' Tiếp tục hành trình Crew Club của bạn.'),
   'crew-lc-message');
  message.id='crew-lc-message';
  const awards=el('div',undefined,'crew-lc-awards');
  const count=moment.rewards.length;
  awards.append(el('h3',count?'✦ PHẦN THƯỞNG VỪA MỞ KHÓA':'✦ CHẶNG ĐƯỜNG MỚI','crew-lc-awards-title'));
  const list=el('ul',undefined,'crew-lc-awards-list');
  if(count){
   for(const text of moment.rewards.slice(0,8)){
    const item=el('li',undefined,'crew-lc-award');
    item.append(el('span','✦','crew-lc-award-icon'),el('span',text));
    list.append(item);
   }
   if(count>8)list.append(el('li','Và '+(count-8)+' phần thưởng khác trong bộ sưu tập.','crew-lc-more'));
  }else list.append(el('li','Khám phá phần thưởng sắp mở trong Hồ sơ của bạn.','crew-lc-more'));
  awards.append(list);
  const actions=el('div',undefined,'crew-lc-actions');
  const view=el('button','Xem phần thưởng','crew-lc-action crew-lc-primary');view.type='button';
  view.onclick=()=>{
   dialog.close();
   const rewardsDialog=document.getElementById('rewards-dialog');
   if(rewardsDialog&&!rewardsDialog.open)rewardsDialog.showModal();
  };
  const later=el('button','Để sau · Bỏ qua','crew-lc-action crew-lc-secondary');later.type='button';
  later.onclick=()=>dialog.close();
  actions.append(view,later);
  scene.append(ambient,stars,head,portal,label,number,title,message,awards,actions);
  dialog.append(scene);document.body.append(dialog);
  dialog.addEventListener('close',()=>dialog.remove(),{once:true});
  try{dialog.showModal();}catch(error){dialog.remove();return false;}
  // Finite animation, no autoplay sound, fully accessible in Reduced Motion.
  return true;
 }
 function notify(next){
  if(!next||!validStaff(next.employeeId)||!between(next.level,1,MAX_LEVEL))return false;
  const owner=root.DolphinStaffId?.get?.();
  if(owner?.employeeId&&owner.employeeId!==next.employeeId)return false;
  const key=seenPrefix+next.employeeId,stored=getItem(key);
  if(stored===null){
   // A new device should not replay all the historical levels as "new".
   setItem(key,String(next.level));updateReplay();return false;
  }
  const previous=Number(stored);
  if(!between(previous,1,MAX_LEVEL)){
   setItem(key,String(next.level));return false;
  }
  if(next.testAdmin&&next.level<previous){
   setItem(key,String(next.level));clearMoment(next.employeeId);updateReplay();return false;
  }
  if(next.level<=previous)return false;
  const moment=createMoment(next,previous);
  if(!display(moment))return false; // Do not consume notifications while another modal is open.
  setItem(key,String(next.level));
  saveMoment(next.employeeId,moment);
  updateReplay();
  return true;
 }
 function replay(){
  const staff=root.DolphinPrestige?.getMine?.();
  if(!validStaff(staff?.employeeId))return false;
  const m=readMoment(staff.employeeId);
  return !!m&&display(m,true);
 }
 function init(){
  const btn=document.getElementById('crew-levelup-replay');
  if(btn){btn.addEventListener('click',replay);updateReplay();}
 }
 root.DolphinLevelUp=Object.freeze({notify,replay,updateReplay,tier});
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);
 else init();
})(window);
