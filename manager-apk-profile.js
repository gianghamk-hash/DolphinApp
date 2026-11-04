/* Manager APK presentation. The UA never grants backend permissions. */
(function(){
'use strict';
if(!/DolphinManager/.test(navigator.userAgent)&&window.DOLPHIN_APP_TYPE!=='manager')return;
const $=id=>document.getElementById(id);
document.documentElement.classList.add('manager-apk-profile');
const panel=$('crew-manager-approvals'),hero=$('crew-profile-banner');
if(!panel||!hero)return;
hero.after(panel);
const heading=document.createElement('h2');heading.className='manager-personal-heading';heading.textContent='Cá nhân & thiết bị';
document.querySelector('.quick-actions').before(heading);
const actions=document.createElement('div');actions.className='manager-action-grid';
const pending=$('crew-approval-open');pending.classList.remove('full');actions.append(pending);
const recovery=document.createElement('button');recovery.type='button';recovery.className='secondary';recovery.textContent='Khôi phục tài khoản / thiết bị';
recovery.onclick=()=>{pending.click();$('crew-recovery-list')?.scrollIntoView({block:'nearest'});};actions.append(recovery);
const approved=document.createElement('button');approved.type='button';approved.className='secondary';approved.textContent='Danh bạ đã phê duyệt';actions.prepend(approved);
panel.querySelector('.hint').after(actions);
const dialog=document.createElement('dialog');dialog.id='manager-approved-dialog';
dialog.innerHTML='<div class="dialog-head"><h2>Nhân viên đã phê duyệt</h2><button type="button" class="icon-button" aria-label="Đóng danh bạ">✕</button></div><label for="manager-directory-search">Tìm tên hoặc Staff ID</label><input id="manager-directory-search" type="search"><p role="status"></p><div class="manager-directory-list"></div>';
document.body.append(dialog);dialog.querySelector('button').onclick=()=>dialog.close();
let people=[];
function render(){
 const term=$('manager-directory-search').value.toLocaleLowerCase('vi');
 const rows=people.filter(p=>(p.name+' '+p.employeeId).toLocaleLowerCase('vi').includes(term));
 const list=dialog.querySelector('.manager-directory-list');list.replaceChildren();
 for(const p of rows){
  const row=document.createElement('div');row.className='manager-directory-person';
  const label=document.createElement('p');label.textContent=(p.avatar||'🐬')+' '+p.name+' · '+p.employeeId;row.append(label);
  if(p.employeeId!=='DOL-0001')for(const [title,endpoint] of [['Cấp lại mã liên kết','staffIssueEmployeeRecoveryCode'],['Xóa tài khoản','staffDeleteEmployee']]){
   const button=document.createElement('button');button.type='button';button.className='secondary';button.textContent=title;
   button.onclick=async()=>{
    const payload={employeeId:p.employeeId};
    if(endpoint==='staffDeleteEmployee'){
     const typed=window.prompt('Xóa quyền truy cập của '+p.name+' trên mọi thiết bị. Lịch sử doanh thu và XP được giữ lại. Nhập '+p.employeeId+' để xác nhận:');
     if(typed!==p.employeeId)return;payload.confirmEmployeeId=typed;
    }else if(!window.confirm('Đã xác minh đúng nhân viên '+p.name+' ('+p.employeeId+')? Mã sẽ liên kết thiết bị mới và giữ nguyên ID, XP, lịch sử.'))return;
    button.disabled=true;
    try{
     const result=await window.DolphinPrestige.call(endpoint,payload);
     if(result.code){
      const output=document.createElement('p');output.textContent='Mã cho '+result.name+' (10 phút, dùng một lần): '+result.code;output.style.overflowWrap='anywhere';row.append(output);
      const copy=document.createElement('button');copy.type='button';copy.className='secondary';copy.textContent='Sao chép mã';
      copy.onclick=async()=>{try{await navigator.clipboard.writeText(result.code);copy.textContent='Đã sao chép';}catch(_){dialog.querySelector('[role=status]').textContent='Nhấn giữ mã để sao chép.';}};row.append(copy);
     }else{people=people.filter(x=>x.employeeId!==p.employeeId);render();}
    }catch(e){dialog.querySelector('[role=status]').textContent='Không thực hiện được: '+e.message;}
    finally{button.disabled=false;}
   };row.append(button);
  }
  list.append(row);
 }
 dialog.querySelector('[role=status]').textContent=rows.length+' hồ sơ';
}
$('manager-directory-search').oninput=render;
approved.onclick=async()=>{
 dialog.showModal();people=[];render();dialog.querySelector('[role=status]').textContent='Đang tải…';
 try{const result=await window.DolphinStaffId.listApproved();if(!window.DolphinStaffId.get()?.managerSession)return;people=result.profiles||[];render();}
 catch(e){dialog.querySelector('[role=status]').textContent='Không tải được: '+e.message;}
};
function sync(){
 const me=window.DolphinStaffId?.get?.(),owner=me?.managerSession===true&&me.verified===true&&me.employeeId==='DOL-0001';
 document.documentElement.classList.toggle('manager-owner-verified',owner);
 $('staff-daily-card').hidden=true;
 if(!owner){people=[];dialog.close();return;}
 const hint=$('profile-name-input')?.nextElementSibling;
 if(hint)hint.textContent='DOL-0001 có thể đổi tên nhiều lần. Tên vẫn phải hợp lệ và không trùng hồ sơ khác.';
}
window.addEventListener('dolphin-staff-id-changed',sync);sync();
})();
