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
