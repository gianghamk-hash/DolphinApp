'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const core=require('./staff-daily-core.cjs');
const person=()=>({employeeId:'DOL-0123',name:'Crew',active:true,xp:0,registrationSource:'manager'});
const vn=(day,hour=1)=>Date.parse(day+'T00:00:00Z')-7*3600000+hour*3600000;
test('eight fixed tasks have precisely the requested rewards',()=>{
 assert.deepEqual(core.TASKS.map(x=>x.id),[
  'checkin','order_completed','bungalow_opened','lounge_opened',
  'order_received','avatar_changed','snake_100','game2048_1000'
 ]);
 assert.deepEqual(core.TASKS.map(x=>x.xp),[2000,400,300,250,150,100,500,1000]);
 assert.equal(core.checkinXP(1),2000);
 assert.equal(core.checkinXP(7),5000);
 assert.equal(core.checkinXP(999),5000);
 assert.throws(()=>core.apply(person(),'arbitrary_task',vn('2026-11-03')));
});
test('VN midnight resets eight daily missions but preserves streak',()=>{
 const a=Date.parse('2026-11-02T16:59:59Z'),b=a+1000;
 const claimed=core.apply(person(),'snake_100',a,'snake-proof');
 assert.equal(claimed.addedXP,500);
 assert.equal(core.view(claimed.profile,a).completedCount,1);
 assert.equal(core.view(claimed.profile,b).completedCount,0);
 assert.equal(core.view(claimed.profile,b).resetAt,Date.parse('2026-11-03T17:00:00Z'));
});
test('check-in streak has x10 more reward than previous version and caps at day 7',()=>{
 let p=person(),total=0;
 for(let i=1;i<=9;i++){
  const result=core.apply(p,'checkin',vn('2026-11-'+String(i).padStart(2,'0')),String(i));
  assert.equal(result.addedXP,core.checkinXP(i));
  total+=result.addedXP;p=result.profile;assert.equal(p.xp,total);
 }
 assert.equal(core.apply(p,'checkin',vn('2026-11-12')).addedXP,2000);
});
test('each verified task is claimed once per day per Staff ID',()=>{
 const time=vn('2026-11-03'),amounts={checkin:2000,order_completed:400,bungalow_opened:300,lounge_opened:250,order_received:150,avatar_changed:100,snake_100:500,game2048_1000:1000};
 let p=person(),total=0;
 for(const [task,xp] of Object.entries(amounts)){
  const first=core.apply(p,task,time,task);total+=xp;
  assert.equal(first.addedXP,xp);
  assert.equal(core.apply(first.profile,task,time+1000,'retry').addedXP,0);
  p=first.profile;
 }
 assert.equal(total,4700);assert.equal(p.xp,total);
 assert.equal(core.view(p,time).completedCount,8);
 assert.equal(core.view(p,time).todayXP,total);
});
test('pending and inactive staff never get game or order bonuses',()=>{
 const pending={...person(),registrationSource:'self',approved:false};
 assert.equal(core.apply(pending,'snake_100',vn('2026-11-03')).changed,false);
 assert.equal(core.apply({...person(),active:false},'game2048_1000',vn('2026-11-03')).changed,false);
 const current=core.apply(person(),'checkin',vn('2026-11-04')).profile;
 assert.equal(core.apply(current,'avatar_changed',vn('2026-11-03')).changed,false);
});
test('today-only 1x and 10x legacy check-ins upgrade to new x100 rate once',()=>{
 const now=vn('2026-11-03');
 for(const legacyXP of [20,200]){
  const p={...person(),xp:legacyXP,dailyMissions:{date:'2026-11-03',lastCheckinDay:'2026-11-03',streak:1,completed:{checkin:{xp:legacyXP,at:now,receipt:'signed'}}}};
  const result=core.reconcileLegacyDaily(p,now+1000);
  assert.equal(result.addedXP,2000-legacyXP);
  assert.equal(result.profile.xp,2000);
  assert.equal(result.profile.dailyMissions.completed.checkin.rateVersion,3);
  assert.equal(core.reconcileLegacyDaily(result.profile,now+1500).changed,false);
 }
});
test('legacy business mission receipts top up only TODAY; unverified receipts do not',()=>{
 const time=vn('2026-11-03');
 const base={...person(),xp:40,dailyMissions:{date:'2026-11-03',completed:{order_completed:{xp:40,at:time,receipt:'trusted'}}}};
 const fixed=core.reconcileLegacyDaily(base,time+1000);
 assert.equal(fixed.addedXP,360);
 assert.equal(fixed.profile.xp,400);
 assert.equal(core.reconcileLegacyDaily(base,vn('2026-11-04')).changed,false);
 const untrusted={...base,dailyMissions:{...base.dailyMissions,completed:{order_completed:{xp:40,at:time}}}};
 assert.equal(core.reconcileLegacyDaily(untrusted,time).changed,false);
});
test('new game mission rewards are not multiplied by another factor',()=>{
 const t=vn('2026-11-03');
 assert.equal(core.apply(person(),'snake_100',t,'run').addedXP,500);
 assert.equal(core.apply(person(),'game2048_1000',t,'run').addedXP,1000);
});
