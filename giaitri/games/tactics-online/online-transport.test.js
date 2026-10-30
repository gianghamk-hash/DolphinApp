'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const E=require('../../../functions/tactics/engine');
const {createTransport,compact,MAX_QUEUE,PROTOCOL}=require('./online-transport');
const copy=value=>value===undefined?undefined:JSON.parse(JSON.stringify(value));
// Versioned store models Firestore optimistic retry/atomic commit semantics.
// No host listeners or input collection are involved in these four-client tests.
class Store{
 constructor(){this.values=new Map();this.versions=new Map();this.listeners=new Map();this.writes=[];this.repeatAfterCommit=false;}
 collection(path){return this.ref(path,true);}
 ref(path,collection=false){
  const store=this;
  return {path,collection:name=>store.ref(path+'/'+name,true),doc:name=>store.ref(path+'/'+name),
   get:async()=>store.snap(path),update:async fields=>{store.commit([{path,value:{...copy(store.values.get(path)),...fields}}]);},
   onSnapshot(...args){const cb=args.find(x=>typeof x==='function');const key=(collection?'collection:':'doc:')+path;
    const list=store.listeners.get(key)||new Set();list.add(cb);store.listeners.set(key,list);
    cb(collection?store.query(path):store.snap(path));return()=>list.delete(cb);
   }};
 }
 snap(path){const value=copy(this.values.get(path));return {exists:value!==undefined,data:()=>copy(value),metadata:{fromCache:false,hasPendingWrites:false}};}
 query(path){return {docs:[...this.values.keys()].filter(k=>k.startsWith(path+'/')&&k.slice(path.length+1).indexOf('/')<0).map(k=>({id:k.slice(path.length+1),...this.snap(k)}))};}
 commit(writes){
  for(const {path,value} of writes){value===undefined?this.values.delete(path):this.values.set(path,copy(value));this.versions.set(path,(this.versions.get(path)||0)+1);this.writes.push({path,value:copy(value)});}
  for(const {path} of writes){for(const fn of this.listeners.get('doc:'+path)||[])fn(this.snap(path));const collection=path.slice(0,path.lastIndexOf('/'));for(const fn of this.listeners.get('collection:'+collection)||[])fn(this.query(collection));}
 }
 async runTransaction(callback){
  for(let retry=0;retry<20;retry++){
   const reads=new Map(),writes=[];
   const result=await callback({get:async ref=>{assert.equal(writes.length,0,'all transaction reads precede writes');reads.set(ref.path,this.versions.get(ref.path)||0);return this.snap(ref.path);},
    set:(ref,value,opts)=>writes.push({path:ref.path,value:opts?.merge?{...copy(this.values.get(ref.path)),...copy(value)}:copy(value)}),
    update:(ref,value)=>writes.push({path:ref.path,value:{...copy(this.values.get(ref.path)),...copy(value)}}),
    delete:ref=>writes.push({path:ref.path,value:undefined})});
   if([...reads].some(([path,version])=>(this.versions.get(path)||0)!==version))continue;
   this.commit(writes);
   if(this.repeatAfterCommit&&writes.some(w=>w.path.endsWith('/data/state'))){this.repeatAfterCommit=false;continue;}
   return result;
  }
  throw Error('transaction conflict');
 }
}
async function match(){
 const db=new Store();let time=1000;
 const clients=['a','b','c','d'].map((deviceId,i)=>createTransport(E,db,{deviceId,clock:()=>time,random:()=>.15+i*.1,setInterval:()=>0,clearInterval:()=>{},serverTimestamp:()=>time}));
 const room=await clients[0].createRoom({name:'A'}),id=room.roomId;
 for(let i=1;i<4;i++)await clients[i].joinRoom(id,{name:String(i)});
 const events=clients.map(()=>[]),stops=clients.map((c,i)=>c.subscribe({roomId:id,emit:(type,payload)=>events[i].push({type,payload})}));
 await clients[0].startRoom();
 const statePath='mp_rooms/'+id+'/data/state';
 return {db,clients,id,events,stops,statePath,setTime:n=>{time=n;},state:()=>copy(db.values.get(statePath))};
}
test('four clients buy simultaneously without host relay, unique units and lost gold',async()=>{
 const m=await match(),before=m.state();
 await Promise.all(m.clients.map(c=>c.action({type:'BUY',index:0})));
 const after=m.state(),ids=[];
 for(const uid of after.playerOrder){const p=after.players[uid];assert.equal(p.gold,before.players[uid].gold-E.HERO[before.players[uid].shop[0]].cost);assert.equal(Object.keys(p.units).length,1);ids.push(...Object.keys(p.units));}
 assert.equal(new Set(ids).size,4);assert.equal(after.revision,5);
 for(const c of m.clients)assert.deepEqual(c.getState(),after);
 assert.ok(m.db.writes.every(w=>!w.path.includes('/inputs/')));
});
test('uncertain commit retried with the same receipt cannot buy or charge twice',async()=>{
 const m=await match();m.db.repeatAfterCommit=true;
 await m.clients[1].action({type:'BUY',index:0});
 const p=m.state().players.b;assert.equal(Object.keys(p.units).length,1);assert.equal(p.gold,10-E.HERO[Object.values(p.units)[0].heroId].cost);
 assert.equal(m.state().commandReceipts.b.length,1);
});
test('commands queue locally instead of rejecting the next click while waiting for host',async()=>{
 const m=await match();
 await Promise.all(Array.from({length:8},()=>m.clients[1].action({type:'TOGGLE_SHOP_LOCK'})));
 assert.equal(m.state().players.b.shopLocked,false);assert.equal(m.state().commandReceipts.b.length,8);
 assert.equal(m.clients[1].getStatus().pending,0);
});
test('host can leave active game; any surviving client advances exactly once',async()=>{
 const m=await match();m.stops[0]();await m.clients[0].leaveRoom(m.id);
 assert.equal(m.db.values.get('mp_rooms/'+m.id).status,'in_game');
 assert.equal(m.state().playerOrder.length,4);
 m.setTime(m.state().phaseEndsAt);
 await Promise.all(m.clients.slice(1).map(c=>c.advance()));assert.equal(m.state().roundPhase,'COMBAT');
 m.setTime(m.state().phaseEndsAt);
 await Promise.all(m.clients.slice(1).map(c=>c.advance()));assert.equal(m.state().roundPhase,'TRANSITION');
 const hp=m.state().players.b.hp;m.setTime(m.state().phaseEndsAt);
 await Promise.all(m.clients.slice(1).map(c=>c.advance()));assert.equal(m.state().round,2);assert.equal(m.state().players.b.hp,hp);assert.equal(m.state().players.b.xp,2);
 const joined=await m.clients[0].joinRoom(m.id,{name:'A'});assert.equal(joined.playerId,'a');
});
test('phase fence expires queued actions instead of applying them to the next round',async()=>{
 const m=await match();m.setTime(m.state().phaseEndsAt);
 const advance=m.clients[1].advance(),action=m.clients[1].action({type:'TOGGLE_SHOP_LOCK'});
 await advance;await assert.rejects(action,/Giai đoạn/);assert.equal(m.state().players.b.shopLocked,false);
});
test('all READY permits one early advance and never awards duplicate economy',async()=>{
 const m=await match();await Promise.all(m.clients.map(c=>c.action({type:'READY'})));
 await Promise.all(m.clients.map(c=>c.advance()));assert.equal(m.state().roundPhase,'COMBAT');assert.equal(m.state().round,1);
 await m.clients[2].advance();assert.equal(m.state().roundPhase,'COMBAT');
});
test('waiting host handover retains players and active reconnect does not reset state',async()=>{
 const db=new Store(),opts={clock:()=>1000,setInterval:()=>0,clearInterval:()=>{},serverTimestamp:()=>1000};
 const a=createTransport(E,db,{...opts,deviceId:'a'}),b=createTransport(E,db,{...opts,deviceId:'b'});
 const r=await a.createRoom({name:'A'});await b.joinRoom(r.roomId,{name:'B'});await a.leaveRoom(r.roomId);
 assert.equal(db.values.get('mp_rooms/'+r.roomId).hostId,'b');assert.equal(Object.keys(db.values.get('mp_rooms/'+r.roomId).seats).length,1);
});
test('no reports or event arrays are retransmitted by the compact protocol',()=>{
 const room=E.roomNew('a','A',0,123);room.playerOrder=['a','b','c','d'];room.status='in_game';room.round=12;room.phaseEndsAt=30000;
 for(const uid of room.playerOrder){const p=E.freshPlayer(uid,uid,room);room.players[uid]=p;p.level=9;for(let j=0;j<9;j++){const id=uid+j;p.units[id]={id,heroId:E.C.heroes[j].id,star:2,items:[]};p.board[E.boardKey(Math.floor(j/8),j%8)]=id;}}
 E.advance(room,room.phaseEndsAt);const full=E.clone(room);E.advance(full,full.phaseEndsAt);
 E.advance(room,room.phaseEndsAt,{recordEvents:false});
 const clean=compact(room);assert.deepEqual(clean.reports,compact(full).reports);
 assert.ok(full.reports.some(r=>r.events.length>0));assert.ok(room.reports.every(r=>r.events.length===0));
 const bytes=v=>Buffer.byteLength(JSON.stringify(v));assert.ok(bytes(clean)<bytes(full)*.1);assert.ok(bytes(clean)<15000);
 assert.equal(room.players.a.hp,full.players.a.hp);assert.equal(room.randomState,full.randomState);
 console.log('TFT payload benchmark:',JSON.stringify({before:bytes(full),after:bytes(clean),reduction:((1-bytes(clean)/bytes(full))*100).toFixed(1)+'%'}));
});
test('old protocol rooms fail explicitly and queue length is bounded',async()=>{
 const m=await match(),legacy='mp_rooms/OLD234';m.db.values.set(legacy,{game:'dolphin-tactics'});
 await assert.rejects(m.clients[1].joinRoom('OLD234',{name:'B'}),/phiên bản cũ/);
 const promises=Array.from({length:MAX_QUEUE},()=>m.clients[1].action({type:'TOGGLE_SHOP_LOCK'}));
 await assert.rejects(m.clients[1].action({type:'ROLL'}),/nhiều thao tác/);await Promise.all(promises);
 assert.equal(m.state().commandReceipts.b.length,24);assert.equal(m.db.values.get('mp_rooms/'+m.id).protocol,PROTOCOL);
});
test('leaving cancels queued commands and unsubscribes all three listeners',async()=>{
 const m=await match(),command=m.clients[1].action({type:'ROLL'});m.stops[1]();
 await assert.rejects(command,/Đã rời phòng/);assert.equal(m.state().players.b.gold,10);
 assert.equal([...m.db.listeners.values()].reduce((sum,x)=>sum+x.size,0),9);
});
test('placement responds before network commit; rejection restores committed board and gold',async()=>{
 const m=await match();await m.clients[1].action({type:'BUY',index:0});
 const uid='b',unit=Object.keys(m.state().players[uid].units)[0],before=m.state();
 const transaction=m.db.runTransaction.bind(m.db);let release;
 const gate=new Promise(resolve=>{release=resolve;});m.db.runTransaction=async cb=>{await gate;return transaction(cb);};
 const move=m.clients[1].action({type:'MOVE',unitId:unit,to:'board',index:'r0c3'});
 const preview=m.events[1].filter(e=>e.type==='state').at(-1).payload;
 assert.equal(preview.players.b.board.r0c3,unit);assert.deepEqual(m.clients[1].getState().players.b.board,{});
 assert.equal(preview.players.b.gold,before.players.b.gold);
 // A phase change wins the race while the request is in flight.
 const state=m.state();state.roundPhase='COMBAT';state.revision++;m.db.commit([{path:m.statePath,value:state}]);
 release();await assert.rejects(move,/Giai đoạn/);
 const reconciled=m.events[1].filter(e=>e.type==='state').at(-1).payload;
 assert.deepEqual(reconciled.players.b.board,{});assert.equal(reconciled.players.b.bench['0'],unit);
});
module.exports={Store};
