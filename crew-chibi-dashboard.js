/* Dolphin Crew Club chibi dashboard: read-only projection of verified staff data.
   Images are decorative only; no profile name, rank, Level, revenue or XP is
   hardcoded from the design mockup. No Firebase writes are performed here.
*/
(function(root){
 'use strict';
 const $=id=>document.getElementById(id);
 const fmt=n=>Number(n).toLocaleString('vi-VN',{maximumFractionDigits:2});
 function ownerId(){
  try{return root.DolphinStaffId?.get?.()?.employeeId||'';}catch(_){return '';}
 }
 function model(payload){
  if(!payload||typeof payload!=='object'||typeof payload.employeeId!=='string'||!payload.employeeId)return null;
  const owner=ownerId();
  if(owner&&payload.employeeId!==owner)return null;
  const xp=Number(payload.xp),level=Number(payload.level);
  if(!Number.isFinite(xp)||xp<0||!Number.isInteger(level)||level<1||level>60)return null;
  const daily=payload.dailyMissions,hasDaily=daily&&Array.isArray(daily.tasks);
  const completed=hasDaily?Math.max(0,Math.min(daily.tasks.length,Math.trunc(Number(daily.completedCount)||0))):null;
  const total=hasDaily?Math.max(0,Number(daily.total)||daily.tasks.length):null;
  const earned=Number(daily?.todayXP);
  const unlocked=Array.isArray(payload.unlocked)?payload.unlocked.length:null;
  return Object.freeze({
   employeeId:payload.employeeId,name:String(payload.name||'Hồ sơ của bạn'),
   xp,level,rank:String(payload.rank||''),completed,total,
   todayXP:Number.isFinite(earned)&&earned>=0?earned:null,
   unlocked
  });
 }
 function set(id,value){const el=$(id);if(el)el.textContent=value;}
 function detailLine(label,value){
  const row=document.createElement('p');
  const strong=document.createElement('strong');
  strong.textContent=label+' ';
  row.append(strong,document.createTextNode(value));
  return row;
 }
 function render(payload){
  const data=model(payload);
  const card=$('crew-chibi-daily-count');
  set('crew-chibi-current-xp',data?fmt(data.xp)+' XP':'—');
  set('crew-chibi-current-level',data?'Lv. '+data.level:'—');
  set('crew-chibi-current-daily',data&&data.completed!==null?data.completed+'/'+data.total:'—');
  if(card){card.textContent=data&&data.completed!==null?data.completed+'/'+data.total:'—';
   card.hidden=!data||data.completed===null;}
  set('crew-dashboard-xp-detail',data?
   data.name+' · '+data.employeeId+' · '+fmt(data.xp)+' XP · Lv.'+data.level+
   (data.rank?' · '+data.rank:''):
   'Chưa có hồ sơ được xác minh trên thiết bị này.');
  const remaining=$('staff-next-level')?.textContent||'';
  set('crew-dashboard-next-detail',data?remaining:'Vui lòng đăng ký hoặc liên kết Staff ID để xem tiến độ.');
  const container=$('crew-dashboard-achievements');
  if(container){
   container.replaceChildren();
   if(!data){container.append(detailLine('Trạng thái:','Chưa liên kết Staff ID được xác minh.'));}
   else{
    container.append(detailLine('Nhân viên:',data.name+' · '+data.employeeId));
    container.append(detailLine('Level hiện tại:','Lv.'+data.level+(data.rank?' · '+data.rank:'')));
    container.append(detailLine('XP hiện tại:',fmt(data.xp)+' XP'));
    if(data.unlocked!==null)container.append(detailLine('Mục đã mở khóa:',String(data.unlocked)));
    if(data.completed!==null)container.append(detailLine('Nhiệm vụ hôm nay:',data.completed+'/'+data.total));
   }
  }
  // Never use revenue/work numbers printed in a visual mockup. Links in their
  // detail panels direct staff to the live weekly ranking and order source.
  set('crew-dashboard-work-staff',data?data.name+' · '+data.employeeId:'Đang kết nối Staff ID…');
  set('crew-dashboard-revenue-staff',data?data.name+' · '+data.employeeId:'Đang kết nối Staff ID…');
  return data;
 }
 function init(){
  render(root.DolphinPrestige?.getMine?.()||null);
  root.addEventListener('dolphin-my-progress-updated',e=>render(e.detail));
  root.addEventListener('dolphin-staff-id-changed',()=>render(null));
  document.querySelectorAll('[data-crew-dialog-switch]').forEach(button=>{
   button.addEventListener('click',()=>{
    const target=$(button.dataset.crewDialogSwitch);
    if(!target||target.open)return;
    const parent=button.closest('dialog');
    if(parent?.open)parent.close();
    target.showModal();
   });
  });
 }
 root.DolphinCrewChibiDashboard=Object.freeze({model,render});
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
 else init();
})(window);
