'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const engine=require('../crew-arcade-proof.js');
function fixture(options={}){
 const data=new Map([
  ['staffIdentity/worker',{verified:true,employeeId:'DOL-0002'}],
  ['staffRegistry/DOL-0002',{employeeId:'DOL-0002',name:'Crew',active:true,registrationSource:'manager',xp:0}],
  ['staffIdentity/pending',{verified:false,employeeId:'DOL-0003'}],
  ['staffRegistry/DOL-0003',{employeeId:'DOL-0003',name:'Pending',active:true,registrationSource:'self',approved:false,xp:0}]
 ]);
 let rebuilds=0;
 const ref=path=>({
  set:async value=>{data.set(path,value);},
  once:async()=>({val:()=>data.get(path)||null}),
  transaction:async fn=>{const old=data.get(path)||null,next=fn(old);
   if(next===undefined)return {committed:false,snapshot:{val:()=>old}};
   if(next===null)data.delete(path);else data.set(path,next);
   return {committed:true,snapshot:{val:()=>next}};
  }
 });
 class HttpsError extends Error{constructor(code,msg){super(msg);this.code=code;}}
 const ex={},ctx={exports:ex,module:{exports:ex},console,Date,Intl,Number,RegExp,String};
 ctx.require=name=>{
  if(name==='node:crypto')return require(name);
  if(name==='firebase-admin/database')return {getDatabase:()=>({ref})};
  if(name==='firebase-functions/v2/https')return {onCall:(_,callback)=>callback,HttpsError};
  if(name==='./staff-daily-core.cjs')return require('./staff-daily-core.cjs');
  if(name==='./crew-arcade-proof.cjs')return options.validReplay
   ?{replay:(game)=>({valid:true,score:game==='snake'?100:1000,steps:100})}:engine;
  if(name==='./staff-prestige')return {_rebuildPrestige:async()=>{rebuilds++;}};
  if(name==='./staff-name-policy.cjs')return require('./staff-name-policy.cjs');
  throw Error(name);
 };
 vm.runInNewContext(fs.readFileSync(__dirname+'/staff-daily-missions.js','utf8'),ctx);
 const req=(uid,payload={})=>({auth:uid?{uid}:null,data:payload});
 return {api:ex,req,data,rebuilds:()=>rebuilds};
}
test('only verified approved staff can start seeded game challenges',async()=>{
 const h=fixture();
 await assert.rejects(()=>h.api.staffStartArcadeMission(h.req(null,{game:'snake'})),e=>e.code==='unauthenticated');
 await assert.rejects(()=>h.api.staffStartArcadeMission(h.req('pending',{game:'2048'})),e=>e.code==='permission-denied');
 await assert.rejects(()=>h.api.staffStartArcadeMission(h.req('worker',{game:'tactics'})),e=>e.code==='invalid-argument');
 const run=await h.api.staffStartArcadeMission(h.req('worker',{game:'snake'}));
 assert.equal(run.game,'snake');assert.equal(run.challengeId.length,32);assert(Number.isSafeInteger(run.seed));
});
test('fake client score without matching replay cannot create XP',async()=>{
 const h=fixture();
 const run=await h.api.staffStartArcadeMission(h.req('worker',{game:'2048'}));
 h.data.get('staffDailyGameChallenges/worker/2048').startedAt-=25000;
 await assert.rejects(()=>h.api.staffFinishArcadeMission(h.req('worker',{
  game:'2048',challengeId:run.challengeId,score:1000,moves:'LRUD'
 })),e=>['permission-denied','failed-precondition'].includes(e.code));
 assert.equal(h.data.get('staffRegistry/DOL-0002').xp,0);
});
test('replayed and correctly verified game run awards once per task and per day',async()=>{
 const h=fixture({validReplay:true});
 for(const [game,score,xp] of [['snake',100,500],['2048',1000,1000]]){
  const run=await h.api.staffStartArcadeMission(h.req('worker',{game}));
  h.data.get('staffDailyGameChallenges/worker/'+game).startedAt-=20000;
  const request=h.req('worker',{game,challengeId:run.challengeId,score,moves:'LRUD'});
  const first=await h.api.staffFinishArcadeMission(request);
  assert.equal(first.awarded,true);assert.equal(first.addedXP,xp);
  await assert.rejects(()=>h.api.staffFinishArcadeMission(request),e=>e.code==='failed-precondition');
  // A new seeded run on the same day does not credit the task again.
  const fresh=await h.api.staffStartArcadeMission(h.req('worker',{game}));
  h.data.get('staffDailyGameChallenges/worker/'+game).startedAt-=20000;
  const second=await h.api.staffFinishArcadeMission(h.req('worker',{
   game,challengeId:fresh.challengeId,score,moves:'LRUD'
  }));
  assert.equal(second.addedXP,0);
 }
 assert.equal(h.data.get('staffRegistry/DOL-0002').xp,1500);
 assert.equal(h.rebuilds(),2);
});
test('shared pure replay engine rejects tampered and impossible inputs',()=>{
 for(const game of ['snake','2048']){
  assert.equal(engine.replay(game,2031,'GODMODE').valid,false);
  const a=engine.replay(game,123,'RRRR'),b=engine.replay(game,123,'RRRR');
  assert.deepEqual(a,b,'Same seed and moves have deterministic results');
 }
 assert.equal(engine.replay('snake',2031,'L').valid,false,'Snake cannot reverse into its body');
});

test('deployed Cloud Functions proof is identical to browser proof',()=>{
 const server=fs.readFileSync(__dirname+'/crew-arcade-proof.cjs','utf8');
 const client=fs.readFileSync(__dirname+'/../crew-arcade-proof.js','utf8');
 assert.equal(server,client,'Server and browser must replay the exact same game rules');
});
