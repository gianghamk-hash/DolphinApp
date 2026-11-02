'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const rules=require('./staff-daily-core.cjs');
const person=()=>({employeeId:'DOL-0123',name:'Crew',active:true,xp:0,registrationSource:'manager'});
const vn=(day,hour=1)=>Date.parse(day+'T00:00:00Z')-7*3600000+hour*3600000;
test('six fixed tasks and bounded rewards are never client configurable',()=>{
 assert.deepEqual(rules.TASKS.map(v=>v.id),['checkin','order_completed','bungalow_opened','lounge_opened','order_received','avatar_changed']);
 assert.equal(rules.checkinXP(1),20);
 assert.equal(rules.checkinXP(7),50);
 assert.equal(rules.checkinXP(1000),50);
 assert.throws(()=>rules.apply(person(),'grant_any_xp',vn('2026-11-02')));
});
test('00:00 Asia/Ho_Chi_Minh resets daily missions but not the streak',()=>{
 const before=Date.parse('2026-11-02T16:59:59Z');
 const after=Date.parse('2026-11-02T17:00:00Z');
 assert.equal(rules.vietnamDay(before),'2026-11-02');
 assert.equal(rules.vietnamDay(after),'2026-11-03');
 const opened=rules.apply(person(),'bungalow_opened',before,'first').profile;
 const status=rules.view(opened,after);
 assert.equal(status.date,'2026-11-03');
 assert.equal(status.completedCount,0);
 assert.equal(status.todayXP,0);
 assert.equal(status.resetAt,Date.parse('2026-11-03T17:00:00Z'));
});
test('check-in streak increases every consecutive VN day, caps XP at day 7',()=>{
 let p=person(),previousXP=0;
 for(let i=2;i<=9;i++){
  const day='2026-11-'+String(i).padStart(2,'0');
  const result=rules.apply(p,'checkin',vn(day),'receipt'+i);
  assert.equal(result.changed,true);
  assert.equal(result.addedXP,rules.checkinXP(i-1));
  p=result.profile;
  const snapshot=rules.view(p,vn(day));
  assert.equal(snapshot.streak,i-1);
  assert.equal(snapshot.bestStreak,i-1);
  assert.equal(snapshot.checkedInToday,true);
  assert.equal(p.xp,previousXP+result.addedXP);
  previousXP=p.xp;
 }
 const skipped=rules.view(p,vn('2026-11-11'));
 assert.equal(skipped.streak,0);
 const reset=rules.apply(p,'checkin',vn('2026-11-11'),'new');
 assert.equal(reset.changed,true);
 assert.equal(reset.addedXP,20);
 assert.equal(rules.view(reset.profile,vn('2026-11-11')).streak,1);
 assert.equal(rules.view(reset.profile,vn('2026-11-11')).bestStreak,8);
});
test('same-day replay does not add XP, other tasks independently add XP once',()=>{
 const day=vn('2026-11-02');
 const first=rules.apply(person(),'checkin',day,'1');
 const replay=rules.apply(first.profile,'checkin',day+500,'2');
 assert.equal(replay.changed,false);
 assert.equal(replay.profile.xp,20);
 let p=first.profile;
 const amounts={order_completed:40,bungalow_opened:30,lounge_opened:25,order_received:15,avatar_changed:10};
 for(const [mission,bonus] of Object.entries(amounts)){
  const win=rules.apply(p,mission,day+1000,mission);
  assert.equal(win.addedXP,bonus);
  p=win.profile;
  assert.equal(rules.apply(p,mission,day+2000,'duplicate').changed,false);
 }
 assert.equal(p.xp,140);
 const state=rules.view(p,day);
 assert.equal(state.completedCount,6);
 assert.equal(state.todayXP,140);
 assert.equal(state.tasks.every(x=>x.done),true);
});
test('unapproved/inactive accounts earn nothing and stale actions cannot roll back newer-day state',()=>{
 const pending={...person(),registrationSource:'self',approved:false};
 assert.equal(rules.apply(pending,'order_received',vn('2026-11-02')).changed,false);
 assert.equal(rules.apply({...person(),active:false},'checkin',vn('2026-11-02')).changed,false);
 const later=rules.apply(person(),'checkin',vn('2026-11-05'));
 assert.equal(rules.apply(later.profile,'avatar_changed',vn('2026-11-04')).changed,false);
});
test('daily XP updates the same permanent level/peak field as sales XP',()=>{
 const start={...person(),xp:3495};
 const updated=rules.apply(start,'checkin',vn('2026-11-02')).profile;
 assert.equal(updated.levelPeak,2);
 assert.equal(updated.xp,3515);
 assert.equal(updated.dailyMissions.completed.checkin.xp,20);
});
