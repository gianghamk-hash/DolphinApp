/* DOL-0001 employee approval inbox; mounted only inside Staff Profile. */
(function(){
'use strict';
if(!document.getElementById('crew-manager-approvals'))return;
const $=id=>document.getElementById(id);
let manager=false,polling=false,lastPending=new Set(),lastProfiles=[],fetched=false,renderRequested=false;
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
  const reject=document.createElement('button');reject.type='button';reject.className='secondary crew-reject-button';reject.textContent='Từ chối';
  reject.setAttribute('aria-label','Từ chối hồ sơ của '+p.name);
  reject.onclick=async()=>{
   if(!window.confirm('Từ chối '+p.name+' ('+p.employeeId+')? Staff ID cũ sẽ bị vô hiệu hóa trên mọi thiết bị. Nhân viên phải đăng ký lại từ đầu.'))return;
   btn.disabled=true;reject.disabled=true;
   $('crew-approval-dialog-status').textContent='Đang từ chối '+p.name+'…';
   try{
    await window.DolphinStaffId.rejectRegistration(p.employeeId);
    $('crew-approval-dialog-status').textContent='Đã từ chối '+p.name+'. Tài khoản cũ đã bị khóa; nhân viên cần đăng ký lại.';
    await refresh(true);
   }catch(error){
    btn.disabled=false;reject.disabled=false;
    $('crew-approval-dialog-status').textContent='Không thể từ chối: '+String(error.message||error);
   }
  };
  const actions=document.createElement('div');actions.className='crew-approval-actions';actions.append(btn,reject);
  row.append(name,actions);list.append(row);
 }
}
async function refresh(render=false){
 if(!verifiedOwner())return;
 if(render){
  renderRequested=true;
  if(lastProfiles.length)displayPeople(lastProfiles);
  else $('crew-approval-dialog-status').textContent='Đang tải danh sách chờ duyệt…';
 }
 // A refresh may be in flight when the manager opens the dialog. Let that
 // request complete and render its result, rather than dropping the click.
 if(polling)return;
 polling=true;
 try{
  const result=await window.DolphinStaffId.listPending();
  if(!verifiedOwner())return;
  const profiles=Array.isArray(result?.profiles)?result.profiles:[];
  lastProfiles=profiles;
  const next=new Set(profiles.map(p=>p.employeeId));
  const added=profiles.filter(p=>!lastPending.has(p.employeeId));
  const isNew=fetched&&added.length>0;
  fetched=true;lastPending=next;
  $('crew-approval-count').textContent=profiles.length+' chờ duyệt';
  // Keep the badge node mounted. Replacing the entire button.textContent
  // used to delete this span, causing "Cannot set properties of null".
  $('crew-approval-open-label').textContent='Duyệt nhân viên ('+profiles.length+')';
  $('crew-approval-badge').hidden=!profiles.length;
  if(isNew){
   feedback('🔔 '+added.length+' nhân viên mới đang chờ phê duyệt.');
   // Web notification when available; background FCM is handled separately.
   if('Notification' in window&&Notification.permission==='granted'&&!document.hidden){
    try{new Notification('🐬 Nhân viên mới chờ duyệt',{body:added[0].name+' · '+added[0].employeeId,tag:'dolphin-staff-approval'});}catch(_){}
   }
  }
  if(renderRequested||$('crew-approval-dialog').open){
   displayPeople(profiles);
   if(!profiles.length)$('crew-approval-dialog-status').textContent='Danh sách chờ duyệt đang trống.';
   else $('crew-approval-dialog-status').textContent=profiles.length+' hồ sơ đang chờ duyệt.';
  }
 }catch(error){
  const msg='Chưa tải được danh sách duyệt: '+String(error.message||error);
  feedback(msg);$('crew-approval-dialog-status').textContent=msg;
 }finally{polling=false;renderRequested=false;}
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
 if(!manager){lastPending.clear();lastProfiles=[];fetched=false;return;}
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
