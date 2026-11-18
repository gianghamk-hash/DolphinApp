/* Read-only companion: Prestige owns XP, identity and permissions. */
(function(root){
 'use strict';
 const forms=Object.freeze([
  [1,'Baby Dolphin'],[10,'Wave Dolphin'],[20,'Coral Dolphin'],
  [30,'Sapphire Dolphin'],[40,'Crystal Dolphin'],[50,'Celestial Dolphin'],
  [60,'Aurora Dolphin'],[70,'Cosmic Dolphin'],[90,'Royal Dolphin'],[100,'Eternal Dolphin']
 ].map(([level,name],index)=>Object.freeze({level,name,index})));
 function model(profile,owner){
  if(!owner||profile?.employeeId!==owner||!Number.isFinite(profile.level)||profile.level<1)return null;
  const level=Math.min(100,Math.trunc(profile.level));
  const form=forms.filter(f=>level>=f.level).pop();
  return {...form,currentLevel:level,xp:Number.isFinite(profile.xp)?profile.xp:0,employeeId:owner};
 }
 root.DolphinCompanion=Object.freeze({forms,model});
 const document=root.document;
 if(!document)return;
 let last=null,timer,stage,button,sprite,status;
 function pulse(kind){
  if(!stage||stage.hidden||document.hidden)return;
  clearTimeout(timer);stage.dataset.reaction=kind;
  timer=setTimeout(()=>{delete stage.dataset.reaction;},1800);
 }
 function render(profile){
  if(!stage)return;
  const next=model(profile,root.DolphinStaffId?.get?.()?.employeeId);
  stage.hidden=!next;
  if(!next){last=null;clearTimeout(timer);delete stage.dataset.reaction;status.textContent='';return;}
  sprite.style.backgroundPosition=(next.index%5*25)+'% '+(Math.floor(next.index/5)*100)+'%';
  const label=next.name+' · Level '+next.currentLevel;
  button.setAttribute('aria-label',label+' — Chạm để gọi linh thú');
  button.title=label;stage.dataset.form=String(next.index);
  if(last?.employeeId===next.employeeId){
   if(next.currentLevel>last.currentLevel){pulse('level');status.textContent='Linh thú đồng hành: '+label;}
   else if(next.currentLevel<last.currentLevel||next.xp<last.xp){
    clearTimeout(timer);delete stage.dataset.reaction;
    status.textContent='Linh thú đã đồng bộ cấp hiện tại: '+label;
   }else if(next.xp>last.xp)pulse('xp');
  }else{clearTimeout(timer);delete stage.dataset.reaction;}
  last=next;
 }
 function init(){
  const portrait=document.querySelector('#crew-profile-banner .crew-card-portrait');
  if(!portrait||stage)return;
  stage=document.createElement('div');stage.className='dolphin-pet-stage';stage.hidden=true;
  button=document.createElement('button');button.type='button';button.className='dolphin-pet-flight';
  sprite=document.createElement('span');sprite.className='dolphin-pet-sprite';sprite.setAttribute('aria-hidden','true');
  button.append(sprite);stage.append(button);portrait.append(stage);
  status=document.createElement('span');status.className='dolphin-pet-status';status.setAttribute('role','status');
  portrait.append(status);
  button.addEventListener('click',()=>{pulse('hello');status.textContent=last?last.name+' luôn đồng hành cùng bạn!':'';});
  render(root.DolphinPrestige?.getMine?.());
 }
 root.addEventListener('dolphin-my-progress-updated',event=>render(event.detail));
 root.addEventListener('dolphin-staff-id-changed',()=>render(root.DolphinPrestige?.getMine?.()));
 document.addEventListener('visibilitychange',()=>{if(stage)stage.dataset.paused=String(document.hidden);});
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})(typeof window==='undefined'?globalThis:window);
