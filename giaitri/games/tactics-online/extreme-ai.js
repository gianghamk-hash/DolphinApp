/* Dolphin Tactics offline champion AI: board optimization, economy, trait-aware drafts. */
(function(root){
'use strict';
function createAI(E){
 const H=E.HERO, traits=E.C.origins;
 const value=(u)=>{const h=H[u.heroId];return h.hp*.055+h.attack*2.1+h.cost*15+u.star*32+(u.items||[]).length*18;};
 function teamScore(p,units){
  let score=units.reduce((sum,u)=>sum+value(u),0);
  const counts={};const seen=new Set();
  for(const u of units){if(seen.has(u.heroId))continue;seen.add(u.heroId);const h=H[u.heroId];
   for(const key of [...h.origins,...h.classes])counts[key]=(counts[key]||0)+1;
  }
  for(const [key,n] of Object.entries(counts)){
   const th=Object.keys(traits[key]?.thresholds||{}).map(Number).sort((a,b)=>a-b);
   const active=th.filter(x=>n>=x).pop()||0;
   if(active)score+=28+active*19;
   else if(th.length&&n===th[0]-1)score+=13;
  }
  return score;
 }
 function bestLineup(p){
  const all=Object.values(p.units),capacity=Math.min(p.level,8,all.length);
  const ranked=all.slice().sort((a,b)=>value(b)-value(a)).slice(0,11);
  let best=[],bestScore=-Infinity;
  function dfs(index,chosen){
   if(chosen.length===capacity){const score=teamScore(p,chosen);if(score>bestScore){bestScore=score;best=chosen.slice();}return;}
   if(index>=ranked.length||chosen.length+ranked.length-index<capacity)return;
   chosen.push(ranked[index]);dfs(index+1,chosen);chosen.pop();dfs(index+1,chosen);
  }
  if(capacity)dfs(0,[]);
  return best;
 }
 function planBoard(E,p){
  const chosen=bestLineup(p),front=[],back=[];
  for(const u of chosen)(H[u.heroId].range<=1?front:back).push(u);
  const board={},bench={},frontCols=[3,4,2,5,1,6,0,7],backCols=[3,4,2,5,1,6,0,7];
  front.forEach((u,i)=>board['r0c'+frontCols[i]]=u.id);
  back.forEach((u,i)=>board['r3c'+backCols[i]]=u.id);
  let k=0;for(const u of Object.values(p.units))if(!chosen.includes(u)&&k<8)bench[String(k++)]=u.id;
  p.board=board;p.bench=bench;
 }
 function draftScore(E,p,h){
  const have=Object.values(p.units).filter(u=>u.heroId===h.id);
  const count=have.length;
  let result=h.hp*.055+h.attack*2+h.cost*11+(count===2?175:count===1?50:0);
  const lineage=E.traitCounts(p);
  for(const key of [...h.origins,...h.classes]){
   const n=lineage[key]||0,tiers=Object.keys(traits[key]?.thresholds||{}).map(Number).sort((a,b)=>a-b);
   if(tiers.some(t=>n+1===t))result+=70;
   else if(n)result+=17;
  }
  return result;
 }
 function takeTurn(s,uid,now){
  const p=s.players[uid];if(!p||p.eliminated||s.roundPhase!=='PREPARATION')return;
  // Prioritize bench capacity, intelligent purchases, level threshold and trait activation.
  for(let loop=0;loop<32;loop++){
   const slots=Object.keys(p.bench).length;
   const choices=p.shop.map((id,i)=>({i,h:H[id]})).filter(x=>x.h&&x.h.cost<=p.gold);
   if(!choices.length||slots>=8)break;
   choices.sort((a,b)=>draftScore(E,p,b.h)-draftScore(E,p,a.h));
   if(p.gold<3&&choices[0].h.cost>1)break;
   try{E.action(s,uid,{type:'BUY',index:choices[0].i},now);}catch(e){break;}
  }
  if(p.gold>=12 && p.level<8){for(let i=0;i<Math.min(4,Math.floor((p.gold-6)/4));i++){
   try{E.action(s,uid,{type:'BUY_XP'},now);}catch(e){break;}
  }}
  // Prioritize building strong compositions over hoarding gold.
  if(p.gold>=6&&Object.keys(p.bench).length<8){
   for(let i=0;i<2;i++){
    try{E.action(s,uid,{type:'ROLL'},now);}catch(e){break;}
    const choices=p.shop.map((id,i)=>({i,h:H[id]})).filter(x=>x.h&&x.h.cost<=p.gold);
    choices.sort((a,b)=>draftScore(E,p,b.h)-draftScore(E,p,a.h));
    if(choices[0])try{E.action(s,uid,{type:'BUY',index:choices[0].i},now);}catch(e){}
   }
  }
  // Equip optimal champions; components combine through E.action.
  planBoard(E,p);
  for(let i=0;i<Math.min(p.inventory.length,15);i++){
   const id=Object.values(p.board).map(k=>p.units[k]).filter(Boolean).sort((a,b)=>value(b)-value(a))[0]?.id;
   const item=p.inventory[0];if(!id||!item)break;
   try{E.action(s,uid,{type:'EQUIP',unitId:id,component:item},now);}catch(e){break;}
  }
  planBoard(E,p);
  E.action(s,uid,{type:'READY'},now);
 }
 return {takeTurn,bestLineup,teamScore};
}
if(typeof module!=='undefined'&&module.exports)module.exports=createAI;
else root.DolphinTacticsCreateAI=createAI;
})(typeof window!=='undefined'?window:globalThis);
