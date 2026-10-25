const test=require('node:test'),assert=require('node:assert/strict'),E=require('../../../functions/tactics/engine'),makeAI=require('./extreme-ai.js');const AI=makeAI(E);
test('three expert bots autonomously draft, position, level and mark ready',()=>{
 const r=E.roomNew('human','Human',100,1234);
 for(const uid of ['AI_1','AI_2','AI_3']){r.players[uid]=E.freshPlayer(uid,uid,r);r.playerOrder.push(uid);}
 r.status='in_game';r.phaseEndsAt=30100;
 for(const uid of ['AI_1','AI_2','AI_3']){
  AI.takeTurn(r,uid,1000);
  const p=r.players[uid];assert.equal(p.ready,true);
  assert.ok(Object.keys(p.board).length>0);
  assert.ok(Object.keys(p.board).length<=p.level);
  assert.ok(Object.keys(p.bench).length<=8);
 }
});
test('twelve offline rounds run without firestore and keep legal board ownership',()=>{
 const r=E.roomNew('human','Human',100,4321);
 for(const uid of ['AI_1','AI_2','AI_3']){r.players[uid]=E.freshPlayer(uid,uid,r);r.playerOrder.push(uid);}
 r.status='in_game';r.phaseEndsAt=30100;
 for(let i=0;i<12&&r.status==='in_game';i++){
  const at=r.phaseStartedAt+100;
  for(const id of ['AI_1','AI_2','AI_3'])if(!r.players[id].eliminated)AI.takeTurn(r,id,at);
  E.advance(r,r.phaseEndsAt);E.advance(r,r.phaseEndsAt);if(r.status==='finished')break;E.advance(r,r.phaseEndsAt);
  for(const id of ['AI_1','AI_2','AI_3']){
   const p=r.players[id];
   for(const u of Object.values(p.board))assert.ok(p.units[u]);
  }
 }
 assert.ok(r.round>=2);
});
