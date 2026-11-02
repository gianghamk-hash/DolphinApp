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
  if(n==='./staff-daily-core.cjs')return require('./staff-daily-core.cjs');
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
 assert.equal(board.champion,null,'Sandbox admin cannot become Dolphin Emperor');
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

test('Level 6 may save name flame and Light theme after RTDB cold-cache null',async()=>{
 const {api,data}=harness({coldCacheProfile:true});
 const existing=data.get('staffRegistry/DOL-0001');
 data.set('staffRegistry/DOL-0001',{...existing,xp:80000,levelPeak:5});
 const result=await api.staffSetPersonalStyle(req('lanDevice',{theme:'light',nameFlame:true}));
 assert.equal(result.level,6);
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
 assert.equal(increased.level,6);
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
test('sandbox admin defaults to hidden from public XP leaderboard or Emperor',async()=>{
 const {api,data}=harness();
 data.set('staffRegistry/DOL-0001',{...data.get('staffRegistry/DOL-0001'),xp:900000,levelPeak:14});
 data.set('staffRegistry/DOL-0002',{employeeId:'DOL-0002',name:'Binh',active:true,avatar:'🐬',xp:500,levelPeak:1});
 assert.deepEqual(Array.from(api._leaderboard({a:data.get('staffRegistry/DOL-0001'),b:data.get('staffRegistry/DOL-0002')}).map(p=>p.employeeId)),['DOL-0002']);
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


test('Level 6 unlocks Bronze frame and exposes next Level 8 reward',async()=>{
 const {api,data}=harness({coldCacheProfile:true});
 const old=data.get('staffRegistry/DOL-0001');
 data.set('staffRegistry/DOL-0001',{...old,xp:80000,levelPeak:5});
 const result=await api.staffSetPersonalStyle(req('lanDevice',{theme:'light',nameFlame:true,selectedFrame:'bronze',selectedTitle:'none',selectedBanner:'default',nameGradient:false}));
 assert.equal(result.level,6);
 assert.equal(result.selectedFrame,'bronze');
 assert.equal(result.nameFlame,true);
 assert.equal(result.nextReward.level,8);
 assert(result.unlocked.includes('frame_bronze'));
 assert.equal(result.rewardCatalog.find(r=>r.id==='frame_mythic').level,60);
 await assert.rejects(()=>api.staffSetPersonalStyle(req('lanDevice',{theme:'light',selectedFrame:'silver'})),e=>e.code==='permission-denied');
});
test('Level 15 can equip Rookie Star and Wave banner, preserving choices on theme-only saves',async()=>{
 const {api,data}=harness();
 const old=data.get('staffRegistry/DOL-0001');
 data.set('staffRegistry/DOL-0001',{...old,xp:engine.xpForLevel(15),levelPeak:15});
 const first=await api.staffSetPersonalStyle(req('lanDevice',{theme:'spring',nameFlame:true,selectedFrame:'bronze',selectedTitle:'rookie',selectedBanner:'wave'}));
 assert.equal(first.selectedTitle,'rookie');assert.equal(first.selectedBanner,'wave');
 const second=await api.staffSetPersonalStyle(req('lanDevice',{theme:'dark',nameFlame:true}));
 assert.equal(second.selectedTitle,'rookie');assert.equal(second.selectedBanner,'wave');
 assert.equal(second.xp,engine.xpForLevel(15));
 await assert.rejects(()=>api.staffSetPersonalStyle(req('lanDevice',{theme:'dark',selectedTitle:'legend'})),e=>e.code==='permission-denied');
});
test('Level 45 enables gradient, Level 60 unlocks Mythic, and Admin reset relocks all',async()=>{
 const {api,data}=harness();
 const old=data.get('staffRegistry/DOL-0001');
 data.set('staffRegistry/DOL-0001',{...old,xp:engine.xpForLevel(45),levelPeak:45});
 const gradient=await api.staffSetPersonalStyle(req('lanDevice',{theme:'dark',nameFlame:true,nameGradient:true,selectedFrame:'gold'}));
 assert.equal(gradient.nameGradient,true);assert.equal(gradient.selectedFrame,'gold');
 await assert.rejects(()=>api.staffSetPersonalStyle(req('lanDevice',{theme:'dark',nameFlame:true,selectedFrame:'mythic'})),e=>e.code==='permission-denied');
 data.set('staffRegistry/DOL-0001',{...data.get('staffRegistry/DOL-0001'),xp:engine.xpForLevel(60),levelPeak:60});
 const mythic=await api.staffSetPersonalStyle(req('lanDevice',{theme:'dark',nameFlame:true,nameGradient:true,selectedFrame:'mythic',selectedTitle:'legend',selectedBanner:'mythic'}));
 assert.equal(mythic.selectedFrame,'mythic');assert.equal(mythic.selectedTitle,'legend');assert.equal(mythic.selectedBanner,'mythic');
 const reset=await api.staffAdjustOwnTestXP(req('lanDevice',{action:'reset'}));
 assert.equal(reset.level,1);assert.equal(reset.selectedFrame,'none');assert.equal(reset.selectedTitle,'none');
 assert.equal(reset.selectedBanner,'default');assert.equal(reset.nameGradient,false);
 assert.equal(reset.xp,0);
});
test('Server rejects forged gradient and unknown cosmetic values at Level 1',async()=>{
 const {api}=harness();
 await assert.rejects(()=>api.staffSetPersonalStyle(req('lanDevice',{theme:'dark',nameFlame:false,nameGradient:true})),e=>e.code==='permission-denied');
 await assert.rejects(()=>api.staffSetPersonalStyle(req('lanDevice',{theme:'dark',selectedFrame:'godmode'})),e=>e.code==='invalid-argument');
});
test('Public board publishes equipped titles and frames, excluding DOL-0001 tester',async()=>{
 const {api,data}=harness();
 data.set('staffRegistry/DOL-0002',{employeeId:'DOL-0002',name:'Colleague',active:true,avatar:'🐯',xp:engine.xpForLevel(15),levelPeak:15,selectedFrame:'bronze',selectedTitle:'rookie',selectedBanner:'wave',personalTheme:'spring'});
 await api._rebuildPrestige();
 const board=await api.staffGetPrestige(req('lanDevice'));
 assert.equal(board.leaderboard.length,1);assert.equal(board.leaderboard[0].employeeId,'DOL-0002');
 assert.equal(board.leaderboard[0].selectedFrame,'bronze');
 assert.equal(board.leaderboard[0].selectedTitle,'rookie');
 assert.equal(board.leaderboard[0].selectedBanner,'wave');
  assert.equal(board.leaderboard[0].personalTheme,'spring','Landing receives the equipped public theme');
});

test('DOL-0001 can opt into and out of public ranking only when verified',async()=>{
 const {api,data}=harness();
 data.set('staffRegistry/DOL-0002',{employeeId:'DOL-0002',name:'Binh',active:true,xp:500,levelPeak:1});
 await assert.rejects(()=>api.staffSetOwnRankingVisibility(req('manager',{visible:true})),e=>e.code==='permission-denied');
 await api.staffSetOwnRankingVisibility(req('lanDevice',{visible:true}));
 const board=await api.staffGetPrestige(req('lanDevice'));
 assert.equal(board.showAdminRanking,true);
 assert.ok(board.leaderboard.some(p=>p.employeeId==='DOL-0001'));
 await api.staffSetOwnRankingVisibility(req('lanDevice',{visible:false}));
 const hidden=await api.staffGetPrestige(req('lanDevice'));
 assert.equal(hidden.showAdminRanking,false);
 assert.equal(hidden.leaderboard.some(p=>p.employeeId==='DOL-0001'),false);
});
test('new FX choices unlock cumulatively, prior lower-level choices remain selectable',async()=>{
 const {api,data}=harness();
 const old=data.get('staffRegistry/DOL-0001');
 data.set('staffRegistry/DOL-0001',{...old,xp:engine.xpForLevel(60),levelPeak:60});
 const selected=await api.staffSetPersonalStyle(req('lanDevice',{
  theme:'dark',selectedNameFx:'ember',selectedAura:'spark',selectedTrail:'wave',
  selectedCardFx:'soft',selectedFrame:'bronze'
 }));
 assert.equal(selected.selectedNameFx,'ember');assert.equal(selected.selectedAura,'spark');
 assert.equal(selected.selectedTrail,'wave');assert.equal(selected.selectedCardFx,'soft');
 const epic=await api.staffSetPersonalStyle(req('lanDevice',{
  theme:'dark',selectedNameFx:'celestial',selectedAura:'celestial',selectedTrail:'nova',selectedCardFx:'mythic'
 }));
 assert.equal(epic.selectedCardFx,'mythic');
});

test('personal progress exposes daily mission status without including it in public leaderboards',async()=>{
 const {api}=harness();
 const mine=await api.staffGetMyProgress(req('lanDevice'));
 assert.equal(mine.dailyMissions.total,6);
 assert.equal(mine.dailyMissions.completedCount,0);
 const publicBoard=await api.staffGetPrestige(req('lanDevice'));
 assert.equal(JSON.stringify(publicBoard).includes('dailyMissions'),false);
});

test('staffGetMyProgress backfills a verified same-day legacy check-in exactly once',async()=>{
 const {api,data}=harness({coldCacheProfile:true});
 const checkedAt=Date.now()-1000;
 const today=require('./staff-daily-core.cjs').vietnamDay(checkedAt);
 const p=data.get('staffRegistry/DOL-0001');
 data.set('staffRegistry/DOL-0001',{...p,xp:20,dailyMissions:{
  date:today,lastCheckinDay:today,streak:1,bestStreak:1,
  completed:{checkin:{xp:20,at:checkedAt,receipt:'legacy-checkin-1'}}
 }});
 const first=await api.staffGetMyProgress(req('lanDevice'));
 assert.equal(first.xp,200);
 assert.equal(first.dailyMissions.todayXP,200);
 assert.equal(first.dailyMissions.tasks[0].xp,200);
 assert.equal(first.dailyMissions.checkinTopUpXP,180);
 assert.equal(data.get('staffRegistry/DOL-0001').xp,200);
 const second=await api.staffGetMyProgress(req('lanDevice'));
 assert.equal(second.xp,200);
 assert.equal(second.dailyMissions.checkinTopUpXP,undefined);
 assert.equal(data.get('staffRegistry/DOL-0001').xp,200);
});
test('old check-in cannot be backfilled after 00:00 Vietnam time',async()=>{
 const {api,data}=harness();
 const timestamp=Date.now()-2*86400000;
 const oldDay=require('./staff-daily-core.cjs').vietnamDay(timestamp);
 const existing=data.get('staffRegistry/DOL-0001');
 data.set('staffRegistry/DOL-0001',{...existing,xp:20,dailyMissions:{
  date:oldDay,lastCheckinDay:oldDay,streak:1,completed:{checkin:{xp:20,at:timestamp,receipt:'old'}}
 }});
 const r=await api.staffGetMyProgress(req('lanDevice'));
 assert.equal(r.xp,20);
 assert.equal(r.dailyMissions.todayXP,0);
});
test('public Level board is rebuilt on demand for the new 2450 threshold',async()=>{
 const {api,data}=harness();
 data.set('staffRegistry/DOL-0002',{employeeId:'DOL-0002',name:'Visible Crew',avatar:'🐬',active:true,xp:2450,levelPeak:1});
 data.set('staffPrestige/public',{leaderboard:[{employeeId:'DOL-0002',name:'Visible Crew',xp:2450,level:1}],updatedAt:123});
 const first=await api.staffGetPrestige(req('lanDevice'));
 assert.equal(first.levelRulesVersion,2);
 assert.equal(first.leaderboard[0].level,2);
 const second=await api.staffGetPrestige(req('lanDevice'));
 assert.equal(second.leaderboard[0].level,2);
 assert.equal(data.get('staffPrestige/public').levelRulesVersion,2);
});
