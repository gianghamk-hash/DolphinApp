/* Dolphin Staff ID — Manager-issued, server-verified identities.
 * Frontend cannot create identities without authorized Firebase callable functions.
 * Legacy staff names/order fields remain untouched.
 */
(function(){
'use strict';
const config={apiKey:'AIzaSyAtBNp9WBnyIkCiVjXfUpjH2d7-9dbg-JQ',authDomain:'dolphin-f6d67.firebaseapp.com',projectId:'dolphin-f6d67'};
const profilePage=new URL('./dolphin-profile.html',document.currentScript?.src||location.href).href;
let api=null, identity=null, rejection=false, uid='', initialized=false, connection=null;
const manager=()=>navigator.userAgent.includes('DolphinManager')||window.DOLPHIN_APP_TYPE==='manager';
const htmlEscape=x=>String(x||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function emit(){
 if(identity){
  if(window.applySyncedStaffProfile)window.applySyncedStaffProfile(identity);
  try{const value=JSON.stringify(identity);if(localStorage.getItem('dolphinStaffProfile')!==value)localStorage.setItem('dolphinStaffProfile',value);}catch(e){}
 }else{
  try{localStorage.removeItem('dolphinStaffProfile');}catch(_){}
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
  api=name=>func.httpsCallable(functions,name,name==='guestSheetBridge'?{timeout:540000}:{});
  auth.onAuthStateChanged(a,next=>{if((next?.uid||'')!==uid){uid=next?.uid||'';identity=null;emit();if(next)void refresh();}});
  await refresh();
  void retryXP();
 }catch(e){initialized=false;api=null;console.warn('[StaffID] Chưa thể kết nối chức năng xác minh:',e);}
}
function connect(){if(!connection||!initialized)connection=init();return connection;}
async function refresh(){
 if(!api)return null;
 const requestedUid=uid;
 try{
  const r=await api(manager()?'staffGetManagerIdentity':'staffGetIdentity')({});
  if(uid!==requestedUid)return null;
  rejection=r.data?.rejected===true;
  identity=r.data&&(r.data.linked||r.data.verified)?{...r.data,linked:true}:null;emit();return identity;
 }catch(e){
  console.warn('[StaffID] Backend chưa sẵn sàng:',e);
  if(manager()){
   identity=null;
   // Show an existing wrong binding only to obtain explicit switch consent.
   // This response can never unlock a Manager session.
   if(String(e?.code||'').includes('permission-denied'))try{
    const current=(await api('staffGetIdentity')({})).data;
    if(uid===requestedUid&&current?.linked)identity={...current,verified:false,managerSession:false,requiresNameChange:false};
   }catch(_){}
   if(uid===requestedUid)emit();
  }
  return identity;
 }
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
 $('sidClaimBtn').onclick=async()=>{try{await call('staffClaimLinkCode',{code:$('sidCode').value.trim()});msg('Đã xác minh liên kết thiết bị.');render();}catch(e){msg('Không thể xác minh: '+e.message);}};
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
 if(manager()&&name==='staffRegisterSelfProfile')throw Error('Manager APK chỉ liên kết DOL-0001 đã xác minh.');
 if(manager()&&name==='staffClaimLinkCode')data={...data,managerSession:true};
 const result=await api(name)(data||{});
 if(!['staffListApprovedProfiles','staffIssueOwnLinkCode','staffGetAvatarDirectory','staffListPendingApprovals','staffApproveRegistration','staffRejectRegistration','staffRequestNameRecovery','staffListRecoveryRequests','staffApproveNameRecovery'].includes(name)){
  if(name==='staffClaimLinkCode'||name==='staffRepairMyName'||name==='staffRenameManager'||(manager()&&name==='staffUpdateMyProfile'))await refresh();
  else{rejection=false;identity={...result.data,linked:true};emit();}
 }
 return result.data;
}

const pendingXPKey='dolphinStaffXpPendingV1';
function pendingXP(){
 try{return (JSON.parse(localStorage.getItem(pendingXPKey)||'[]')||[])
  .filter(x=>x&&typeof x.id==='string'&&typeof x.kind==='string'&&Date.now()-Number(x.at||0)<3*86400000).slice(-20);}
 catch(_){return [];}
}
function savePendingXP(list){try{localStorage.setItem(pendingXPKey,JSON.stringify(list.slice(-20)));}catch(_){}}
function rememberXP(payload){
 if(!payload||typeof payload.kind!=='string'||typeof payload.id!=='string')return;
 const current=pendingXP().filter(x=>x.kind!==payload.kind||x.id!==payload.id);
 current.push({kind:payload.kind,id:payload.id,employeeId:identity?.employeeId||'',at:Date.now(),attemptAt:0});
 savePendingXP(current);
}
function forgetXP(payload){savePendingXP(pendingXP().filter(x=>x.kind!==payload.kind||x.id!==payload.id));}
async function syncXP(payload){
 rememberXP(payload);
 await connect();
 if(!api)throw Error('Chưa kết nối Firebase XP');
 const response=await api('staffSyncSavedActivityXP')(payload);
 forgetXP(payload);
 return response.data;
}
let retryingXP=false;
async function retryXP(){
 if(retryingXP||!api||!identity?.employeeId||document.hidden)return;
 retryingXP=true;
 try{
  for(const task of pendingXP()){
   if(task.employeeId&&task.employeeId!==identity.employeeId)continue;
   if(Date.now()-Number(task.attemptAt||0)<60000)continue;
   const next=pendingXP();const item=next.find(x=>x.id===task.id&&x.kind===task.kind);
   if(item){item.attemptAt=Date.now();savePendingXP(next);}
   try{
    const r=await api('staffSyncSavedActivityXP')({kind:task.kind,id:task.id});
    forgetXP(task);
    if(Number(r.data?.addedXP)>0)window.dispatchEvent(new CustomEvent('dolphin-xp-synced',{detail:{addedXP:r.data.addedXP}}));
   }catch(e){console.warn('[Staff ID] Pending XP will retry later:',e?.code||e?.message||e);break;}
  }
 }finally{retryingXP=false;}
}

window.DolphinStaffId={get:()=>identity,wasRejected:()=>rejection,refresh,ready:connect,register:data=>call('staffRegisterSelfProfile',data),
 renameManager:(name,avatar)=>call('staffRenameManager',{name,...(avatar?{avatar}:{})}),update:data=>call('staffUpdateMyProfile',data),repairName:name=>call('staffRepairMyName',{name}),link:(code,options={})=>call('staffClaimLinkCode',{code,replaceCurrent:options.replaceCurrent===true,expectedEmployeeId:identity?.employeeId||''}),
 listApproved:()=>call('staffListApprovedProfiles'),avatarDirectory:()=>call('staffGetAvatarDirectory'),
 issueLink:()=>call('staffIssueOwnLinkCode'),
 listPending:()=>call('staffListPendingApprovals'),
 requestNameRecovery:name=>call('staffRequestNameRecovery',{name}),
 listRecoveryRequests:()=>call('staffListRecoveryRequests'),
 approveNameRecovery:requestId=>call('staffApproveNameRecovery',{requestId}),
 approveRegistration:employeeId=>call('staffApproveRegistration',{employeeId}),
 rejectRegistration:employeeId=>call('staffRejectRegistration',{employeeId}),
 assignGuestTable:payload=>call('guestSheetBridge',{action:'assign',data:payload}),
 syncGuestSheets:()=>call('guestSheetBridge',{action:'sync'}),
 performLiveAction:async payload=>{await connect();if(!api)throw Error('Chưa kết nối Firebase');const response=await api('staffRecordLiveAction')(payload);return response.data;},
 syncSavedActivity:syncXP,retrySavedXP:retryXP,
 recoverTodayXP:async()=>{await connect();if(!api)throw Error('Chưa kết nối Firebase XP');const result=await api('staffSyncMyRecentXP')({});return result.data;},
 open:()=>{if(typeof window.openApp==='function'){window.openApp('profile');return;}window.location.assign(profilePage);},
 openManager:()=>{render();document.getElementById('dolphinStaffIdPanel').style.display='flex';}};
window.addEventListener('storage',e=>{if(e.key==='dolphinStaffProfile'&&api)refresh();});
window.addEventListener('focus',()=>{if(api)refresh().then(retryXP);});
setInterval(()=>{if(document.visibilityState==='visible'&&api)void retryXP();},120000);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',connect);else connect();
})();
