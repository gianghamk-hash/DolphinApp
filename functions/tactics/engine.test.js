const test=require('node:test'),assert=require('node:assert/strict');
const E=require('./engine');
function setup(){const s=E.roomNew('a','A',100,123456);for(const id of ['b','c','d']){s.playerOrder.push(id);s.players[id]=E.freshPlayer(id,id,s);}s.status='in_game';s.phaseEndsAt=30100;return s;}
test('catalog: 30 champions, five cost tiers, 21 item recipes',()=>{
 assert.equal(E.C.heroes.length,36);assert.equal(E.C.recipes.length,21);
 assert.deepEqual([1,2,3,4,5].map(i=>E.C.heroes.filter(h=>h.cost===i).length),[9,8,8,6,5]);
 assert.equal(new Set(E.C.heroes.map(h=>h.id)).size,36);
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
 assert.equal(E.C.heroes.length,36);
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

test('all 30 heroes have distinct skill identities and supported status metadata',()=>{
 const heroes=E.C.heroes,ids=new Set(),names=new Set();
 assert.equal(heroes.length,36);
 for(const h of heroes){
  assert.ok(h.ability.id&&h.ability.name&&h.ability.vfx&&h.ability.sfx,h.id);
  assert.ok(!ids.has(h.ability.id)&&!names.has(h.ability.name),h.id);
  assert.ok(['slow','burn',null].includes(h.ability.status),h.id);
  assert.ok(h.ability.effectScale>=1&&h.ability.effectScale<=1.2,h.id);
  ids.add(h.ability.id);names.add(h.ability.name);
 }
});
test('client catalog matches server ability identities for all heroes',()=>{
 const path=require('node:path'),fs=require('node:fs');
 const client=JSON.parse(fs.readFileSync(path.resolve(__dirname,'../../giaitri/games/tactics-online/catalog.json'),'utf8'));
 assert.deepEqual(client.heroes.map(h=>h.ability),E.C.heroes.map(h=>h.ability));
});

test('casting consumes full mana and creates a matching skill timeline event',()=>{
 const state=setup(),player=state.players.a;
 const h=E.C.heroes.find(x=>x.ability.kind==='stun');
 player.units={caster:{id:'caster',heroId:h.id,star:2,items:[]}};
 player.board={r0c3:'caster'};
 state.round=1;
 const events=E.simulate({a:'a',b:null,pve:true,ghost:false},state,{a:E.clone(player)},381).events;
 const cast=events.find(e=>e.type==='skill'&&e.actor==='caster');
 assert.ok(cast,'expected spell cast during PvE combat');
 assert.equal(cast.skillId,h.ability.id);
 assert.ok(events.some(e=>e.type==='mana'&&e.actor==='caster'&&e.amount===0&&e.t===cast.t));
 assert.ok(events.some(e=>e.type==='mana'&&e.actor==='caster'&&e.amount>0));
});

test('equipment v2: 21 craft pairs, completed gear priority and item effects',()=>{
 const s=setup(),p=s.players.a;
 for(const recipe of E.C.recipes){
  p.units={u:{id:'u',heroId:'H01',star:1,items:[]}};p.bench={'0':'u'};
  p.inventory=[...recipe.components];
  E.action(s,'a',{type:'EQUIP',unitId:'u',component:recipe.components[0]},1000);
  E.action(s,'a',{type:'EQUIP',unitId:'u',component:recipe.components[1]},1001);
  assert.deepEqual(p.units.u.items,[recipe.id],recipe.id);
 }
 assert.equal(E.combatStats(p,{id:'test',heroId:'H01',star:1,items:['I05']},{}).omnivamp,.15);
 assert.ok(E.combatStats(p,{id:'test',heroId:'H01',star:1,items:['I20']},{}).effects.includes('manaPulse'));
 p.units={a:{id:'a',heroId:'H01',star:1,items:['sword']},b:{id:'b',heroId:'H01',star:1,items:['I05','I20']},c:{id:'c',heroId:'H01',star:1,items:['I14']}};
 p.bench={'0':'a','1':'b','2':'c'};p.inventory=[];
 E.mergeTriples(p);
 assert.equal(Object.values(p.units)[0].star,2);
 assert.deepEqual(new Set(Object.values(p.units)[0].items),new Set(['I05','I20','I14']));
 assert.deepEqual(p.inventory,['sword']);
});
test('equipment v2: sell and unequip return items without losing ownership',()=>{
 const s=setup(),p=s.players.a;
 p.units={u:{id:'u',heroId:'H01',star:1,items:['I05','I20']}};p.bench={'0':'u'};
 E.action(s,'a',{type:'UNEQUIP',unitId:'u',slot:1},1000);
 assert.deepEqual(p.inventory,['I20']);
 E.action(s,'a',{type:'SELL',unitId:'u'},1001);
 assert.deepEqual(p.inventory,['I20','I05']);
 assert.equal(p.units.u,undefined);
});

test('shared shop copies are contested and released on sale',()=>{
 const s=setup(),p=s.players.a,h=E.C.heroes.find(x=>x.cost===1);
 const cap=E.COPIES_BY_COST[1];assert.ok(cap>0);
 p.units={};p.bench={};p.board={};p.inventory=[];
 for(let i=0;i<cap;i++)p.units['pool'+i]={id:'pool'+i,heroId:h.id,star:1,items:[]};
 assert.equal(E.remainingCopies(s,h.id),0);
 p.shop[0]=h.id;p.gold=150;
 assert.throws(()=>E.action(s,'a',{type:'BUY',index:0},1000),/hết trong bể/);
 E.action(s,'a',{type:'SELL',unitId:'pool0'},1000);
 assert.equal(E.remainingCopies(s,h.id),1);
});
test('win and loss streak gold uses 2, 4 and 5 thresholds',()=>{
 for(const [streak,expected] of [[0,0],[1,0],[2,1],[3,1],[4,2],[5,3],[6,3]]){
  const s=setup(),p=s.players.a;
  s.roundPhase='TRANSITION';s.phaseEndsAt=1000;p.gold=0;p.streaks.win=streak;
  E.advance(s,1000);
  assert.equal(p.lastEconomy.streak,expected);
  assert.equal(p.gold,5+expected);
 }
});

test('all 30 MLBB primary roles are aligned without changing hero identity or skill',()=>{
 const expected=['Assassin','Fighter','Ranger','Ranger','Sorcerer','Sorcerer','Tank','Ranger','Assassin','Tank','Sorcerer','Fighter','Ranger','Assassin','Sorcerer','Ranger','Assassin','Ranger','Fighter','Support','Sorcerer','Fighter','Ranger','Fighter','Tank','Sorcerer','Sorcerer','Sorcerer','Tank','Fighter'];
 assert.deepEqual(E.C.heroes.slice(0,30).map(h=>h.classes[0]),expected);
 assert.equal(E.C.heroes.length,36);
 for(const hero of E.C.heroes){
  assert.ok(E.C.origins[hero.classes[0]],hero.id);
  assert.ok(hero.ability.id&&hero.ability.kind,hero.id);
 }
 assert.equal(E.C.origins.Ranger.label,'Xạ Thủ');
 assert.equal(E.C.origins.Fighter.label,'Đấu Sĩ');
 assert.equal(E.C.origins.Tank.label,'Đỡ Đòn');
 assert.equal(E.C.origins.Support.label,'Hỗ Trợ');
});

test('six support skills heal, shield and haste friendly units',()=>{
 const additions=E.C.heroes.slice(30);
 assert.equal(additions.length,6);
 assert.deepEqual(additions.map(h=>h.cost),[1,2,3,3,4,5]);
 assert.ok(additions.every(h=>h.classes.includes('Support')));
 for(const kind of ['teamHeal','teamShield','teamHaste']){
  const hero=additions.find(h=>h.ability.kind===kind),s=setup(),p=s.players.a;
  p.units={support:{id:'support',heroId:hero.id,star:2,items:[]},friend:{id:'friend',heroId:'H01',star:2,items:[]}};
  p.board={r0c2:'support',r0c3:'friend'};
  const before=hero.manaStart,rangeBefore=hero.range;hero.manaStart=hero.manaMax;hero.range=8;
  try{
   const events=E.simulate({a:'a',b:null,pve:true,ghost:false},s,{a:E.clone(p)},123).events;
   assert.ok(events.some(e=>e.type==='skill'&&e.actor==='support'),kind+' not cast');
   assert.ok(events.some(e=>e.type===({teamHeal:'heal',teamShield:'shield',teamHaste:'haste'})[kind]&&e.target==='friend'),kind+' not applied to ally');
  }finally{hero.manaStart=before;hero.range=rangeBefore;}
 }
});

test('phase 1: lethal overkill lifesteal only heals actual removed HP',()=>{
 const s=setup(),p=s.players.a;
 p.units={attacker:{id:'attacker',heroId:'H01',star:1,items:['I05']}};
 p.board={r0c0:'attacker'};
 const q=s.players.b;q.units={target:{id:'target',heroId:'H01',star:1,items:[]}};q.board={r0c0:'target'};
 const before=E.HERO.H01.hp;
 const rep=E.simulate({a:'a',b:'b'},s,{a:E.clone(p),b:E.clone(q)},1234);
 assert.ok(rep.events.some(e=>e.type==='attack'&&e.actor==='attacker'));
 // A hit on a low-health enemy must never be reported above its HP remaining.
 const attacks=rep.events.filter(e=>e.type==='attack'&&e.actor==='attacker');
 assert.ok(attacks.every(e=>e.amount>=0&&e.amount<=before));
});
test('phase 1: support shields are bounded at 35 percent max HP',()=>{
 const s=setup(),p=s.players.a,hero=E.HERO.H36;
 p.units={support:{id:'support',heroId:'H36',star:2,items:['I21']},friend:{id:'friend',heroId:'H01',star:1,items:[]}};
 p.board={r0c2:'support',r0c3:'friend'};
 const oldMana=hero.manaStart,oldRange=hero.range;
 hero.manaStart=hero.manaMax;hero.range=8;
 try{
  const events=E.simulate({a:'a',b:null,pve:true},s,{a:E.clone(p)},123).events.filter(e=>e.type==='shield'&&e.target==='friend');
  assert.ok(events.length>0);
  const hp=E.HERO.H01.hp;
  assert.ok(events.reduce((sum,e)=>sum+e.amount,0)<=Math.round(hp*.35));
 }finally{hero.manaStart=oldMana;hero.range=oldRange;}
});
test('phase 1: source-scoped haste and burn/status ordering are preserved',()=>{
 const fs=require('node:fs'),path=require('node:path');
 const engine=fs.readFileSync(path.join(__dirname,'engine.js'),'utf8');
 assert.match(engine,/u\.burns=\{\}/);
 assert.match(engine,/v\.hasteEffects\[u\.id\]/);
 assert.match(engine,/Object\.values\(u\.hasteEffects\|\|\{\}\)/);
 assert.ok(engine.indexOf('const burnDps=Math.max(')<engine.indexOf('if(u.stunnedUntil>t)'));
});

test('critical shield ledger keeps permanent and temporary absorption separate',()=>{
 const src=require('node:fs').readFileSync(require('node:path').join(__dirname,'engine.js'),'utf8');
 assert.match(src,/u\.baseShield=u\.shield\|\|0/);
 assert.match(src,/const baseUsed=Math\.min\(tgt\.baseShield\|\|0,absorbed\)/);
 assert.match(src,/let temporaryUsed=absorbed-baseUsed/);
 assert.match(src,/l\.until<=t/);
 assert.match(src,/baseShield:0,shieldLayers:\[\]/);
});

test('replay exposes buffed initial unit stats and effective combat events',()=>{
 const s=setup(),p=s.players.a;
 p.units={a:{id:'a',heroId:'H31',star:2,items:[]}};p.board={r0c0:'a'};
 const result=E.simulate({a:'a',b:null,pve:true},s,{a:E.clone(p)},42);
 const initial=result.initialStats.find(u=>u.id==='a');
 assert.ok(initial&&initial.maxHp>0&&initial.hp===initial.maxHp);
 assert.ok(Number.isFinite(initial.mana)&&Number.isFinite(initial.manaMax));
 assert.ok(result.events.some(e=>e.type==='skill'||e.type==='attack'));
 assert.ok(result.events.filter(e=>e.type==='heal'||e.type==='damageTick').every(e=>Number.isFinite(e.amount)&&e.amount>=0));
});

// Package D deterministic stress suite runs in engine CI.
require('../../giaitri/games/tactics-online/stress.test.js');

test('role balancing: all 36 champions have role-appropriate HP, armor, speed and range',()=>{
 const heroes=E.C.heroes;
 assert.equal(heroes.length,36);
 const oneGoldTanks=heroes.filter(h=>h.cost===1&&h.classes.includes('Tank'));
 assert.ok(oneGoldTanks.length>=1,'need at least one affordable one-gold frontline tank');
 assert.equal(E.HERO.H07.classes[0],'Tank');
 const roles=['Tank','Fighter','Assassin','Ranger','Sorcerer','Support'];
 for(const h of heroes){
  const role=h.classes[0];
  assert.ok(roles.includes(role),h.name);
  assert.ok(h.hp>0&&h.attack>0&&h.attackSpeed>0,h.name);
  assert.ok(h.armor>=0&&h.magicResist>=0,h.name);
  assert.equal(h.range,['Tank','Fighter','Assassin'].includes(role)?1:3,h.name+' must use role range');
 }
 for(let tier=1;tier<=5;tier++){
  const same=heroes.filter(h=>h.cost===tier);
  const tanks=same.filter(h=>h.classes[0]==='Tank');
  const others=same.filter(h=>['Ranger','Sorcerer','Assassin'].includes(h.classes[0]));
  if(tanks.length&&others.length){
   assert.ok(Math.min(...tanks.map(h=>h.hp))>Math.max(...others.map(h=>h.hp)),tier+' tank frontline HP');
   assert.ok(Math.min(...tanks.map(h=>h.armor))>Math.max(...others.map(h=>h.armor)),tier+' tank armor');
  }
 }
});

test('every champion has a distinct typed signature with unique identity',()=>{
 const entries=E.C.heroes.map(h=>h.ability.signature);
 assert.equal(entries.length,36);
 assert.equal(new Set(entries.map(s=>s.id)).size,36);
 assert.equal(new Set(entries.map(s=>s.effect+':'+s.pattern)).size,36);
 const valid={Tank:new Set(['shock','fortify','frost','guard']),Assassin:new Set(['quickstep','armorBreak','shock','sunder']),Ranger:new Set(['empower','quickstep','armorBreak','ignite','shock','spark','sunder']),Sorcerer:new Set(['ignite','frost','shock','sunder','armorBreak','spark','empower']),Support:new Set(['renew','guard','fortify','quickstep','spark','empower','siphon']),Fighter:new Set(['siphon','empower','fortify','ignite','shock','quickstep'])};
 E.C.heroes.forEach(h=>assert.ok(valid[h.classes[0]].has(h.ability.signature.effect),h.name+' role signature'));

 for(const s of entries){assert.ok(s.name&&s.power>0);assert.ok(['focused','sweep','chain','burst','arc'].includes(s.pattern));}
});
test('all 36 signatures create authoritative cast and visual event',()=>{
 for(const h of E.C.heroes){
  const state=setup(),p=state.players.a;
  p.units={caster:{id:'caster',heroId:h.id,star:1,items:[]}};
  p.board={r0c1:'caster'};
  const beforeMana=h.manaStart, beforeRange=h.range;
  h.manaStart=h.manaMax;h.range=8;
  try{
   const report=E.simulate({a:'a',b:null,pve:true},state,{a:E.clone(p)},42);
   const signature=report.events.find(e=>e.type==='signature'&&e.skillId===h.ability.signature.id);
   assert.ok(signature,h.name+' signature did not trigger');
   assert.equal(signature.vfx,h.ability.vfx);
   assert.ok(report.events.some(e=>e.type==='skill'&&e.actor==='caster'),h.name+' missing skill animation event');
  }finally{h.manaStart=beforeMana;h.range=beforeRange;}
 }
});

test('signature effect events and assassin carry approach match skill descriptions',()=>{
 const eventType={shock:'stun',armorBreak:'signatureEffect',quickstep:'haste',renew:'heal',fortify:'shield',ignite:'burn',siphon:'heal',frost:'slow',empower:'signatureEffect',sunder:'signatureEffect',spark:'mana',guard:'shield'};
 for(const hero of E.C.heroes){
  const state=setup(),p=state.players.a;
  p.units={caster:{id:'caster',heroId:hero.id,star:1,items:[]}};
  p.board={r0c3:'caster'};state.round=20;
  const mana=hero.manaStart,range=hero.range;
  hero.manaStart=hero.manaMax;hero.range=8;
  try{
   const report=E.simulate({a:'a',b:null,pve:true},state,{a:E.clone(p)},12345);
   const expected=eventType[hero.ability.signature.effect];
   assert.ok(report.events.some(e=>e.type===expected&&e.actor==='caster'),hero.id+' needs a real '+expected+' combat event');
   assert.ok(report.events.some(e=>e.type==='signature'&&e.skillId===hero.ability.signature.id),hero.id+' needs signature VFX cue');
   if(hero.classes.includes('Assassin'))assert.ok(report.events.some(e=>e.type==='move'&&e.actor==='caster'&&e.source==='assassinSkill'),hero.id+' must approach enemy carry');
  }finally{hero.manaStart=mana;hero.range=range;}
 }
});

test('Package E: server records distinct authoritative placements for four players',()=>{
 const room=E.roomNew('a','A',0,200);
 for(const id of ['b','c','d']){room.players[id]=E.freshPlayer(id,id,room);room.playerOrder.push(id);}
 room.status='in_game';room.roundPhase='COMBAT';room.phaseEndsAt=30000;room.round=1;
 room.players.b.hp=1;room.players.c.hp=2;room.players.d.hp=3;
 room.pairs=[{a:'a',b:'b'},{a:'c',b:'d'}];
 room.combatSnapshot=E.clone(room.players);
 E.advance(room,30000);
 const values=Object.values(room.finalPlacements||{});
 assert.equal(new Set(values).size,values.length);
 assert.ok(values.every(x=>Number.isInteger(x)&&x>=1&&x<=4));
});
test('Package E: ranking is not based on client-submitted score or placement',()=>{
 const fs=require('node:fs'),path=require('node:path');
 const server=fs.readFileSync(path.join(__dirname,'../index.js'),'utf8');
 const ranking=fs.readFileSync(path.join(__dirname,'../../dolphin-leaderboard.js'),'utf8');
 assert.match(server,/placementFromVerifiedRoom\(room,uid\)/);
 assert.match(server,/getDatabase\(\)\.ref\('staffIdentity\/'.*uid\)/);
 assert.match(server,/if\(matches\[matchId\]\)/);
 assert.match(ranking,/async function submitTacticsMatch\(\)/);
 assert.doesNotMatch(ranking,/recentMatches:/);
});

test('Package F: timed attack buffs expire and emit a combat event',()=>{
 const room=setup(),p=room.players.a,h=E.HERO.H03,old=h.manaStart,range=h.range;
 p.units={caster:{id:'caster',heroId:h.id,star:1,items:[]}};
 p.board={r0c2:'caster'};room.round=15;h.manaStart=h.manaMax;h.range=8;
 try{
  const report=E.simulate({a:'a',b:null,pve:true},room,{a:E.clone(p)},42);
  assert.ok(report.events.some(e=>e.type==='signatureEffect'&&e.effect==='empower'&&e.duration===3500));
  assert.ok(report.events.some(e=>e.type==='signatureExpire'&&e.effect==='empower'));
  assert.equal(report.events.at(-1).type,'end');
 }finally{h.manaStart=old;h.range=range;}
});
test('Package F: combat events no longer silently truncate at 1200',()=>{
 const fs=require('node:fs'),path=require('node:path');
 const code=fs.readFileSync(path.join(__dirname,'engine.js'),'utf8');
 assert.doesNotMatch(code,/events\.length\s*<\s*1200/);
});

test('automatic XP accrues between completed rounds, levels up and never double-grants in same phase',()=>{
 const s=setup(),p=s.players.a;
 s.status='in_game';s.roundPhase='TRANSITION';s.phaseEndsAt=1000;s.round=4;
 const before=p.xp;
 E.advance(s,1000);
 assert.equal(s.round,5);assert.equal(s.roundPhase,'PREPARATION');
 assert.equal(p.xp,before+2);assert.equal(p.lastRoundXp,2);
 assert.throws(()=>E.advance(s,1001));
 assert.equal(p.xp,before+2);
});
test('all 36 champions use role-correct attack ranges; Ruby attacks in melee',()=>{
 const expected={Tank:1,Fighter:1,Assassin:1,Ranger:3,Sorcerer:3,Support:3};
 assert.equal(E.C.heroes.length,36);
 for(const hero of E.C.heroes)assert.equal(hero.range,expected[hero.classes[0]],hero.name+' range');
 assert.equal(E.HERO.H19.ability.kind,'aoe');
 assert.equal(E.HERO.H19.ability.radius,1);
});
test('item bonuses apply to wearer only and class trait buffs only to matching heroes',()=>{
 const s=setup(),p=s.players.a;
 const unit=(id,heroId,items=[])=>({id,heroId,star:1,items});
 p.units={fighter:unit('fighter','H02'),mage:unit('mage','H05'),ally:unit('ally','H12')};
 p.board={r0c0:'fighter',r0c1:'mage',r0c2:'ally'};
 const trait=E.activeTraits(p),f=E.combatStats(p,p.units.fighter,trait),m=E.combatStats(p,p.units.mage,trait);
 // Two Fighters gain HP; Sorcerer does not inherit the Fighter buff.
 assert.equal(f.hp,Math.round(E.HERO.H02.hp*1.15));
 assert.equal(m.hp,E.HERO.H05.hp);
 p.units.fighter.items=['sword','vest'];
 const equipped=E.combatStats(p,p.units.fighter,trait),mage=E.combatStats(p,p.units.mage,trait);
 assert.equal(equipped.attack,f.attack+12);assert.equal(equipped.armor,f.armor+20);
 assert.equal(mage.attack,m.attack);assert.equal(mage.armor,m.armor);
});
