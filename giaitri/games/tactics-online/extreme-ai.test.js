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

test('Phase 3: bots manage reserve and draft through 15 rounds without illegal slots',()=>{
 const r=E.roomNew('human','Human',100,6611);
 for(const uid of ['AI_1','AI_2','AI_3']){r.players[uid]=E.freshPlayer(uid,uid,r);r.playerOrder.push(uid);}
 r.status='in_game';r.phaseEndsAt=30100;
 for(let i=0;i<15&&r.status==='in_game';i++){
  for(const uid of ['AI_1','AI_2','AI_3']){
   const p=r.players[uid];if(p.eliminated)continue;
   AI.takeTurn(r,uid,r.phaseStartedAt+100);
   assert.equal(p.ready,true);
   assert.ok(Object.keys(p.board).length<=p.level);
   assert.ok(Object.keys(p.bench).length<=8);
  }
  E.advance(r,r.phaseEndsAt);E.advance(r,r.phaseEndsAt);
  if(r.status==='finished')break;
  E.advance(r,r.phaseEndsAt);
 }
 assert.ok(r.round>=3);
});
test('Phase 3: economy reserve decreases under critical HP',()=>{
 const healthy={hp:100,gold:40,level:5};
 const danger={hp:20,gold:40,level:5};
 assert.ok(AI.economicPlan(healthy,9).reserve>AI.economicPlan(danger,9).reserve);
});

test('level 9 AI selects nine deployed champions when available',()=>{
 const s=E.roomNew('a','A',100,919),p=s.players.a;
 p.level=9;p.units={};
 for(let i=0;i<10;i++){const id='u'+i;p.units[id]={id,heroId:E.C.heroes[i].id,star:1,items:[]};}
 const lineup=AI.bestLineup(p);
 assert.equal(lineup.length,9);
 assert.equal(new Set(lineup.map(x=>x.id)).size,9);
});

test('three bots pursue distinct economy, tempo and adaptive strategies',()=>{
 assert.equal(AI.styleFor('AI_1'),'economy');
 assert.equal(AI.styleFor('AI_2'),'tempo');
 assert.equal(AI.styleFor('AI_3'),'adaptive');
 const p={hp:80,gold:45,level:5};
 assert.ok(AI.economicPlan(p,10,'economy').reserve>AI.economicPlan(p,10,'tempo').reserve);
 assert.ok(AI.economicPlan(p,10,'tempo').rollBudget>AI.economicPlan(p,10,'economy').rollBudget);
});
test('nine backline units get unique valid board positions',()=>{
 const r=E.roomNew('AI_1','AI',100,25),p=r.players.AI_1;
 p.level=9;p.units={};p.board={};p.bench={};
 for(let i=0;i<9;i++){const h=E.C.heroes.find(x=>x.range>1&&x.id!==Object.values(p.units).map(v=>v.heroId)[0])||E.C.heroes[2];p.units['u'+i]={id:'u'+i,heroId:h.id,star:1,items:[]};}
 const threat=AI.opponentThreat(r,'AI_1');
 // Exercise the same plan through a normal turn; enough roster to fill nine slots.
 r.status='in_game';r.phaseEndsAt=30100;
 AI.takeTurn(r,'AI_1',1000);
 assert.equal(Object.keys(p.board).length,9);
 assert.equal(new Set(Object.values(p.board)).size,9);
});
test('deterministic simulation preserves legal units and economy',()=>{
 const sim=require('./balance-sim.js');
 const result=sim.batch(3);
 assert.equal(result.games,3);
 assert.ok(result.rounds>=3);
 assert.ok(result.events>0);
});
