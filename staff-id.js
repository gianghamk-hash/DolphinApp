/* Dolphin Staff ID — Manager-issued, server-verified identities.
 * Frontend cannot create identities without authorized Firebase callable functions.
 * Legacy staff names/order fields remain untouched.
 */
(function(){
'use strict';
const config={apiKey:'AIzaSyAtBNp9WBnyIkCiVjXfUpjH2d7-9dbg-JQ',authDomain:'dolphin-f6d67.firebaseapp.com',projectId:'dolphin-f6d67'};
let api=null, identity=null, uid='', initialized=false, connection=null;
const manager=()=>navigator.userAgent.includes('DolphinManager')||window.DOLPHIN_APP_TYPE==='manager';
const htmlEscape=x=>String(x||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function emit(){
 if(identity){
  if(window.applySyncedStaffProfile)window.applySyncedStaffProfile(identity);
  try{const value=JSON.stringify(identity);if(localStorage.getItem('dolphinStaffProfile')!==value)localStorage.setItem('dolphinStaffProfile',value);}catch(e){}
 }
 window.dispatchEvent(new CustomEvent('dolphin-staff-id-changed',{detail:identity}));
}
async function init(){
 if(initialized)return;initialized=true;
 try{
  const [fb,auth,func]=await Promise.all([
   import('https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js'),
   import('https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js'),
   import('https://www.gstatic.com/firebasejs/10.12.2/firebase-functions.js')]);
  let app;try{app=fb.getApp('staff-identity-app');}catch(e){app=fb.initializeApp(config,'staff-identity-app');}
  const a=auth.getAuth(app);if(a.authStateReady)await a.authStateReady();
  const user=a.currentUser|| (await auth.signInAnonymously(a)).user;
  uid=user.uid;const functions=func.getFunctions(app,'asia-southeast1');
  api=name=>func.httpsCallable(functions,name);
  await refresh();
 }catch(e){initialized=false;api=null;console.warn('[StaffID] Chưa thể kết nối chức năng xác minh:',e);}
}
function connect(){if(!connection||!initialized)connection=init();return connection;}
async function refresh(){
 if(!api)return null;
 try{
  const r=await api('staffGetIdentity')({});
  identity=r.data&&(r.data.linked||r.data.verified)?{...r.data,linked:true}:null;emit();return identity;
 }catch(e){console.warn('[StaffID] Backend chưa sẵn sàng:',e);return identity;}
}
function ui(){
 if(document.getElementById('dolphinStaffIdPanel'))return;
 const wrapper=document.createElement('div');wrapper.id='dolphinStaffIdPanel';
 wrapper.style.cssText='position:fixed;inset:0;z-index:2147483000;background:#000b;display:none;align-items:center;justify-content:center;padding:18px;font-family:Arial,sans-serif';
 wrapper.innerHTML='<div style="background:#123634;color:white;border:1px solid #d7b65a;border-radius:16px;padding:18px;width:min(100%,430px);max-height:90vh;overflow:auto"><div style="display:flex;justify-content:space-between;align-items:center"><b>🐬 DOLPHIN STAFF ID</b><button id="sidClose" type="button">✕</button></div><p id="sidStatus" style="font-size:13px"></p><section id="sidClaim"><label>Mã liên kết thiết bị do quản lý cấp (hết hạn sau 10 phút)</label><input id="sidCode" placeholder="36 ký tự" style="width:100%;padding:10px;margin:8px 0"><button id="sidClaimBtn" type="button">Xác minh thiết bị</button></section><section id="sidManager" style="display:none;border-top:1px solid #777;margin-top:16px;padding-top:12px"><b>Quản lý cấp mã nhân viên</b><p style="font-size:12px">UID quản lý: <code id="sidUid"></code> (phải được cấp quyền ở máy chủ)</p><input id="sidNewId" placeholder="DOL-0001" style="width:100%;padding:9px;margin:5px 0"><input id="sidNewName" placeholder="Họ tên nhân viên" style="width:100%;padding:9px;margin:5px 0"><button id="sidCreate" type="button">Tạo hồ sơ</button><p style="font-size:12px">Cấp mã liên kết cho APK/Web (mỗi thiết bị cần một mã mới):</p><input id="sidExisting" placeholder="DOL-0001" style="width:100%;padding:9px;margin:5px 0"><button id="sidIssue" type="button">Tạo mã liên kết</button><p id="sidOutput" style="overflow-wrap:anywhere;color:#fbd77a"></p></section><p id="sidMessage" role="status" style="font-size:12px"></p></div>';
 document.body.appendChild(wrapper);
 const $=id=>document.getElementById(id),msg=t=>{$('sidMessage').textContent=t;};
 $('sidClose').onclick=()=>wrapper.style.display='none';
 wrapper.onclick=e=>{if(e.target===wrapper)wrapper.style.display='none';};
 $('sidClaimBtn').onclick=async()=>{try{if(!api)throw Error('Chưa kết nối máy chủ');const r=await api('staffClaimLinkCode')({code:$('sidCode').value.trim()});identity=r.data;emit();msg('Đã liên kết '+identity.employeeId+' — '+identity.name);render();}catch(e){msg('Không thể xác minh: '+e.message);}};
 $('sidCreate').onclick=async()=>{try{if(!api)throw Error('Chưa kết nối máy chủ');const r=await api('staffCreateProfile')({employeeId:$('sidNewId').value.trim(),name:$('sidNewName').value.trim()});msg('Đã tạo hồ sơ '+r.data.employeeId+' — '+r.data.name);}catch(e){msg('Không thể tạo: '+e.message);}};
 $('sidIssue').onclick=async()=>{try{if(!api)throw Error('Chưa kết nối máy chủ');const r=await api('staffIssueLinkCode')({employeeId:$('sidExisting').value.trim()});$('sidOutput').textContent=r.data.code;msg('Mã một lần, hiệu lực 10 phút. Chuyển riêng cho nhân viên.');}catch(e){msg('Không thể cấp mã: '+e.message);}};
}
function render(){
 ui();const $=id=>document.getElementById(id);
 $('sidStatus').textContent=identity?'Đã liên kết: '+identity.employeeId+' — '+identity.name:'Thiết bị chưa liên kết Staff ID. Tên nhân viên cũ vẫn hoạt động như trước.';
 $('sidClaim').style.display=identity?'none':'block';
 $('sidManager').style.display=manager()?'block':'none';
 $('sidUid').textContent=uid||'Chưa kết nối';
}
async function call(name,data){
 await connect();if(!api)throw Error('Chưa kết nối máy chủ. Vui lòng thử lại.');
 const result=await api(name)(data||{});
 if(name!=='staffIssueOwnLinkCode'){
  if(name==='staffClaimLinkCode')await refresh();
  else{identity={...result.data,linked:true};emit();}
 }
 return result.data;
}
window.DolphinStaffId={get:()=>identity,refresh,ready:connect,register:data=>call('staffRegisterSelfProfile',data),
 update:data=>call('staffUpdateMyProfile',data),link:code=>call('staffClaimLinkCode',{code}),
 issueLink:()=>call('staffIssueOwnLinkCode'),
 open:()=>{render();document.getElementById('dolphinStaffIdPanel').style.display='flex';}};
window.addEventListener('storage',e=>{if(e.key==='dolphinStaffProfile'&&api)refresh();});
window.addEventListener('focus',()=>{if(api)refresh();});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',connect);else connect();
})();
