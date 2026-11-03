/* Shared display avatars. Staff ID wins; legacy names resolve only when unique. */
(function(root){
'use strict';
function nameKey(name){return String(name||'').normalize('NFC').trim().replace(/\s+/g,' ').toLocaleLowerCase('vi-VN');}
function escapeHTML(value){return String(value||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function createResolver(){
 let profiles=new Map(),names=new Map();
 function index(){
  names=new Map();
  for(const p of profiles.values())for(const name of [p.name,...(p.nameAliases||[])]){
   const key=nameKey(name);if(!key)continue;
   if(!names.has(key))names.set(key,new Set());names.get(key).add(p.employeeId);
  }
 }
 function upsert(p){
  if(!p?.employeeId||!p.name||typeof p.avatar!=='string')return;
  const prev=profiles.get(p.employeeId);
  const aliases=[...(prev?.nameAliases||[]),...(p.nameAliases||[]),...(prev&&nameKey(prev.name)!==nameKey(p.name)?[prev.name]:[])];
  profiles.set(p.employeeId,{employeeId:p.employeeId,name:p.name,avatar:p.avatar.slice(0,24),selectedFrame:p.selectedFrame||prev?.selectedFrame||'none',selectedAvatarMotion:p.selectedAvatarMotion||prev?.selectedAvatarMotion||'none',selectedTitle:p.selectedTitle||prev?.selectedTitle||'none',selectedBanner:p.selectedBanner||prev?.selectedBanner||'default',personalTheme:p.personalTheme||prev?.personalTheme||'dark',selectedAura:p.selectedAura||prev?.selectedAura||'none',selectedTrail:p.selectedTrail||prev?.selectedTrail||'none',selectedCardFx:p.selectedCardFx||prev?.selectedCardFx||'none',selectedNameFx:p.selectedNameFx||prev?.selectedNameFx||'none',nameAliases:Array.from(new Set(aliases)).slice(-10)});index();
 }
 function replace(rows){profiles=new Map();for(const p of rows||[])if(p?.employeeId&&p.name&&typeof p.avatar==='string')profiles.set(p.employeeId,{...p,avatar:p.avatar.slice(0,24)});index();}
 function resolve(name,id){
  if(id)return profiles.get(id)||null;
  const ids=names.get(nameKey(name));return ids?.size===1?profiles.get(ids.values().next().value):null;
 }
 return {replace,upsert,resolve};
}
function avatarHTML(name,id='',avatar='👤'){
 return '<span class="dolphin-staff-avatar" data-staff-avatar data-staff-name="'+escapeHTML(name)+'" data-staff-id="'+escapeHTML(id)+'">'+escapeHTML(avatar)+'</span>';
}
if(typeof module!=='undefined')module.exports={nameKey,createResolver,escapeHTML,avatarHTML};
if(!root.document)return;
const cosmeticsHref=new URL('crew-cosmetics.css?v=crew-global-v9',document.currentScript?.src||location.href).href;
const resolver=createResolver(),listeners=new Set();let own=null,scheduled=false,inflight=null,shared=null;
try{if(root.parent!==root)shared=root.parent.DolphinAvatars||null;}catch(e){}
function staffName(){try{return root.getSyncedStaffName?.()||localStorage.getItem('dolphinStaffName')||'';}catch(e){return '';}}
function get(name,id){return resolver.resolve(name,id)?.avatar||null;}
function fallback(name){return Array.from(String(name||'').trim())[0]?.toLocaleUpperCase('vi-VN')||'👤';}
/* Rarity is derived only from the server-validated avatar catalog values.
   The same glyph uses the same visual treatment in every Dolphin subapp. */
const mythicAvatars=new Set(['🐉','🐲','🐦‍🔥','🦄','🧞','🔱','🪄']);
const royalAvatars=new Set(['👑','💎','🗡️','🛡️','⚜️','🎖️','🏵️','🤴','👸','🫅','🏰','💍','🗝️','🪙']);
function rarityOf(value){const v=String(value||'').trim();return royalAvatars.has(v)?'sovereign':mythicAvatars.has(v)?'mythic':'common';}

/* One idempotent animator for equipped cosmetics on every UI surface.
   IMPORTANT: children have no text nodes; existing avatar textContent-based
   synchronization and ranking checks keep working unchanged. */
const frameSelector=[
 '.hero-avatar[data-frame]',
 '.level-avatar[data-frame]',
 '.leader-tile-icon[data-frame]',
 '.dolphin-staff-avatar[data-frame]',
 '.drr-frame[data-frame]',
 '.sow-avatar[data-frame]',
 '.fx-frame-preview[data-frame]',
 '.avatar-choice[data-avatar-rarity]',
 '[data-avatar-motion]:not([data-avatar-motion="none"])',
 '#profile-avatar[data-frame]'
].join(',');
function decorateFrame(el){
 const frame=el?.dataset?.frame||'none';
 const supported=['bronze','silver','gold','mythic','emerald','sapphire','nebula'];
 const previous=el?.querySelector(':scope > .crew-fx-orbits');
 const oldMotion=el?.querySelector(':scope > .crew-avatar-motion');
 const motion=el?.dataset?.avatarMotion||'none';
 // A semantic mythic/royal insignia is independent of the equipped frame.
 // No textual child nodes: avatar textContent and cross-app sync stay stable.
 const glyph=el.dataset.avatarGlyph||el.querySelector('.drl-level-glyph')?.textContent||String(el.textContent||'').trim();
 const rarity=rarityOf(glyph);
 if(el.dataset.avatarRarity!==rarity)el.dataset.avatarRarity=rarity;
 const insignia=el.querySelector(':scope > .crew-avatar-insignia');
 if(rarity==='common'){insignia?.remove();}
 else if(!insignia){
  const jewel=document.createElement('span');jewel.className='crew-avatar-insignia';
  jewel.setAttribute('aria-hidden','true');el.appendChild(jewel);
 }

 if(oldMotion&&oldMotion.dataset.kind!==motion)oldMotion.remove();
 if(motion!=='none'&&!el.querySelector(':scope > .crew-avatar-motion')){
  const layer=document.createElement('span');layer.className='crew-avatar-motion';layer.dataset.kind=motion;
  layer.setAttribute('aria-hidden','true');
  // Layered, pointer-transparent V4 particle system. Animations never alter
  // the avatar emoji or intercept taps; generated once per equipped motion.
  if(['comet','tide','vortex','phoenix','supernova'].includes(motion)){
   const core=document.createElement('span');core.className='crew-motion-core';layer.appendChild(core);
   for(let i=0;i<2;i++){
    const ring=document.createElement('span');ring.className='crew-motion-ring';
    ring.style.setProperty('--ring-index',String(i));layer.appendChild(ring);
   }
   for(let i=0;i<8;i++){
    const spark=document.createElement('span');spark.className='crew-motion-spark';
    spark.style.setProperty('--spark-index',String(i));layer.appendChild(spark);
   }
  }
  el.appendChild(layer);
 }
 if(!supported.includes(frame)){
  if(previous)previous.remove();
  if(el?.dataset?.crewFxFrame)delete el.dataset.crewFxFrame;
  return;
 }
 if(previous&&el.dataset.crewFxFrame===frame)return; // no observer loop
 if(previous)previous.remove();
 const wrap=document.createElement('span');wrap.className='crew-fx-orbits';
 wrap.setAttribute('aria-hidden','true');
 if(frame==='mythic'){
  const universe=document.createElement('span');universe.className='crew-mythic-universe';
  for(const kind of ['halo','ring-outer','ring-inner','shimmer']){
   const layer=document.createElement('span');layer.className='crew-mythic-'+kind;universe.appendChild(layer);
  }
  for(let i=1;i<=4;i++){
   const orbit=document.createElement('span');orbit.className='crew-mythic-orbit crew-mythic-orbit--'+i;
   const crystal=document.createElement('span');crystal.className='crew-mythic-crystal';orbit.appendChild(crystal);universe.appendChild(orbit);
  }
  for(let i=1;i<=8;i++){
   const particle=document.createElement('span');particle.className='crew-mythic-particle crew-mythic-particle--'+i;universe.appendChild(particle);
  }
  wrap.appendChild(universe);
 }else{
  const count={bronze:1,silver:2,gold:3}[frame]||{emerald:2,sapphire:3,nebula:4}[frame];
  for(let i=1;i<=count;i++){
   const ring=document.createElement('span');
   ring.className='crew-fx-layer crew-fx-ring crew-fx-ring--'+i;
   wrap.appendChild(ring);
  }
 }
 el.dataset.crewFxFrame=frame;
 el.appendChild(wrap);
}
function decorateFrames(){
 for(const el of document.querySelectorAll(frameSelector))decorateFrame(el);
}
root.DolphinFrameFX={refresh:decorateFrames,decorate:decorateFrame,rarityOf};
function paint(){
 scheduled=false;
 const source=shared||api;
 for(const el of document.querySelectorAll('[data-staff-avatar]')){
  const mine=el.getAttribute('data-staff-avatar')==='mine';
  const profile=mine?source.getMine():null;
  const name=mine?(profile?.name||staffName()):el.getAttribute('data-staff-name');
  const id=mine?profile?.employeeId:el.getAttribute('data-staff-id');
  const avatar=source.get(name,id)||el.dataset.avatarGlyph||el.textContent.trim()||fallback(name);
  if(el.textContent!==avatar)el.textContent=avatar;
  el.dataset.avatarGlyph=avatar;
  const chosen=source.profile?.(name,id);
  // Keep already-rendered, server-backed board cosmetics while the directory
  // is loading, instead of silently wiping premium styles to "none".
  const allowed=['bronze','silver','gold','mythic','emerald','sapphire','nebula'];
  const frame=chosen
    ? (allowed.includes(chosen.selectedFrame)?chosen.selectedFrame:'none')
    : (allowed.includes(el.dataset.frame)?el.dataset.frame:'none');
  if(el.dataset.frame!==frame)el.dataset.frame=frame;
  for(const [key,value] of [
   ['avatarMotion',chosen?.selectedAvatarMotion],
   ['crewAura',chosen?.selectedAura],
   ['crewTrail',chosen?.selectedTrail],
   ['crewCard',chosen?.selectedCardFx],
   ['crewBanner',chosen?.selectedBanner],
   ['crewNameFx',chosen?.selectedNameFx]
  ]){
   const chosenValue=value||el.dataset[key]||'none';
   if(el.dataset[key]!==chosenValue)el.dataset[key]=chosenValue;
  }
  const rarity=rarityOf(avatar);
  if(el.dataset.avatarRarity!==rarity)el.dataset.avatarRarity=rarity;
  const label='Avatar của '+(name||'nhân viên');if(el.getAttribute('aria-label')!==label)el.setAttribute('aria-label',label);
 }
 for(const el of document.querySelectorAll('[data-staff-profile-name]')){
  const name=source.getMine()?.name||staffName()||'Nhân viên';if(el.textContent!==name)el.textContent=name;
 }
 decorateFrames();
}
function schedule(){if(!scheduled){scheduled=true;requestAnimationFrame(paint);}}
function changed(){schedule();for(const listener of listeners)listener();root.dispatchEvent(new CustomEvent('dolphin-avatars-updated'));}
function setOwn(profile){own=profile?.employeeId?profile:null;if(own)resolver.upsert(own);changed();}
async function refresh(){
 if(shared)return shared.refresh();
 if(inflight)return inflight;
 const service=root.DolphinStaffId;
 if(!service?.avatarDirectory)return;
 inflight=(async()=>{
  try{
   // Pending staff are intentionally absent from the public directory. Refresh
   // their own private identity to keep cross-device avatar changes in sync.
   if(own?.employeeId&&own.verified!==true)await service.refresh();
   const result=await service.avatarDirectory();
   const canonical=own&&(result.profiles||[]).find(p=>p.employeeId===own.employeeId);
   if(canonical&&(canonical.profileVersion||0)>=(own.profileVersion||0)){
    const newer=(canonical.profileVersion||0)>(own.profileVersion||0);
    own={...own,...canonical};
    if(newer)service.refresh();
   }
   resolver.replace(result.profiles);if(own)resolver.upsert(own);changed();
  }
  catch(e){console.warn('[Avatars] Giữ avatar đã tải khi mất kết nối:',e.code||e.message);}
  finally{inflight=null;}
 })();return inflight;
}
const api={get,getMine:()=>own,profile:(name,id)=>resolver.resolve(name,id),setOwn,refresh,
 subscribe:listener=>{listeners.add(listener);return ()=>listeners.delete(listener);},
 html:(name,id)=>avatarHTML(name,id,get(name,id)||fallback(name))};
root.DolphinAvatars=shared||api;
function init(){
 const style=document.createElement('style');style.textContent=`
.dolphin-staff-avatar{display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;width:32px;height:32px;border-radius:50%;background:#ffffff12;border:1px solid #fbd77a55;font-size:21px;line-height:1;vertical-align:middle;margin-right:7px}
[data-staff-avatar][data-frame=bronze]{border:3px solid #cb9154!important;box-shadow:0 0 0 1px #77461f,0 0 10px #cb915488!important}
[data-staff-avatar][data-frame=silver]{border:3px solid #bde5fa!important;box-shadow:0 0 0 1px #6d92a3,0 0 10px #9be2fbbb!important}
[data-staff-avatar][data-frame=gold]{border:3px solid #ffd468!important;box-shadow:0 0 0 1px #ad7926,0 0 11px #ffd86cbb!important}
[data-staff-avatar][data-frame=mythic]{border:3px solid #eeafff!important;box-shadow:0 0 0 2px #7ee8ff,0 0 13px #d895ffdd!important;animation:crew-frame-glow 2.3s ease-in-out infinite alternate}
@keyframes crew-frame-glow{to{box-shadow:0 0 0 2px #bb91ff,0 0 19px #68efff}}
@media(prefers-reduced-motion:reduce){[data-staff-avatar][data-frame=mythic]{animation:none}}
`;document.head.appendChild(style);
 // Place the shared stylesheet AFTER legacy injected rules so the epic tiers win.
 if(!document.getElementById('crew-cosmetics-stylesheet')){
  const link=document.createElement('link');link.id='crew-cosmetics-stylesheet';link.rel='stylesheet';link.href=cosmeticsHref;document.head.appendChild(link);
 }
 new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['data-staff-name','data-staff-id']});
 root.addEventListener('dolphin-staff-id-changed',e=>{(shared||api).setOwn(e.detail);if(!shared)refresh();});
 root.addEventListener('dolphinStaffNameChanged',schedule);
 if(shared){
  let unsubscribe=shared.subscribe(schedule);
  root.addEventListener('pagehide',()=>{unsubscribe?.();unsubscribe=null;});
  root.addEventListener('pageshow',()=>{if(!unsubscribe)unsubscribe=shared.subscribe(schedule);schedule();});
  schedule();return;
 }
 try{own=JSON.parse(localStorage.getItem('dolphinStaffProfile')||'null');if(own)resolver.upsert(own);}catch(e){}
 root.addEventListener('storage',e=>{if(e.key==='dolphinStaffProfile'){try{setOwn(JSON.parse(e.newValue||'null'));}catch(err){}}});
 root.addEventListener('focus',refresh);document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh();});
 setInterval(()=>{if(!document.hidden)refresh();},30000);
 root.DolphinStaffId?.ready().then(()=>{setOwn(root.DolphinStaffId.get());refresh();});schedule();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})(typeof window==='undefined'?globalThis:window);
