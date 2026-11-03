/* DOL-0001 employee approval inbox; mounted only inside Staff Profile. */
(function(){
'use strict';
if(!document.getElementById('crew-manager-approvals'))return;
const $=id=>document.getElementById(id);
let manager=false,polling=false,lastPending=new Set(),lastProfiles=[],fetched=false,renderRequested=false,recoveryRequests=[],approvedProfiles=[],approvedLoading=false;
function feedback(message){$('crew-manager-feedback').textContent=message;}
function verifiedOwner(){
 const i=window.DolphinStaffId?.get?.();
 return i?.employeeId==='DOL-0001'&&i.verified===true;
}
function renderApproved(){
 const list=$('crew-approved-list');if(!list)return;list.replaceChildren();
 const query=($('crew-approved-search')?.value||'').trim().toLocaleLowerCase('vi-VN');
 const sort=$('crew-approved-sort')?.value||'name';
 const rows=approvedProfiles.filter(p=>(p.name+' '+p.employeeId+' '+(p.department||'')).toLocaleLowerCase('vi-VN').includes(query));
 rows.sort((a,b)=>sort==='recent'?(b.approvedAt||b.createdAt||0)-(a.approvedAt||a.createdAt||0)
  :sort==='id'?a.employeeId.localeCompare(b.employeeId)
  :a.name.localeCompare(b.name,'vi'));
 $('crew-approved-summary').textContent=rows.length+' / '+approvedProfiles.length+' nhân viên đã phê duyệt';
 if(!rows.length){const empty=document.createElement('p');empty.className='hint';empty.textContent='Không tìm thấy hồ sơ phù hợp.';list.append(empty);return;}
 for(const p of rows){
  const card=document.createElement('article');card.className='crew-directory-person';
  const avatar=document.createElement('span');avatar.className='crew-directory-avatar';avatar.textContent=p.avatar||'🐬';
  const info=document.createElement('div');info.className='crew-directory-info';
  const title=document.createElement('strong');title.textContent=p.name||'Chưa có tên';
  const id=document.createElement('small');id.textContent=p.employeeId;
  const metadata=document.createElement('small');
  const date=p.approvedAt||p.createdAt;
  const dateLabel=date?new Date(date).toLocaleDateString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh'}):'Chưa rõ';
  metadata.textContent=(p.source==='self'?'Quản lý đã phê duyệt':'Quản lý cấp tài khoản')+
   ' · '+(p.deviceCount||0)+' thiết bị · '+dateLabel+(p.department?' · '+p.department:'');
  info.append(title,id,metadata);
  const pill=document.createElement('span');pill.className='crew-approved-pill';pill.textContent='Đã duyệt';
  card.append(avatar,info,pill);list.append(card);
 }
}
async function refreshApproved(){
 if(!verifiedOwner()||approvedLoading)return;
 approvedLoading=true;
 $('crew-approved-summary').textContent='Đang đồng bộ tài khoản đã phê duyệt…';
 try{
  const result=await window.DolphinStaffId.listApproved();
  if(!verifiedOwner())return;
  approvedProfiles=Array.isArray(result?.profiles)?result.profiles:[];
  $('crew-approved-count').textContent=approvedProfiles.length+' nhân viên';
  renderApproved();
 }catch(error){
  $('crew-approved-summary').textContent='Không tải được danh sách: '+String(error.message||error);
 }finally{approvedLoading=false;}
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
  $('crew-recovery-count').textContent=recoveryRequests.length+' yêu cầu chờ';
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
  $('crew-pending-description').textContent=profiles.length+' hồ sơ mới';
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
 $('crew-manager-approvals').hidden=!manager;
 if(!manager){lastPending.clear();lastProfiles=[];approvedProfiles=[];fetched=false;return;}
 const mine=window.DolphinPrestige?.getMine?.();
 if(mine?.employeeId==='DOL-0001')$('crew-manager-ranking-toggle').checked=mine.rankingVisible===true;
 void refresh();void refreshApproved();
}
function init(){
 $('crew-approved-open').addEventListener('click',()=>{$('crew-approved-dialog').showModal();void refreshApproved();});
 $('crew-approved-close').addEventListener('click',()=>$('crew-approved-dialog').close());
 $('crew-approved-refresh').addEventListener('click',()=>void refreshApproved());
 $('crew-approved-search').addEventListener('input',renderApproved);
 $('crew-approved-sort').addEventListener('change',renderApproved);
 $('crew-recovery-open').addEventListener('click',()=>{
  $('crew-approval-dialog').showModal();$('crew-recovery-section')?.scrollIntoView({block:'nearest'});
  void refresh(true);void refreshRecovery();
 });
 $('crew-approval-open').addEventListener('click',()=>{$('crew-approval-dialog').showModal();void refresh(true);});
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
 document.addEventListener('visibilitychange',()=>{if(!document.hidden){void refresh();if($('crew-approved-dialog').open)void refreshApproved();}});
 setInterval(()=>{if(manager&&!document.hidden)void refresh();},25000);
 syncManager();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
