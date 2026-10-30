'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),E=require('./engine');
function combat(){
 const s=E.roomNew('a','Giang',100,123456);
 for(const id of ['b','c','d']){s.playerOrder.push(id);s.players[id]=E.freshPlayer(id,id,s);}
 s.status='in_game';s.phaseEndsAt=30100;
 const p=s.players.a;p.gold=80;p.shop=['H01','H01','H01','H02','H03'];
 E.action(s,'a',{type:'BUY',index:0},1000);E.action(s,'a',{type:'BUY',index:1},1001);
 const [field,reserve]=Object.keys(p.units);E.action(s,'a',{type:'MOVE',unitId:field,to:'board',index:'r0c3'},1002);
 p.ready=true;E.advance(s,30100);return {s,p,field,reserve,now:30101};
}
test('combat permits owned bench rearrangement, including swaps, without touching the combat snapshot',()=>{
 const {s,p,now,reserve}=combat(),snapshot=E.clone(s.combatSnapshot);
 E.action(s,'a',{type:'BUY',index:3},now);const bought=Object.keys(p.units).find(id=>p.units[id].heroId==='H02');
 const original=E.findPosition(p,bought).key;
 E.action(s,'a',{type:'MOVE',unitId:reserve,to:'bench',index:'7'},now+1);
 E.action(s,'a',{type:'MOVE',unitId:bought,to:'bench',index:'7'},now+2);
 assert.equal(p.bench['7'],bought);assert.equal(p.bench[original],reserve);
 assert.equal(p.ready,true);assert.deepEqual(s.combatSnapshot,snapshot);
});
test('combat rejects deployment, withdrawal, selling, equipping and invalid bench positions',()=>{
 const {s,p,now,field,reserve}=combat();p.inventory=['sword'];
 const commands=[
  {type:'MOVE',unitId:field,to:'bench',index:'3'},
  {type:'MOVE',unitId:reserve,to:'board',index:'r1c1'},
  {type:'MOVE',unitId:field,to:'board',index:'r1c2'},
  {type:'MOVE',unitId:reserve,to:'bench',index:'8'},
  {type:'MOVE',unitId:'not-owned',to:'bench',index:'2'},
  {type:'SELL',unitId:reserve},{type:'EQUIP',unitId:field,component:'sword'},{type:'READY'}
 ];
 for(const command of commands){const before=E.clone(s);assert.throws(()=>E.action(s,'a',command,now));assert.deepEqual(s,before,command.type+' must not mutate a rejected room');}
});
test('buying the third copy during combat defers fusion through TRANSITION until PREPARATION',()=>{
 const {s,p,now,field}=combat(),snapshot=E.clone(s.combatSnapshot);
 E.action(s,'a',{type:'BUY',index:2},now);
 assert.equal(Object.keys(p.units).length,3);assert.equal(p.pendingMerge,true);
 assert.ok(Object.values(p.units).every(u=>u.star===1));assert.equal(p.board.r0c3,field);
 assert.deepEqual(s.combatSnapshot,snapshot);
 E.advance(s,s.phaseEndsAt,{recordEvents:false});assert.equal(s.roundPhase,'TRANSITION');assert.equal(Object.keys(p.units).length,3);
 E.advance(s,s.phaseEndsAt,{recordEvents:false});assert.equal(s.roundPhase,'PREPARATION');
 assert.equal(Object.keys(p.units).length,1);assert.equal(p.units[field].star,2);assert.equal(p.board.r0c3,field);assert.equal(p.pendingMerge,false);
 assert.throws(()=>E.advance(s,s.phaseStartedAt+1));
});
test('combat shop supports XP, lock/unlock and reroll without changing the current battle',()=>{
 const {s,p,now}=combat(),snapshot=E.clone(s.combatSnapshot),gold=p.gold;
 E.action(s,'a',{type:'BUY_XP'},now);assert.equal(p.gold,gold-4);assert.equal(p.xp,4);
 E.action(s,'a',{type:'TOGGLE_SHOP_LOCK'},now+1);assert.equal(p.shopLocked,true);
 assert.throws(()=>E.action(s,'a',{type:'ROLL'},now+2),/khóa/);
 E.action(s,'a',{type:'TOGGLE_SHOP_LOCK'},now+3);E.action(s,'a',{type:'ROLL'},now+4);
 assert.equal(p.gold,gold-6);assert.equal(p.shop.length,5);assert.deepEqual(s.combatSnapshot,snapshot);
});
