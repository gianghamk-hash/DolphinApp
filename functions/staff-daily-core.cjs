'use strict';
/* Authoritative daily Crew Club task rules. Pure module: no client-supplied XP. */
const engine=require('./staff-xp-engine.cjs');
const ZONE='Asia/Ho_Chi_Minh';
const TASKS=Object.freeze([
 Object.freeze({id:'checkin',icon:'🔥',title:'Điểm danh hằng ngày',description:'Ngày 1: 600 XP · tăng 150 XP/ngày · tối đa 1.500 XP',xp:600}),
 Object.freeze({id:'order_completed',icon:'✅',title:'Hoàn thành 1 order',description:'Hoàn tất một đơn được xác nhận trên máy chủ',xp:1200}),
 Object.freeze({id:'bungalow_opened',icon:'🏝️',title:'Mở 1 Bungalow',description:'Tạo lượt phục vụ Bungalow mới',xp:900}),
 Object.freeze({id:'lounge_opened',icon:'🍸',title:'Mở 1 bàn Lounge',description:'Tạo lượt phục vụ Lounge mới',xp:750}),
 Object.freeze({id:'order_received',icon:'📥',title:'Nhận 1 order',description:'Nhận và bắt đầu xử lý một đơn mới',xp:450}),
 Object.freeze({id:'avatar_changed',icon:'🎭',title:'Đổi avatar 1 lần',description:'Lưu một avatar khác với avatar hiện tại',xp:300}),
 Object.freeze({id:'snake_100',icon:'🐍',title:'Rắn Offline đạt 200 điểm',description:'Đạt ít nhất 200 điểm trong một ván Rắn Săn Mồi Offline',xp:1500}),
 Object.freeze({id:'game2048_1000',icon:'🔢',title:'2048 đạt 1.000 điểm',description:'Đạt ít nhất 1.000 điểm trong một ván 2048',xp:3000})
]);
const ids=new Set(TASKS.map(task=>task.id));
function vietnamDay(time=Date.now()){
 const parts=Object.fromEntries(new Intl.DateTimeFormat('en-US',{
  timeZone:ZONE,year:'numeric',month:'2-digit',day:'2-digit'
 }).formatToParts(new Date(time)).filter(p=>p.type!=='literal').map(p=>[p.type,p.value]));
 return [parts.year,parts.month,parts.day].join('-');
}
function utcDate(day){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(String(day||'')))return NaN;
 return Date.parse(day+'T00:00:00Z');
}
function daysBetween(previous,next){
 return Math.round((utcDate(next)-utcDate(previous))/86400000);
}
function nextMidnight(day){
 return utcDate(day)+86400000-7*3600000;
}
function checkinXP(streak){
 return (15+Math.min(7,Math.max(1,Number(streak)||1))*5)*30;
}
function todayCompleted(record,day){
 return record?.date===day&&record.completed&&typeof record.completed==='object'
  ? record.completed:{};
}
function nextStreak(record,day){
 const previous=record?.lastCheckinDay||'';
 if(previous===day)return Math.max(1,Number(record?.streak)||1);
 return daysBetween(previous,day)===1?Math.max(0,Number(record?.streak)||0)+1:1;
}
function activeStreak(record,day){
 return record?.lastCheckinDay===day||daysBetween(record?.lastCheckinDay,day)===1
  ?Math.max(0,Number(record?.streak)||0):0;
}
function view(profile,time=Date.now()){
 const day=vietnamDay(time),record=profile?.dailyMissions||{},completed=todayCompleted(record,day);
 const streak=activeStreak(record,day),next=nextStreak(record,day);
 const tasks=TASKS.map(t=>{
  const entry=completed[t.id],done=!!entry;
  return {id:t.id,icon:t.icon,title:t.title,description:t.description,
   xp:done?Math.max(0,Number(entry.xp)||0):t.id==='checkin'?checkinXP(next):t.xp,
   done,completedAt:done?Number(entry.at)||0:null};
 });
 return {
  date:day,timeZone:ZONE,resetAt:nextMidnight(day),streak,bestStreak:Math.max(Number(record.bestStreak)||0,streak),
  nextCheckinStreak:next,checkedInToday:!!completed.checkin,
  completedCount:tasks.filter(t=>t.done).length,total:tasks.length,
  todayXP:tasks.filter(t=>t.done).reduce((sum,t)=>sum+t.xp,0),tasks
 };
}
function apply(profile,taskId,time=Date.now(),receipt=''){
 if(!ids.has(taskId))throw new TypeError('Nhiệm vụ không hợp lệ');
 if(!profile?.active||(profile.registrationSource==='self'&&profile.approved!==true))
  return {changed:false,profile,addedXP:0};
 const day=vietnamDay(time),prior=profile.dailyMissions||{};
 // Avoid overwriting a newer-day record if an old business action finishes late.
 if(prior.date>day)return {changed:false,profile,addedXP:0};
 const completed={...todayCompleted(prior,day)};
 if(completed[taskId])return {changed:false,profile,addedXP:0};
 const streak=taskId==='checkin'?nextStreak(prior,day):Math.max(0,Number(prior.streak)||0);
 const addedXP=taskId==='checkin'?checkinXP(streak):TASKS.find(t=>t.id===taskId).xp;
 const xp=Math.max(0,Number(profile.xp)||0)+addedXP;
 const nextProfile={
  ...profile,xp,levelPeak:Math.max(Number(profile.levelPeak)||1,engine.levelForXP(xp)),
  dailyMissions:{
   date:day,completed:{...completed,[taskId]:{xp:addedXP,at:time,receipt}},
   lastCheckinDay:taskId==='checkin'?day:(prior.lastCheckinDay||''),
   streak,bestStreak:Math.max(Number(prior.bestStreak)||0,streak)
  },
  updatedAt:time
 };
 return {changed:true,profile:engine.equipOnLevelUp(profile,nextProfile),addedXP};
}
/**
 * Correct only today's authenticated receipt, never re-claim a task.
 * Legacy receipts are normalized to their HISTORICAL rates, not the new triple rewards.
 * Preserve existing same-day receipts and the old correction behavior;
 * new 3x rewards only apply to missions claimed after rollout.
 * Past days are not available in the daily record and are left untouched.
 */
const PRE_TRIPLE_TASK_XP=Object.freeze({order_completed:400,bungalow_opened:300,lounge_opened:250,order_received:150,avatar_changed:100,snake_100:500,game2048_1000:1000});
function reconcileLegacyDaily(profile,time=Date.now()){
 const unchanged={changed:false,profile,addedXP:0};
 if(!profile?.active||(profile.registrationSource==='self'&&profile.approved!==true))
  return unchanged;
 const record=profile.dailyMissions||{},day=vietnamDay(time);
 if(record.date!==day)return unchanged;
 const entries={...todayCompleted(record,day)};
 let adjustment=0,changed=false;
 for(const task of TASKS){
  const entry=entries[task.id],at=Number(entry?.at);
  if(!entry||typeof entry.receipt!=='string'||!entry.receipt.length||
    !Number.isFinite(at)||at<=0||vietnamDay(at)!==day)continue;
  const base=task.id==='checkin'?
    15+Math.min(7,Math.max(1,Number(record.streak)||1))*5:PRE_TRIPLE_TASK_XP[task.id]/10;
  const allowed=task.id==='checkin'?[base,base*100]:[base];
  const target=task.id==='checkin'?checkinXP(record.streak)/3:PRE_TRIPLE_TASK_XP[task.id];
  if(!allowed.includes(Number(entry.xp))||Number(entry.xp)===target)continue;
  adjustment+=target-Number(entry.xp);
  entries[task.id]={...entry,xp:target,rateVersion:4,backfilledAt:time};
  changed=true;
 }
 if(!changed)return unchanged;
 const xp=Number(Math.max(0,Number(profile.xp||0)+adjustment).toFixed(2));
 if(!Number.isFinite(xp)||xp>Number.MAX_SAFE_INTEGER)return unchanged;
 return {changed:true,addedXP:adjustment,profile:engine.equipOnLevelUp(profile,{
  ...profile,xp,levelPeak:Math.max(Number(profile.levelPeak)||1,engine.levelForXP(xp)),
  dailyMissions:{...record,completed:entries},updatedAt:time
 })};
}
function reconcileLegacyCheckin(profile,time=Date.now()){
 return reconcileLegacyDaily(profile,time);
}

module.exports={ZONE,TASKS,vietnamDay,daysBetween,nextMidnight,checkinXP,view,apply,reconcileLegacyCheckin,reconcileLegacyDaily};
