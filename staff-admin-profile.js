/* DOL-0001 employee approval inbox; mounted only inside Staff Profile. */
(function(){
'use strict';
if(!document.getElementById('crew-manager-approvals'))return;
const $=id=>document.getElementById(id);
let manager=false,polling=false,lastPending=new Set(),fetched=false;
function feedback(message){$('crew-manager-feedback').textContent=message;}
function verifiedOwner(){
 const i=window.DolphinStaffId?.get?.();
 return i?.employeeId==='DOL-0001'&&i.verified===true;
}
function displayPeople(people){
 const list=$('crew-approval-list');list.replaceChildren();
 if(!people.length){const p=document.createElement('p');p.className='hint';p.textContent='Không có nhân viên đang chờ duyệt.';list.append(p);}
 for(const p of people){
  const row=document.createElement('div');row.className='crew-approval-row';
  const name=document.createElement('span');name.textContent=(p.avatar||'🐬')+' '+p.name+' · '+p.employeeId;
  const btn=document.createElement('button');btn.type='button';btn.className='secondary';btn.textContent='Phê duyệt';
  btn.onclick=async()=>{
   if(!confirm('Phê duyệt '+p.name+' ('+p.employeeId+')?'))return;
   btn.disabled=true;
   try{
    await window.DolphinStaffId.approveRegistration(p.employeeId);
    $('crew-approval-dialog-status').textContent='Đã duyệt '+p.name+'.';
    await refresh(true);
   }catch(error){btn.disabled=false;$('crew-approval-dialog-status').textContent='Không thể duyệt: '+String(error.message||error);}
  };
  row.append(name,btn);list.append(row);
 }
}
async function refresh(render=false){
 if(polling||!verifiedOwner())return;
 polling=true;
 try{
  const result=await window.DolphinStaffId.listPending();
  if(!verifiedOwner())return;
  const profiles=result?.profiles||[];
  const next=new Set(profiles.map(p=>p.employeeId));
  const added=profiles.filter(p=>!lastPending.has(p.employeeId));
  const isNew=fetched&&added.length>0;
  fetched=true;lastPending=next;
  $('crew-approval-count').textContent=profiles.length+' chờ duyệt';
  $('crew-approval-badge').hidden=!profiles.length;
  $('crew-approval-open').textContent='Duyệt nhân viên ('+profiles.length+')';
  if(isNew){
   feedback('🔔 '+added.length+' nhân viên mới đang chờ phê duyệt.');
   // Web notification when available; background FCM is handled separately.
   if('Notification' in window&&Notification.permission==='granted'&&!document.hidden){
    try{new Notification('🐬 Nhân viên mới chờ duyệt',{body:added[0].name+' · '+added[0].employeeId,tag:'dolphin-staff-approval'});}catch(_){}
   }
  }
  if(render||$('crew-approval-dialog').open)displayPeople(profiles);
 }catch(error){feedback('Chưa tải được danh sách duyệt: '+String(error.message||error));}
 finally{polling=false;}
}
async function applyVisibility(){
 const toggle=$('crew-manager-ranking-toggle'),visible=toggle.checked;
 toggle.disabled=true;feedback('Đang cập nhật bảng xếp hạng…');
 try{
  if(!verifiedOwner())throw Error('Chỉ DOL-0001 có quyền.');
  await window.DolphinPrestige.call('staffSetOwnRankingVisibility',{visible});
  feedback(visible?'Đã hiện DOL-0001 trên các bảng xếp hạng.':'Đã ẩn DOL-0001 khỏi các bảng xếp hạng.');
  await window.DolphinPrestige.refresh();
 }catch(error){toggle.checked=!visible;feedback('Không lưu được: '+String(error.message||error));}
 finally{toggle.disabled=false;}
}
function syncManager(){
 manager=verifiedOwner();
 $('crew-manager-approvals').hidden=!manager;
 if(!manager){lastPending.clear();fetched=false;return;}
 const mine=window.DolphinPrestige?.getMine?.();
 if(mine?.employeeId==='DOL-0001')$('crew-manager-ranking-toggle').checked=mine.rankingVisible===true;
 void refresh();
}
function init(){
 $('crew-approval-open').addEventListener('click',()=>{$('crew-approval-dialog').showModal();void refresh(true);});
 $('crew-approval-close').addEventListener('click',()=>$('crew-approval-dialog').close());
 $('crew-approval-refresh').addEventListener('click',()=>void refresh(true));
 $('crew-manager-ranking-toggle').addEventListener('change',applyVisibility);
 window.addEventListener('dolphin-staff-id-changed',syncManager);
 window.addEventListener('dolphin-my-progress-updated',syncManager);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)void refresh();});
 setInterval(()=>{if(manager&&!document.hidden)void refresh();},25000);
 syncManager();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
