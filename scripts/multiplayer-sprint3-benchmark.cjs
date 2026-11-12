/* Sprint 3: deterministic, offline multiplayer transport benchmark.
 * Does not connect to production Firebase, grant XP, or run real GPU frames.
 * "RTT" here is injected into the per-client fake clock, not observed ping.
 * Run: node scripts/multiplayer-sprint3-benchmark.cjs
 */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {Store}=require('../giaitri/games/tactics-online/test-store.cjs');
const {createTransport}=require('../giaitri/games/tactics-online/online-transport.js');
const E=require('../functions/tactics/engine.js');
const source=fs.readFileSync(path.join(__dirname,'../dolphin-multiplayer.js'),'utf8');
const LATENCIES=[50,100,200,400],PLAYER_COUNTS=[2,3,4];
const PATTERN=[-0.18,-0.08,0.06,0.18,-0.12,0.1,0.02,-0.04];
const SAMPLE_COUNT=16;
const copy=x=>x===undefined?undefined:JSON.parse(JSON.stringify(x));
function percentile(numbers,fraction){
 const values=[...numbers].sort((a,b)=>a-b);
 return values.length?values[Math.ceil(values.length*fraction)-1]:null;
}
function summarize(numbers){
 return {samples:numbers.length,medianMs:percentile(numbers,.5),
   p95Ms:percentile(numbers,.95),
   jitterMs:numbers.length>1?Math.round(numbers.slice(1)
     .reduce((sum,x,i)=>sum+Math.abs(x-numbers[i]),0)/(numbers.length-1)):0};
}
function session(id,rtt){
 let time=1700000000000,sequence=0;
 return {id,online:true, clock:()=>time,
   tick(){const sample=Math.round(rtt*(1+PATTERN[(sequence++)%PATTERN.length]));time+=sample;return sample;}
 };
}
function legacyDB(store,client){
 function check(){if(!client.online)throw Error('Simulated connection lost');}
 function reference(p,collection=false){
  return {path:p,doc:id=>reference(p+'/'+id),
   collection:id=>reference(p+'/'+id,true),
   get:async()=>{check();return collection?store.query(p):store.snap(p);},
   set:async(value,opts)=>{check();store.commit([{path:p,value:opts?.merge?{...copy(store.values.get(p)),...copy(value)}:copy(value)}]);client.tick();},
   update:async(value)=>{check();store.commit([{path:p,value:{...copy(store.values.get(p)),...copy(value)}}]);client.tick();},
   delete:async()=>{check();store.commit([{path:p,value:undefined}]);client.tick();},
   onSnapshot(...args){
    const callback=args.find(x=>typeof x==='function');
    return store.ref(p,collection).onSnapshot(snap=>{
      if(!client.online)return;
      if(collection){
        callback({docs:snap.docs,docChanges:()=>snap.docs.map(d=>({
          type:'modified',doc:{id:d.id,data:d.data}
        }))});
      }else callback(snap);
    });
   }
  };
 }
 return {collection:p=>reference(p,true),
   runTransaction:async(fn)=>{check();const value=await store.runTransaction(fn);client.tick();return value;}
 };
}
function createLegacyPeer(store,id,rtt){
 const net=session(id,rtt),values=new Map([
  ['dolphin_device_id',id],['dolphinStaffName','Benchmark '+id]
 ]);
 const localStorage={getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,String(v))};
 const navigator={onLine:true};
 const window={localStorage,navigator,db:legacyDB(store,net)};
 const context={window,localStorage,navigator,Date:{now:net.clock},Math,console:{log(){},error(){}},
   setInterval:()=>1,clearInterval:()=>{}};
 vm.runInNewContext(source,context,{filename:'dolphin-multiplayer.js'});
 return {mp:window.DolphinMP,net,navigator};
}
async function legacyScenario(players,rtt){
 const store=new Store();
 const peers=Array.from({length:players},(_,i)=>createLegacyPeer(store,'bench'+i,rtt));
 const host=peers[0],received=[];
 host.mp.onInput(p=>received.push({from:p.playerId,nonce:p.nonce}));
 const room=await host.mp.createRoom('sprint3-transport',{name:'Host',maxPlayers:players});
 assert.match(room.roomId,/^[A-Z2-9]{6}$/);
 for(let i=1;i<players;i++){
  const entry=await peers[i].mp.joinRoom(room.roomId,'sprint3-transport',{name:'P'+i});
  assert.equal(entry.side,'p'+(i+1));
 }
 const sends=[];
 for(let i=1;i<players;i++)for(let n=0;n<SAMPLE_COUNT;n++)
  sends.push(peers[i].mp.sendInputStrict({type:'sprint3-test',nonce:n}));
 await Promise.all(sends);
 for(let i=1;i<players;i++){
  const packets=received.filter(p=>p.from==='bench'+i);
  assert.equal(packets.length,SAMPLE_COUNT,'all commands arrive exactly once');
  assert.deepEqual(packets.map(p=>p.nonce),Array.from({length:SAMPLE_COUNT},(_,n)=>n),
    'FIFO input order remains correct under injected latency');
  const stat=peers[i].mp.getNetworkStats();
  assert.equal(stat.pendingInputs,0);
  assert.equal(stat.failedWrites,0);
  assert.ok(stat.ackP95Ms>=rtt*.8&&stat.ackP95Ms<=rtt*1.3);
 }
 // Disconnect one guest: strictly reject a failed write, then rejoin with the
 // same device/seat and ensure no stale input is replayed by the host.
 const guest=peers[players-1],original=store.snap('mp_rooms/'+room.roomId).data();
 guest.net.online=false;guest.navigator.onLine=false;
 await assert.rejects(guest.mp.sendInputStrict({type:'sprint3-test',nonce:999}),/Simulated connection lost/);
 assert.equal(guest.mp.getNetworkStats().failedWrites,1);
 guest.net.online=true;guest.navigator.onLine=true;
 await guest.mp.leaveRoom();
 const resumed=await guest.mp.joinRoom(room.roomId,'sprint3-transport',{name:'Returning'});
 assert.equal(resumed.side,'p'+players);
 await guest.mp.sendInputStrict({type:'sprint3-test',nonce:'reconnected'});
 assert.equal(received.filter(p=>p.from===guest.net.id&&p.nonce==='reconnected').length,1);
 assert.equal(received.filter(p=>p.from===guest.net.id).length,SAMPLE_COUNT+1);
 assert.equal(store.snap('mp_rooms/'+room.roomId).data().hostId,original.hostId);
 const acks=peers.slice(1).map(p=>p.mp.getNetworkStats().ackP95Ms).filter(Number.isFinite);
 const results={mode:'legacy',players,injectedRttMs:rtt,commands:received.length,
   ...summarize(acks),reconnected:true,duplicates:0};
 await Promise.all(peers.slice(1).map(p=>p.mp.leaveRoom()));
 await host.mp.leaveRoom();
 return results;
}
async function tftScenario(rtt){
 const store=new Store(),clients=[],nets=[],samples=[],stops=[];
 for(let i=0;i<4;i++){
  const net=session('tft'+i,rtt);
  nets.push(net);samples.push([]);
  const db={
   collection:store.collection.bind(store),
   runTransaction:async(fn)=>{if(!net.online)throw Error('Simulated connection lost');
     const result=await store.runTransaction(fn);net.tick();return result;}
  };
  clients.push(createTransport(E,db,{deviceId:net.id,clock:net.clock,
    random:()=>.17+i*.1,isOnline:()=>net.online,
    serverTimestamp:net.clock,setInterval:()=>0,clearInterval:()=>{}}));
 }
 const created=await clients[0].createRoom({name:'TFT host'});
 for(let i=1;i<4;i++)await clients[i].joinRoom(created.roomId,{name:'TFT '+i});
 for(let i=0;i<4;i++)stops.push(clients[i].subscribe({
  roomId:created.roomId,emit:(type,value)=>{
   if(type==='network'&&Number.isFinite(value.rttMs)&&value.rttMs>0)samples[i].push(value.rttMs);
  }
 }));
 await clients[0].startRoom();
 const statePath='mp_rooms/'+created.roomId+'/data/state',before=copy(store.values.get(statePath));
 await Promise.all(clients.map(c=>c.action({type:'BUY',index:0})));
 const after=copy(store.values.get(statePath));
 assert.equal(after.revision,before.revision+4);
 for(const id of after.playerOrder){
  const p=after.players[id];
  assert.equal(Object.keys(p.units).length,1);
  assert.ok(p.gold<before.players[id].gold);
 }
 for(let k=0;k<SAMPLE_COUNT;k++)
  await Promise.all(clients.map(c=>c.action({type:'TOGGLE_SHOP_LOCK'})));
 for(const uid of after.playerOrder){
  assert.equal(store.values.get(statePath).players[uid].shopLocked,false);
 }
 const baselineRevision=store.values.get(statePath).revision;
 nets[2].online=false;
 await assert.rejects(clients[2].action({type:'ROLL'}),/Mất kết nối/);
 assert.equal(store.values.get(statePath).revision,baselineRevision);
 nets[2].online=true;
 stops[2]();
 await clients[2].joinRoom(created.roomId,{name:'TFT returning'});
 stops[2]=clients[2].subscribe({roomId:created.roomId,emit:(type,value)=>{
  if(type==='network'&&Number.isFinite(value.rttMs)&&value.rttMs>0)samples[2].push(value.rttMs);
 }});
 assert.equal(clients[2].getState().revision,baselineRevision);
 await clients[2].action({type:'TOGGLE_SHOP_LOCK'});
 assert.equal(store.values.get(statePath).revision,baselineRevision+1);
 assert.equal(clients[2].getStatus().pending,0);
 const latest=store.values.get(statePath);
 assert.equal(latest.playerOrder.length,4);
 const all=samples.flat();
 const result={mode:'tft-atomic',players:4,injectedRttMs:rtt,
   commands:4+SAMPLE_COUNT*4+1,...summarize(all),reconnected:true,
   duplicates:latest.playerOrder.length-new Set(latest.playerOrder).size};
 for(const stop of stops)stop();
 return result;
}
async function run(){
 const results=[];
 for(const players of PLAYER_COUNTS)for(const rtt of LATENCIES)
  results.push(await legacyScenario(players,rtt));
 for(const rtt of LATENCIES)results.push(await tftScenario(rtt));
 for(const result of results){
  assert.equal(result.duplicates,0);
  assert.ok(result.p95Ms>0,'Metrics must have at least one observed synthetic ACK');
  assert.ok(result.reconnected);
 }
 const summary={kind:'OFFLINE_SIMULATION_NOT_REAL_PING',
   seed:'sprint3-pattern-v1',scenarios:results.length,
   result:results};
 console.log('SPRINT3_BENCHMARK_JSON '+JSON.stringify(summary));
 console.log('Sprint 3 deterministic transport tests: '+results.length+' scenarios PASS');
 return summary;
}
if(require.main===module)run().catch(e=>{console.error(e);process.exitCode=1;});
module.exports={run,legacyScenario,tftScenario,percentile,summarize};
