/* Dolphin Tactics 3D deterministic engine. CommonJS in Functions, injectable in browser. */
(function(root){
'use strict';
function createEngine(C){
 const HERO=Object.fromEntries(C.heroes.map(h=>[h.id,h]));
 const COMP=Object.fromEntries(C.components.map(x=>[x.id,x]));
 const RECIPE=Object.fromEntries(C.recipes.map(x=>[x.key,x]));
 const TRAITS=C.origins, PHASES=C.phases;
 const LEVEL_XP={3:6,4:10,5:20,6:36,7:48,8:76};
 const maxLevel=9,slotsForLevel=level=>Math.min(9,Math.max(1,level));
 function clone(x){return JSON.parse(JSON.stringify(x));}
 function assert(ok,msg){if(!ok)throw Error(msg);}
 function nextRand(s){s.randomState=(Math.imul(s.randomState||1,1664525)+1013904223)>>>0;return s.randomState/4294967296;}
 function shuffle(s,a){a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(nextRand(s)*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
 function shopRoll(s,level){const pool=C.heroes.filter(h=>h.cost<=Math.min(5,Math.max(1,Math.ceil(level/2)+1)));return Array.from({length:5},()=>pool[Math.floor(nextRand(s)*pool.length)].id);}
 function freshPlayer(uid,name,room){return {uid,displayName:String(name||"Người chơi").slice(0,32),hp:100,gold:10,level:3,xp:0,board:{},bench:{},units:{},shop:shopRoll(room,3),inventory:[],streaks:{win:0,loss:0},ready:false,eliminated:false};}
 function roomNew(uid,name,now,seed){
  const s={status:"waiting",round:1,roundPhase:"PREPARATION",phaseStartedAt:0,phaseEndsAt:0,
   hostId:uid,players:{},playerOrder:[uid],seed,randomState:seed,sequence:0,pairs:[],combatSnapshot:null,reports:[],winnerId:null,createdAt:now,updatedAt:now};
  s.players[uid]=freshPlayer(uid,name,s);return s;
 }
 const boardKey=(r,c)=>'r'+r+'c'+c;
 const legalBoard=k=>/^r[0-3]c[0-7]$/.test(k);
 const legalBench=k=>/^[0-7]$/.test(String(k));
 function findPosition(p,id){for(let k in p.board)if(p.board[k]===id)return {kind:"board",key:k};for(let k in p.bench)if(p.bench[k]===id)return {kind:"bench",key:k};return null;}
 function firstBench(p){for(let i=0;i<8;i++)if(!p.bench[String(i)])return String(i);return null;}
 function mergeTriples(p){
  let done=true;
  while(done){done=false;
   for(const unit of Object.values(p.units)){
    const same=Object.values(p.units).filter(x=>x.heroId===unit.heroId&&x.star===unit.star);
    if(same.length<3||unit.star===3)continue;
    const chosen=same.slice(0,3).sort((a,b)=>(findPosition(p,a.id)?.kind==="board"?-1:0)-(findPosition(p,b.id)?.kind==="board"?-1:0));
    const survivor=chosen[0],combined=chosen.flatMap(x=>x.items||[]);survivor.star++;
    survivor.items=combined.slice(0,3);p.inventory.push(...combined.slice(3));
    chosen.slice(1).forEach(x=>{const pos=findPosition(p,x.id);if(pos)delete p[pos.kind][pos.key];delete p.units[x.id];});
    done=true;break;
   }
  }
 }
 function traitCounts(p){const counts={};const unique=new Set();
  for(const id of Object.values(p.board)){const u=p.units[id];if(!u||unique.has(u.heroId))continue;unique.add(u.heroId);
   const h=HERO[u.heroId];if(!h)continue;for(const key of [...h.origins,...h.classes])counts[key]=(counts[key]||0)+1;}
  return counts;
 }
 function activeTraits(p){const counts=traitCounts(p),active={};
  Object.keys(counts).forEach(k=>{const def=TRAITS[k];if(!def)return;const levels=Object.keys(def.thresholds).map(Number).filter(t=>counts[k]>=t);if(levels.length){const tier=Math.max(...levels);active[k]={count:counts[k],tier,buff:def.thresholds[tier]};}});
  return active;
 }
 function itemStats(items){const result={};for(const id of items||[]){let x=COMP[id]||C.recipes.find(z=>z.id===id);if(!x)continue;
  const parts=x.bonus||{[x.stat]:x.value};for(const k in parts)result[k]=(result[k]||0)+parts[k];}
  return result;
 }
 function combatStats(p,u,traits){
  const h=HERO[u.heroId],factor=Math.pow(1.8,u.star-1),items=itemStats(u.items);
  const b={};Object.values(traits).forEach(t=>{for(const k in t.buff)b[k]=(b[k]||0)+t.buff[k];});
  const hp=Math.round((h.hp+ (items.hp||0))*factor*(1+(b.hpRatio||0)));
  const effects=(u.items||[]).map(id=>C.recipes.find(i=>i.id===id)?.effect).filter(Boolean);
  return {hp,maxHp:hp,attack:Math.round(h.attack*factor+(items.attack||0)),armor:h.armor+(items.armor||0)+(b.armor||0),
   magicResist:h.magicResist+(items.magicResist||0),attackSpeed:h.attackSpeed,range:h.range,
   mana:h.manaStart+(items.mana||0),manaMax:h.manaMax,ability:h.ability,assassinJump:!!(traits.Assassin&&h.classes.includes('Assassin')),
   abilityPower:(items.abilityPower||0)+(b.abilityPower||0),effects,shield:0,regen:b.regen||0,bonusMana:b.bonusMana||0,
   trueDamageRatio:b.trueDamageRatio||0,omnivamp:b.omnivamp||0,critChance:(b.critChance||0)+(effects.includes('crit')?.25:0),critDamage:(b.critDamage||0)+(effects.includes('crit')?.4:0),
   stackAttackSpeed:b.stackAttackSpeed||0,doubleHitChance:b.doubleHitChance||0,
   cloneRatio:b.cloneRatio||0,adjacentShield:b.adjacentShield||0};
 }
 function action(s,uid,a,now){
  assert(s.status==="in_game"&&s.roundPhase==="PREPARATION"&&now<=s.phaseEndsAt,"Chỉ thao tác trong thời gian chuẩn bị");
  const p=s.players[uid];assert(p&&!p.eliminated,"Người chơi không hợp lệ");
  assert(a&&typeof a.type==="string","Thiếu thao tác");assert(!p.ready,"Đã sẵn sàng");
  if(a.type==="BUY"){const i=a.index;assert(Number.isInteger(i)&&i>=0&&i<5,"Ô shop sai");
    const id=p.shop[i],h=HERO[id],slot=firstBench(p);assert(h&&slot!==null&&p.gold>=h.cost,"Không đủ vàng hoặc bench đầy");
    p.gold-=h.cost;const unitId='u'+(++s.sequence);p.units[unitId]={id:unitId,heroId:id,star:1,items:[]};p.bench[slot]=unitId;p.shop[i]="";mergeTriples(p);
  }else if(a.type==="ROLL"){assert(p.gold>=2,"Không đủ 2 vàng");p.gold-=2;p.shop=shopRoll(s,p.level);
  }else if(a.type==="BUY_XP"){assert(p.gold>=4&&p.level<maxLevel,"Không đủ vàng hoặc đã đạt cấp tối đa");
    p.gold-=4;p.xp+=4;while(p.level<maxLevel&&p.xp>=(LEVEL_XP[p.level]||999)){p.xp-=LEVEL_XP[p.level];p.level++;}
  }else if(a.type==="MOVE"){assert(typeof a.unitId==="string"&&p.units[a.unitId],"Tướng không có");
    const dest=a.to,key=String(a.index);
    assert(dest==="board"?legalBoard(key):dest==="bench"&&legalBench(key),"Ô không hợp lệ");
    const where=findPosition(p,a.unitId);assert(where,"Không tìm thấy tướng");
    const map=dest==="board"?p.board:p.bench,old=p[where.kind],other=map[key];
    if(dest==="board"&&where.kind!=="board"&&!other)assert(Object.keys(p.board).length<slotsForLevel(p.level),"Vượt số tướng trên sân");
    if(other&&other!==a.unitId)old[where.key]=other;else delete old[where.key];
    map[key]=a.unitId;
  }else if(a.type==="SELL"){const u=p.units[a.unitId];assert(u,"Không tìm thấy tướng");
    const pos=findPosition(p,u.id);if(pos)delete p[pos.kind][pos.key];p.gold+=HERO[u.heroId].cost*(u.star===1?1:u.star===2?3:9);
    p.inventory.push(...u.items);delete p.units[u.id];
  }else if(a.type==="EQUIP"){const u=p.units[a.unitId],comp=a.component;assert(u&&COMP[comp],"Tướng hoặc trang bị không hợp lệ");
    const idx=p.inventory.indexOf(comp);assert(idx!==-1,"Không sở hữu trang bị");
    const other=u.items.findIndex(x=>!!COMP[x]&&!!RECIPE[[x,comp].sort().join("+")]);
    if(other!==-1){const recipe=RECIPE[[u.items[other],comp].sort().join("+")];u.items.splice(other,1,recipe.id);}
    else{assert(u.items.length<3,"Đã đủ 3 ô đồ");u.items.push(comp);}
    p.inventory.splice(idx,1);
  }else if(a.type==="UNEQUIP"){
    const u=p.units[a.unitId];assert(u,"Tướng không tồn tại");
    const idx=a.slot;assert(Number.isInteger(idx)&&idx>=0&&idx<u.items.length,"Ô trang bị không hợp lệ");
    p.inventory.push(u.items.splice(idx,1)[0]);
  }else if(a.type==="READY"){p.ready=true;
  }else throw Error("Thao tác không được hỗ trợ");
  s.updatedAt=now;return s;
 }
 function pairings(s){let alive=shuffle(s,s.playerOrder.filter(uid=>!s.players[uid].eliminated));
  if(s.round<=3||s.round%5===0)return alive.map(uid=>({a:uid,b:null,ghost:false,pve:true}));
  const out=[];while(alive.length>1)out.push({a:alive.shift(),b:alive.shift(),ghost:false,pve:false});
  if(alive.length){const ghosts=s.playerOrder.filter(uid=>s.players[uid].eliminated);out.push({a:alive[0],b:ghosts.length?ghosts[Math.floor(nextRand(s)*ghosts.length)]:null,ghost:true,pve:!ghosts.length});}
  return out;
 }
 function makeTeam(p,side){
  const traits=activeTraits(p);
  return Object.entries(p.board).filter(([k,id])=>legalBoard(k)&&p.units[id]).map(([k,id])=>{
   const u=p.units[id],m=k.match(/^r(\d)c(\d)$/),row=Number(m[1]),col=Number(m[2]);
   return {...combatStats(p,u,traits),id:u.id,heroId:u.heroId,owner:side,x:col,y:side===0?4+row:3-row,
    star:u.star,alive:true,shadowUsed:false,attacks:0,nextAttack:0,nextMove:0,fsm:"Idle"};});
 }
 const dist=(a,b)=>Math.abs(a.x-b.x)+Math.abs(a.y-b.y);
 const posKey=(x,y)=>x+":"+y;
 function findStep(u,target,units){
  const blocked=new Set(units.filter(v=>v.alive&&v!==u).map(v=>posKey(v.x,v.y)));
  const visited=new Set([posKey(u.x,u.y)]),queue=[[u.x,u.y,null]],directions=[[1,0],[-1,0],[0,1],[0,-1]];
  let best=null;
  while(queue.length){const [x,y,first]=queue.shift();const d=Math.abs(x-target.x)+Math.abs(y-target.y);
   if(d<=u.range)return first;
   for(const [dx,dy] of directions){const nx=x+dx,ny=y+dy,k=posKey(nx,ny);
    if(nx<0||nx>=8||ny<0||ny>=8||visited.has(k)||blocked.has(k))continue;
    visited.add(k);const step=first||{x:nx,y:ny};queue.push([nx,ny,step]);}
  }return best;
 }
 function simulate(pair,room,players,seed){
  let state=(seed^(room.round*2654435761))>>>0;
  function rnd(){state=(Math.imul(state||1,1664525)+1013904223)>>>0;return state/4294967296;}
  const a=players[pair.a],b=pair.b?players[pair.b]:null;
  const units=makeTeam(a,0);
  if(b)units.push(...makeTeam(b,1));else{
   const monsterCount=Math.min(5,2+Math.floor(room.round/5));
   for(let i=0;i<monsterCount;i++){const h=HERO["H07"],hp=210+room.round*30;
    units.push({id:"mob"+i,heroId:"H07",owner:1,x:(i*2+1)%8,y:1+Math.floor(i/4),star:1,
    hp,maxHp:hp,attack:28+room.round*3,armor:10,magicResist:10,attackSpeed:.7,range:1,mana:0,manaMax:999,
    ability:{kind:"strike",power:0,radius:1},abilityPower:0,shield:0,regen:0,bonusMana:0,
    trueDamageRatio:0,omnivamp:0,critChance:0,critDamage:0,stackAttackSpeed:0,doubleHitChance:0,
    cloneRatio:0,adjacentShield:0,alive:true,shadowUsed:false,attacks:0,nextAttack:0,nextMove:0,fsm:"Idle"});}
  }
  // Assassin backline jump happens before auto-combat; avoid occupied cells.
  for(const u of units){if(!u.assassinJump)continue;
   const backY=u.owner===0?0:7;
   for(const x of [u.x,(u.x+1)%8,(u.x+7)%8]){
    if(!units.some(v=>v!==u&&v.x===x&&v.y===backY)) {u.x=x;u.y=backY;break;}
   }
  }
  for(const u of units){if(u.adjacentShield){for(const v of units){if(v.owner===u.owner&&dist(u,v)<=1)v.shield+=u.adjacentShield;}}}
  const events=[],emit=e=>{if(events.length<1200)events.push(e);};
  function deal(src,tgt,amount,t,spell){
   if(!tgt.alive)return;let dealt=Math.max(1,Math.round(amount));const absorbed=Math.min(tgt.shield,dealt);tgt.shield-=absorbed;dealt-=absorbed;
   tgt.hp=Math.max(0,tgt.hp-dealt);src.hp=Math.min(src.maxHp,src.hp+dealt*src.omnivamp);
   if(src.effects&&src.effects.includes('burn')){tgt.burnUntil=t+3000;tgt.burnDps=Math.max(8,tgt.maxHp*.015);}
   tgt.mana=Math.min(tgt.manaMax,tgt.mana+10+tgt.bonusMana);emit({t,actor:src.id,target:tgt.id,type:spell?"cast":"attack",amount:dealt});
   if(tgt.hp<=0){tgt.alive=false;tgt.fsm="Dead";emit({t,actor:tgt.id,type:"die"});}
  }
  for(let t=0;t<40000;t+=200){
   const living=units.filter(x=>x.alive);if(!living.some(x=>x.owner===0)||!living.some(x=>x.owner===1))break;
   for(const u of living){if(!u.alive)continue;
    if(u.regen)u.hp=Math.min(u.maxHp,u.hp+u.regen*.2);
   if(u.effects&&u.effects.includes('manaRegen'))u.mana=Math.min(u.manaMax,u.mana+1);
   if(u.burnUntil>t&&u.burnDps){u.hp=Math.max(0,u.hp-u.burnDps*.2);if(!u.hp){u.alive=false;emit({t,actor:u.id,type:'die'});continue;}}
    if(u.cloneRatio&&!u.shadowUsed&&u.hp<u.maxHp*.5&&units.length<32){u.shadowUsed=true;const positions=[[1,0],[-1,0],[0,1],[0,-1]];
      const free=positions.map(([dx,dy])=>({x:u.x+dx,y:u.y+dy})).find(p=>p.x>=0&&p.x<8&&p.y>=0&&p.y<8&&!units.some(v=>v.alive&&v.x===p.x&&v.y===p.y));
      if(free){const cloneUnit={...u,id:u.id+"_shadow",...free,maxHp:u.maxHp*u.cloneRatio,hp:u.maxHp*u.cloneRatio,attack:u.attack*u.cloneRatio,cloneRatio:0,shadowUsed:true,shield:0};units.push(cloneUnit);emit({t,actor:cloneUnit.id,type:"shield"});}
    }
    const foes=units.filter(v=>v.alive&&v.owner!==u.owner);if(!foes.length)break;
    foes.sort((x,y)=>dist(u,x)-dist(u,y)||x.id.localeCompare(y.id));const target=foes[0];
    u.fsm="Targeting";
    if(dist(u,target)>u.range){u.fsm="Moving";if(t>=u.nextMove){let step=findStep(u,target,units);if(step){u.x=step.x;u.y=step.y;u.nextMove=t+550;emit({t,actor:u.id,type:"move",x:u.x,y:u.y});}}continue;}
    if(t<u.nextAttack)continue;
    if(u.mana>=u.manaMax){u.fsm="Casting Spell";u.mana=0;
      if(u.effects&&u.effects.includes('apGrowth'))u.abilityPower=Math.min(250,u.abilityPower+8);
      if(u.ability.kind==="heal"){u.hp=Math.min(u.maxHp,u.hp+u.ability.power*(1+u.abilityPower/100));emit({t,actor:u.id,type:"heal",amount:u.ability.power});}
      else if(u.ability.kind==="shield"){u.shield+=u.ability.power*(1+u.abilityPower/100);emit({t,actor:u.id,type:"shield",amount:u.ability.power});}
      else {const multi=u.ability.kind==="aoe";const targets=multi?foes.filter(v=>dist(target,v)<=u.ability.radius):[target];
       for(const v of targets){const power=u.ability.power*(1+u.abilityPower/100);deal(u,v,power*100/(100+Math.max(-50,v.magicResist)),t,true);}}
    }else{u.fsm="Attacking";const crit=rnd()<u.critChance?1.5+u.critDamage:1;
      const effectiveArmor=Math.max(-50,target.armor);const physical=u.attack*crit*100/(100+effectiveArmor);
      deal(u,target,physical*(1-u.trueDamageRatio)+u.attack*u.trueDamageRatio,t,false);
      if(target.alive&&rnd()<u.doubleHitChance)deal(u,target,physical*.8,t,false);
      u.mana=Math.min(u.manaMax,u.mana+10+u.bonusMana);u.attacks++;
    }
    const speed=Math.min(3,u.attackSpeed+Math.min(.9,u.attacks*u.stackAttackSpeed));
    u.nextAttack=t+1000/speed;
   }
  }
  const left=units.filter(x=>x.alive&&x.owner===0),right=units.filter(x=>x.alive&&x.owner===1);
  const leftPower=left.reduce((v,x)=>v+x.hp,0),rightPower=right.reduce((v,x)=>v+x.hp,0);
  const winLeft=left.length&&!right.length?true:!left.length&&right.length?false:leftPower>=rightPower;
  const tie=(!left.length&&!right.length)||!!(left.length&&right.length&&Math.abs(leftPower-rightPower)<.01);
  const winner=tie?null:(winLeft?pair.a:(pair.pve||pair.ghost?null:pair.b));
  const surviving=tie?[]:(winLeft?left:right);
  const damage=tie?0:2+Math.floor(room.round/3)+surviving.reduce((v,x)=>v+(x.star||1),0);
  emit({t:40000,actor:"system",type:"end",amount:damage});
  return {pair,winner,loser:tie?null:pair.pve||pair.ghost?(winLeft?null:pair.a):(winLeft?pair.b:pair.a),damage,events};
 }
 function finalize(s,now){
  assert(s.roundPhase==="COMBAT","Chưa ở phase chiến đấu");
  const snap=s.combatSnapshot||clone(s.players);
  const reports=s.pairs.map((pair,i)=>simulate(pair,s,snap,(s.seed+i*977+s.round*1033)>>>0));
  for(const rep of reports){
   // PvE rewards drop only after actually winning the PvE encounter.
   if(rep.pair.pve&&rep.winner===rep.pair.a&&s.players[rep.pair.a]){
    const item=C.components[Math.floor(nextRand(s)*C.components.length)];s.players[rep.pair.a].inventory.push(item.id);
   }
   if(rep.loser&&s.players[rep.loser]&&!s.players[rep.loser].eliminated){
    const p=s.players[rep.loser];p.hp=Math.max(0,p.hp-rep.damage);p.streaks.loss++;p.streaks.win=0;if(!p.hp)p.eliminated=true;}
   if(rep.winner&&s.players[rep.winner]&&!s.players[rep.winner].eliminated){const p=s.players[rep.winner];p.streaks.win++;p.streaks.loss=0;}
  }
  s.reports=reports;
  const alive=s.playerOrder.filter(uid=>!s.players[uid].eliminated);
  if(alive.length<=1){s.status="finished";s.winnerId=alive[0]||null;s.roundPhase="TRANSITION";s.phaseEndsAt=now;return s;}
  s.roundPhase="TRANSITION";s.phaseStartedAt=now;s.phaseEndsAt=now+PHASES.TRANSITION;s.combatSnapshot=null;return s;
 }
 function advance(s,now){
  assert(s.status==="in_game","Phòng chưa bắt đầu");
  const allReady=s.roundPhase==="PREPARATION"&&s.playerOrder.filter(u=>!s.players[u].eliminated).every(u=>s.players[u].ready);
  assert(now>=s.phaseEndsAt||allReady,"Chưa hết thời gian phase");
  if(s.roundPhase==="PREPARATION"){s.roundPhase="COMBAT";s.phaseStartedAt=now;s.phaseEndsAt=now+PHASES.COMBAT;s.combatSnapshot=clone(s.players);
    s.pairs=pairings(s);s.reports=[];
  }else if(s.roundPhase==="COMBAT")finalize(s,now);
  else if(s.roundPhase==="TRANSITION"){s.round++;s.roundPhase="PREPARATION";s.phaseStartedAt=now;s.phaseEndsAt=now+PHASES.PREPARATION;
    for(const uid of s.playerOrder){const p=s.players[uid];if(p.eliminated)continue;
      p.gold=Math.min(80,p.gold+5+Math.min(5,Math.floor(p.gold/10)));p.ready=false;p.shop=shopRoll(s,p.level);

    }}
  s.updatedAt=now;return s;
 }
 return {C,HERO,COMP,RECIPE,PHASES,clone,assert,nextRand,shopRoll,freshPlayer,roomNew,boardKey,
 legalBoard,legalBench,findPosition,firstBench,mergeTriples,traitCounts,activeTraits,itemStats,combatStats,
 action,LEVEL_XP,maxLevel,slotsForLevel,pairings,findStep,simulate,finalize,advance};
}
if(typeof module!=="undefined"&&module.exports)module.exports=createEngine(require("./catalog.json"));
else root.DolphinTacticsCreateEngine=createEngine;
})(typeof window!=="undefined"?window:typeof globalThis!=="undefined"?globalThis:this);
