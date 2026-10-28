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
 assert.throws(()=>E.action(s,'a',{type:'MOVE',unitId:id,to:'board',index:'r0c4'},30101)); // shop rolls are intentionally allowed during combat
 const a=E.simulate(s.pairs[0],s,s.combatSnapshot,876),b=E.simulate(s.pairs[0],s,s.combatSnapshot,876);
 assert.deepEqual(a,b);
 E.advance(s,60100);assert.equal(s.roundPhase,'TRANSITION');assert.equal(s.reports.length,4);
 E.advance(s,65100);assert.equal(s.roundPhase,'PREPARATION');assert.equal(s.round,2);
});

test('30-second combat has bounded authoritative timeline and tuned hero classes',()=>{
 assert.equal(E.PHASES.COMBAT,30000);
 assert.equal(E.PHASES.PREPARATION,30000);
 assert.equal(E.C.heroes.length,30);
 for(const hero of E.C.heroes){
  assert.ok(hero.hp>=300&&hero.hp<=2000,hero.id+' HP');
  assert.ok(hero.attack>=40&&hero.attack<=200,hero.id+' attack');
  assert.ok(hero.ability.power>0,hero.id+' ability');
 }
 const state=setup();E.advance(state,30100);
 const report=E.simulate(state.pairs[0],state,state.combatSnapshot,876);
 assert.equal(report.events.at(-1).t,30000);
});

test('trait buffs apply only to heroes possessing the activated trait',()=>{
 const state=setup(),p=state.players.a;
 const mech=E.C.heroes.filter(h=>h.origins.includes('Mech'));
 const outsider=E.C.heroes.find(h=>!h.origins.includes('Mech')&&!h.classes.includes('Mech'));
 assert.ok(mech.length>=2&&outsider);
 [mech[0],mech[1],outsider].forEach((h,i)=>{const id='trait'+i;p.units[id]={id,heroId:h.id,star:1,items:[]};p.board['r0c'+i]=id;});
 const traits=E.activeTraits(p);assert.equal(traits.Mech.tier,2);
 const ally=E.combatStats(p,p.units.trait0,traits),other=E.combatStats(p,p.units.trait2,traits),plainOther=E.combatStats(p,p.units.trait2,{});
 assert.equal(other.armor,plainOther.armor);
 assert.equal(other.regen,plainOther.regen);
 assert.equal(ally.armor,E.combatStats(p,p.units.trait0,{}).armor+20);
 assert.equal(ally.regen,8);
});
test('equipment allows at most three occupied slots on a hero',()=>{
 const state=setup(),p=state.players.a,h=E.C.heroes[0];
 const crafted=E.C.recipes.slice(0,3).map(x=>x.id);
 p.units.u={id:'u',heroId:h.id,star:1,items:crafted};p.bench['0']='u';
 const extra=E.C.components[0].id;p.inventory.push(extra);
 assert.throws(()=>E.action(state,'a',{type:'EQUIP',unitId:'u',component:extra},1009),/3 ô đồ/);
 assert.equal(p.units.u.items.length,3);
});

test('all trait thresholds activate at the exact distinct deployed hero count',()=>{
 const s=setup(),p=s.players.a;
 for(const [key,definition] of Object.entries(E.C.origins)){
  const available=E.C.heroes.filter(h=>[...h.origins,...h.classes].includes(key));
  for(const threshold of Object.keys(definition.thresholds).map(Number)){
   p.units={};p.board={};
   assert.ok(available.length>=threshold,'insufficient heroes for '+key+' '+threshold);
   available.slice(0,threshold-1).forEach((h,i)=>{const id='u'+i;p.units[id]={id,heroId:h.id,star:1,items:[]};p.board['r'+Math.floor(i/8)+'c'+i%8]=id;});
   const before=E.activeTraits(p)[key];
   assert.ok(!before||before.tier<threshold,key+' activated early at '+threshold);
   const h=available[threshold-1],id='final';p.units[id]={id,heroId:h.id,star:1,items:[]};p.board['r'+Math.floor((threshold-1)/8)+'c'+(threshold-1)%8]=id;
   assert.equal(E.activeTraits(p)[key].tier,threshold,key+' missed '+threshold);
  }
 }
});
test('skills produce distinct deterministic control and healing events',()=>{
 const s=setup(),p=s.players.a;
 function run(kind){
  p.units={};p.board={};
  const own=E.C.heroes.find(h=>h.ability.kind===kind);
  assert.ok(own,'missing '+kind);
  p.units.a={id:'a',heroId:own.id,star:1,items:[]};p.board.r0c3='a';
  s.round=1;
  // Deterministic fixture: guarantee the skill can fire before combat ends.
  const before={manaStart:own.manaStart,range:own.range,attack:own.attack};
  own.manaStart=own.manaMax;own.range=8;own.attack=1;
  try{
   const battle=E.simulate({a:'a',b:null,pve:true,ghost:false},s,{a:E.clone(p)},123);
   return battle.events;
  }finally{Object.assign(own,before);}
 }
 assert.ok(run('stun').some(e=>e.type==='stun'));
 assert.ok(run('drain').some(e=>e.type==='heal'));
 assert.ok(run('dash').some(e=>e.type==='move'));
});
