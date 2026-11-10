/* Manager APK presentation. The UA never grants backend permissions. */
(function(){
'use strict';
if(!/DolphinManager/.test(navigator.userAgent)&&window.DOLPHIN_APP_TYPE!=='manager')return;
const $=id=>document.getElementById(id);
document.documentElement.classList.add('manager-apk-profile');
const panel=$('crew-manager-approvals'),hero=$('crew-profile-banner');
if(!panel||!hero)return;
hero.after(panel);
const heading=document.createElement('h2');heading.className='manager-personal-heading';heading.textContent='Quản lý Dolphin Crew';
panel.before(heading);
const actions=document.createElement('div');actions.className='manager-action-grid';
const pending=$('crew-approval-open');pending.classList.remove('full');actions.append(pending);
const recovery=document.createElement('button');recovery.type='button';recovery.className='secondary';recovery.textContent='Khôi phục tài khoản / thiết bị';
recovery.onclick=()=>{pending.click();$('crew-recovery-list')?.scrollIntoView({block:'nearest'});};actions.append(recovery);
const approved=document.createElement('button');approved.type='button';approved.className='secondary';approved.textContent='Danh bạ đã phê duyệt';actions.prepend(approved);
panel.querySelector('.hint').after(actions);
const dialog=document.createElement('dialog');dialog.id='manager-approved-dialog';
dialog.innerHTML='<div class="dialog-head"><h2>Nhân viên đã phê duyệt</h2><button type="button" class="icon-button" aria-label="Đóng danh bạ">✕</button></div><label for="manager-directory-search">Tìm tên hoặc Staff ID</label><input id="manager-directory-search" type="search"><p role="status"></p><div class="manager-directory-list"></div>';
document.body.append(dialog);dialog.querySelector('button').onclick=()=>dialog.close();
// These controls are presentation only. The callable re-verifies the actual DOL-0001 UID.
const correction=document.createElement('dialog');correction.id='manager-score-dialog';
correction.innerHTML='<div class="dialog-head"><h2>Điều chỉnh điểm nhân viên</h2><button type="button" class="icon-button" aria-label="Đóng điều chỉnh">✕</button></div>'
 +'<p id="manager-score-person" class="hint"></p><p id="manager-score-type" class="hint"></p>'
 +'<label for="manager-score-amount">Số điểm cần điều chỉnh</label><input id="manager-score-amount" type="number" min="1" step="1" inputmode="numeric" required>'
 +'<label for="manager-score-reason">Lý do điều chỉnh (bắt buộc)</label><textarea id="manager-score-reason" rows="3" minlength="5" maxlength="240" placeholder="Ví dụ: Điều chỉnh sau đối soát..."></textarea>'
 +'<button type="button" class="primary full" id="manager-score-submit">Xác nhận điều chỉnh</button>'
 +'<p id="manager-score-feedback" role="status" aria-live="polite"></p>'
 +'<h3>Lịch sử điều chỉnh gần đây</h3><div id="manager-score-history"></div>';
document.body.append(correction);
correction.querySelector('.dialog-head button').onclick=()=>correction.close();
const correctionCss=document.createElement('style');correctionCss.textContent=
 '#manager-score-dialog{width:min(94vw,510px);max-height:87vh;overflow:auto;border:1px solid #c49b5a;border-radius:20px;padding:22px;color:inherit;background:#102e32;box-shadow:0 22px 70px #000b}'
 +'#manager-score-dialog::backdrop{background:#000a}'
 +'#manager-score-dialog label{display:block;font-size:12px;font-weight:800;margin:12px 0 5px}'
 +'#manager-score-dialog input,#manager-score-dialog textarea{display:block;width:100%;padding:12px;color:#fff;background:#0b2225;border:1px solid #b5c9bc66;border-radius:10px;box-sizing:border-box;font:inherit}'
 +'#manager-score-dialog #manager-score-submit{margin-top:16px}'
 +'#manager-score-dialog #manager-score-history{font-size:12px;max-height:180px;overflow:auto;display:grid;gap:6px}'
 +'#manager-score-dialog .manager-score-entry{padding:8px;border:1px solid #ffffff2b;border-radius:9px;overflow-wrap:anywhere}';
document.head.append(correctionCss);
let chosenCorrection=null;
const scoreActions={xp_add:'Cộng XP',xp_deduct:'Trừ XP',revenue_deduct:'Trừ điểm doanh thu tuần'};
const money=value=>Number(value||0).toLocaleString('vi-VN');
function correctionId(){
 if(!window.crypto?.getRandomValues)throw Error('Thiết bị không hỗ trợ mã giao dịch an toàn.');
 return 'm'+Array.from(window.crypto.getRandomValues(new Uint8Array(16)),x=>x.toString(16).padStart(2,'0')).join('');
}
async function readCorrectionHistory(){
 if(!chosenCorrection)return;
 const selected=chosenCorrection;
 const history=$('manager-score-history');history.replaceChildren();
 try{
  const result=await window.DolphinPrestige.call('staffManagerGetEmployeeAdjustments',{employeeId:selected.employeeId});
  if(chosenCorrection!==selected)return;
  $('manager-score-person').textContent=selected.name+' · '+selected.employeeId+' · XP hiện tại: '+money(result.xp);
  const items=[...(result.xpHistory||[]),...(result.revenueHistory||[])].sort((a,b)=>b.at-a.at).slice(0,12);
  if(!items.length){history.textContent='Chưa có lịch sử điều chỉnh.';return;}
  for(const entry of items){
   const e=document.createElement('div');e.className='manager-score-entry';
   e.textContent=new Date(entry.at).toLocaleString('vi-VN')+' · '+(scoreActions[entry.kind]||entry.kind)
    +' '+money(entry.amount)+(entry.kind==='revenue_deduct'?' đ':' XP')+' · '+entry.reason;
   history.append(e);
  }
 }catch(error){if(chosenCorrection===selected)history.textContent='Không tải được lịch sử: '+error.message;}
}
function openCorrection(person,kind){
 const mine=window.DolphinStaffId?.get?.();
 if(!(mine?.managerSession===true&&mine.verified===true&&mine.employeeId==='DOL-0001'))return;
 chosenCorrection={employeeId:person.employeeId,name:person.name,kind,requestId:null};
 $('manager-score-person').textContent=person.name+' · '+person.employeeId;
 $('manager-score-type').textContent=scoreActions[kind]+(kind==='revenue_deduct'?' (VNĐ, chỉ ảnh hưởng BXH tuần hiện tại)':' (không thay đổi điểm công việc)');
 $('manager-score-amount').value='';
 $('manager-score-amount').max=kind==='revenue_deduct'?'100000000':'1000000';
 $('manager-score-reason').value='';
 $('manager-score-feedback').textContent='';
 correction.showModal();void readCorrectionHistory();
}
$('manager-score-submit').onclick=async()=>{
 if(!chosenCorrection)return;
 const current=chosenCorrection,amountText=$('manager-score-amount').value.trim();
 const reason=$('manager-score-reason').value.trim();
 const amount=Number(amountText),max=current.kind==='revenue_deduct'?100000000:1000000;
 if(!/^[1-9]\d*$/.test(amountText)||!Number.isSafeInteger(amount)||amount>max){
  $('manager-score-feedback').textContent='Nhập số nguyên dương không quá '+money(max)+'.';return;
 }
 if(reason.length<5||reason.length>240){$('manager-score-feedback').textContent='Nhập lý do từ 5 đến 240 ký tự.';return;}
 if(!window.confirm(scoreActions[current.kind]+' '+money(amount)+(current.kind==='revenue_deduct'?' đ':' XP')
  +' cho '+current.name+' ('+current.employeeId+')?\nLý do: '+reason))return;
 const button=$('manager-score-submit');button.disabled=true;
 try{
  if(!current.requestId)current.requestId=correctionId();
  const result=await window.DolphinPrestige.call('staffManagerAdjustEmployee',{
   employeeId:current.employeeId,kind:current.kind,requestId:current.requestId,amount,reason
  });
  $('manager-score-feedback').textContent=(result.duplicate?'Giao dịch đã được ghi trước đó; không cộng/trừ trùng.':'Đã lưu điều chỉnh thành công.')
   +(result.after!==undefined?' XP còn '+money(result.after):'');
  current.requestId=null;
  await readCorrectionHistory();void window.DolphinPrestige.refresh?.();
 }catch(error){$('manager-score-feedback').textContent='Chưa xác nhận lưu: '+error.message+'. Thử lại sẽ dùng cùng mã giao dịch.';}
 finally{button.disabled=false;}
};

let people=[];
function directoryNameKey(name){
 return String(name||'').normalize('NFKC').trim().replace(/\s+/g,' ')
  .normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[đĐ]/g,'d').toLowerCase();
}
function render(){
 const term=$('manager-directory-search').value.toLocaleLowerCase('vi');
 const rows=people.filter(p=>(p.name+' '+p.employeeId).toLocaleLowerCase('vi').includes(term));
 const collisions=new Map();
 for(const person of people){
  const key=directoryNameKey(person.name);
  if(!collisions.has(key))collisions.set(key,[]);
  collisions.get(key).push(person.employeeId);
 }
 const list=dialog.querySelector('.manager-directory-list');list.replaceChildren();
 for(const p of rows){
  const row=document.createElement('div');row.className='manager-directory-person';
  const label=document.createElement('p');label.textContent=(p.avatar||'🐬')+' '+p.name+' · '+p.employeeId;row.append(label);
  const twins=collisions.get(directoryNameKey(p.name))||[];
  if(twins.length>1){
   const notice=document.createElement('p');notice.className='manager-directory-collision';
   notice.style.cssText='color:#f3c979;font-size:11px;margin:6px 0;overflow-wrap:anywhere';
   notice.textContent='⚠ Trùng tên: '+twins.join(', ')+'. Đối chiếu Staff ID trước khi đổi tên hoặc ngừng tài khoản.';
   row.append(notice);
  }
  if(p.employeeId!=='DOL-0001'){
   for(const [kind,title] of [['xp_add','Cộng XP'],['xp_deduct','Trừ XP'],['revenue_deduct','Trừ doanh thu']]){
    const change=document.createElement('button');change.type='button';change.className='secondary';change.textContent=title;
    change.onclick=()=>openCorrection(p,kind);row.append(change);
   }
  }
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
 const duplicates=[...collisions.values()].filter(ids=>ids.length>1).length;
 dialog.querySelector('[role=status]').textContent=rows.length+' hồ sơ'+(duplicates?' · ⚠ '+duplicates+' nhóm trùng tên cần kiểm tra':'');
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
 if(!owner){people=[];chosenCorrection=null;dialog.close();correction.close();return;}
 const hint=$('profile-name-input')?.nextElementSibling;
 if(hint)hint.textContent='DOL-0001 có thể đổi tên nhiều lần. Tên vẫn phải hợp lệ và không trùng hồ sơ khác.';
}
window.addEventListener('dolphin-staff-id-changed',sync);sync();
})();
