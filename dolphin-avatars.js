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
  profiles.set(p.employeeId,{employeeId:p.employeeId,name:p.name,avatar:p.avatar.slice(0,24),selectedFrame:p.selectedFrame||prev?.selectedFrame||'none',selectedTitle:p.selectedTitle||prev?.selectedTitle||'none',selectedAura:p.selectedAura||prev?.selectedAura||'none',selectedTrail:p.selectedTrail||prev?.selectedTrail||'none',selectedCardFx:p.selectedCardFx||prev?.selectedCardFx||'none',selectedNameFx:p.selectedNameFx||prev?.selectedNameFx||'none',nameAliases:Array.from(new Set(aliases)).slice(-10)});index();
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
const cosmeticsHref=new URL('crew-cosmetics.css?v=crew-v5-20261102',document.currentScript?.src||location.href).href;
const resolver=createResolver(),listeners=new Set();let own=null,scheduled=false,inflight=null,shared=null;
try{if(root.parent!==root)shared=root.parent.DolphinAvatars||null;}catch(e){}
function staffName(){try{return root.getSyncedStaffName?.()||localStorage.getItem('dolphinStaffName')||'';}catch(e){return '';}}
function get(name,id){return resolver.resolve(name,id)?.avatar||null;}
function fallback(name){return Array.from(String(name||'').trim())[0]?.toLocaleUpperCase('vi-VN')||'👤';}
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
 '#profile-avatar[data-frame]'
].join(',');
function decorateFrame(el){
 const frame=el?.dataset?.frame||'none';
 const supported=['bronze','silver','gold','mythic'];
 const previous=el?.querySelector(':scope > .crew-fx-orbits');
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
  for(let i=1;i<=2;i++){
   const orbit=document.createElement('span');
   orbit.className='crew-fx-layer crew-fx-star-orbit crew-fx-star-orbit--'+i;
   const star=document.createElement('span');star.className='crew-fx-star';
   orbit.appendChild(star);wrap.appendChild(orbit);
  }
 }else{
  const count={bronze:1,silver:2,gold:3}[frame];
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
root.DolphinFrameFX={refresh:decorateFrames,decorate:decorateFrame};
function paint(){
 scheduled=false;
 const source=shared||api;
 for(const el of document.querySelectorAll('[data-staff-avatar]')){
  const mine=el.getAttribute('data-staff-avatar')==='mine';
  const profile=mine?source.getMine():null;
  const name=mine?(profile?.name||staffName()):el.getAttribute('data-staff-name');
  const id=mine?profile?.employeeId:el.getAttribute('data-staff-id');
  const avatar=source.get(name,id)||fallback(name);
  if(el.textContent!==avatar)el.textContent=avatar;
  const chosen=source.profile?.(name,id);
  // Ranking may already have a trusted board frame before the directory arrives.
  const allowed=['bronze','silver','gold','mythic'];
  const frame=chosen
    ? (allowed.includes(chosen.selectedFrame)?chosen.selectedFrame:'none')
    : (allowed.includes(el.dataset.frame)?el.dataset.frame:'none');
  if(el.dataset.frame!==frame)el.dataset.frame=frame;
  const aura=chosen?.selectedAura||'none',trail=chosen?.selectedTrail||'none';
  if(el.dataset.crewAura!==aura)el.dataset.crewAura=aura;
  if(el.dataset.crewTrail!==trail)el.dataset.crewTrail=trail;
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
