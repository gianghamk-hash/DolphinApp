/* DOL-0001 employee approval inbox; mounted only inside Staff Profile. */
(function(){
'use strict';
if(!document.getElementById('crew-manager-approvals'))return;
const $=id=>document.getElementById(id);
let manager=false,polling=false,lastPending=new Set(),lastProfiles=[],fetched=false,renderRequested=false,recoveryRequests=[];
function feedback(message){$('crew-manager-feedback').textContent=message;}
function verifiedOwner(){
 const i=window.DolphinStaffId?.get?.();
 return i?.employeeId==='DOL-0001'&&i.verified===true;
}
const isManagerApk=()=>/DolphinManager(?:\/|\b)/.test(navigator.userAgent);
const ownerInManagerApk=()=>isManagerApk()&&verifiedOwner();
function renderManagerExclusive(){
 const enabled=ownerInManagerApk();
 document.documentElement.classList.toggle('manager-owner-mode',enabled);
 for(const id of ['manager-owner-intro','manager-owner-actions','crew-recovery-open','crew-owner-name-open']){
  const el=$(id);if(el)el.hidden=!enabled;
 }
 if(enabled){
  const daily=$('staff-daily-card');if(daily)daily.hidden=true;
 }else{
  const daily=$('staff-daily-card');if(daily)daily.hidden=false;
 }
}
function openOwnerRename(){
 if(!ownerInManagerApk())return;
 $('owner-rename-value').value=window.DolphinStaffId?.get?.()?.name||'';
 $('owner-rename-feedback').textContent='';
 $('owner-rename-dialog').showModal();
}
async function submitOwnerRename(event){
 event.preventDefault();
 const button=$('owner-rename-save'),output=$('owner-rename-feedback');
 if(!ownerInManagerApk())return;
 const name=$('owner-rename-value').value.trim().replace(/\s+/g,' ');
 if(name.length<7){output.textContent='Vui lòng nhập tên từ 7 ký tự.';return;}
 if(button.disabled)return;
 button.disabled=true;output.textContent='Đang đồng bộ tên với Staff ID DOL-0001…';
 try{
  const result=await window.DolphinStaffId.renameOwner(name);
  if(result?.employeeId!=='DOL-0001'||result.name!==name)throw Error('Máy chủ trả về hồ sơ không hợp lệ.');
  output.textContent='Đã đổi tên và đồng bộ các UID DOL-0001. Staff ID và XP không thay đổi.';
  await window.DolphinPrestige?.refresh?.();
  feedback('Đã đổi tên DOL-0001 thành '+name+'.');
 }catch(error){
  output.textContent='Không đổi được tên: '+String(error?.message||error);
 }finally{button.disabled=false;}
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
function displayRecovery(){
 const list=$('crew-recovery-list');if(!list)return;list.replaceChildren();
 if(!recoveryRequests.length){const hint=document.createElement('p');hint.className='hint';hint.textContent='Không có yêu cầu khôi phục đang chờ.';list.append(hint);return;}
 for(const request of recoveryRequests){
  const row=document.createElement('div');row.className='crew-approval-row';
  const name=document.createElement('span');name.textContent=request.name+' · '+request.employeeId;
  const btn=document.createElement('button');btn.type='button';btn.className='secondary';btn.textContent='Cấp mã';
  btn.onclick=async()=>{
   if(!window.confirm('Đã xác minh danh tính '+request.name+' ('+request.employeeId+')? Mã cấp ra cho phép liên kết thiết bị vào hồ sơ này.'))return;
   btn.disabled=true;
   try{
    const issued=await window.DolphinStaffId.approveNameRecovery(request.requestId);
    const output=$('crew-recovery-code');output.textContent=issued.code;output.hidden=false;
    $('crew-recovery-copy').hidden=false;
    $('crew-approval-dialog-status').textContent='Đã tạo mã liên kết 10 phút cho '+issued.name+'. Chỉ chuyển riêng cho đúng nhân viên.';
    await refresh(true);
   }catch(error){btn.disabled=false;$('crew-approval-dialog-status').textContent='Không cấp được mã: '+String(error.message||error);}
  };
  row.append(name,btn);list.append(row);
 }
}
async function refreshRecovery(){
 if(!verifiedOwner())return;
 try{
  const result=await window.DolphinStaffId.listRecoveryRequests();
  recoveryRequests=Array.isArray(result?.requests)?result.requests:[];
  if($('crew-approval-dialog').open)displayRecovery();
 }catch(error){feedback('Không tải được yêu cầu khôi phục: '+String(error.message||error));}
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
 }finally{polling=false;renderRequested=false;void refreshRecovery();}
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
 renderManagerExclusive();
 $('crew-manager-approvals').hidden=!manager;
 if(!manager){lastPending.clear();lastProfiles=[];fetched=false;return;}
 const mine=window.DolphinPrestige?.getMine?.();
 if(mine?.employeeId==='DOL-0001')$('crew-manager-ranking-toggle').checked=mine.rankingVisible===true;
 void refresh();
}
function init(){
 $('crew-approval-open').addEventListener('click',()=>{$('crew-approval-dialog').showModal();void refresh(true);});
 $('manager-owner-approve')?.addEventListener('click',()=>{if(ownerInManagerApk())$('crew-approval-open').click();});
 $('crew-recovery-open')?.addEventListener('click',()=>{if(!ownerInManagerApk())return;$('crew-approval-open').click();$('crew-recovery-list')?.scrollIntoView({behavior:'smooth',block:'center'});});
 $('manager-owner-rename')?.addEventListener('click',openOwnerRename);
 $('crew-owner-name-open')?.addEventListener('click',openOwnerRename);
 $('owner-rename-close')?.addEventListener('click',()=>$('owner-rename-dialog').close());
 $('owner-rename-form')?.addEventListener('submit',submitOwnerRename);
 $('manager-owner-xp')?.addEventListener('click',()=>{if(ownerInManagerApk())$('crew-admin-sandbox')?.scrollIntoView({behavior:'smooth',block:'start'});});
 $('crew-approval-close').addEventListener('click',()=>$('crew-approval-dialog').close());
 $('crew-approval-refresh').addEventListener('click',()=>void refresh(true));
 $('crew-recovery-copy')?.addEventListener('click',async()=>{
  const code=$('crew-recovery-code')?.textContent;
  if(!code)return;
  try{await navigator.clipboard.writeText(code);$('crew-approval-dialog-status').textContent='Đã sao chép mã. Chỉ gửi riêng cho đúng nhân viên.';}
  catch(e){$('crew-approval-dialog-status').textContent='Không sao chép được tự động; nhấn giữ mã để sao chép.';}
 });
 $('crew-manager-ranking-toggle').addEventListener('change',applyVisibility);
 window.addEventListener('dolphin-staff-id-changed',syncManager);
 window.addEventListener('dolphin-my-progress-updated',syncManager);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)void refresh();});
 setInterval(()=>{if(manager&&!document.hidden)void refresh();},25000);
 syncManager();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
