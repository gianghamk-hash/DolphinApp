'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const source=fs.readFileSync('crew-dolphin-companion.js','utf8'),context={};
vm.runInNewContext(source,context);
const {model,forms}=context.DolphinCompanion;
test('all 100 current levels map to ten rendered forms, including Level 100 only Eternal',()=>{
 const seen=new Set();
 for(let level=1;level<=100;level++){
  const state=model({employeeId:'DOL-0002',level,xp:2450*(level-1)**2,highestLevel:100},'DOL-0002');
  assert.equal(state.currentLevel,level);assert.ok(state.level<=level);seen.add(state.index);
 }
 assert.equal(seen.size,10);assert.equal(forms.length,10);
 assert.equal(model({employeeId:'DOL-0002',level:99},'DOL-0002').name,'Royal Dolphin');
 assert.equal(model({employeeId:'DOL-0002',level:100},'DOL-0002').name,'Eternal Dolphin');
});
test('deduction ignores historical unlocks; no stale or unlinked employee pet',()=>{
 const p={employeeId:'DOL-0001',level:1,xp:0,highestLevel:100,levelPeak:100};
 assert.equal(model(p,'DOL-0001').index,0);
 assert.equal(model(p,'DOL-0002'),null);assert.equal(model(p,null),null);
 for(const level of [NaN,Infinity,-1,0,'100',undefined])assert.equal(model({...p,level},'DOL-0001'),null);
 assert.equal(model(null,'DOL-0001'),null);
});
