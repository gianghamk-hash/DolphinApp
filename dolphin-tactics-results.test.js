'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const {Store}=require('./giaitri/games/tactics-online/test-store.cjs');
const R=require('./dolphin-tactics-results');
function fixture(){
 const db=new Store(),room={status:'finished',protocol:'tactics-atomic-v2',mode:'casual',seed:123,round:20,updatedAt:1000,winnerId:'b',playerOrder:['a','b','c','d'],finalPlacements:{a:2,b:1,c:4,d:3},players:{}};
 for(const uid of room.playerOrder)room.players[uid]={uid,displayName:uid==='a'?'Giang <&>':uid.toUpperCase(),hp:uid==='b'?40:0,level:8};
 const path='mp_rooms/ABC234';db.values.set(path,{game:'dolphin-tactics',protocol:'tactics-atomic-v2',seats:{p1:'a',p2:'b',p3:'c',p4:'d'}});db.values.set(path+'/data/state',room);
 const storage=new Map(),local={getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)};
 return {db,room,storage,service:R.createService(db,{storage:local,clock:()=>2000})};
}
test('all four clients submitting one match increment all four ranks exactly once',async()=>{
 const m=fixture();await Promise.all(m.room.playerOrder.map(uid=>m.service.recordFinishedRoom('ABC234',uid,123)));
 const ranks=await m.service.getLeaderboard();assert.equal(ranks.length,4);assert.deepEqual(ranks.map(x=>x.totalScore),[25,18,12,6]);
 assert.ok(ranks.every(x=>x.totalGames===1));assert.equal(ranks[0].uid,'b');assert.equal(ranks[0].wins,1);
 assert.equal(m.service.pending().length,0);assert.equal(m.db.values.get('game_scores/'+R.matchId('ABC234',123)).rows.length,4);
 assert.ok(m.db.writes.every(w=>w.path.startsWith('game_scores/')&&!w.path.includes('Verified')));
});
test('receipts remain permanent after more than 100 matches and retries do not inflate totals',async()=>{
 const m=fixture();for(let i=0;i<105;i++){m.room.seed=1000+i;await m.service.recordFinishedRoom('ABC234','a',1000+i);}
 m.room.seed=1000;const retry=await m.service.recordFinishedRoom('ABC234','a',1000);assert.equal(retry.alreadyCounted,true);
 const ranks=await m.service.getLeaderboard();assert.equal(ranks[0].totalGames,105);assert.equal(ranks[0].totalScore,105*25);
});
test('failed writes retain a pending match and reconnect flush repairs it only once',async()=>{
 const m=fixture(),transaction=m.db.runTransaction.bind(m.db);m.db.runTransaction=async()=>{throw Error('unavailable');};
 await assert.rejects(m.service.recordFinishedRoom('ABC234','a',123),/unavailable/);assert.equal(m.service.pending().length,1);
 m.db.runTransaction=transaction;await m.service.flush();await m.service.flush();
 assert.equal(m.service.pending().length,0);assert.equal((await m.service.getLeaderboard())[0].totalGames,1);
});
test('a completed last room can be recovered after reload even without a queued receipt',async()=>{
 const m=fixture();m.storage.set('dolphin_tactics_last_room',JSON.stringify({code:'ABC234'}));
 await m.service.repairLastRoom('a');await m.service.repairLastRoom('a');assert.equal((await m.service.getLeaderboard())[0].totalGames,1);
});
test('unfinished, offline, stale and non-member submissions cannot write rankings',async()=>{
 for(const invalid of ['unfinished','offline','stale','outsider','placements']){
  const m=fixture();let uid='a',seed=123;
  if(invalid==='unfinished')m.room.status='in_game';if(invalid==='offline')m.room.mode='offline';if(invalid==='stale')seed=777;if(invalid==='outsider')uid='intruder';if(invalid==='placements')m.room.finalPlacements.c=1;
  await assert.rejects(m.service.recordFinishedRoom('ABC234',uid,seed));assert.equal(m.db.writes.length,0,invalid);
 }
});
test('standings follow recorded elimination placements instead of equal zero HP',()=>{
 const m=fixture();assert.deepEqual(R.rowsFor(m.room).map(x=>x.uid),['b','a','d','c']);
 m.room.finalPlacements.a=1;assert.throws(()=>R.rowsFor(m.room),/không hợp lệ/);
});
function leaderboardHarness(db,{failOnce=false}={}){
 let attempts=0;const storage=new Map(),localStorage={getItem:k=>storage.get(k)||'Giang',setItem:(k,v)=>storage.set(k,v)};
 const firebase={apps:[],firestore:()=>db,initializeApp(){attempts++;if(failOnce&&attempts===1)throw Error('temporary SDK error');return {firestore:()=>db};}};
 const window={firebase,localStorage,DolphinTacticsResults:R,addEventListener:()=>{}};
 vm.runInNewContext(fs.readFileSync('./dolphin-leaderboard.js','utf8'),{window,localStorage,Date,console},{filename:'dolphin-leaderboard.js'});
 return window.DolphinLeaderboard;
}
test('leaderboard uses the same initialized Firebase SDK and reads casual results',async()=>{
 const m=fixture();await m.service.recordFinishedRoom('ABC234','a',123);
 const lb=leaderboardHarness(m.db);assert.equal(await lb.init(),true);assert.equal(lb.ready(),true);
 assert.equal((await lb.getLeaderboard('dolphin-tactics'))[0].uid,'b');assert.equal(lb.lastError('dolphin-tactics'),'');
 assert.equal(await lb.submitTacticsMatch(),false);assert.equal(await lb.submit('dolphin-tactics',999),false);
});
test('other-game best scores and totals survive the compatibility SDK path',async()=>{
 const m=fixture(),lb=leaderboardHarness(m.db);await lb.submit('snake',10,{win:true});await lb.submit('snake',5,{win:false});
 const rows=await lb.getLeaderboard('snake');assert.equal(rows.length,1);assert.equal(rows[0].bestScore,10);assert.equal(rows[0].totalScore,15);assert.equal(rows[0].totalGames,2);
});
test('initialization can retry after failure instead of caching a failed promise',async()=>{
 const m=fixture(),lb=leaderboardHarness(m.db,{failOnce:true});await new Promise(resolve=>setTimeout(resolve,0));
 assert.equal(await lb.init(),true);assert.equal(lb.ready(),true);
});
test('hub asset URLs resolve for both custom-domain root and GitHub project paths',()=>{
 const html=fs.readFileSync('./giaitri/index.html','utf8');
 assert.match(html,/src="\.\.\/dolphin-leaderboard\.js\?v=2"/);assert.doesNotMatch(html,/src="\/DolphinApp\//);
 for(const base of ['https://dolphinfb.store/giaitri/index.html','https://gianghamk-hash.github.io/DolphinApp/giaitri/index.html']){
  const url=new URL('../dolphin-leaderboard.js',base);assert.ok(url.pathname.endsWith('/dolphin-leaderboard.js'));assert.equal(url.pathname.includes('/DolphinApp/'),base.includes('github.io'));
 }
});
