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
 assert.deepEqual(core.TASKS.map(x=>x.xp),[600,1200,900,750,450,300,1500,3000]);
 assert.equal(core.checkinXP(1),600);
 assert.equal(core.checkinXP(7),1500);
 assert.equal(core.checkinXP(999),1500);
 assert.throws(()=>core.apply(person(),'arbitrary_task',vn('2026-11-03')));
});
test('VN midnight resets eight daily missions but preserves streak',()=>{
 const a=Date.parse('2026-11-02T16:59:59Z'),b=a+1000;
 const claimed=core.apply(person(),'snake_100',a,'snake-proof');
 assert.equal(claimed.addedXP,1500);
 assert.equal(core.view(claimed.profile,a).completedCount,1);
 assert.equal(core.view(claimed.profile,b).completedCount,0);
 assert.equal(core.view(claimed.profile,b).resetAt,Date.parse('2026-11-03T17:00:00Z'));
});
test('check-in is tripled to 600–1500 XP independent of order work XP',()=>{
 let p=person(),total=0;
 for(let i=1;i<=9;i++){
  const result=core.apply(p,'checkin',vn('2026-11-'+String(i).padStart(2,'0')),String(i));
  assert.equal(result.addedXP,core.checkinXP(i));
  total+=result.addedXP;p=result.profile;assert.equal(p.xp,total);
 }
 assert.equal(core.apply(p,'checkin',vn('2026-11-12')).addedXP,600);
});
test('each verified task is claimed once per day per Staff ID',()=>{
 const time=vn('2026-11-03'),amounts={checkin:600,order_completed:1200,bungalow_opened:900,lounge_opened:750,order_received:450,avatar_changed:300,snake_100:1500,game2048_1000:3000};
 let p=person(),total=0;
 for(const [task,xp] of Object.entries(amounts)){
  const first=core.apply(p,task,time,task);total+=xp;
  assert.equal(first.addedXP,xp);
  assert.equal(core.apply(first.profile,task,time+1000,'retry').addedXP,0);
  p=first.profile;
 }
 assert.equal(total,8700);assert.equal(p.xp,total);
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
test('same-day check-in corrects old 1x and mistaken 100x rewards once',()=>{
 const now=vn('2026-11-03');
 for(const [legacyXP,correction] of [[20,180],[200,0],[2000,-1800]]){
  const p={...person(),xp:legacyXP,dailyMissions:{date:'2026-11-03',lastCheckinDay:'2026-11-03',streak:1,completed:{checkin:{xp:legacyXP,at:now,receipt:'signed'}}}};
  const result=core.reconcileLegacyDaily(p,now+1000);
  assert.equal(result.addedXP,correction);
  assert.equal(result.profile.xp,legacyXP+correction);
  if(correction){
   assert.equal(result.profile.dailyMissions.completed.checkin.rateVersion,4);
   assert.equal(core.reconcileLegacyDaily(result.profile,now+1500).changed,false);
  }else assert.equal(result.changed,false);
 }
 const day2=vn('2026-11-03'),second={...person(),xp:2600,dailyMissions:{
 date:'2026-11-03',streak:2,lastCheckinDay:'2026-11-03',
 completed:{checkin:{xp:2500,at:day2,receipt:'signed-2'}}}};
 assert.equal(core.reconcileLegacyDaily(second,day2+500).profile.xp,350);
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
test('new triple rewards do not top up previously completed missions',()=>{
 const t=vn('2026-11-07');
 const prior={...person(),xp:400,dailyMissions:{date:'2026-11-07',completed:{
  order_completed:{xp:400,at:t,receipt:'verified-pre-upgrade'}
 }}};
 assert.equal(core.view(prior,t).tasks.find(task=>task.id==='order_completed').xp,400);
 assert.equal(core.apply(prior,'order_completed',t+1000,'retry').addedXP,0);
 assert.equal(core.reconcileLegacyDaily(prior,t+1000).changed,false);
 assert.equal(core.apply(person(),'order_completed',t+1000,'new').addedXP,1200);
});
test('game mission rewards use the single new triple multiplier',()=>{
 const t=vn('2026-11-03');
 assert.equal(core.apply(person(),'snake_100',t,'run').addedXP,1500);
 assert.equal(core.apply(person(),'game2048_1000',t,'run').addedXP,3000);
});

test('daily rewards and same-day legacy top-ups auto-equip only when they raise the permanent level',()=>{
 const engine=require('./staff-xp-engine.cjs'),now=Date.now();
 const base={...person(),xp:engine.xpForLevel(3)-200,levelPeak:2};
 const level=core.apply(base,'checkin',now,'checkin');
 assert.equal(level.profile.selectedNameFx,'ember');assert.equal(level.profile.selectedAvatarMotion,'pulse');
 const custom={...level.profile,selectedNameFx:'none',nameFlame:false};
 const same=core.apply(custom,'order_received',now,'received');assert.equal(same.profile.selectedNameFx,'none');
 const old={...person(),xp:engine.xpForLevel(3)-360,levelPeak:2,dailyMissions:{date:core.vietnamDay(now),completed:{order_completed:{xp:40,at:now,receipt:'legacy'}}}};
 const repaired=core.reconcileLegacyDaily(old,now);assert.equal(repaired.profile.selectedNameFx,'ember');
});
