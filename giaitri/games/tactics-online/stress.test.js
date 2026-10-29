/* Package D: deterministic stress regression suite. Run with node --test stress.test.js.
 * Real Android GPU/FPS and Firestore latency require physical-device integration tests.
 */
'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const E=require('../../../functions/tactics/engine');
const {run,batch}=require('./balance-sim.js');
const catalog=E.C;
function validReport(result){
 assert.ok(result.rounds>0&&result.rounds<=30);
 assert.ok(result.events>=0);
 for(const p of Object.values(result.styles)){
  assert.ok(Number.isSafeInteger(p.wins)&&p.wins>=0);
  assert.ok(Number.isSafeInteger(p.losses)&&p.losses>=0);
 }
}
test('Package D: catalog coverage — 36 champions, 12 traits and 21 equipment recipes',()=>{
 assert.equal(catalog.heroes.length,36);
 assert.equal(Object.keys(catalog.origins).length,12);
 assert.equal(catalog.recipes.length,21);
 assert.equal(catalog.components.length,6);
 const ids=new Set(catalog.heroes.map(h=>h.id));assert.equal(ids.size,36);
 for(const h of catalog.heroes){assert.ok(h.ability?.kind&&E.HERO[h.id]);for(const trait of [...h.origins,...h.classes])assert.ok(catalog.origins[trait],trait);}
 for(const item of catalog.recipes){assert.equal(item.components.length,2);assert.ok(item.components.every(id=>E.COMP[id]));}
});
test('Package D: 6 different seeds survive 18 rounds without invalid economy or placement',()=>{
 for(let i=0;i<6;i++){const result=run(20261029+i*97,18);validReport(result);}
});
test('Package D: reproducible simulation never changes results for the same seed',()=>{
 const first=run(871223,16),second=run(871223,22);
 assert.deepEqual(first,second);
});
test('Package D: 4-game batch reports consistent round and event aggregation',()=>{
 const results=batch(4);
 assert.equal(results.games,4);
 assert.equal(results.results.length,4);
 assert.equal(results.rounds,results.results.reduce((sum,x)=>sum+x.rounds,0));
 assert.equal(results.events,results.results.reduce((sum,x)=>sum+x.events,0));
});
test('Package D: equipped champions preserve legal inventory after repeated trades',()=>{
 const s=E.roomNew('a','A',0,320),p=s.players.a;
 s.status='in_game';s.phaseEndsAt=100000;
 p.gold=80;
 const h=catalog.heroes.find(h=>h.cost===1);
 p.shop=[h.id,h.id,h.id,h.id,h.id];
 for(let i=0;i<3;i++)E.action(s,'a',{type:'BUY',index:i},100+i);
 assert.ok(Object.values(p.units).length>=1);
 const u=Object.values(p.units)[0];
 p.inventory=['sword','sword','sword','sword'];
 E.action(s,'a',{type:'EQUIP',unitId:u.id,component:'sword'},200);
 E.action(s,'a',{type:'EQUIP',unitId:u.id,component:'sword'},201);
 const count=()=>p.inventory.length+Object.values(p.units).reduce((sum,x)=>sum+(x.items||[]).reduce((n,item)=>n+(E.COMP[item]?1:2),0),0);
 assert.equal(count(),4);
 E.action(s,'a',{type:'SELL',unitId:u.id},202);
 assert.equal(count(),4);
});
