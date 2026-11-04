'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const e=require('./staff-xp-engine.cjs');
test('Revenue stays 1 XP per 1,000 VND; 0.1 work point is now 100 XP',()=>{
 assert.equal(e.revenueXP(2290000),2290);
 assert.equal(e.revenueXP(3290000),3290);
 assert.equal(e.revenueXP(999),0);
 assert.equal(e.workXP(0.1),100);
 assert.equal(e.workXP(1.25),1250);
 assert.equal(e.workXP(2.5),2500);
 assert.equal(e.totalXP(2000000,1.5),3500);
 assert.equal(e.workXP(0.25),250);
 assert.equal(e.workXP(0.15),150);
 assert.equal(e.workXP(0.5),500);
 assert.equal(e.workXP(1),1000);
 assert.equal(e.XP_PER_POINT_TENTH,100);
});
test('reject negative and invalid revenue/points',()=>{
 for(const value of [-1,NaN,Infinity,1.5])assert.throws(()=>e.revenueXP(value));
 for(const value of [-0.1,0.155,Infinity,NaN])assert.throws(()=>e.workXP(value));
});
test('level progression is monotonically increasing and unlock thresholds are ordered',()=>{
 let prev=0;
 for(let level=1;level<=60;level++){const xp=e.xpForLevel(level);assert(xp>=prev);prev=xp;assert.equal(e.levelForXP(xp),level);}
 assert.equal(e.LEVEL_COEFFICIENT,2450);
 assert.equal(e.levelForXP(2449),1);
 assert.equal(e.levelForXP(2450),2);
 assert.equal(e.levelForXP(9799),2);
 assert.equal(e.levelForXP(9800),3);
 assert.equal(e.xpForLevel(60),8528450);
 assert.equal(e.xpForLevel(10),198450);
 assert.equal(e.levelForXP(8528449),59);
 assert.equal(e.levelForXP(1000000000),60);
 const levels=e.PERKS.map(p=>p.level);
 assert(levels.every((v,i)=>!i||v>=levels[i-1]));
 assert.equal(e.PERKS.filter(p=>p.id.startsWith('theme-')).length,15);
});
test('perks activate only after meeting corresponding level threshold',()=>{
 assert(!e.progress(9799).unlocked.includes('name-onflame'));
 assert(e.progress(9800).unlocked.includes('name-onflame'));
 assert(!e.progress(e.xpForLevel(7)).unlocked.includes('theme-default'));
 assert(e.progress(e.xpForLevel(8)).unlocked.includes('theme-default'));
 assert.equal(e.progress(0).rank,'Bronze');
});

test('automatic presets select only unlocked effects for every level, including all Mythic slots',()=>{
 for(let level=1;level<=60;level++){
  const style=e.automaticStyle(level);
  for(const [kind,choices] of Object.entries(e.COSMETIC_CHOICES)){
   const field='selected'+kind[0].toUpperCase()+kind.slice(1),value=style[field];
   assert.ok(Object.hasOwn(choices,value));assert.ok(choices[value]<=level);
   assert.equal(choices[value],Math.max(...Object.values(choices).filter(required=>required<=level)));
  }
  assert.ok((e.THEME_LEVELS[style.personalTheme]||1)<=level);
 }
 assert.equal(e.automaticStyle(2).selectedNameFx,'none');
 assert.equal(e.automaticStyle(3).selectedNameFx,'ember');
 assert.equal(e.automaticStyle(12).selectedFrame,'emerald');
 const top=e.automaticStyle(60);
 assert.equal(top.selectedFrame,'mythic');assert.equal(top.selectedAvatarMotion,'ascension');
 assert.equal(top.selectedNameFx,'celestial');assert.equal(top.selectedAura,'celestial');
 assert.equal(top.selectedTrail,'nova');assert.equal(top.selectedCardFx,'mythic');
 assert.equal(top.selectedTitle,'emperor');assert.equal(top.selectedBanner,'mythic');
 assert.equal(top.nameGradient,true);assert.equal(top.personalTheme,'obsidian');
});
test('automatic equip is atomic with a real level gain, idempotent, and preserves identity and manual styles otherwise',()=>{
 const old={employeeId:'DOL-0002',name:'Existing Person',active:true,avatar:'🐯',xp:e.xpForLevel(2),levelPeak:2,profileVersion:8};
 const promoted=e.equipOnLevelUp(old,{...old,xp:e.xpForLevel(12),levelPeak:12});
 assert.equal(promoted.selectedFrame,'emerald');assert.equal(promoted.autoStyleLevel,12);assert.equal(promoted.profileVersion,9);
 for(const field of ['employeeId','name','avatar'])assert.equal(promoted[field],old[field]);
 assert.deepEqual(e.equipOnLevelUp(old,promoted),promoted,'speculative retry never changes the version twice');
 const custom={...promoted,selectedFrame:'none',selectedNameFx:'none',nameFlame:false,personalTheme:'gray'};
 assert.deepEqual(e.equipOnLevelUp(custom,{...custom,xp:custom.xp+1}),{...custom,xp:custom.xp+1});
 assert.deepEqual(e.equipOnLevelUp(custom,{...custom,xp:0}),{...custom,xp:0},'permanent level peak prevents correction from overwriting customization');
});
