/* Dolphin Staff Access Gate — approval is ALWAYS decided by Firebase. */
(function(root){
'use strict';
if(!root.document||root.parent!==root||root.DolphinStaffAccess)return;
const base=new URL('./',document.currentScript?.src||location.href);
const $=id=>document.getElementById(id);
const state={allowed:false,busy:false,mode:'register',avatar:'🐬',initialized:false};
const starters=['🐬','🐳','🐠','🐢','🦊','🐯','🦁','👨‍🍳','👩‍🍳','⭐','🌊','🔥'];
document.documentElement.classList.add('dolphin-access-pending');
function status(message,error=false){const el=$('dag-status');if(el){el.textContent=message;el.dataset.error=String(error);}}
function busy(on){state.busy=on;for(const el of document.querySelectorAll('#dolphinAccessGate button[data-action],#dolphinAccessGate input'))el.disabled=on;}
function panel(name){
 state.mode=name;
 for(const p of document.querySelectorAll('.dag-panel'))p.hidden=p.dataset.panel!==name;
 for(const b of document.querySelectorAll('.dag-tab'))b.setAttribute('aria-selected',String(b.dataset.tab===name));
}
function unlock(identity){
 state.allowed=true;
 document.documentElement.classList.remove('dolphin-access-pending');
 document.documentElement.classList.add('dolphin-access-allowed');
 $('dolphinAccessGate').hidden=true;
 // Staff approval controls now live exclusively inside DOL-0001's profile.
}
function lock(identity){
 state.allowed=false;
 document.documentElement.classList.remove('dolphin-access-allowed');
 document.documentElement.classList.add('dolphin-access-pending');
 $('dolphinAccessGate').hidden=false;

 if(identity?.employeeId){
  panel('pending');
  $('dag-pending-id').textContent=identity.employeeId;
  $('dag-pending-name').textContent=identity.name||'';
 }else if(state.mode!=='register'&&state.mode!=='link')panel('register');
}
async function getApi(){
 if(root.DolphinStaffId)return root.DolphinStaffId;
 await new Promise((resolve,reject)=>{
  const s=document.createElement('script');
  s.src=new URL('staff-id.js',base).href;
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
  </div>
  <section class="dag-panel" data-panel="register">
   <form id="dag-register-form">
    <label for="dag-name">Họ và tên nhân viên</label>
    <input id="dag-name" name="name" autocomplete="name" minlength="2" maxlength="64" required placeholder="Nhập họ và tên chính xác">
    <p class="dag-help">Tên đăng ký chỉ được đặt một lần, không thể tự đổi về sau.</p>
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
  <section class="dag-panel" data-panel="pending" hidden>
   <div class="dag-pending">
    <strong>⏳ Chờ quản lý DOL-0001 duyệt</strong>
    <p id="dag-pending-name"></p>
    <p>Staff ID: <b id="dag-pending-id"></b></p>
    <p class="dag-help">Khi được quản lý phê duyệt, thiết bị sẽ tự động vào DolphinApp. Không cần đăng ký lại.</p>
    <button type="button" class="dag-secondary" data-action="refresh">Kiểm tra lại</button>
    <button type="button" class="dag-secondary" data-action="switch">Liên kết Staff ID khác</button>
   </div>
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
 gate.querySelector('[data-action=refresh]').onclick=()=>check(true);
 gate.querySelector('[data-action=switch]').onclick=()=>{panel('link');$('dag-switch-label').hidden=false;};
 gate.querySelector('[data-action=close]').onclick=()=>{gate.hidden=true;panel('register');};
}
async function check(force=false){
 try{
  const api=await getApi();await api.ready();
  const identity=force?await api.refresh():api.get();
  if(identity?.verified===true&&identity?.employeeId){unlock(identity);return;}
  lock(identity);
  status(identity?.employeeId?'Hồ sơ đang chờ DOL-0001 phê duyệt.':
   api.wasRejected?.()?'Hồ sơ trước đã bị từ chối. Hãy đăng ký lại để nhận Staff ID mới; hồ sơ cũ không còn quyền truy cập.':
   'Chọn đăng ký mới hoặc liên kết Staff ID đã có.');
 }catch(e){lock(null);status('Không thể kết nối Firebase: '+(e.message||'Hãy thử lại.'),true);}
}
async function register(event){
 event.preventDefault();if(state.busy)return;
 const name=$('dag-name').value.trim().replace(/\s+/g,' ');
 if(name.length<2){status('Nhập đúng họ và tên.',true);return;}
 busy(true);status('Đang đăng ký hồ sơ và thiết bị…');
 try{const api=await getApi();await api.register({name,avatar:state.avatar});await check(true);}
 catch(e){status('Không đăng ký được: '+(e.message||'Lỗi không xác định.'),true);}
 finally{busy(false);}
}
async function link(event){
 event.preventDefault();if(state.busy)return;
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
  if(id?.verified===true&&id.employeeId)unlock(id);
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
