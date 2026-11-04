(function(){
'use strict';
const $=id=>document.getElementById(id);
const f=n=>Number(n||0).toLocaleString('vi-VN',{maximumFractionDigits:2});
let pending=[];
function mount(){
 if($('prestige-admin-panel'))return;
 const parent=$('prestige-admin-mount')||document.querySelector('main');
 if(!parent)return;
 const section=document.createElement('section');section.id='prestige-admin-panel';section.className='card';
 section.innerHTML='<h2>🛡️ Đối chiếu & bù XP nhân viên</h2>'+
 '<p>Lấy doanh thu Lounge, Bungalow, Dolphin Show và điểm công việc từ đơn hiện tại cùng lịch sử. Chỉ quản lý có quyền máy chủ mới được duyệt, mỗi sự kiện chỉ cấp XP một lần.</p>'+
 '<label>Phạm vi <select id="prestige-scope"><option value="all">Toàn bộ dữ liệu còn lưu</option><option value="week">Tuần này</option></select></label>'+
 '<button type="button" class="secondary" id="prestige-preview">Kiểm tra XP chưa duyệt</button>'+
 '<p id="prestige-admin-status" role="status">Chưa kiểm tra.</p>'+
 '<div id="prestige-staff-totals" style="overflow:auto"></div>'+
 '<div id="prestige-admin-events" style="max-height:350px;overflow:auto;margin:12px 0"></div>'+
 '<button type="button" class="primary" id="prestige-approve" disabled>Duyệt các sự kiện đã chọn (tối đa 50)</button>';
 parent.appendChild(section);
 $('prestige-preview').onclick=preview;$('prestige-approve').onclick=approve;
}
async function init(){
 mount();
 try{
  const role=await window.DolphinPrestige.call('staffIsPrestigeAdmin');
  if($('prestige-admin-launch'))$('prestige-admin-launch').hidden=!role?.admin;
 }catch(e){console.warn('[Prestige admin] unavailable',e);}
}
function selections(){return [...document.querySelectorAll('#prestige-admin-events input[type=checkbox]:checked')].map(x=>x.value).slice(0,50);}
async function preview(){
 const btn=$('prestige-preview');btn.disabled=true;
 $('prestige-admin-status').textContent='Đang đối chiếu đơn hiện tại và lịch sử...';
 try{
  const data=await window.DolphinPrestige.call('staffPreviewArchiveXP',{scope:$('prestige-scope').value});
  pending=data.pending||[];$('prestige-admin-events').replaceChildren();
  const box=$('prestige-staff-totals');box.replaceChildren();
  const table=document.createElement('table');
  const header=document.createElement('tr');
  for(const title of ['Nhân viên','XP tổng hiện tại','Điểm CV đã đối chiếu','XP CV phải nhận','XP CV đã nhận','XP CV còn thiếu','XP doanh thu còn thiếu']){
   const th=document.createElement('th');th.textContent=title;header.append(th);
  }
  table.append(header);
  for(const staff of data.staffTotals||[]){
   const row=document.createElement('tr');
   for(const value of [staff.name+' · '+staff.employeeId,f(staff.totalXP),f(staff.workPoints),f(staff.expectedWorkXP),f(staff.creditedWorkXP),f(staff.missingWorkXP),f(staff.missingRevenueXP)]){
    const td=document.createElement('td');td.textContent=value;td.style.padding='6px';row.append(td);
   }
   table.append(row);
  }
  box.append(table);
  for(const ev of pending){
   const label=document.createElement('label');label.style.cssText='display:flex;align-items:flex-start;gap:10px;padding:8px 2px;border-bottom:1px solid #ffffff20;font-size:12px';
   const input=document.createElement('input');input.type='checkbox';input.value=ev.eventId;input.checked=!ev.needsReview;input.disabled=!!ev.needsReview;
   input.style.marginTop='4px';input.onchange=()=>{$('prestige-approve').disabled=!selections().length;};
   const span=document.createElement('span');
   span.textContent=ev.date+' · '+ev.staffName+' · '+ev.outlet+' · '+ev.description+' · '+f(ev.amount)+' XP '+(ev.needsReview?'[Cần xác minh ID nguồn hoặc thời điểm áp dụng mức XP] ':'')+'('+(ev.source==='revenue'?'doanh thu':'công việc')+')';
   label.append(input,span);$('prestige-admin-events').appendChild(label);
  }
  $('prestige-admin-status').textContent='Chưa duyệt: '+data.pendingCount+' (đang hiển thị '+pending.length+')'+' sự kiện (trong phạm vi quét '+data.scanned+'); doanh thu '+f(data.totals?.revenueXP)+' XP, công việc '+f(data.totals?.workXP)+' XP. Hãy kiểm tra số liệu trước khi duyệt.';
  $('prestige-approve').disabled=!selections().length;
 }catch(e){$('prestige-admin-status').textContent='Lỗi tải: '+e.message;}
 finally{btn.disabled=false;}
}
async function approve(){
 const ids=selections();
 if(!ids.length)return;
 if(!confirm('Xác nhận cấp XP vĩnh viễn cho '+ids.length+' sự kiện? Dữ liệu được máy chủ kiểm tra lại.'))return;
 const btn=$('prestige-approve');btn.disabled=true;
 try{
  const result=await window.DolphinPrestige.call('staffApproveArchiveXP',{eventIds:ids});
  $('prestige-admin-status').textContent='Đã duyệt '+result.credited+' sự kiện, '+result.duplicates+' sự kiện đã có trước đó.';
  await window.DolphinPrestige.refresh();await preview();
 }catch(e){$('prestige-admin-status').textContent='Không thể duyệt: '+e.message;btn.disabled=false;}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
