const test=require('node:test');
const assert=require('node:assert/strict');
const {createCombatCueScheduler}=require('./combat-timeline.js');

test('wind-up starts before impact, never duplicates and resets for next round',()=>{
 const s=createCombatCueScheduler(),events=[
  {type:'attack',actor:'a',t:1000},{type:'cast',actor:'b',t:1100},
  {type:'attack',actor:'a',t:1450}
 ];
 let seen=[];
 s.advance(events,0,800,(e,i)=>seen.push(i));
 assert.deepEqual(seen,[]);
 s.advance(events,0,850,(e,i)=>seen.push(i));
 assert.deepEqual(seen,[0]);
 s.advance(events,0,900,(e,i)=>seen.push(i));
 assert.deepEqual(seen,[0,1]);
 assert.equal(s.consume(0),true);
 assert.equal(s.consume(0),false);
 s.advance(events,1,1300,(e,i)=>seen.push(i));
 assert.deepEqual(seen,[0,1,2]);
 assert.equal(s.consume(2),true);
 s.reset();
 assert.equal(s.pending,0);
 s.advance(events,0,850,(e,i)=>seen.push(i));
 assert.equal(seen.at(-1),0);
});

test('late frames do not start an obsolete pre-impact animation',()=>{
 const s=createCombatCueScheduler(),events=[{type:'attack',t:200},{type:'move',t:250},{type:'cast',t:400}];
 const seen=[];
 s.advance(events,0,500,(e,i)=>seen.push(i));
 assert.deepEqual(seen,[]);
 assert.equal(s.consume(0),false);
});
