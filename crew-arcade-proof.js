/* Deterministic, shared arcade rule verifier for trusted Crew daily missions.
 * Browser games use seeded RNG; Cloud Functions independently replay inputs.
 * Not a full bot-prevention system: local games run on untrusted devices.
 */
(function(root,factory){
 'use strict';
 const api=factory();
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 if(root)root.DolphinArcadeProof=api;
})(typeof globalThis==='undefined'?this:globalThis,function(){
 'use strict';
 const dirs={U:[0,-1],D:[0,1],L:[-1,0],R:[1,0]};
 function random(seed){
  let x=(Number(seed)>>>0)||1;
  return function(){
   x^=x<<13;x^=x>>>17;x^=x<<5;
   return (x>>>0)/4294967296;
  };
 }
 function initialSnake(seed){
  const state={snake:[[8,10],[7,10],[6,10]],dir:'R',food:null,score:0,over:false};
  const rng=random(seed);
  function food(){
   const busy=new Set(state.snake.map(([x,y])=>y*20+x));
   const empty=[];for(let i=0;i<400;i++)if(!busy.has(i))empty.push(i);
   if(!empty.length)return null;
   const idx=empty[Math.floor(rng()*empty.length)];
   return [idx%20,Math.floor(idx/20)];
  }
  state.food=food();
  return {state,step(next){
   if(state.over||!dirs[next])return false;
   const [dx,dy]=dirs[next],[px,py]=dirs[state.dir];
   if(dx===-px&&dy===-py)return false;
   state.dir=next;
   const [sx,sy]=state.snake[0],x=sx+dx,y=sy+dy;
   if(x<0||y<0||x>=20||y>=20||state.snake.slice(0,-1).some(([a,b])=>a===x&&b===y)){
    state.over=true;return false;
   }
   state.snake.unshift([x,y]);
   if(state.food&&state.food[0]===x&&state.food[1]===y){
    state.score+=10;state.food=food();
   }else state.snake.pop();
   return true;
  }};
 }
 function initial2048(seed){
  const board=Array(16).fill(0),rng=random(seed);
  function spawn(){
   const empty=[];for(let i=0;i<16;i++)if(!board[i])empty.push(i);
   if(!empty.length)return;
   const idx=empty[Math.floor(rng()*empty.length)];
   board[idx]=rng()<0.9?2:4;
  }
  spawn();spawn();
  const state={board,score:0};
  return {state,step(dir){
   if(!dirs[dir])return false;
   const next=Array(16).fill(0);let gained=0;
   for(let i=0;i<4;i++){
    const positions=[];
    for(let j=0;j<4;j++){
     const r=dir==='L'||dir==='R'?i:(dir==='U'?j:3-j);
     const c=dir==='U'||dir==='D'?i:(dir==='L'?j:3-j);
     positions.push(r*4+c);
    }
    // For right/down traversal, reverse row/column indexing.
    if(dir==='R'){for(let j=0;j<4;j++)positions[j]=i*4+(3-j);}
    if(dir==='D'){for(let j=0;j<4;j++)positions[j]=(3-j)*4+i;}
    const values=positions.map(k=>board[k]).filter(Boolean),merged=[];
    for(let k=0;k<values.length;k++){
     if(values[k]===values[k+1]){merged.push(values[k]*2);gained+=values[k]*2;k++;}
     else merged.push(values[k]);
    }
    positions.forEach((k,j)=>{next[k]=merged[j]||0;});
   }
   if(next.every((v,i)=>v===board[i]))return false;
   board.splice(0,16,...next);state.score+=gained;spawn();
   return true;
  }};
 }
 function replay(game,seed,moves){
  if(typeof moves!=='string'||moves.length<1||moves.length>5000||!/^[UDLR]+$/.test(moves))
   return {valid:false,score:0,steps:0};
  const engine=game==='snake'?initialSnake(seed):game==='2048'?initial2048(seed):null;
  if(!engine)return {valid:false,score:0,steps:0};
  for(const dir of moves)if(!engine.step(dir))return {valid:false,score:engine.state.score,steps:moves.length};
  return {valid:true,score:engine.state.score,steps:moves.length};
 }
 return {random,initialSnake,initial2048,replay};
});
