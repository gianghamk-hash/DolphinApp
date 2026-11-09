'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const wagers=require('./rules.cjs'),engine=require('../staff-xp-engine.cjs');
const staff=(id,xp,stake,extra={})=>({employeeId:id,xp,stake,active:true,verified:true,registrationSource:'manager',...extra});
test('validates identity, positive integer stake, unique staff and available XP',()=>{
 const a=staff('DOL-0002',1250,1200,{xpReserved:50});
 const b=staff('DOL-0003',500,500);
 assert.equal(wagers.available(a),1200);
 assert.equal(wagers.prepare('caro',[a,b]).pot,1700);
 assert.throws(()=>wagers.prepare('caro',[{...a,stake:1201},b]),/vượt XP/);
 assert.throws(()=>wagers.prepare('caro',[a,{...b,employeeId:'DOL-0002'}]),/Trùng/);
 assert.throws(()=>wagers.prepare('caro',[a,{...b,verified:false}]),/duyệt/);
 assert.throws(()=>wagers.prepare('caro',[a,{...b,stake:0}]),/nguyên dương/);
 assert.throws(()=>wagers.prepare('caro',[a,{...b,stake:1.5}]),/nguyên dương/);
 assert.throws(()=>wagers.prepare('caro',[a,{...b,registrationSource:'self',approved:false}]),/duyệt/);
});
test('zero-sum two-player payout only gives winner the opponent stake',()=>{
 const contract=wagers.prepare('battleship',[staff('DOL-0002',1000,300),staff('DOL-0003',1000,100)]);
 const value=wagers.settlement(contract,{type:'win',winnerId:'DOL-0002'});
 assert.deepEqual(value.deltas,{'DOL-0002':100,'DOL-0003':-100});
 assert.equal(value.pot,400);
 assert.equal(Object.values(value.deltas).reduce((a,n)=>a+n,0),0);
 assert.throws(()=>wagers.settlement(contract,{type:'win',winnerId:'DOL-9999'}),/không thuộc/);
});
test('four-player Tactics distributes all defeated stakes to only the verified winner',()=>{
 const contract=wagers.prepare('tactics',[
  staff('DOL-0002',2000,100),staff('DOL-0003',2500,200),
  staff('DOL-0004',3000,300),staff('DOL-0005',3500,400)
 ]);
 const result=wagers.settlement(contract,{type:'win',winnerId:'DOL-0004'});
 assert.deepEqual(result.deltas,{'DOL-0002':-100,'DOL-0003':-200,'DOL-0004':700,'DOL-0005':-400});
 assert.equal(result.pot,1000);
 assert.equal(Object.values(result.deltas).reduce((a,n)=>a+n,0),0);
});
test('draw and cancellation leave every stake untouched',()=>{
 for(const game of ['caro','xiangqi']){
  const contract=wagers.prepare(game,[staff('DOL-0002',800,500),staff('DOL-0003',900,300)]);
  for(const type of ['draw','cancel']){
   const result=wagers.settlement(contract,{type});
   assert.deepEqual(result.deltas,{'DOL-0002':0,'DOL-0003':0});
   assert.equal(result.winnerId,null);
  }
 }
});
test('duplicate settlement receipt is idempotent, contradictory replay is rejected',()=>{
 const before=staff('DOL-0002',1000,100,{levelPeak:7,selectedAvatarMotion:'wave'});
 const adjustment={matchId:'tactics:ABCDEFGH',delta:-300,at:1234};
 const first=wagers.applyOnce(before,adjustment);
 assert.equal(first.applied,true);
 assert.equal(first.after,700);
 const replay=wagers.applyOnce(first.profile,adjustment);
 assert.equal(replay.applied,false);
 assert.equal(replay.duplicate,true);
 assert.equal(replay.profile.xp,700);
 assert.throws(()=>wagers.applyOnce(first.profile,{...adjustment,delta:300}),/Trùng mã trận/);
 assert.equal(first.profile.levelPeak,7);
 assert.equal(first.profile.selectedAvatarMotion,'wave');
});
test('XP loss reduces CURRENT level while unlocked levelPeak is retained',()=>{
 const prior=staff('DOL-0002',engine.xpForLevel(12),100,{levelPeak:12});
 const result=wagers.applyOnce(prior,{matchId:'caro:LEVELDOWN',delta:-engine.xpForLevel(12)+engine.xpForLevel(9),at:999});
 assert.equal(result.oldLevel,12);
 assert.equal(result.newLevel,9);
 assert.equal(result.profile.levelPeak,12);
 assert.equal(result.profile.xp,engine.xpForLevel(9));
 assert.throws(()=>wagers.applyOnce(prior,{matchId:'caro:INSUFFICIENT',delta:-prior.xp-1}),/không hợp lệ/);
});
test('match contract cannot accidentally include more players or unsupported game',()=>{
 assert.throws(()=>wagers.prepare('unknown',[]),/không hỗ trợ/);
 assert.throws(()=>wagers.prepare('caro',[staff('DOL-0002',30,10)]),/không hợp lệ/);
 assert.throws(()=>wagers.prepare('tactics',[staff('DOL-0002',30,10),staff('DOL-0003',30,10)]),/không hợp lệ/);
});
