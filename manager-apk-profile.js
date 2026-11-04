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
 for(const p of rows){const row=document.createElement('p');row.className='manager-directory-person';row.textContent=(p.avatar||'🐬')+' '+p.name+' · '+p.employeeId;list.append(row);}
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
