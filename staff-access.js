/* Dolphin Staff Access Gate — approval is ALWAYS decided by Firebase. */
(function(root){
'use strict';
if(!root.document||root.parent!==root||root.DolphinStaffAccess)return;
const managerAPK=()=>/DolphinManager/.test(navigator.userAgent)||root.DOLPHIN_APP_TYPE==='manager';
const base=new URL('./',document.currentScript?.src||location.href);
const $=id=>document.getElementById(id);
const state={allowed:false,busy:false,mode:'register',avatar:'🐬',initialized:false,pending:false,needsRename:false};
const starters=['🐬','🐳','🐠','🐢','🦊','🐯','🦁','👨‍🍳','👩‍🍳','⭐','🌊','🔥'];
document.documentElement.classList.add('dolphin-access-pending');
function status(message,error=false){const el=$('dag-status');if(el){el.textContent=message;el.dataset.error=String(error);}}
function busy(on){state.busy=on;for(const el of document.querySelectorAll('#dolphinAccessGate button[data-action],#dolphinAccessGate input'))el.disabled=on;}
function panel(name){
 if(state.pending&&name!=='pending')return;
 if(state.needsRename&&name!=='rename')return;
 state.mode=name;
 for(const p of document.querySelectorAll('.dag-panel'))p.hidden=p.dataset.panel!==name;
 for(const b of document.querySelectorAll('.dag-tab'))b.setAttribute('aria-selected',String(b.dataset.tab===name));
}
function unlock(identity){
 if(identity?.requiresNameChange||identity?.verified!==true||(managerAPK()&&identity?.managerSession!==true))return lock(identity);
 state.pending=false;state.needsRename=false;state.allowed=true;
 document.documentElement.classList.remove('dolphin-access-pending');
 document.documentElement.classList.add('dolphin-access-allowed');
 $('dolphinAccessGate').hidden=true;
 // Staff approval controls now live exclusively inside DOL-0001's profile.
}
function lock(identity){
 state.allowed=false;
 state.pending=!!(identity?.employeeId&&identity?.approved===false);
 state.needsRename=!!identity?.requiresNameChange;
 for(const tab of document.querySelectorAll('.dag-tab')){tab.hidden=state.pending||state.needsRename;tab.disabled=state.pending||state.needsRename;}
 document.documentElement.classList.remove('dolphin-access-allowed');
 document.documentElement.classList.add('dolphin-access-pending');
 $('dolphinAccessGate').hidden=false;

 if(state.needsRename){
  state.mode='rename';panel('rename');
  $('dag-rename-current').textContent=identity?.name||'';
 }else if(managerAPK()){
  state.pending=false;state.mode='link';panel('link');
  for(const tab of document.querySelectorAll('.dag-tab'))tab.hidden=tab.dataset.tab!=='link';
  status('Manager APK cần mã liên kết DOL-0001 từ thiết bị đã xác minh.');
 }else if(identity?.employeeId){
  state.mode='pending';panel('pending');
  $('dag-pending-id').textContent=identity.employeeId;
  $('dag-pending-name').textContent=identity.name||'';
 }else if(state.mode!=='register'&&state.mode!=='link')panel('register');
}
async function getApi(){
 if(root.DolphinStaffId)return root.DolphinStaffId;
 await new Promise((resolve,reject)=>{
  const s=document.createElement('script');
  s.src=new URL('staff-id.js?v=crew-operational-auth-v1',base).href;
  s.onload=resolve;s.onerror=reject;document.head.appendChild(s);
 });
 if(!root.DolphinStaffId)throw Error('Không thể tải Staff ID.');
 return root.DolphinStaffId;
}
function makeUI(){
 if($('dolphinAccessGate'))return;
 const gate=document.createElement('section');gate.id='dolphinAccessGate';
 gate.setAttribute('role','dialog');gate.setAttribute('aria-label','Xác minh Dolphin Staff');
 gate.innerHTML=`
 <div class="dag-card">
  <div class="dag-logo">🐬</div><h1>DOLPHIN STAFF</h1>
  <p class="dag-sub">Xác minh nhân viên và liên kết thiết bị</p>
  <div class="dag-tabs" role="tablist">
   <button type="button" class="dag-tab" data-tab="register" aria-selected="true">Đăng ký mới</button>
   <button type="button" class="dag-tab" data-tab="link" aria-selected="false">Liên kết thiết bị</button>
   <button type="button" class="dag-tab" data-tab="recovery" aria-selected="false">Quên tài khoản?</button>
  </div>
  <section class="dag-panel" data-panel="register">
   <form id="dag-register-form">
    <label for="dag-name">Họ và tên nhân viên</label>
    <input id="dag-name" name="name" autocomplete="name" minlength="7" maxlength="64" required placeholder="Họ và tên trên 6 ký tự">
    <p class="dag-help">Tên phải trên 6 ký tự, không trùng với bất kỳ hồ sơ đang hoạt động nào. Chỉ được đổi khi hệ thống yêu cầu chuẩn hóa.</p>
    <label>Chọn Avatar khởi đầu</label>
    <div class="dag-avatars" id="dag-avatar-list" role="group" aria-label="Chọn avatar"></div>
    <button type="submit" class="dag-primary" data-action="register">Đăng ký và gửi duyệt</button>
   </form>
  </section>
  <section class="dag-panel" data-panel="link" hidden>
   <form id="dag-link-form">
    <label for="dag-code">Mã liên kết thiết bị (36 ký tự)</label>
    <input id="dag-code" autocomplete="off" maxlength="36" pattern="[A-Fa-f0-9]{36}" spellcheck="false" placeholder="Dán mã liên kết" required>
    <p class="dag-help">Mỗi mã chỉ dùng một lần, hết hạn sau 10 phút. Nhận mã từ thiết bị cũ hoặc quản lý.</p>
    <label id="dag-switch-label" class="dag-switch" hidden>
     <input id="dag-switch-confirm" type="checkbox">
     <span>Đồng ý chuyển thiết bị đang đăng ký sang Staff ID trong mã liên kết.</span>
    </label>
    <button type="submit" class="dag-primary" data-action="link">Xác minh thiết bị</button>
   </form>
  </section>
  <section class="dag-panel" data-panel="recovery" hidden>
   <form id="dag-recovery-form">
    <label for="dag-recovery-name">Họ và tên đã đăng ký</label>
    <input id="dag-recovery-name" autocomplete="name" minlength="2" maxlength="64" required placeholder="Nhập đúng họ và tên">
    <p class="dag-help">Chỉ cần nhập họ tên. Nếu hồ sơ hợp lệ, quản lý DOL-0001 sẽ xác minh và cấp mã liên kết một lần. Không ai có thể tự lấy mã của người khác bằng tên.</p>
    <button type="submit" class="dag-primary" data-action="recovery">Gửi yêu cầu lấy lại tài khoản</button>
   </form>
  </section>
  <section class="dag-panel" data-panel="pending" hidden>
   <div class="dag-pending">
    <strong>⏳ Chờ quản lý DOL-0001 duyệt</strong>
    <p id="dag-pending-name"></p>
    <p>Staff ID: <b id="dag-pending-id"></b></p>
    <p class="dag-help">Khi được quản lý phê duyệt, thiết bị sẽ tự động vào DolphinApp. Không cần đăng ký lại.</p>
    <button type="button" class="dag-secondary" data-action="refresh">Kiểm tra lại</button>

   </div>
  </section>
  <section class="dag-panel" data-panel="rename" hidden>
   <form id="dag-rename-form">
    <strong>⚠️ Cần cập nhật họ tên nhân viên</strong>
    <p class="dag-help">Tên hiện tại: <b id="dag-rename-current"></b></p>
    <p class="dag-help">Tên phải dài hơn 6 ký tự và không trùng với tài khoản khác. Staff ID, XP, doanh thu, điểm công việc, Level và lịch sử vẫn được giữ nguyên.</p>
    <label for="dag-rename-name">Họ và tên mới</label>
    <input id="dag-rename-name" minlength="7" maxlength="64" autocomplete="name" required placeholder="Họ và tên hợp lệ">
    <button type="submit" class="dag-primary" data-action="rename">Lưu tên và tiếp tục</button>
   </form>
  </section>
  <section class="dag-panel" data-panel="manager" hidden>
   <h2 style="font-size:18px;color:#ffe1a1">👑 Quản lý DOL-0001</h2>
   <p class="dag-help">Chỉ quản lý đã xác minh trên máy chủ có thể phê duyệt.</p>
   <div id="dag-pending-list"></div>
   <button type="button" class="dag-secondary dag-back" data-action="close">Về trang chủ</button>
  </section>
  <p id="dag-status" class="dag-status" role="status" aria-live="polite">Đang xác thực Staff ID…</p>
 </div>`;
 document.body.appendChild(gate);

 const grid=$('dag-avatar-list');
 for(const emoji of starters){
  const btn=document.createElement('button');btn.type='button';btn.className='dag-avatar';
  btn.textContent=emoji;btn.dataset.avatar=emoji;
  btn.setAttribute('aria-pressed',String(emoji===state.avatar));
  btn.setAttribute('aria-label','Chọn avatar '+emoji);
  btn.onclick=()=>{state.avatar=emoji;for(const b of grid.children)b.setAttribute('aria-pressed',String(b===btn));};
  grid.appendChild(btn);
 }
 for(const tab of document.querySelectorAll('.dag-tab'))tab.onclick=()=>{panel(tab.dataset.tab);status('');};
 $('dag-register-form').onsubmit=register;
 $('dag-link-form').onsubmit=link;
 $('dag-recovery-form').onsubmit=requestRecovery;
 $('dag-rename-form').onsubmit=renameAccount;
 gate.querySelector('[data-action=refresh]').onclick=()=>check(true);

 gate.querySelector('[data-action=close]').onclick=()=>{gate.hidden=true;panel('register');};
}
async function check(force=false){
 try{
  const api=await getApi();await api.ready();
  const identity=force?await api.refresh():api.get();
  if(identity?.verified===true&&identity?.employeeId&&!identity?.requiresNameChange){unlock(identity);return;}
  lock(identity);
  status(identity?.requiresNameChange?'Hãy cập nhật tên hợp lệ để tiếp tục sử dụng ứng dụng.':identity?.employeeId?'Hồ sơ đang chờ DOL-0001 phê duyệt.':
   api.wasRejected?.()?'Hồ sơ trước đã bị từ chối. Hãy đăng ký lại để nhận Staff ID mới; hồ sơ cũ không còn quyền truy cập.':
   managerAPK()?'Manager APK chỉ dành cho DOL-0001. Nhập mã liên kết từ thiết bị đã xác minh.':'Chọn đăng ký mới hoặc liên kết Staff ID đã có.');
 }catch(e){lock(root.DolphinStaffId?.get?.()||null);status('Không thể kết nối Firebase: '+(e.message||'Hãy thử lại.'),true);}
}
async function renameAccount(event){
 event.preventDefault();if(state.busy||!state.needsRename)return;
 const name=$('dag-rename-name').value.trim().replace(/\s+/g,' ');
 if(name.length<7){status('Họ tên phải dài hơn 6 ký tự.',true);return;}
 busy(true);status('Đang lưu tên, giữ nguyên Staff ID và XP…');
 try{const api=await getApi();await api.repairName(name);await check(true);}
 catch(e){status('Không đổi được tên: '+(e.message||e),true);}
 finally{busy(false);}
}
async function requestRecovery(event){
 event.preventDefault();if(state.busy||state.pending||state.needsRename)return;
 const name=$('dag-recovery-name').value.trim().replace(/\s+/g,' ');
 if(name.length<2){status('Nhập họ tên đã đăng ký.',true);return;}
 busy(true);status('Đang gửi yêu cầu khôi phục…');
 try{const api=await getApi();const result=await api.requestNameRecovery(name);status(result.message||'Đã gửi yêu cầu. Hãy liên hệ DOL-0001 để nhận mã liên kết.');}
 catch(e){status('Không gửi được yêu cầu: '+String(e.message||e),true);}
 finally{busy(false);}
}
async function register(event){
 event.preventDefault();if(state.busy||state.pending||state.needsRename)return;
 const name=$('dag-name').value.trim().replace(/\s+/g,' ');
 if(name.length<7){status('Họ và tên phải trên 6 ký tự.',true);return;}
 busy(true);status('Đang đăng ký hồ sơ và thiết bị…');
 try{const api=await getApi();await api.register({name,avatar:state.avatar});await check(true);}
 catch(e){status('Không đăng ký được: '+(e.message||'Lỗi không xác định.'),true);}
 finally{busy(false);}
}
async function link(event){
 event.preventDefault();if(state.busy||state.pending||state.needsRename)return;
 busy(true);
 try{
  const api=await getApi(),id=api.get();
  if(id?.employeeId&&!$('dag-switch-confirm').checked){
   status('Xác nhận chuyển sang Staff ID khác trước khi liên kết.',true);return;
  }
  status('Đang liên kết thiết bị…');
  await api.link($('dag-code').value.trim(),{replaceCurrent:!!id?.employeeId});
  $('dag-code').value='';$('dag-switch-confirm').checked=false;
  await check(true);
 }catch(e){status('Không thể liên kết: '+(e.message||'Mã không hợp lệ.'),true);}
 finally{busy(false);}
}
async function openManager(){
 const api=await getApi(),me=api.get();
 if(me?.employeeId!=='DOL-0001'||me.verified!==true)return;
 $('dolphinAccessGate').hidden=false;panel('manager');status('Đang tải nhân viên chờ duyệt…');
 const list=$('dag-pending-list');list.replaceChildren();
 try{
  const result=await api.listPending(),people=result.profiles||[];
  if(!people.length){list.textContent='Hiện không có hồ sơ chờ duyệt.';status('Hàng chờ trống.');return;}
  for(const p of people){
   const row=document.createElement('div');row.className='dag-manager-row';
   const person=document.createElement('div');person.className='dag-person';
   person.textContent=(p.avatar||'🐬')+' '+p.name+' · '+p.employeeId;
   const approve=document.createElement('button');approve.type='button';approve.textContent='Duyệt';
   approve.onclick=async()=>{
    if(!root.confirm('Phê duyệt '+p.name+' ('+p.employeeId+')?'))return;
    approve.disabled=true;
    try{await api.approveRegistration(p.employeeId);await openManager();}
    catch(e){status('Không thể duyệt: '+e.message,true);approve.disabled=false;}
   };
   row.append(person,approve);list.append(row);
  }
  status('Có '+people.length+' hồ sơ đang chờ duyệt.');
 }catch(e){status('Không tải được danh sách: '+e.message,true);}
}
function init(){
 if(state.initialized)return;state.initialized=true;makeUI();
 const original=root.openApp;
 if(typeof original==='function')root.openApp=function(area){
  if(!state.allowed){$('dolphinAccessGate').hidden=false;return;}
  return original.apply(this,arguments);
 };
 root.addEventListener('dolphin-staff-id-changed',event=>{
  const id=event.detail;
  if(id?.verified===true&&id.employeeId&&!id?.requiresNameChange)unlock(id);
  else if(!state.busy&&state.mode!=='manager')lock(id);
 });
 setInterval(()=>{if(!document.hidden&&!state.allowed)void check(true);},15000);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)void check(true);});
 void check();
}
root.DolphinStaffAccess={isAllowed:()=>state.allowed,refresh:()=>check(true)};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);
else init();
})(typeof window==='undefined'?globalThis:window);
