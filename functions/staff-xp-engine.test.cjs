'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const e=require('./staff-xp-engine.cjs');
test('1,000 VND = 1 XP; 0.1 work point = 1 XP',()=>{
 assert.equal(e.revenueXP(2290000),2290);
 assert.equal(e.revenueXP(3290000),3290);
 assert.equal(e.revenueXP(999),0);
 assert.equal(e.workXP(0.1),1);
 assert.equal(e.workXP(1.25),13);
 assert.equal(e.workXP(2.5),25);
 assert.equal(e.totalXP(2000000,1.5),2015);
});
test('reject negative and invalid revenue/points',()=>{
 for(const value of [-1,NaN,Infinity,1.5])assert.throws(()=>e.revenueXP(value));
 for(const value of [-0.1,0.15,Infinity,NaN])assert.throws(()=>e.workXP(value));
});
test('level progression is monotonically increasing and unlock thresholds are ordered',()=>{
 let prev=0;
 for(let level=1;level<=60;level++){const xp=e.xpForLevel(level);assert(xp>=prev);prev=xp;assert.equal(e.levelForXP(xp),level);}
 assert.equal(e.levelForXP(999),1);
 assert.equal(e.levelForXP(1000),2);
 assert.equal(e.levelForXP(4000),3);
 assert.equal(e.levelForXP(1000000000),60);
 const levels=e.PERKS.map(p=>p.level);
 assert.deepEqual(levels,[1,3,5,8,10,12,15,18,22,28]);
});
test('perks activate only after meeting corresponding level threshold',()=>{
 assert(!e.progress(3999).unlocked.includes('name-onflame'));
 assert(e.progress(4000).unlocked.includes('name-onflame'));
 assert(!e.progress(e.xpForLevel(7)).unlocked.includes('theme-dolphin-ocean'));
 assert(e.progress(e.xpForLevel(8)).unlocked.includes('theme-dolphin-ocean'));
 assert.equal(e.progress(0).rank,'Bronze');
});
