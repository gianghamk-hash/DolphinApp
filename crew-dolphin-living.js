/* Dolphin Living Pet Sprint 2.
 * Client-only entertainment. Prestige and Staff ID remain the sole authority for identity,
 * Levels, XP and rewards. Cosmetic treasure is local to this browser, never server XP. */
(function(root){
 'use strict';
 const SKILLS=Object.freeze([
  ['bubble','Bubble Parade','Vũ điệu bong bóng'],
  ['wave','Tidal Hello','Làn sóng chào'],
  ['coral','Coral Bloom','San hô nở hoa'],
  ['sapphire','Sapphire Flash','Tia sáng sapphire'],
  ['crystal','Crystal Waltz','Vũ điệu tinh thể'],
  ['celestial','Celestial Wings','Đôi cánh thiên quang'],
  ['aurora','Aurora Ribbon','Dải cực quang'],
  ['cosmic','Cosmic Gateway','Cổng thiên hà'],
  ['royal','Royal Halo','Hào quang hoàng gia'],
  ['eternal','Eternal Ocean','Đại dương vĩnh cửu']
 ].map(([id,name,vi],index)=>Object.freeze({id,name,vi,index})));
 const REWARDS=Object.freeze([
  {id:'pearls',name:'Ngọc trai nhỏ',min:0,rarity:'Thường',fx:'pearls'},
  {id:'bubbles',name:'Bong bóng ánh ngọc',min:0,rarity:'Thường',fx:'bubbles'},
  {id:'coral',name:'Cánh san hô',min:2,rarity:'Hiếm',fx:'coral'},
  {id:'sapphire',name:'Tinh thể sapphire',min:3,rarity:'Hiếm',fx:'sapphire'},
  {id:'crystal',name:'Bụi pha lê',min:4,rarity:'Hiếm',fx:'crystal'},
  {id:'aurora',name:'Bụi cực quang',min:6,rarity:'Sử thi',fx:'aurora'},
  {id:'cosmic',name:'Sao vũ trụ',min:7,rarity:'Sử thi',fx:'cosmic'},
  {id:'royal',name:'Vương miện biển',min:8,rarity:'Huyền thoại',fx:'royal'},
  {id:'eternal',name:'Vệt sáng vĩnh cửu',min:9,rarity:'Huyền thoại',fx:'eternal'}
 ].map(Object.freeze));
 function hash(input){
  let h=2166136261;
  for(const ch of String(input)){h^=ch.charCodeAt(0);h=Math.imul(h,16777619);}
  return h>>>0;
 }
 function dateVN(now){
  const parts=new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Ho_Chi_Minh',
   year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now);
  const date=Object.fromEntries(parts.map(p=>[p.type,p.value]));
  return [date.year,date.month,date.day].join('-');
 }
 function form(profile,id,companion){
  if(!id?.verified||!id?.employeeId||id.requiresNameChange||id.approved===false||
    !companion?.model)return null;
  return companion.model(profile,id.employeeId);
 }
 function offer(employeeId,day,index,openedDay){
  if(!employeeId||!day||index<0||openedDay===day)return false;
  return hash('treasure|'+employeeId+'|'+day)%100<45;
 }
 function drawReward(employeeId,day,index){
  const pool=REWARDS.filter(r=>r.min<=index),n=hash('reward|'+employeeId+'|'+day);
  return pool[n%pool.length];
 }
 function eligibleReward(reward,index){return !!reward&&index>=reward.min;}
 const pure=Object.freeze({SKILLS,REWARDS,hash,dateVN,form,offer,drawReward,eligibleReward});
 root.DolphinLivingRules=pure;
 if(typeof module==='object'&&module.exports)module.exports=pure;
 const doc=root.document;
 if(!doc)return;
 const $=id=>doc.getElementById(id);
 const state={owner:'',form:null,profile:null,place:'',
  panel:null,dock:null,performBtn:null,avatarBtn:null,collectionBtn:null,treasureBtn:null,
  scene:null,avatarFx:null,status:null,dialog:null,items:null,seen:null,petStage:null,
  collection:null,carry:null,allowed:false,due:0,sceneTimer:0,avatarTimer:0,dialogVisible:false,
  busy:false,autoGreeted:false,manualAvatar:false,lastPosition:null};
 function currentIdentity(){return root.DolphinStaffId?.get?.()||null;}
 function hasGate(){return doc.documentElement.classList.contains('dolphin-access-allowed');}
 function active(){
  const id=currentIdentity(),p=form(root.DolphinPrestige?.getMine?.(),id,root.DolphinCompanion);
  return !!(p&&p.employeeId===state.owner&&state.form&&p.currentLevel===state.form.currentLevel&&hasGate());
 }
 function landingVisible(){
  const landing=$('landing');
  return state.place==='landing'&&active()&&landing&&!doc.hidden&&
   !doc.body.classList.contains('app-mode')&&landing.style.display!=='none'&&
   !landing.classList.contains('fade-out')&&
   !['orderNotif','reminderAlarm'].some(n=>$(n)?.classList.contains('show'));
 }
 function profileVisible(){
  return state.place==='profile'&&active()&&!doc.hidden&&
    !doc.querySelector('dialog[open]');
 }
 function storageKey(owner){return 'dolphin-companion-cosmetics-v1:'+encodeURIComponent(String(owner).slice(0,80));}
 function emptyCollection(){return {items:[],openedDay:'',selected:''};}
 function loadCollection(owner){
  if(!owner)return emptyCollection();
  try{
   const saved=JSON.parse(root.localStorage.getItem(storageKey(owner))||'null');
   if(!saved||!Array.isArray(saved.items))return emptyCollection();
   return {items:[...new Set(saved.items.filter(x=>REWARDS.some(r=>r.id===x)))].slice(0,REWARDS.length),
    openedDay:typeof saved.openedDay==='string'?saved.openedDay:'',
    selected:typeof saved.selected==='string'&&REWARDS.some(r=>r.id===saved.selected)?saved.selected:''};
  }catch(_){return emptyCollection();}
 }
 function saveCollection(){
  if(!state.owner||!state.collection)return;
  try{root.localStorage.setItem(storageKey(state.owner),JSON.stringify(state.collection));}
  catch(_){status('Không thể lưu kho báu trên thiết bị này.');}
 }
 function status(text){
  if(state.status)state.status.textContent=text;
 }
 function el(tag,className,text){
  const n=doc.createElement(tag);
  if(className)n.className=className;
  if(text!==undefined)n.textContent=text;
  return n;
 }
 function btn(text,css,action){
  const n=el('button',css,text);n.type='button';n.addEventListener('click',action);return n;
 }
 function createScene(host){
  const scene=el('div','dcl-living-scene');scene.hidden=true;scene.setAttribute('aria-hidden','true');
  scene.append(el('div','dcl-living-ring'));
  for(let i=0;i<8;i++){
   const sparkle=el('span','dcl-living-spark');sparkle.style.setProperty('--i',String(i));scene.append(sparkle);
  }
  host.append(scene);return scene;
 }
 function makeProfile(){
  const banner=$('crew-profile-banner'),portrait=banner?.querySelector('.crew-card-portrait');
  if(!portrait)return false;
  state.place='profile';state.petStage=portrait.querySelector('.dolphin-pet-stage');
  state.panel=el('section','dcl-living-panel');
  state.panel.setAttribute('aria-label','Linh thú biểu diễn cùng Avatar');
  const label=el('strong','dcl-living-title','🐬 LINH THÚ ĐỒNG HÀNH · COMPANION');
  state.performBtn=btn('✦ Biểu diễn / Perform','dcl-living-button',()=>perform());
  state.avatarBtn=btn('♡ Tạo dáng với Avatar','dcl-living-button',()=>meetAvatar());
  const actions=el('div','dcl-living-actions');actions.append(state.performBtn,state.avatarBtn);
  state.status=el('p','dcl-living-status','');state.status.setAttribute('role','status');
  state.panel.append(label,actions,state.status);
  banner.insertAdjacentElement('afterend',state.panel);
  state.scene=createScene(portrait);
  state.avatarFx=el('div','dcl-living-avatar-fx');state.avatarFx.hidden=true;
  state.avatarFx.setAttribute('aria-hidden','true');
  for(let i=0;i<5;i++)state.avatarFx.append(el('span','dcl-avatar-heart','♥'));
  portrait.append(state.avatarFx);
  // The avatar itself remains unmodified and retains its original role.
  $('profile-avatar')?.addEventListener('click',()=>meetAvatar());
  return true;
 }
 function makeLanding(){
  const landing=$('landing'),grid=landing?.querySelector('.area-grid');
  const stage=$('dolphinLandingCompanion');
  if(!grid||!stage)return false;
  state.place='landing';state.petStage=stage;
  state.panel=el('section','dcl-living-panel dcl-living-landing');
  state.panel.setAttribute('aria-label','Hoạt động giải trí cùng cá heo');
  const title=el('strong','dcl-living-title','🐬 DOLPHIN COMPANION');
  const actions=el('div','dcl-living-actions');
  state.performBtn=btn('✦ Biểu diễn / Perform','dcl-living-button',()=>perform());
  state.collectionBtn=btn('♢ Bộ sưu tập kho báu','dcl-living-button',()=>openCollection());
  state.treasureBtn=btn('🎁 Mở rương bí mật','dcl-living-button dcl-living-treasure',()=>openTreasure());
  state.treasureBtn.hidden=true;
  actions.append(state.performBtn,state.collectionBtn,state.treasureBtn);
  state.status=el('p','dcl-living-status','');state.status.setAttribute('role','status');
  state.panel.append(title,actions,state.status);
  grid.insertAdjacentElement('afterend',state.panel);
  state.scene=createScene(stage);
  state.carry=el('span','dcl-living-carry');state.carry.hidden=true;
  state.carry.setAttribute('aria-hidden','true');stage.append(state.carry);
  state.dialog=el('dialog','dcl-living-dialog');
  state.dialog.setAttribute('aria-label','Bộ sưu tập kho báu Dolphin');
  const head=el('div','dcl-living-dialog-head');
  head.append(el('h2','','Kho báu của Dolphin'),btn('✕ Đóng','dcl-living-close',()=>state.dialog.close()));
  state.items=el('div','dcl-living-items');
  const foot=el('p','dcl-living-disclaimer','Vật phẩm chỉ mang tính trang trí, được lưu trên trình duyệt hiện tại. Không liên quan XP hay doanh thu.');
  state.dialog.append(head,state.items,foot);
  state.dialog.addEventListener('close',()=>{state.dialogVisible=false;});
  landing.append(state.dialog);
  return true;
 }
 function destroyAction(){
  root.clearTimeout(state.sceneTimer);root.clearTimeout(state.avatarTimer);
  state.busy=false;
  if(state.scene){state.scene.hidden=true;delete state.scene.dataset.skill;}
  if(state.avatarFx)state.avatarFx.hidden=true;
  if(state.petStage)delete state.petStage.dataset.avatar;
 }
 function renderCollection(){
  if(!state.items||!state.collection||!state.form)return;
  state.items.replaceChildren();
  const tip=el('p','dcl-living-dialog-tip','Chỉ mở rương được khi cá heo mang kho báu tới Landing. Mỗi ngày tối đa một rương.');
  state.items.append(tip);
  if(state.collection.items.length===0){
   state.items.append(el('p','dcl-living-empty','Chưa có vật phẩm nào. Hãy để ý chiếc rương bí mật của cá heo!'));
   return;
  }
  for(const key of state.collection.items){
   const reward=REWARDS.find(r=>r.id===key),row=el('div','dcl-living-item');
   const unlocked=eligibleReward(reward,state.form.index);
   const desc=el('span','dcl-living-item-copy',reward.name+' · '+reward.rarity+
     (unlocked?'':' · Yêu cầu Level '+root.DolphinCompanion.forms[reward.min].level));
   const button=btn(state.collection.selected===key?'✓ Đang dùng':'Trang bị',
    'dcl-living-equip',()=>equip(key));
   button.disabled=!unlocked||state.collection.selected===key;
   row.append(desc,button);state.items.append(row);
  }
 }
 function equip(key){
  if(!active()||!state.collection?.items.includes(key))return;
  const reward=REWARDS.find(r=>r.id===key);
  if(!eligibleReward(reward,state.form.index))return;
  state.collection.selected=key;saveCollection();renderCollection();applyCosmetic();
  status('Đã trang bị '+reward.name+'.');
 }
 function applyCosmetic(){
  if(!state.panel)return;
  const reward=REWARDS.find(r=>r.id===state.collection?.selected);
  // Keep collectibles owned after Level drops, but lock visual use until eligible.
  const activeReward=reward&&state.collection.items.includes(reward.id)&&eligibleReward(reward,state.form?.index);
  const fx=activeReward?reward.fx:'';
  state.panel.dataset.cosmetic=fx;
  if(state.petStage)state.petStage.dataset.cosmetic=fx;
 }
 function openCollection(){
  if(!landingVisible()||!state.dialog)return;
  renderCollection();state.dialogVisible=true;
  if(typeof state.dialog.showModal==='function')state.dialog.showModal();
  else state.dialog.setAttribute('open','');
 }
 function openTreasure(){
  if(!landingVisible()||!state.collection||!state.treasureBtn||state.treasureBtn.hidden)return;
  const day=dateVN(new Date());
  if(!offer(state.owner,day,state.form.index,state.collection.openedDay))return;
  const reward=drawReward(state.owner,day,state.form.index);
  state.collection.openedDay=day;
  if(!state.collection.items.includes(reward.id))state.collection.items.push(reward.id);
  state.collection.selected=reward.id;saveCollection();
  state.treasureBtn.hidden=true;
  if(state.carry)state.carry.hidden=true;
  applyCosmetic();
  status('🎁 Rương kho báu: '+reward.name+' ('+reward.rarity+'). Đã thêm vào bộ sưu tập!');
  if(state.scene)showScene(state.form.index,'treasure');
  renderCollection();
 }
 function perform(){
  if(!active()||state.busy)return;
  if(state.place==='landing'&&!landingVisible())return;
  if(state.place==='profile'&&!profileVisible())return;
  const skill=SKILLS[state.form.index];
  showScene(skill.index,'skill');
  status('✦ '+skill.name+' — '+skill.vi+'.');
 }
 function showScene(index,mode){
  if(!active()||!state.scene)return;
  root.clearTimeout(state.sceneTimer);
  state.scene.hidden=true;delete state.scene.dataset.skill;
  void state.scene.offsetWidth;
  state.scene.dataset.skill=SKILLS[index].id;
  if(state.place==='landing'&&state.lastPosition){
   state.scene.style.setProperty('--dcl-sx',state.lastPosition.x+'px');
   state.scene.style.setProperty('--dcl-sy',state.lastPosition.y+'px');
  }
  state.scene.dataset.mode=mode;
  state.scene.hidden=false;
  state.busy=true;
  if(root.matchMedia?.('(prefers-reduced-motion: reduce)').matches){
   // Reveal the static effect briefly without triggering motion.
   state.sceneTimer=root.setTimeout(()=>{state.scene.hidden=true;state.busy=false;},1500);
  }else state.sceneTimer=root.setTimeout(()=>{state.scene.hidden=true;state.busy=false;},3600);
 }
 function meetAvatar(auto=false){
  if(!profileVisible()||!state.petStage||!state.avatarFx)return;
  if(!auto)state.manualAvatar=true;
  root.clearTimeout(state.avatarTimer);
  state.petStage.dataset.avatar='true';
  state.avatarFx.hidden=false;
  state.avatarFx.style.animation='none';void state.avatarFx.offsetWidth;state.avatarFx.style.animation='';
  status(auto?'🐬 Cá heo đã đến chào Avatar của bạn!':'🐬 Cá heo lại gần, dụi đầu và chụp ảnh cùng Avatar!');
  state.avatarTimer=root.setTimeout(()=>{
   if(state.petStage)delete state.petStage.dataset.avatar;
   if(state.avatarFx)state.avatarFx.hidden=true;
  },3200);
 }
 function tickTreasure(){
  if(state.place!=='landing'||!state.treasureBtn)return;
  const day=dateVN(new Date());
  const available=!!(landingVisible()&&Date.now()>=state.due&&
    state.collection&&offer(state.owner,day,state.form.index,state.collection.openedDay));
  state.treasureBtn.hidden=!available;
  if(state.carry){state.carry.hidden=!available;
   if(available&&state.lastPosition)state.carry.style.transform='translate3d('+(state.lastPosition.x+13)+'px,'+(state.lastPosition.y-36)+'px,0)';
  }
  if(state.collectionBtn)state.collectionBtn.hidden=!landingVisible();
  if(state.performBtn)state.performBtn.hidden=!landingVisible();
  if(state.panel)state.panel.hidden=!landingVisible();
 }
 function render(profile){
  const id=currentIdentity(),next=form(profile,id,root.DolphinCompanion);
  // Avoid a stale Prestige response on account switch.
  const prev=state.form;
  if(!next){
   state.owner='';state.form=null;state.profile=null;state.collection=null;state.due=0;
   destroyAction();
   if(state.dialog?.open)state.dialog.close();
   if(state.panel)state.panel.hidden=true;
   if(state.treasureBtn)state.treasureBtn.hidden=true;
   if(state.carry)state.carry.hidden=true;
   if(state.scene)state.scene.hidden=true;
   return;
  }
  const switched=state.owner!==next.employeeId;
  const lowered=prev&&!switched&&(next.currentLevel<prev.currentLevel||next.xp<prev.xp);
  state.owner=next.employeeId;state.form=next;state.profile=profile;
  if(switched){
   destroyAction();
   state.collection=loadCollection(next.employeeId);
   state.autoGreeted=false;state.manualAvatar=false;
   state.due=Date.now()+6500;
   if(state.dialog?.open)state.dialog.close();
  }else if(lowered)destroyAction();
  if(state.panel)state.panel.hidden=!hasGate();
  if(state.performBtn){
   state.performBtn.textContent='✦ '+SKILLS[next.index].vi;
   state.performBtn.setAttribute('aria-label','Biểu diễn '+SKILLS[next.index].name+' (Level '+next.currentLevel+')');
  }
  applyCosmetic();
  if(state.place==='profile'){
   if(!state.autoGreeted&&hasGate()){
    state.autoGreeted=true;
    root.setTimeout(()=>{if(active()&&profileVisible()&&!state.manualAvatar)meetAvatar(true);},1000);
   }
  }else tickTreasure();
 }
 function init(){
  if(state.panel||!root.DolphinCompanion?.model)return;
  if(!makeLanding()&&!makeProfile())return;
  root.addEventListener('dolphin-my-progress-updated',event=>render(event.detail));
  root.addEventListener('dolphin-staff-id-changed',()=>render(root.DolphinPrestige?.getMine?.()));
  doc.addEventListener('visibilitychange',()=>{
   if(doc.hidden){destroyAction();if(state.dialog?.open)state.dialog.close();}
   tickTreasure();
  });
  // This is UI only: do not subscribe to or mutate operational events.
  if(state.place==='landing'){
   const obs=new MutationObserver(tickTreasure);
   for(const id of ['orderNotif','reminderAlarm'])if($(id))
    obs.observe($(id),{attributes:true,attributeFilter:['class']});
   obs.observe(doc.body,{attributes:true,attributeFilter:['class']});
   obs.observe(doc.documentElement,{attributes:true,attributeFilter:['class']});
   root.setInterval(tickTreasure,4000);
  }else{
   new MutationObserver(()=>{if(!hasGate()||!active())destroyAction();if(state.panel)state.panel.hidden=!active();})
     .observe(doc.documentElement,{attributes:true,attributeFilter:['class']});
  }
  render(root.DolphinPrestige?.getMine?.());
 }
 root.DolphinLivingBridge=Object.freeze({move(x,y){
  if(state.place!=='landing'||!state.form)return;
  state.lastPosition={x,y};
  if(state.scene&&!state.scene.hidden){state.scene.style.setProperty('--dcl-sx',x+'px');state.scene.style.setProperty('--dcl-sy',y+'px');}
  if(state.carry&&!state.carry.hidden)
   state.carry.style.transform='translate3d('+(x+13)+'px,'+(y-36)+'px,0)';
 }});
 if(doc.readyState==='loading')doc.addEventListener('DOMContentLoaded',init);else init();
})(typeof window==='undefined'?globalThis:window);
