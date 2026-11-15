'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const engine=require('./staff-xp-engine.cjs'),daily=require('./staff-daily-core.cjs');
test('all 100 thresholds, cap and new effect tiers agree; deductions relock effects',()=>{
 for(let lv=2;lv<=100;lv++){
  assert.equal(engine.levelForXP(engine.xpForLevel(lv)-1),lv-1);
  assert.equal(engine.levelForXP(engine.xpForLevel(lv)),lv);
 }
 assert.equal(engine.levelForXP(Number.MAX_SAFE_INTEGER),100);
 assert.equal(engine.progress(engine.xpForLevel(100)).xpNeeded,0);
 for(const [id,lv] of [['polar',70],['galaxy',80],['sovereign',90],['eternal',100]]){
  const equipped=engine.automaticStyle(lv);
  for(const kind of Object.keys(engine.COSMETIC_CHOICES)){
   const field='selected'+kind[0].toUpperCase()+kind.slice(1);
   assert.equal(equipped[field],id);
   const downgraded=engine.equipOnLevelUp({active:true,xp:engine.xpForLevel(lv)},{active:true,...equipped,xp:engine.xpForLevel(lv-1)});
   assert.notEqual(downgraded[field],id);
  }
 }
 // Existing aurora banner/card remain available at their original thresholds.
 assert.equal(engine.COSMETIC_CHOICES.banner.aurora,12);
 assert.equal(engine.COSMETIC_CHOICES.cardFx.aurora,52);
});
test('previous rollout receipts are never multiplied or reclaimed',()=>{
 const now=Date.now(),date=daily.vietnamDay(now);
 const previous={checkin:600,order_completed:1200,bungalow_opened:900,lounge_opened:750,order_received:450,avatar_changed:300,snake_100:1500,game2048_1000:3000};
 for(const [id,xp] of Object.entries(previous)){
  const profile={active:true,xp,dailyMissions:{date,streak:1,lastCheckinDay:date,completed:{[id]:{xp,at:now,receipt:'verified'}}}};
  assert.equal(daily.apply(profile,id,now+1,'retry').addedXP,0);
  assert.equal(daily.reconcileLegacyDaily(profile,now+1).changed,false);
  assert.equal(daily.view(profile,now+1).tasks.find(t=>t.id===id).xp,xp);
 }
});
