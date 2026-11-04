/* Self-service staff profile. Identity and writes are confirmed by Firebase callables. */
(function(){
'use strict';
const $=id=>document.getElementById(id),api=window.DolphinStaffId;
let profile=null,avatar='🐬',catalog={},busy=false,dirty=false,expiresAt=0;
function message(text,error=false){
 for(const id of ['profile-message','profile-edit-message','device-message']){
  const node=$(id);if(node){node.textContent=text;node.dataset.error=String(error);}
 }
}
for(const button of document.querySelectorAll('[data-open-dialog]'))button.addEventListener('click',()=>{
 const dialog=$(button.dataset.openDialog);if(dialog&&!dialog.open)dialog.showModal();
});
for(const button of document.querySelectorAll('[data-close-dialog]'))button.addEventListener('click',()=>button.closest('dialog').close());
function setBusy(value){busy=value;for(const id of ['save-profile','choose-avatar','profile-name-input','claim-link','issue-link'])$(id).disabled=value||(id==='issue-link'&&!profile)||(id==='profile-name-input'&&!!profile);}
function render(fill=true){
 profile=api.get();
 const managerApk=/DolphinManager/.test(navigator.userAgent)||window.DOLPHIN_APP_TYPE==='manager';
 if(managerApk)document.documentElement.dataset.app='manager';
 document.documentElement.dataset.verifiedManager=String(managerApk&&profile?.employeeId==='DOL-0001'&&profile.verified===true);
 if(fill){
  dirty=false;
  $('profile-name-input').value=profile?.name||(window.getSyncedStaffName?.()||'');
  avatar=profile?.avatar||'🐬';
 }
 $('choose-avatar').textContent=avatar;
 if($('profile-avatar'))$('profile-avatar').textContent=avatar;
 $('profile-name').textContent=profile?.name||'Hồ sơ của bạn';
 $('employee-id').textContent=profile?.employeeId||'ID sẽ được tự cấp';
 $('profile-state').textContent=profile?(profile.verified?'Đã xác minh':'Đang chờ quản lý duyệt'):'Sẵn sàng đăng ký';
 $('device-status').textContent=profile?'Đã liên kết':'Chưa liên kết';
 $('created-at').textContent=profile?.createdAt?new Date(profile.createdAt).toLocaleDateString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh'}):'—';
 $('save-profile').textContent=profile?'Lưu avatar':'Đăng ký hồ sơ & thiết bị';
 $('registration-note').hidden=!!profile;
 $('switch-confirm').hidden=!profile;
 $('confirm-switch').checked=false;
 $('claim-current').textContent=profile?'Thiết bị này đang dùng '+profile.employeeId+'. Dán mã từ thiết bị khác để chuyển sang hồ sơ đó (cần xác nhận bên dưới).':'Dán mã từ thiết bị đã đăng ký để kích hoạt Staff ID trên thiết bị này.';
 setBusy(false);
}
function errorText(e){
 const code=String(e?.code||'');
 if(code.includes('not-found')||code.includes('unimplemented'))return 'Chức năng hồ sơ chưa sẵn sàng trên máy chủ. Vui lòng thử lại sau.';
 if(code.includes('unavailable')||code.includes('internal'))return 'Chưa kết nối được máy chủ. Vui lòng kiểm tra mạng và thử lại.';
 return e?.message||'Chưa lưu được hồ sơ. Vui lòng thử lại.';
}
$('profile-form').addEventListener('submit',async e=>{
 e.preventDefault();if(busy)return;
 const data={name:$('profile-name-input').value.trim(),avatar};
 setBusy(true);message(profile?'Đang lưu thay đổi…':'Đang đăng ký hồ sơ và thiết bị…');
 try{const wasRegistered=!!profile;await (profile?api.update({avatar}):api.register(data));render();message(wasRegistered?'Đã lưu hồ sơ và avatar. Họ tên đã được khóa.':'Đã lưu hồ sơ. Vui lòng chờ DOL-0001 xác minh.');$('profile-edit-dialog')?.close();}
 catch(err){message(errorText(err),true);setBusy(false);}
});
function renderAvatars(){
 const grid=$('avatar-grid');grid.replaceChildren();
 const group=$('avatar-category').value,need=Number((group.match(/Lv\.(\d+)/)||[])[1])||1,level=window.DolphinPrestige?.getMine()?.level||1;
 for(const emoji of catalog[group]||[]){
  const button=document.createElement('button');button.type='button';button.className='avatar-choice';button.textContent=emoji;
  const rarity=window.DolphinFrameFX?.rarityOf?.(emoji)||'common';
  button.dataset.avatarRarity=rarity;
  button.setAttribute('aria-label',(rarity==='sovereign'?'👑 Hoàng gia ':rarity==='mythic'?'💎 Mythic ':'Chọn ')+emoji);
  button.setAttribute('aria-pressed',String(emoji===avatar));
  if(need>level){button.disabled=true;button.title='Mở khóa tại Level '+need;button.style.opacity='.35';}
  button.onclick=()=>{dirty=true;avatar=emoji;$('choose-avatar').textContent=emoji;$('avatar-dialog').close();};grid.appendChild(button);
 }
}
$('choose-avatar').onclick=async()=>{
 try{
  if(!Object.keys(catalog).length){const res=await fetch('./functions/staff-avatar-catalog.json?v=crew-global-v9');if(!res.ok)throw Error('Chưa tải được bộ avatar');catalog=await res.json();
   const levelOf=label=>Number((label.match(/Lv\.(\d+)/)||[])[1])||1;
   const categories=Object.keys(catalog).sort((a,b)=>levelOf(a)-levelOf(b)||a.localeCompare(b,'vi'));
   const select=$('avatar-category'),previous=select.value;
   select.replaceChildren();
   for(const category of categories){
    const option=document.createElement('option');option.value=category;
    option.textContent=category;select.appendChild(option);
   }
   // Always present Level 1 first; preserve an explicit previous choice.
   select.value=previous&&catalog[previous]?previous:categories[0];}
  renderAvatars();$('avatar-dialog').showModal();
 }catch(e){message(errorText(e),true);}
};
$('avatar-category').onchange=renderAvatars;$('close-avatars').onclick=()=>$('avatar-dialog').close();
$('issue-link').onclick=async()=>{
 if(busy||!profile)return;setBusy(true);message('Đang tạo mã liên kết…');
 try{const result=await api.issueLink();$('link-code').textContent=result.code;expiresAt=Date.now()+result.expiresInMinutes*60000;$('code-panel').hidden=false;updateExpiry();message('Đã tạo mã. Nhập mã trên thiết bị mới để dùng cùng hồ sơ.');}
 catch(e){message(errorText(e),true);}finally{setBusy(false);}
};
function updateExpiry(){if(!expiresAt)return;const secs=Math.max(0,Math.ceil((expiresAt-Date.now())/1000));$('code-expiry').textContent=secs?'Mã còn hiệu lực '+Math.floor(secs/60)+':'+String(secs%60).padStart(2,'0'):'Mã đã hết hạn. Hãy tạo mã mới.';$('copy-code').disabled=!secs;}
setInterval(updateExpiry,1000);
$('copy-code').onclick=async()=>{try{await navigator.clipboard.writeText($('link-code').textContent);message('Đã sao chép mã liên kết.');}catch(e){message('Bạn có thể nhấn giữ mã để sao chép.');}};
$('link-form').addEventListener('submit',async e=>{
 e.preventDefault();if(busy)return;
 if(profile&&!$('confirm-switch').checked){message('Hãy xác nhận chuyển hồ sơ cho thiết bị này trước khi liên kết.',true);return;}
 setBusy(true);message('Đang liên kết thiết bị…');
 try{await api.link($('claim-code').value.trim(),{replaceCurrent:!!profile});$('claim-code').value='';expiresAt=0;$('link-code').textContent='';$('code-panel').hidden=true;render();message('Đã liên kết. Hồ sơ, tên và avatar được lấy từ thiết bị cũ.');}
 catch(err){message(errorText(err),true);setBusy(false);}
});
$('device-platform').textContent=/DolphinManager/.test(navigator.userAgent)?'Dolphin Manager APK':/DolphinStaff/.test(navigator.userAgent)?'Dolphin Staff APK':'Trình duyệt / PWA';
$('profile-name-input').addEventListener('input',()=>{dirty=true;});
window.addEventListener('dolphin-staff-id-changed',()=>{if(!busy&&!dirty)render();});
api.ready().then(()=>{render();message(profile?'Hồ sơ của bạn đã sẵn sàng.':'Nhập tên và chọn avatar để tự đăng ký. Nếu đã có ID, hãy liên kết hồ sơ có sẵn.');}).catch(e=>message(errorText(e),true));
})();
