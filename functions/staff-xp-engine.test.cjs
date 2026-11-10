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
 const down=e.equipOnLevelUp(custom,{...custom,xp:0});
 assert.equal(down.xp,0);assert.equal(e.effectiveLevel(down),1);
 assert.equal(down.levelPeak,12,'Past maximum is audit-only');
 assert.equal(down.selectedFrame,'none');assert.equal(down.personalTheme,'gray');
 assert.equal(down.selectedAvatarMotion,'none');
 assert.equal(down.autoStyleLevel,1);
 assert.equal(down.profileVersion,10);
 const regained=e.equipOnLevelUp(down,{...down,xp:e.xpForLevel(6)});
 assert.equal(regained.selectedFrame,'bronze');
 assert.equal(regained.selectedAvatarMotion,'comet');
 assert.equal(regained.autoStyleLevel,6);
});

test('Linh hihi Level 2 / 4102.5 XP cannot equip Level 20 Guardian or high-end effects',()=>{
 const p={
  employeeId:'DOL-0003',name:'Linh hihi',active:true,xp:4102.5,levelPeak:54,
  avatar:'👻',selectedTitle:'guardian',selectedFrame:'gold',selectedAura:'celestial',
  selectedAvatarMotion:'supernova',selectedTrail:'nova',selectedCardFx:'mythic',
  selectedNameFx:'royal',nameFlame:true,nameGradient:true,selectedBanner:'cosmic',
  personalTheme:'cosmic'
 };
 assert.equal(e.effectiveLevel(p),2);
 assert.equal(e.levelForXP(4102.5),2);
 const visible=e.currentCosmetics(p);
 for(const field of ['selectedTitle','selectedFrame','selectedAura','selectedAvatarMotion','selectedTrail','selectedCardFx','selectedNameFx'])assert.equal(visible[field],'none');
 assert.equal(visible.selectedBanner,'default');
 assert.equal(visible.personalTheme,'dark');
 assert.equal(visible.nameFlame,false);assert.equal(visible.nameGradient,false);
 assert.equal(visible.avatar,'🐬');
 assert.equal(p.selectedTitle,'guardian','Pure projection never mutates stored history');
});
test('Avatar catalog is gated by current XP at Level 1, Level 2 and higher tiers',()=>{
 const catalog=require('./staff-avatar-catalog.json');
 const pet=catalog['Thú cưng Lv.2'][0];
 const elite=catalog['Thần tốc Lv.30']?.[0]||Object.entries(catalog).find(([k])=>/Lv\.30/.test(k))?.[1]?.[0];
 assert.equal(e.currentCosmetics({xp:0,avatar:pet}).avatar,'🐬');
 assert.equal(e.currentCosmetics({xp:e.xpForLevel(2),avatar:pet}).avatar,pet);
 if(elite){
  assert.equal(e.currentCosmetics({xp:e.xpForLevel(2),avatar:elite}).avatar,'🐬');
  assert.equal(e.currentCosmetics({xp:e.xpForLevel(30),avatar:elite}).avatar,elite);
 }
});
test('XP loss across a threshold locks effects and later XP increases unlock them again',()=>{
 const old={employeeId:'DOL-0003',active:true,xp:e.xpForLevel(54),levelPeak:54,
  avatar:'🐬',autoStyleLevel:54,profileVersion:7,...e.automaticStyle(54)};
 const low=e.equipOnLevelUp(old,{...old,xp:4102.5});
 assert.equal(e.effectiveLevel(low),2);assert.equal(low.levelPeak,54);
 assert.equal(low.selectedTitle,'none');assert.equal(low.selectedFrame,'none');
 assert.equal(low.selectedAura,'none');assert.equal(low.selectedNameFx,'none');
 assert.equal(low.nameFlame,false);assert.equal(low.personalTheme,'dark');
 assert.equal(low.autoStyleLevel,2);
 const regain=e.equipOnLevelUp(low,{...low,xp:e.xpForLevel(20)});
 assert.equal(e.effectiveLevel(regain),20);
 assert.equal(regain.selectedTitle,'guardian');assert.equal(regain.selectedFrame,'emerald');
 assert.equal(regain.autoStyleLevel,20);
 const untouched=e.equipOnLevelUp(regain,{...regain,xp:regain.xp+1});
 assert.equal(untouched.selectedTitle,'guardian');
});
