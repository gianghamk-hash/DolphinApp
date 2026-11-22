'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const logic=require('../crew-dolphin-landing.js');
test('Vietnam time slots cover every hour without gaps',()=>{
 const expected={morning:[5,10],noon:[11,13],afternoon:[14,17],evening:[18,21],night:[22,23,0,4]};
 for(const [key,hours]of Object.entries(expected))for(const hour of hours)assert.equal(logic.slot(hour).key,key);
 for(let hour=0;hour<24;hour++){
  assert.ok(logic.slot(hour).text.length>15);
  assert.ok(['playful','cheerful','calm','sleepy'].includes(logic.slot(hour).mood));
 }
});
test('Vietnam wall-clock time uses Asia/Ho_Chi_Minh, not device time',()=>{
 assert.equal(logic.hourVN(new Date('2026-11-22T00:01:00Z')),7);
 assert.equal(logic.hourVN(new Date('2026-11-22T16:59:00Z')),23);
 assert.equal(logic.dayVN(new Date('2026-11-22T18:00:00Z')),'2026-11-23');
});
test('check-in reminder only reads an active server-confirmed mission',()=>{
 const today=new Date('2026-11-22T03:01:00Z');
 const date=logic.dayVN(today);
 const profile={dailyMissions:{date,tasks:[{id:'order_completed',done:false},{id:'checkin',done:false}]}};
 assert.equal(logic.pendingCheckin(profile,today),true);
 profile.dailyMissions.tasks[1].done=true;
 assert.equal(logic.pendingCheckin(profile,today),false);
 profile.dailyMissions.tasks[1].done=false;
 profile.dailyMissions.date='2026-11-21';
 assert.equal(logic.pendingCheckin(profile,today),false,'stale daily data must not remind');
 assert.equal(logic.pendingCheckin({dailyMissions:{date,tasks:[]}},today),false);
 assert.equal(logic.pendingCheckin({},today),false);
});
test('Bezier trajectory has exact endpoints and smooth intermediary points',()=>{
 const p=[{x:20,y:70},{x:80,y:30},{x:150,y:150},{x:210,y:110}];
 assert.deepEqual(logic.cubic(p,0),p[0]);
 assert.deepEqual(logic.cubic(p,1),p[3]);
 const midpoint=logic.cubic(p,.5);
 assert.ok(Number.isFinite(midpoint.x)&&Number.isFinite(midpoint.y));
 assert.ok(midpoint.x>20&&midpoint.x<210);
});

test('sprite faces its travel direction and keeps orientation near vertical motion',()=>{
 assert.deepEqual(logic.faceForMovement(8,1),{facing:1,scaleX:-1},'left-facing art flips right');
 assert.deepEqual(logic.faceForMovement(-8,1),{facing:-1,scaleX:1},'left-facing art points left');
 assert.deepEqual(logic.faceForMovement(.1,-1),{facing:-1,scaleX:1},'subpixel turn does not flicker');
});
