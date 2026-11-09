/* Dolphin Crew Club 2.0 — Ocean Journey (view-only).
 * Reads the verified Prestige snapshot; never modifies XP, Level, equipment,
 * unlock receipts, or the Staff Identity. Source: rewardCatalog / perkCatalog.
 */
(function(root){
 'use strict';
 const MAX_LEVEL=60;
 const regions=Object.freeze([
  {id:'departure',name:'Bến Khởi Hành',subtitle:'The Departure',from:1,to:10,icon:'journey',note:'Những bước chân đầu tiên trên đại dương'},
  {id:'silver',name:'Sóng Xa Bờ',subtitle:'Silver Tides',from:11,to:20,icon:'current',note:'Đi xa hơn cùng Dolphin Crew'},
  {id:'coral',name:'Rạn San Hô',subtitle:'Coral Kingdom',from:21,to:30,icon:'frame',note:'Sắc màu của những cuộc khám phá'},
  {id:'current',name:'Hải Lưu Mạnh',subtitle:'Ocean Currents',from:31,to:40,icon:'aura',note:'Không ngừng chinh phục thử thách'},
  {id:'stars',name:'Biển Sao',subtitle:'Celestial Sea',from:41,to:50,icon:'title',note:'Tỏa sáng cùng đồng đội'},
  {id:'mythic',name:'Vương Miện Đại Dương',subtitle:'Ocean Crown',from:51,to:60,icon:'treasure',note:'Hành trình vươn tới đỉnh cao'}
 ]);
 const rankBands=Object.freeze([
  {min:41,label:'LEGEND'},{min:31,label:'DIAMOND'},{min:21,label:'PLATINUM'},
  {min:11,label:'GOLD'},{min:6,label:'SILVER'},{min:1,label:'BRONZE'}
 ]);
 const $=id=>document.getElementById(id);
 const fmt=n=>Number(n||0).toLocaleString('vi-VN',{maximumFractionDigits:2});
 const xpAt=level=>2450*(level-1)*(level-1);
 const validLevel=n=>Number.isInteger(n)&&n>=1&&n<=MAX_LEVEL;
 let expandedAll=false,rememberOpen=null,last=null;
 const create=(tag,cls,content)=>{
  const node=document.createElement(tag);
  if(cls)node.className=cls;
  if(content!==undefined)node.textContent=content;
  return node;
 };
 function sprite(icon,set='journey',size='56px'){
  const img=create('span','crew-2d-icon');
  img.dataset.icon=icon;
  img.dataset.set=set;
  img.style.setProperty('--icon-size',size);
  img.setAttribute('aria-hidden','true');
  return img;
 }
 function ownedView(profile){
  const owner=root.DolphinStaffId?.get?.();
  if(!profile?.employeeId||(owner?.employeeId&&owner.employeeId!==profile.employeeId))return null;
  return profile;
 }
 function model(profile){
  const p=ownedView(profile);
  const current=p&&validLevel(Number(p.level))?Number(p.level):0;
  const highest=current?Math.max(current,Math.min(60,Math.max(1,Number(p.levelPeak)||current))):0;
  const list=Array.isArray(p?.rewardCatalog)?p.rewardCatalog:[];
  const perks=Array.isArray(p?.perkCatalog)?p.perkCatalog:[];
  const map=new Map();
  for(const item of [...list,...perks]){
   if(!validLevel(Number(item?.level)))continue;
   const lv=Number(item.level),label=String(item.label||item.name||'').trim();
   if(!label)continue;
   if(!map.has(lv))map.set(lv,[]);
   const reward=map.get(lv);
   if(reward.length<20&&!reward.some(x=>x.label===label))
    reward.push({id:String(item.id||''),label,level:lv});
  }
  const xp=p&&Number.isFinite(Number(p.xp))?Math.max(0,Number(p.xp)):0;
  return {ready:!!current,current,highest,xp,
   employeeId:p?.employeeId||'',
   regionIndex:current?regions.findIndex(x=>current>=x.from&&current<=x.to):0,
   rewardMap:map,
   levels:Array.from({length:MAX_LEVEL},(_,i)=>{
    const level=i+1;
    return {level,xp:xpAt(level),rank:rankBands.find(x=>level>=x.min).label,
     state:!current?'locked':level===current?'current':level<=highest?'complete':'locked',
     rewards:map.get(level)||[],isMilestone:level%5===0||level===1};
   })}
  };
 }
 function rewardIcon(label){
  if(/khung|frame|viền/i.test(label))return 'frame';
  if(/hào quang|aura|vệt|trail|sáng/i.test(label))return 'aura';
  if(/danh hiệu|title|banner|tên/i.test(label))return 'title';
  if(/avatar|theme|chủ đề|motion|giao diện/i.test(label))return 'frame';
  return 'treasure';
 }
 function summary(region,state){
  const value=state.levels.filter(x=>x.level>=region.from&&x.level<=region.to&&x.state!=='locked').length;
  return value+'/10 Level';
 }
 function stage(level,state){
  const button=create('button','crew-journey-node');
  button.type='button';
  button.dataset.level=String(level.level);
  button.dataset.state=level.state;
  if(level.isMilestone)button.dataset.milestone='true';
  const idx=(level.level-1)%10;
  button.style.gridColumn=String(idx<5?idx+1:10-idx);
  button.style.gridRow=String(idx<5?1:2);
  button.setAttribute('aria-label','Level '+level.level+' · '+(level.state==='current'?'Đang ở đây':level.state==='complete'?'Đã mở':'Chưa mở')+
   (level.rewards.length?' · '+level.rewards.length+' phần thưởng':''));
  const image=sprite(level.state==='complete'?'completed':level.state==='current'?'current':'locked','journey','52px');
  const number=create('span','crew-journey-node-number','Lv.'+level.level);
  button.append(image,number);
  if(level.rewards.length){
   const reward=create('span','crew-journey-reward-mark','✦');
   reward.title=level.rewards.length+' phần thưởng';
   button.append(reward);
  }
  if(level.state==='current')button.append(create('span','crew-journey-here','BẠN Ở ĐÂY'));
  button.addEventListener('click',()=>showDetails(level,state));
  return button;
 }
 function regionElement(region,state,open){
  const section=create('details','crew-journey-region');
  section.dataset.zone=region.id;
  section.dataset.index=String(regions.indexOf(region));
  section.open=open;
  const head=create('summary','crew-journey-region-head');
  head.append(sprite(region.icon,'journey','49px'));
  const heading=create('span','crew-journey-zone-title');
  heading.append(create('strong','',region.name),create('small','',region.subtitle+' · Lv.'+region.from+'–'+region.to));
  const stats=create('span','crew-journey-zone-stats');
  stats.append(create('strong','',summary(region,state)),create('small','',open?'Thu gọn ▲':'Khám phá ▼'));
  head.append(heading,stats);
  const body=create('div','crew-journey-region-body');
  body.append(create('p','crew-journey-zone-note',region.note));
  const map=create('div','crew-journey-grid');
  const path=document.createElementNS('http://www.w3.org/2000/svg','svg');
  path.setAttribute('viewBox','0 0 500 230');
  path.setAttribute('preserveAspectRatio','none');
  path.setAttribute('class','crew-journey-path');
  path.setAttribute('aria-hidden','true');
  const route=document.createElementNS('http://www.w3.org/2000/svg','path');
  route.setAttribute('d','M50 55 H450 C493 55 493 175 450 175 H50');
  route.setAttribute('stroke-width','5');
  route.setAttribute('stroke-dasharray','8 9');
  route.setAttribute('fill','none');
  path.append(route);
  map.append(path);
  state.levels.filter(x=>x.level>=region.from&&x.level<=region.to).forEach(x=>map.append(stage(x,state)));
  body.append(map);
  section.append(head,body);
  section.addEventListener('toggle',()=>{
   if(!rememberOpen)rememberOpen=new Set();
   if(section.open)rememberOpen.add(region.id);
   else rememberOpen.delete(region.id);
   const hint=section.querySelector('.crew-journey-zone-stats small');
   if(hint)hint.textContent=section.open?'Thu gọn ▲':'Khám phá ▼';
  });
  return section;
 }
 function showDetails(level,state){
  const dialog=$('crew-journey-dialog');if(!dialog)return;
  if(dialog.open)dialog.close();
  $('crew-journey-dialog-title').textContent='LEVEL '+level.level;
  $('crew-journey-dialog-region').textContent=regions.find(x=>level.level>=x.from&&level.level<=x.to)?.name||'OCEAN JOURNEY';
  $('crew-journey-dialog-status').textContent=level.state==='current'?'✦ Bạn đang ở Level này':
   level.state==='complete'?'✓ Đã đạt Level và mở khóa mốc thưởng':'🔒 Chưa đạt Level này';
  $('crew-journey-dialog-xp').textContent=fmt(level.xp)+' XP cần đạt · '+level.rank+
   (state.ready&&level.level>state.current?' · Còn '+fmt(Math.max(0,level.xp-state.xp))+' XP':'');
  const img=$('crew-journey-dialog-icon');if(img)img.dataset.icon=level.state==='complete'?'completed':level.state==='current'?'current':'locked';
  const box=$('crew-journey-dialog-rewards');box.replaceChildren();
  if(!level.rewards.length)box.append(create('p','hint','Mốc này là một điểm tiến trình. Không có phần thưởng riêng được khai báo.'));
  for(const item of level.rewards){
   const row=create('div','crew-journey-dialog-reward');
   row.append(sprite(rewardIcon(item.label),'journey','49px'),create('span','',item.label));
   box.append(row);
  }
  dialog.showModal();
 }
 function render(profile){
  const host=$('crew-journey-regions');
  if(!host)return;
  const state=model(profile);
  last=state;
  $('crew-journey-level').textContent=state.ready?'LEVEL '+state.current+' / 60':'LEVEL — / 60';
  $('crew-journey-completed').textContent=state.ready?state.highest+' / 60 mốc đã chinh phục':'Đăng ký hoặc liên kết Staff ID để xem tiến trình';
  const done=state.ready?Math.max(0,Math.min(100,(state.highest-1)*100/59)):0;
  const track=$('crew-ocean-journey')?.querySelector('.crew-journey-progress');
  if(track)track.setAttribute('aria-valuenow',String(state.ready?state.highest:1));
  $('crew-journey-progress-fill').style.width=done+'%';
  if(!rememberOpen)rememberOpen=new Set([regions[state.regionIndex].id]);
  const wasOpen=new Set(rememberOpen);
  host.replaceChildren();
  for(const region of regions){
   const open=expandedAll||wasOpen.has(region.id);
   host.append(regionElement(region,state,open));
  }
  const expand=$('crew-journey-expand');
  if(expand){
   expand.textContent=expandedAll?'Thu gọn bản đồ':'Mở toàn bộ bản đồ';
   expand.setAttribute('aria-expanded',String(expandedAll));
  }
 }
 function refresh(){render(root.DolphinPrestige?.getMine?.()||null);}
 function init(){
  const expand=$('crew-journey-expand'),focus=$('crew-journey-focus');
  if(expand)expand.addEventListener('click',()=>{
   expandedAll=!expandedAll;
   rememberOpen=new Set(expandedAll?regions.map(x=>x.id):[regions[last?.regionIndex||0].id]);
   refresh();
  });
  if(focus)focus.addEventListener('click',()=>{
   const index=last?.regionIndex||0,zone=regions[index];
   if(!rememberOpen)rememberOpen=new Set();
   rememberOpen.add(zone.id);
   const section=document.querySelector('.crew-journey-region[data-zone="'+zone.id+'"]');
   if(section){
    section.open=true;
    section.scrollIntoView?.({behavior:root.matchMedia?.('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'center'});
   }
  });
  $('crew-journey-dialog-close')?.addEventListener('click',()=>$('crew-journey-dialog')?.close());
  $('crew-journey-open-rewards')?.addEventListener('click',()=>{
   $('crew-journey-dialog')?.close();
   const rewards=$('rewards-dialog');
   if(rewards&&!rewards.open)rewards.showModal();
  });
  refresh();
 }
 root.DolphinOceanJourney=Object.freeze({model,render,regions});
 root.addEventListener('dolphin-my-progress-updated',e=>render(e.detail));
 root.addEventListener('dolphin-staff-id-changed',refresh);
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);
 else init();
})(window);
