/* Dolphin Tactics Phase 3: expert deterministic offline opponents.
 * Pure tactical policy; all purchases/equipment use validated engine actions.
 * No Firestore access, timers or AI service required.
 */
(function(root){
'use strict';
function createAI(E){
 const H=E.HERO,traits=E.C.origins;
 const uniq=arr=>[...new Set(arr)];
 const starValue=u=>Math.pow(1.8,u.star-1);
 function value(u){
  const h=H[u.heroId];
  return (h.hp*.065+h.attack*1.9+h.cost*12)*starValue(u)+(u.items||[]).length*17;
 }
 function countsFor(units){
  const c={},seen=new Set();
  for(const u of units){if(seen.has(u.heroId))continue;seen.add(u.heroId);const h=H[u.heroId];
   for(const key of uniq([...h.origins,...h.classes]))c[key]=(c[key]||0)+1;}
  return c;
 }
 function teamScore(p,units){
  const counts=countsFor(units);
  let score=units.reduce((v,u)=>v+value(u),0);
  for(const [trait,n] of Object.entries(counts)){
   const steps=Object.keys(traits[trait]?.thresholds||{}).map(Number).sort((a,b)=>a-b);
   const active=steps.filter(k=>n>=k).pop()||0;
   if(active)score+=30+active*22;
   const next=steps.find(k=>k>n);
   if(next&&next-n===1)score+=16;
  }
  return score;
 }
 function bestLineup(p){
  const all=Object.values(p.units),capacity=Math.min(p.level,9,all.length);
  if(!capacity)return [];
  const pool=all.sort((a,b)=>value(b)-value(a)).slice(0,Math.min(13,all.length));
  let best=[],max=-Infinity;
  const chosen=[];
  function search(i){
   if(chosen.length===capacity){const n=teamScore(p,chosen);if(n>max){best=chosen.slice();max=n;}return;}
   if(i>=pool.length||chosen.length+pool.length-i<capacity)return;
   chosen.push(pool[i]);search(i+1);chosen.pop();search(i+1);
  }
  search(0);return best;
 }
 function opponentThreat(s,uid){
  const opponents=Object.entries(s.players).filter(([id,p])=>id!==uid&&!p.eliminated);
  if(!opponents.length)return {frontSide:0,carryColumn:3,contest:{}};
  const contest={},columns=new Array(8).fill(0);
  for(const [id,p] of opponents){
   for(const u of Object.values(p.units)){contest[u.heroId]=(contest[u.heroId]||0)+1;}
   for(const [key,u] of Object.entries(p.board)){
    const col=Number((key.match(/c(\d)/)||[])[1]);if(Number.isInteger(col))columns[col]++;}
  }
  const carryColumn=columns.indexOf(Math.max(...columns));
  return {carryColumn,contest};
 }
 function planBoard(p,threat){
  const chosen=bestLineup(p),front=[],rear=[];
  for(const u of chosen)(H[u.heroId].range<=1?front:rear).push(u);
  front.sort((a,b)=>H[b.heroId].hp*starValue(b)-H[a.heroId].hp*starValue(a));
  rear.sort((a,b)=>value(b)-value(a));
  const shift=threat.carryColumn>=4?[4,3,5,2,6,1,7,0]:[3,4,2,5,1,6,0,7];
  const board={},bench={};
  front.forEach((u,i)=>{const row=i<8?0:1;board['r'+row+'c'+shift[i%8]]=u.id;});
  rear.forEach((u,i)=>{board['r3c'+shift[i%8]]=u.id;});
  let k=0;const active=new Set(chosen.map(u=>u.id));
  for(const u of Object.values(p.units))if(!active.has(u.id)&&k<8)bench[String(k++)]=u.id;
  p.board=board;p.bench=bench;
 }
 function draftScore(p,h,threat){
  const all=Object.values(p.units),same=all.filter(x=>x.heroId===h.id);
  const pairs=same.filter(u=>u.star===1).length;
  const twoStars=same.filter(u=>u.star===2).length;
  const team=bestLineup(p),now=teamScore(p,team);
  const fake={id:'candidate',heroId:h.id,star:1,items:[]};
  let delta=team.length<p.level?teamScore(p,team.concat(fake))-now:
    Math.max(0,...team.map((u,i)=>teamScore(p,team.filter((_,j)=>j!==i).concat(fake))-now));
  const contested=threat.contest[h.id]||0;
  // Find merge pairs, including progress toward 3 stars, without buying contested junk.
  return h.hp*.04+h.attack*.5+h.cost*7+delta*.55+
   (pairs===2?280:pairs===1?95:0)+(twoStars===2&&pairs===2?190:0)-
   Math.min(5,contested)*13;
 }
 function economicPlan(p,round){
  const danger=p.hp<35,healthy=p.hp>65;
  // Interest is one gold per 10 saved gold, up to 5.
  const reserve=danger?2:round<=3?0:round<=7?10:healthy?30:10;
  const wantLevel=p.level<Math.min(9,Math.max(4,Math.floor(round/2)+2));
  const levelReserve=wantLevel&&p.gold>=reserve+8?4:0;
  return {reserve,rollBudget:danger?Math.min(16,p.gold):p.gold>=45?12:p.gold>=25?6:2,
   xpBudget:wantLevel?Math.min(16,Math.max(0,p.gold-reserve-3)):0,
   levelReserve,danger};
 }
 function equipment(p,s,uid,now){
  if(!p.inventory.length)return;
  const active=Object.values(p.board).map(id=>p.units[id]).filter(Boolean).sort((a,b)=>value(b)-value(a));
  for(let n=0;n<18&&p.inventory.length&&active.length;n++){
   const before=p.inventory.length;
   const component=p.inventory[0];
   const prop=E.COMP[component];
   if(!prop)break;
   const isMagic=prop.stat==='abilityPower'||prop.stat==='mana';
   const candidates=active.slice().sort((a,b)=>{
    const ha=H[a.heroId],hb=H[b.heroId];
    const qa=value(a)+(isMagic&&ha.classes.includes('Sorcerer')?200:0)+(!isMagic&&ha.range<=1?50:0);
    const qb=value(b)+(isMagic&&hb.classes.includes('Sorcerer')?200:0)+(!isMagic&&hb.range<=1?50:0);
    return qb-qa;
   });
   let equipped=false;
   for(const u of candidates){
    if(u.items.length>=3&&u.items.every(x=>!E.COMP[x]))continue;
    try{E.action(s,uid,{type:'EQUIP',unitId:u.id,component},now);equipped=true;break;}catch(e){}
   }
   if(!equipped||p.inventory.length>=before)break;
  }
 }
 function takeTurn(s,uid,now){
  const p=s.players[uid];if(!p||p.eliminated||s.roundPhase!=='PREPARATION'||p.ready)return;
  const threat=opponentThreat(s,uid),round=s.round,plan=economicPlan(p,round);
  function available(){return Object.keys(p.bench).length<8;}
  function buyOffers(limit){
   let bought=0;
   while(available()&&bought<limit){
    const choices=p.shop.map((id,i)=>({i,h:H[id]})).filter(x=>x.h&&p.gold>=x.h.cost);
    if(!choices.length)break;
    choices.sort((a,b)=>draftScore(p,b.h,threat)-draftScore(p,a.h,threat));
    const choice=choices[0],score=draftScore(p,choice.h,threat);
    const merge=Object.values(p.units).filter(u=>u.heroId===choice.h.id&&u.star===1).length>=2;
    if(p.gold-choice.h.cost<plan.reserve&&!plan.danger&&!merge)break;
    if(score<90&&!merge&&round>5)break;
    try{E.action(s,uid,{type:'BUY',index:choice.i},now);bought++;}catch(e){break;}
   }
   return bought;
  }
  // First try natural shop, then level according to economy milestones.
  buyOffers(5);
  let remainingXP=plan.xpBudget;
  while(remainingXP>=4&&p.gold>=4&&p.level<9){
   try{E.action(s,uid,{type:'BUY_XP'},now);remainingXP-=4;}catch(e){break;}
  }
  // Refresh aggressively when in danger, otherwise protect interest breakpoints.
  let remainingRoll=plan.rollBudget;
  while(remainingRoll>=2&&p.gold>=2&&available()){
   if(!plan.danger&&p.gold-2<plan.reserve)break;
   try{E.action(s,uid,{type:'ROLL'},now);remainingRoll-=2;}catch(e){break;}
   buyOffers(3);
  }
  planBoard(p,threat);
  equipment(p,s,uid,now);
  planBoard(p,threat);
  E.action(s,uid,{type:'READY'},now);
 }
 return {takeTurn,bestLineup,teamScore,economicPlan,opponentThreat,draftScore};
}
if(typeof module!=='undefined'&&module.exports)module.exports=createAI;
else root.DolphinTacticsCreateAI=createAI;
})(typeof window!=='undefined'?window:globalThis);
