'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const engine=require('./staff-xp-engine.cjs');
function harness(options={}){
 const data=new Map([
  ['staffRegistry/DOL-0001',{employeeId:'DOL-0001',name:'Lan Nguyen',avatar:'🐬',active:true,xp:0}],
  ['staffIdentity/lanDevice',{employeeId:'DOL-0001',name:'Lan Nguyen',verified:true}]
 ]);
 const read=path=>{
  if(data.has(path))return data.get(path);
  const children=[...data].filter(([k])=>k.startsWith(path+'/')&&!k.slice(path.length+1).includes('/'));
  return children.length?Object.fromEntries(children.map(([k,v])=>[k.slice(path.length+1),v])):null;
 };
 const ref=path=>({
  once:async()=>({val:()=>read(path),exists:()=>read(path)!=null}),
  set:async value=>{if(options.failReceiptAck&&path.startsWith('staffXpLedger/')&&value.state==='credited')throw Error('ack offline');data.set(path,value);},
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
  if(n==='./staff-xp-actions')return {_retryPendingForEmployee:async id=>{if(options.pendingCredit){const path='staffRegistry/'+id,p=data.get(path);data.set(path,{...p,xp:p.xp+options.pendingCredit});options.pendingCredit=0;return {processed:1,failed:0};}return {processed:0,failed:0};}};
  if(n==='./staff-xp-engine.cjs')return engine;
  if(n==='./staff-daily-core.cjs')return require('./staff-daily-core.cjs');
  if(n==='./staff-name-policy.cjs')return require('./staff-name-policy.cjs');
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
 assert.equal(mine.level,1);
 assert.equal(mine.highestLevel,3);
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
test('if active profile is deleted during transaction do not recreate it; retain a retryable pending XP receipt',async()=>{
 const {api,data}=harness({coldCacheProfile:true,removeBeforeServerRetry:true});
 const payload={employeeId:'DOL-0001',eventId:'live:revenue:removed01',source:'revenue',amount:1000};
 await assert.rejects(()=>api._awardTrustedLiveXP(payload),e=>e.code==='internal');
 assert.equal(data.has('staffRegistry/DOL-0001'),false);
 assert.equal(data.get('staffXpLedger/DOL-0001/'+payload.eventId).state,'pending');
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
 data.set('staffRegistry/DOL-0002',{employeeId:'DOL-0002',name:'Binh Nguyen',active:true,avatar:'🐬',xp:500,levelPeak:1});
 assert.deepEqual(Array.from(api._leaderboard({a:data.get('staffRegistry/DOL-0001'),b:data.get('staffRegistry/DOL-0002')}).map(p=>p.employeeId)),['DOL-0002']);
 await api._rebuildPrestige();
 const board=await api.staffGetPrestige(req('lanDevice'));
 assert.equal(board.champion.employeeId,'DOL-0002');
 assert.equal(board.leaderboard.length,1);
 assert.equal(board.leaderboard[0].employeeId,'DOL-0002');
});
test('no self-admin privilege for unverified identity, other Staff ID or anonymous caller',async()=>{
 const {api,data}=harness();
 data.set('staffIdentity/lanDevice',{employeeId:'DOL-0001',name:'Lan Nguyen',verified:false});
 assert.equal((await api.staffGetMyProgress(req('lanDevice'))).testAdmin,false);
 await assert.rejects(()=>api.staffAdjustOwnTestXP(req('lanDevice',{action:'add',amount:5000})),e=>e.code==='permission-denied');
 data.set('staffRegistry/DOL-0002',{employeeId:'DOL-0002',name:'Binh Nguyen',active:true,xp:0,registrationSource:'manager'});
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


test('Level 6 unlocks Bronze frame and exposes Level 7 reward milestone',async()=>{
 const {api,data}=harness({coldCacheProfile:true});
 const old=data.get('staffRegistry/DOL-0001');
 data.set('staffRegistry/DOL-0001',{...old,xp:80000,levelPeak:5});
 const result=await api.staffSetPersonalStyle(req('lanDevice',{theme:'light',nameFlame:true,selectedFrame:'bronze',selectedTitle:'none',selectedBanner:'default',nameGradient:false}));
 assert.equal(result.level,6);
 assert.equal(result.selectedFrame,'bronze');
 assert.equal(result.nameFlame,true);
 assert.equal(result.nextReward.level,7);
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
 data.set('staffRegistry/DOL-0002',{employeeId:'DOL-0002',name:'Binh Nguyen',active:true,xp:500,levelPeak:1});
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
 assert.equal(mine.dailyMissions.total,8);
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
test('read-only profile refresh reverses mistakenly paid 10x check-in today only',async()=>{
 const {api,data}=harness();
 const checkedAt=Date.now()-1000,day=require('./staff-daily-core.cjs').vietnamDay(checkedAt);
 const p=data.get('staffRegistry/DOL-0001');
 data.set('staffRegistry/DOL-0001',{...p,xp:2650,dailyMissions:{
  date:day,lastCheckinDay:day,streak:2,
  completed:{checkin:{xp:2500,at:checkedAt,receipt:'daily-100x'}}}});
 const first=await api.staffGetMyProgress(req('lanDevice'));
 assert.equal(first.xp,400); // 2,650 - 2,250
 assert.equal(first.dailyMissions.tasks[0].xp,250);
 assert.equal(first.dailyMissions.dailyXPAdjustment,-2250);
 const second=await api.staffGetMyProgress(req('lanDevice'));
 assert.equal(second.xp,400);
 assert.equal(second.dailyMissions.dailyXPAdjustment,undefined);
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
 assert.equal(first.levelRulesVersion,3);
 assert.equal(first.leaderboard[0].level,2);
 const second=await api.staffGetPrestige(req('lanDevice'));
 assert.equal(second.leaderboard[0].level,2);
 assert.equal(data.get('staffPrestige/public').levelRulesVersion,3);
});

test('pending registrations never enter Level rankings, Emperor or legends, even with stale cache',async()=>{
 const {api,data}=harness();
 const approved={employeeId:'DOL-0002',name:'Approved',avatar:'🐬',active:true,registrationSource:'self',approved:true,xp:2000};
 const pending={employeeId:'DOL-0003',name:'Pending',avatar:'🐬',active:true,registrationSource:'self',approved:false,xp:9999999};
 data.set('staffRegistry/DOL-0002',approved);
 data.set('staffRegistry/DOL-0003',pending);
 await api._rebuildPrestige();
 let board=await api.staffGetPrestige(req('lanDevice'));
 assert.deepEqual(Array.from(board.leaderboard.map(p=>p.employeeId)),['DOL-0002']);
 assert.equal(board.champion.employeeId,'DOL-0002');
 assert.equal(board.legends.some(p=>p.name==='Pending'),false);
 // Revoke a former winner without a rebuild: even cached results must exclude them.
 data.set('staffRegistry/DOL-0002',{...approved,approved:false});
 board=await api.staffGetPrestige(req('lanDevice'));
 assert.equal(board.leaderboard.length,0);
 assert.equal(board.champion,null);
 assert.equal(board.legends.some(p=>p.name==='Approved'),false);
});
test('manager and trusted live grants cannot credit unapproved registrations',async()=>{
 const {api,data}=harness();
 const pending={employeeId:'DOL-0003',name:'Pending',active:true,registrationSource:'self',approved:false,xp:0};
 data.set('staffRegistry/DOL-0003',pending);
 const event={employeeId:'DOL-0003',eventId:'test:pending:001',source:'revenue',amount:250};
 await assert.rejects(()=>api._awardTrustedLiveXP(event),e=>e.code==='permission-denied');
 await assert.rejects(()=>api.staffGrantVerifiedXP(req('manager',event)),e=>e.code==='permission-denied');
 assert.equal(data.has('staffXpLedger/DOL-0003/test:pending:001'),false);
});

test('a lost ledger acknowledgement retries without losing or doubling committed profile XP',async()=>{
 const options={failReceiptAck:true},h=harness(options),event={employeeId:'DOL-0001',eventId:'live:crash:receipt01',source:'revenue',amount:250};
 await assert.rejects(()=>h.api._awardTrustedLiveXP(event),/ack offline/);
 assert.equal(h.data.get('staffRegistry/DOL-0001').xp,250);
 assert.equal(h.data.get('staffXpLedger/DOL-0001/'+event.eventId).state,'pending');
 options.failReceiptAck=false;await h.api._awardTrustedLiveXP(event);await h.api._awardTrustedLiveXP(event);
 assert.equal(h.data.get('staffRegistry/DOL-0001').xp,250);
 assert.equal(h.data.get('staffXpLedger/DOL-0001/'+event.eventId).state,'credited');
});

test('personal XP refresh repairs pending obligations only for the linked employee and returns fresh XP',async()=>{
 const h=harness({pendingCredit:250});
 const result=await h.api.staffGetMyProgress(req('lanDevice',{employeeId:'DOL-9999'}));
 assert.equal(result.employeeId,'DOL-0001');assert.equal(result.xp,250);
 assert.equal((await h.api.staffGetMyProgress(req('lanDevice'))).xp,250);
});

test('verified XP equips automatically; customization survives refresh, duplicate awards and same-level XP until the next level',async()=>{
 const {api,data}=harness();
 const payload={employeeId:'DOL-0001',eventId:'live:auto-style:level6',source:'work',amount:engine.xpForLevel(6)};
 const leveled=await api.staffGrantVerifiedXP(req('manager',payload));
 assert.equal(leveled.level,6);assert.equal(leveled.selectedFrame,'bronze');assert.equal(leveled.selectedAvatarMotion,'comet');assert.equal(leveled.selectedAura,'ripple');
 assert.equal(leveled.nameFlame,true);assert.equal(leveled.personalTheme,'abyss');
 await api.staffSetPersonalStyle(req('lanDevice',{theme:'gray',nameFlame:false,selectedNameFx:'none',selectedFrame:'none'}));
 await api.staffGrantVerifiedXP(req('manager',payload));
 await api.staffGrantVerifiedXP(req('manager',{...payload,eventId:'live:auto-style:small',amount:1}));
 const custom=await api.staffGetMyProgress(req('lanDevice'));
 assert.equal(custom.selectedFrame,'none');assert.equal(custom.selectedNameFx,'none');assert.equal(custom.personalTheme,'gray');
 const next=await api.staffGrantVerifiedXP(req('manager',{...payload,eventId:'live:auto-style:level7',amount:engine.xpForLevel(7)-custom.xp}));
 assert.equal(next.level,7);assert.equal(next.selectedTitle,'navigator');assert.equal(next.selectedFrame,'bronze');assert.equal(next.nameFlame,true);
 assert.equal(data.get('staffRegistry/DOL-0001').autoStyleLevel,7);
});
test('DOL-0001 XP sandbox uses the same automatic effects and reset allows testing them again',async()=>{
 const {api}=harness();
 const first=await api.staffAdjustOwnTestXP(req('lanDevice',{action:'add',amount:engine.xpForLevel(3)}));
 assert.equal(first.selectedNameFx,'ember');assert.equal(first.selectedAvatarMotion,'pulse');assert.equal(first.nameFlame,true);
 const reset=await api.staffAdjustOwnTestXP(req('lanDevice',{action:'reset'}));assert.equal(reset.selectedNameFx,'none');
 const again=await api.staffAdjustOwnTestXP(req('lanDevice',{action:'add',amount:engine.xpForLevel(3)}));assert.equal(again.nameFlame,true);
});

test('Linh hihi zero XP falls to Level 1 but retains unlocked Level 54 cosmetics and title',async()=>{
 const {api,data}=harness();
 data.set('staffRegistry/DOL-0010',{
  employeeId:'DOL-0010',name:'Linh hihi',avatar:'🐬',active:true,createdAt:100,
  registrationSource:'manager',xp:0,levelPeak:54,
  selectedTitle:'legend',selectedFrame:'gold',selectedAvatarMotion:'supernova'
 });
 const profile=api._leaderboard({'DOL-0010':data.get('staffRegistry/DOL-0010')})[0];
 assert.equal(profile.xp,0);assert.equal(profile.level,1);
 assert.equal(profile.rank,'Bronze');assert.equal(profile.highestLevel,54);
 assert.equal(profile.selectedFrame,'gold');assert.equal(profile.selectedTitle,'legend');
 assert.equal(profile.selectedAvatarMotion,'supernova');
 await api._rebuildPrestige();
 const board=await api.staffGetPrestige(req('lanDevice'));
 assert.equal(board.leaderboard[0].level,1);
 assert.equal(board.leaderboard[0].xp,0);
 assert.equal(board.leaderboard[0].highestLevel,54);
});
test('duplicate name aliases are not separate Level entries; keep stored Staff IDs for review',async()=>{
 const {api,data}=harness();
 const first={employeeId:'DOL-0010',name:'Linh hihi',active:true,
  createdAt:100,registrationSource:'manager',xp:0,levelPeak:54};
 const alias={employeeId:'DOL-0011',name:'  linh   hihi ',active:true,
  createdAt:200,registrationSource:'manager',xp:4102.5,levelPeak:21};
 data.set('staffRegistry/DOL-0010',first);data.set('staffRegistry/DOL-0011',alias);
 const publicBoard=await api._rebuildPrestige();
 assert.equal(publicBoard.leaderboard.filter(x=>x.name.trim().toLowerCase().includes('linh')).length,1);
 assert.equal(publicBoard.leaderboard.find(x=>x.name==='Linh hihi').employeeId,'DOL-0010');
 assert.equal(data.get('staffRegistry/DOL-0011').xp,4102.5,'No employee record is deleted or merged');
});
test('wrong registry key alias cannot create an extra Level row',()=>{
 const {api}=harness();
 const p={employeeId:'DOL-0010',name:'Visible Crew',active:true,xp:2450,levelPeak:2};
 const board=api._leaderboard({'DOL-0010':p,legacyClone:{...p,xp:0,levelPeak:54}});
 assert.equal(board.length,1);
 assert.equal(board[0].level,2);
});
test('public Level response reflects current XP even when cached snapshot has same Staff IDs',async()=>{
 const {api,data}=harness();
 const original={employeeId:'DOL-0010',name:'Linh hihi',active:true,xp:2450*53*53,levelPeak:54};
 data.set('staffRegistry/DOL-0010',original);
 await api._rebuildPrestige();
 data.set('staffRegistry/DOL-0010',{...original,xp:0,selectedFrame:'gold'});
 const updated=await api.staffGetPrestige(req('lanDevice'));
 assert.equal(updated.leaderboard.find(x=>x.employeeId==='DOL-0010').xp,0);
 assert.equal(updated.leaderboard.find(x=>x.employeeId==='DOL-0010').level,1);
 assert.equal(updated.champion.level,1);
 assert.equal(data.get('staffPrestige/public').leaderboard.find(x=>x.employeeId==='DOL-0010').level,1);
});
