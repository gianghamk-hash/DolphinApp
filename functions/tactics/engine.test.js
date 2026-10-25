const test=require('node:test'),assert=require('node:assert/strict');
const E=require('./engine');
function setup(){const s=E.roomNew('a','A',100,123456);for(const id of ['b','c','d']){s.playerOrder.push(id);s.players[id]=E.freshPlayer(id,id,s);}s.status='in_game';s.phaseEndsAt=30100;return s;}
test('catalog: 30 champions, five cost tiers, 21 item recipes',()=>{
 assert.equal(E.C.heroes.length,30);assert.equal(E.C.recipes.length,21);
 assert.deepEqual([1,2,3,4,5].map(i=>E.C.heroes.filter(h=>h.cost===i).length),[8,7,6,5,4]);
 assert.equal(new Set(E.C.heroes.map(h=>h.id)).size,30);
});
test('three identical units combine to 2-star and three 2-star combine to 3-star',()=>{
 const s=setup(),p=s.players.a;p.gold=150;
 function buyTriplet(){for(let i=0;i<3;i++){p.shop[0]='H01';E.action(s,'a',{type:'BUY',index:0},1000);}}
 for(let i=0;i<3;i++)buyTriplet();
 assert.equal(Object.keys(p.units).length,1);
 assert.equal(Object.values(p.units)[0].star,3);
 assert.equal(p.gold,141);
});
test('moves between 8 bench slots and 8x4 board; rejects illegal tiles',()=>{
 const s=setup(),p=s.players.a;p.shop[0]='H01';
 E.action(s,'a',{type:'BUY',index:0},1000);
 const id=Object.keys(p.units)[0];
 E.action(s,'a',{type:'MOVE',unitId:id,to:'board',index:'r3c7'},1001);
 assert.equal(p.board.r3c7,id);assert.equal(Object.keys(p.bench).length,0);
 assert.throws(()=>E.action(s,'a',{type:'MOVE',unitId:id,to:'board',index:'r5c1'},1002));
});
test('trait counters respond to board lineup',()=>{
 const s=setup(),p=s.players.a;
 const sample=E.C.heroes.filter(h=>h.origins.includes('Mech')).slice(0,2);
 sample.forEach((h,i)=>{const id='u'+i;p.units[id]={id,heroId:h.id,star:1,items:[]};p.board['r0c'+i]=id;});
 assert.equal(E.activeTraits(p).Mech.tier,2);
 delete p.board.r0c1;assert.equal(E.activeTraits(p).Mech,undefined);
});
test('all 21 components combinations map to a unique recipe',()=>{
 for(const a of E.C.components)for(const b of E.C.components){
  const key=[a.id,b.id].sort().join('+');
  assert.ok(E.RECIPE[key],'missing '+key);
 }
});
test('server state denies actions during combat and supports deterministic PvE report',()=>{
 const s=setup(),p=s.players.a;p.shop[0]='H01';E.action(s,'a',{type:'BUY',index:0},1000);
 const id=Object.keys(p.units)[0];E.action(s,'a',{type:'MOVE',unitId:id,to:'board',index:'r0c3'},1001);
 E.advance(s,30100);assert.equal(s.roundPhase,'COMBAT');assert.equal(s.pairs.length,4);
 assert.throws(()=>E.action(s,'a',{type:'ROLL'},30101));
 const a=E.simulate(s.pairs[0],s,s.combatSnapshot,876),b=E.simulate(s.pairs[0],s,s.combatSnapshot,876);
 assert.deepEqual(a,b);
 E.advance(s,70100);assert.equal(s.roundPhase,'TRANSITION');assert.equal(s.reports.length,4);
 E.advance(s,75100);assert.equal(s.roundPhase,'PREPARATION');assert.equal(s.round,2);
});
