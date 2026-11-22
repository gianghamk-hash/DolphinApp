'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const rules=require('../crew-dolphin-living.js');
const companion=require('../crew-dolphin-companion.js');
test('all 10 Level forms have unique, non-XP decorative skills',()=>{
 assert.equal(rules.SKILLS.length,10);
 assert.equal(new Set(rules.SKILLS.map(x=>x.id)).size,10);
 for(let index=0;index<10;index++){
  const current=companion.forms[index];
  const p={employeeId:'DOL-0004',level:current.level,xp:1000};
  const f=rules.form(p,{employeeId:p.employeeId,verified:true,approved:true},companion);
  assert.equal(f.index,index);
  assert.equal(rules.SKILLS[index].index,index);
 }
 assert.equal(rules.SKILLS[9].id,'eternal');
 assert.equal(rules.SKILLS[0].id,'bubble');
});
test('identity must be server verified and matches current employee',()=>{
 const profile={employeeId:'DOL-0002',level:100,xp:10000};
 assert.equal(rules.form(profile,{employeeId:'DOL-0002',verified:false},companion),null);
 assert.equal(rules.form(profile,{employeeId:'DOL-0002',verified:true,approved:false},companion),null);
 assert.equal(rules.form(profile,{employeeId:'DOL-0002',verified:true,requiresNameChange:true},companion),null);
 assert.equal(rules.form(profile,{employeeId:'DOL-0001',verified:true},companion),null);
 assert.equal(rules.form(null,{employeeId:'DOL-0002',verified:true},companion),null);
 assert.equal(rules.form(profile,{employeeId:'DOL-0002',verified:true},companion).index,9);
});
test('daily treasure selection is deterministic and never awards XP',()=>{
 const day='2026-11-22',id='DOL-0005';
 const a=rules.offer(id,day,9,''),b=rules.offer(id,day,9,'');
 assert.equal(a,b);
 assert.equal(rules.offer(id,day,9,day),false,'opened chest cannot reappear same day');
 assert.equal(rules.offer(null,day,9,''),false);
 const selected=rules.drawReward(id,day,9);
 assert.equal(rules.drawReward(id,day,9).id,selected.id);
 assert.ok(rules.REWARDS.some(x=>x.id===selected.id));
 assert.ok(!('xp' in selected));assert.ok(!('credits' in selected));
});
test('rare treasure is Level gated and levels are reversible',()=>{
 const id='DOL-0002',day='2026-11-22';
 const baby=rules.drawReward(id,day,0);
 assert.equal(baby.min,0);
 const high=rules.REWARDS.find(x=>x.id==='eternal');
 assert.equal(high.min,9);
 assert.equal(rules.eligibleReward(high,8),false);
 assert.equal(rules.eligibleReward(high,9),true);
 assert.equal(rules.eligibleReward(high,0),false);
 assert.equal(rules.eligibleReward(baby,0),true);
 for(let level=1;level<=100;level++){
  const form=rules.form({employeeId:id,level},{employeeId:id,verified:true},companion);
  const reward=rules.drawReward(id,day,form.index);
  assert.ok(reward.min<=form.index);
 }
});
test('date uses Vietnam local day',()=>{
 assert.equal(rules.dateVN(new Date('2026-11-22T16:00:00Z')),'2026-11-22');
 assert.equal(rules.dateVN(new Date('2026-11-22T18:01:00Z')),'2026-11-23');
});
