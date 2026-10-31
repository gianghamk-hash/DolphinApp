/* Self-service staff profile. Identity and writes are confirmed by Firebase callables. */
(function(){
'use strict';
const $=id=>document.getElementById(id),api=window.DolphinStaffId;
let profile=null,avatar='🐬',catalog={},busy=false,dirty=false,expiresAt=0;
function message(text,error=false){$('profile-message').textContent=text;$('profile-message').dataset.error=String(error);}
function setBusy(value){busy=value;for(const id of ['save-profile','choose-avatar','profile-name-input','department','claim-link','issue-link'])$(id).disabled=value||(id==='issue-link'&&!profile);}
function render(fill=true){
 profile=api.get();
 if(fill){
  dirty=false;
  $('profile-name-input').value=profile?.name||(window.getSyncedStaffName?.()||'');
  $('department').value=profile?.department||'';avatar=profile?.avatar||'🐬';
 }
 $('choose-avatar').textContent=avatar;
 $('profile-name').textContent=profile?.name||'Hồ sơ của bạn';
 $('employee-id').textContent=profile?.employeeId||'ID sẽ được tự cấp';
 $('profile-state').textContent=profile?'Đã đăng ký':'Sẵn sàng đăng ký';
 $('device-status').textContent=profile?'Đã liên kết':'Chưa liên kết';
 $('created-at').textContent=profile?.createdAt?new Date(profile.createdAt).toLocaleDateString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh'}):'—';
 $('save-profile').textContent=profile?'Lưu thay đổi':'Đăng ký hồ sơ & thiết bị';
 $('registration-note').hidden=!!profile;$('claim-section').hidden=!!profile;
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
 const data={name:$('profile-name-input').value.trim(),department:$('department').value,avatar};
 setBusy(true);message(profile?'Đang lưu thay đổi…':'Đang đăng ký hồ sơ và thiết bị…');
 try{await (profile?api.update(data):api.register(data));render();message('Đã lưu hồ sơ. Tên và avatar của bạn đã được cập nhật.');}
 catch(err){message(errorText(err),true);setBusy(false);}
});
function renderAvatars(){
 const grid=$('avatar-grid');grid.replaceChildren();
 for(const emoji of catalog[$('avatar-category').value]||[]){
  const button=document.createElement('button');button.type='button';button.className='avatar-choice';button.textContent=emoji;
  button.setAttribute('aria-label','Chọn '+emoji);button.setAttribute('aria-pressed',String(emoji===avatar));
  button.onclick=()=>{dirty=true;avatar=emoji;$('choose-avatar').textContent=emoji;$('avatar-dialog').close();};grid.appendChild(button);
 }
}
$('choose-avatar').onclick=async()=>{
 try{
  if(!Object.keys(catalog).length){const res=await fetch('./functions/staff-avatar-catalog.json');if(!res.ok)throw Error('Chưa tải được bộ avatar');catalog=await res.json();
   for(const category of Object.keys(catalog)){const option=document.createElement('option');option.value=category;option.textContent=category;$('avatar-category').appendChild(option);}}
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
 e.preventDefault();if(busy||profile)return;setBusy(true);message('Đang liên kết thiết bị…');
 try{await api.link($('claim-code').value.trim());$('claim-code').value='';render();message('Đã liên kết. Hồ sơ, tên và avatar được lấy từ thiết bị cũ.');}
 catch(err){message(errorText(err),true);setBusy(false);}
});
$('device-platform').textContent=/DolphinManager/.test(navigator.userAgent)?'Dolphin Manager APK':/DolphinStaff/.test(navigator.userAgent)?'Dolphin Staff APK':'Trình duyệt / PWA';
$('profile-name-input').addEventListener('input',()=>{dirty=true;});$('department').addEventListener('change',()=>{dirty=true;});
window.addEventListener('dolphin-staff-id-changed',()=>{if(!busy&&!dirty)render();});
api.ready().then(()=>{render();message(profile?'Hồ sơ của bạn đã sẵn sàng.':'Nhập tên và chọn avatar để tự đăng ký. Nếu đã có ID, hãy liên kết hồ sơ có sẵn.');}).catch(e=>message(errorText(e),true));
})();
