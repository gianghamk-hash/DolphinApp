'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const engine=require('./staff-xp-engine.cjs');
function harness(options={}){
 const data=new Map([
  ['staffRegistry/DOL-0001',{employeeId:'DOL-0001',name:'Lan',avatar:'🐬',active:true,xp:0}],
  ['staffIdentity/lanDevice',{employeeId:'DOL-0001',name:'Lan',verified:true}]
 ]);
 const read=path=>{
  if(data.has(path))return data.get(path);
  const children=[...data].filter(([k])=>k.startsWith(path+'/')&&!k.slice(path.length+1).includes('/'));
  return children.length?Object.fromEntries(children.map(([k,v])=>[k.slice(path.length+1),v])):null;
 };
 const ref=path=>({
  once:async()=>({val:()=>read(path),exists:()=>read(path)!=null}),
  set:async value=>{data.set(path,value);},
  remove:async()=>{data.delete(path);},
  transaction:async fn=>{
   const isProfile=path==='staffRegistry/DOL-0001';
   // Emulate RTDB's first local transaction callback receiving null before
   // the server sends the existing active profile.
   if(isProfile&&options.coldCacheProfile)fn(null);
   if(isProfile&&options.removeBeforeServerRetry){
    data.delete(path);
   }
   const old=read(path),next=fn(old);
   if(next===undefined)return {committed:false,snapshot:{val:()=>old}};
   if(next===null)data.delete(path);else data.set(path,next);
   return {committed:true,snapshot:{val:()=>next}};
  },
  orderByChild:()=>({limitToLast:()=>({once:async()=>({val:()=>read(path)})})})
 });
 class HttpsError extends Error{constructor(code,message){super(message);this.code=code;}}
 const api={};const ctx={module:{exports:api},exports:api,process:{env:{STAFF_ADMIN_UIDS:'manager'}},console,Date,Math,Number,String,Set,Map,Object,Array};
 ctx.require=n=>{
  if(n==='firebase-admin/database')return {getDatabase:()=>({ref})};
  if(n==='firebase-admin/firestore')return {getFirestore:()=>({doc:()=>({set:async value=>data.set('staff_xp_updates/public',value)})})};
  if(n==='firebase-functions/v2/https')return {onCall:(_,fn)=>fn,HttpsError};
  if(n==='./staff-xp-engine.cjs')return engine;
  throw Error(n);
 };
 vm.runInNewContext(fs.readFileSync(__dirname+'/staff-prestige.js','utf8'),ctx);
 return {api,data};
}
const req=(user,data={})=>({auth:user?{uid:user}:null,data});
test('manager-only grants reject client spoofing and persist idempotent XP',async()=>{
 const {api,data}=harness();
 const payload={employeeId:'DOL-0001',eventId:'show:archive:001',source:'revenue',amount:2290};
 await assert.rejects(()=>api.staffGrantVerifiedXP(req('lanDevice',payload)),x=>x.code==='permission-denied');
 await assert.rejects(()=>api.staffGrantVerifiedXP(req(null,payload)),x=>x.code==='unauthenticated');
 const first=await api.staffGrantVerifiedXP(req('manager',payload));
 assert.equal(first.duplicate,false);
 assert.equal(first.xp,2290);
 assert.equal(first.level,1);
 const again=await api.staffGrantVerifiedXP(req('manager',payload));
 assert.equal(again.duplicate,true);
 assert.equal(data.get('staffRegistry/DOL-0001').xp,2290);
 const board=await api.staffGetPrestige(req('lanDevice'));
 assert.equal(board.champion.employeeId,'DOL-0001');
});
test('level peak and unlocked rewards survive a correction',async()=>{
 const {api,data}=harness();
 await api.staffGrantVerifiedXP(req('manager',{employeeId:'DOL-0001',eventId:'revenue:verified:high',source:'revenue',amount:20000}));
 assert.equal((await api.staffGetMyProgress(req('lanDevice'))).level,3);
 await api.staffSetPersonalStyle(req('lanDevice',{theme:'dark',nameFlame:true}));
 await api.staffGrantVerifiedXP(req('manager',{employeeId:'DOL-0001',eventId:'correction:verified:001',source:'correction',amount:-19500}));
 const mine=await api.staffGetMyProgress(req('lanDevice'));
 assert.equal(mine.xp,500);
 assert.equal(mine.level,3);
 assert(mine.unlocked.includes('name-onflame'));
 assert.equal(data.get('staffRegistry/DOL-0001').levelPeak,3);
});
test('personal premium theme requires server-side level and cannot be forged',async()=>{
 const {api}=harness();
 await assert.rejects(()=>api.staffSetPersonalStyle(req('lanDevice',{theme:'halloween',nameFlame:true})),x=>x.code==='permission-denied');
 await assert.rejects(()=>api.staffSetPersonalStyle(req('lanDevice',{theme:'does-not-exist'})),x=>x.code==='invalid-argument');
 const out=await api.staffSetPersonalStyle(req('lanDevice',{theme:'gray',nameFlame:false}));
 assert.equal(out.personalTheme,'gray');
});

test('cold-cache RTDB transaction still credits active profile exactly once',async()=>{
 const {api,data}=harness({coldCacheProfile:true});
 const payload={employeeId:'DOL-0001',eventId:'live:revenue:coldcache01',source:'revenue',amount:2500};
 const result=await api._awardTrustedLiveXP(payload);
 assert.equal(result.duplicate,false);
 assert.equal(data.get('staffRegistry/DOL-0001').xp,2500);
 const again=await api._awardTrustedLiveXP(payload);
 assert.equal(again.duplicate,true);
 assert.equal(data.get('staffRegistry/DOL-0001').xp,2500);
});
test('if active profile is deleted during transaction do not recreate it or leave XP ledger',async()=>{
 const {api,data}=harness({coldCacheProfile:true,removeBeforeServerRetry:true});
 const payload={employeeId:'DOL-0001',eventId:'live:revenue:removed01',source:'revenue',amount:1000};
 await assert.rejects(()=>api._awardTrustedLiveXP(payload),e=>e.code==='internal');
 assert.equal(data.has('staffRegistry/DOL-0001'),false);
 assert.equal(data.has('staffXpLedger/DOL-0001/'+payload.eventId),false);
});

test('Level 5 may save name flame and Light theme after RTDB cold-cache null',async()=>{
 const {api,data}=harness({coldCacheProfile:true});
 const existing=data.get('staffRegistry/DOL-0001');
 data.set('staffRegistry/DOL-0001',{...existing,xp:80000,levelPeak:5});
 const result=await api.staffSetPersonalStyle(req('lanDevice',{theme:'light',nameFlame:true}));
 assert.equal(result.level,5);
 assert.equal(result.nameFlame,true);
 assert.equal(result.personalTheme,'light');
 assert.equal(data.get('staffRegistry/DOL-0001').xp,80000);
 assert.equal(data.get('staffRegistry/DOL-0001').nameFlame,true);
});
test('style transaction cannot restore a profile deleted during server retry',async()=>{
 const {api,data}=harness({coldCacheProfile:true,removeBeforeServerRetry:true});
 const existing=data.get('staffRegistry/DOL-0001');
 data.set('staffRegistry/DOL-0001',{...existing,xp:80000,levelPeak:5});
 await assert.rejects(()=>api.staffSetPersonalStyle(req('lanDevice',{theme:'light',nameFlame:true})),
  e=>e.code==='failed-precondition');
 assert.equal(data.has('staffRegistry/DOL-0001'),false);
});
test('server still rejects name flame below Level 3',async()=>{
 const {api,data}=harness({coldCacheProfile:true});
 await assert.rejects(()=>api.staffSetPersonalStyle(req('lanDevice',{theme:'light',nameFlame:true})),
  e=>e.code==='permission-denied');
 assert.equal(data.get('staffRegistry/DOL-0001').nameFlame,undefined);
});

test('DOL-0001 is Admin sandbox only when verified, with self XP add/reset',async()=>{
 const {api,data}=harness();
 const me=await api.staffGetMyProgress(req('lanDevice'));
 assert.equal(me.testAdmin,true);
 assert.equal(me.employeeId,'DOL-0001');
 const increased=await api.staffAdjustOwnTestXP(req('lanDevice',{action:'add',amount:80000}));
 assert.equal(increased.xp,80000);
 assert.equal(increased.level,5);
 assert.equal(increased.testAdmin,true);
 assert.equal(data.get('staffRegistry/DOL-0001').xp,80000);
 const style=await api.staffSetPersonalStyle(req('lanDevice',{theme:'light',nameFlame:true}));
 assert.equal(style.nameFlame,true);
 const reset=await api.staffAdjustOwnTestXP(req('lanDevice',{action:'reset'}));
 assert.equal(reset.xp,0);
 assert.equal(reset.level,1);
 assert.equal(reset.nameFlame,false);
 assert.equal(reset.personalTheme,'dark');
 assert.equal(data.get('staffRegistry/DOL-0001').levelPeak,1);
});
test('sandbox admin never participates in public XP leaderboard or Emperor',async()=>{
 const {api,data}=harness();
 data.set('staffRegistry/DOL-0001',{...data.get('staffRegistry/DOL-0001'),xp:900000,levelPeak:14});
 data.set('staffRegistry/DOL-0002',{employeeId:'DOL-0002',name:'Binh',active:true,avatar:'🐬',xp:500,levelPeak:1});
 assert.deepEqual(api._leaderboard({a:data.get('staffRegistry/DOL-0001'),b:data.get('staffRegistry/DOL-0002')}).map(p=>p.employeeId),['DOL-0002']);
 await api._rebuildPrestige();
 const board=await api.staffGetPrestige(req('lanDevice'));
 assert.equal(board.champion.employeeId,'DOL-0002');
 assert.equal(board.leaderboard.length,1);
 assert.equal(board.leaderboard[0].employeeId,'DOL-0002');
});
test('no self-admin privilege for unverified identity, other Staff ID or anonymous caller',async()=>{
 const {api,data}=harness();
 data.set('staffIdentity/lanDevice',{employeeId:'DOL-0001',name:'Lan',verified:false});
 assert.equal((await api.staffGetMyProgress(req('lanDevice'))).testAdmin,false);
 await assert.rejects(()=>api.staffAdjustOwnTestXP(req('lanDevice',{action:'add',amount:5000})),e=>e.code==='permission-denied');
 data.set('staffRegistry/DOL-0002',{employeeId:'DOL-0002',name:'Binh',active:true,xp:0,registrationSource:'manager'});
 data.set('staffIdentity/otherDevice',{employeeId:'DOL-0002',verified:true});
 assert.equal((await api.staffGetMyProgress(req('otherDevice'))).testAdmin,false);
 await assert.rejects(()=>api.staffAdjustOwnTestXP(req('otherDevice',{action:'reset'})),e=>e.code==='permission-denied');
 await assert.rejects(()=>api.staffAdjustOwnTestXP(req(null,{action:'reset'})),e=>e.code==='unauthenticated');
 assert.equal(data.get('staffRegistry/DOL-0002').xp,0);
});
test('admin sandbox validates XP amounts and never changes staff event ledger',async()=>{
 const {api,data}=harness();
 await assert.rejects(()=>api.staffAdjustOwnTestXP(req('lanDevice',{action:'add',amount:-50})),e=>e.code==='invalid-argument');
 await assert.rejects(()=>api.staffAdjustOwnTestXP(req('lanDevice',{action:'add',amount:1000001})),e=>e.code==='invalid-argument');
 await assert.rejects(()=>api.staffAdjustOwnTestXP(req('lanDevice',{action:'reset',amount:1})),e=>e.code==='invalid-argument');
 data.set('staffXpLedger/DOL-0001/live:old',{amount:250});
 await api.staffAdjustOwnTestXP(req('lanDevice',{action:'add',amount:20000}));
 await api.staffAdjustOwnTestXP(req('lanDevice',{action:'reset'}));
 assert.equal(data.get('staffXpLedger/DOL-0001/live:old').amount,250);
});
