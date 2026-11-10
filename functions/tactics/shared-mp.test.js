const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'..','..','dolphin-multiplayer.js'),'utf8');
function harness(){
 const storage=new Map();
 const localStorage={getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,String(v))};
 const window={localStorage};
 const context={window,localStorage,Date,Math,console,setInterval:()=>0,clearInterval:()=>{}};
 vm.runInNewContext(source,context,{filename:'dolphin-multiplayer.js'});
 return window.DolphinMP;
}
test('adapter: 4-player room creation, shared listeners, and cleanup',async()=>{
 const mp=harness(),events={room:[],players:[],state:[]};let emit,cleanupCount=0,leaveCount=0;
 mp.onRoom(v=>events.room.push(v));mp.onPlayers(v=>events.players.push(v));mp.onState(v=>events.state.push(v));
 mp.registerAdapter('tactics-test',{
  createRoom:async()=>({roomId:'ABC234',playerId:'firebase-user-1',side:'p1',isHost:true}),
  joinRoom:async()=>({roomId:'DEF456',playerId:'firebase-user-2',side:'p2',isHost:false}),
  subscribe:input=>{emit=input.emit;return()=>cleanupCount++;},
  leaveRoom:async id=>{assert.equal(id,'ABC234');leaveCount++;},
  setReady:async ready=>{assert.equal(ready,true);}
 });
 const r=await mp.createRoom('tactics-test',{name:'Giang'});
 assert.equal(r.roomId,'ABC234');assert.equal(mp.getRoomId(),'ABC234');assert.equal(mp.getPlayerId(),'firebase-user-1');
 emit('room',{id:'ABC234',isHost:true});emit('players',{players:[{id:'firebase-user-1'},{id:'b'},{id:'c'},{id:'d'}]});
 emit('state',{round:2,roundPhase:'PREPARATION'});
 assert.equal(events.players[0].players.length,4);assert.equal(events.state[0].round,2);
 assert.equal(events.room.length,1);assert.equal(mp.isHost(),true);
 await mp.setReady(true);
 await assert.rejects(()=>mp.sendState({hp:100}),/Không thể ghi trạng thái/);
 await assert.rejects(()=>mp.updateRoomStatus('finished'),/server quản lý/);
 await mp.leaveRoom();
 assert.equal(cleanupCount,1);assert.equal(leaveCount,1);assert.equal(mp.getRoomId(),null);
});
test('adapter join returns same six character code, does not touch Firestore',async()=>{
 const mp=harness();
 mp.registerAdapter('tactics-test',{
  createRoom:async()=>({roomId:'ABC234'}),
  joinRoom:async code=>{assert.equal(code,'DEF456');return{roomId:code,playerId:'firebase-user-2',isHost:false,side:'p2'};},
  subscribe:()=>()=>{}
 });
 const r=await mp.joinRoom('DEF456','tactics-test',{name:'Guest'});
 assert.equal(r.roomId,'DEF456');assert.equal(mp.getSide(),'p2');assert.equal(mp.isHost(),false);
});
test('existing 2-player games still select original Firestore path',async()=>{
 const mp=harness();
 await assert.rejects(()=>mp.createRoom('snake-coop',{name:'Guest'}),/Chưa kết nối Firebase/);
});


test('all three legacy 2-player games create a Firestore room after shared script loads',async()=>{
 for(const game of ['dolphin-battleship','dolphin-caro','dolphin-xiangqi']){
  const storage=new Map(),writes=[];
  const localStorage={getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,String(v))};
  const snapshot=()=>({exists:false,data:()=>null});
  const doc=(path)=>({
   get:async()=>snapshot(),set:async data=>{writes.push({path,data});},
   update:async data=>{writes.push({path,update:data});},
   onSnapshot:()=>()=>{},
   collection:collectionPath=>collection(path+'/'+collectionPath),
  });
  const collection=path=>({
   doc:id=>doc(path+'/'+id),
   onSnapshot:()=>()=>{}
  });
  const window={localStorage,db:{collection}};
  const ctx={window,localStorage,Date,Math,console,setInterval:()=>0,clearInterval:()=>{}};
  vm.runInNewContext(source,ctx,{filename:'dolphin-multiplayer.js'});
  const mp=window.DolphinMP;
  assert.equal(typeof mp.createRoom,'function','shared script must parse and attach the multiplayer API');
  const result=await mp.createRoom(game,{name:'Dolphin Tester',maxPlayers:2});
  assert.match(result.roomId,/^[A-Z2-9]{6}$/);
  assert.equal(result.isHost,true);assert.equal(result.side,'p1');
  const created=writes.find(x=>x.path==='mp_rooms/'+result.roomId&&x.data);
  assert.equal(created?.data.game,game);
  assert.equal(created?.data.status,'waiting');
  assert.equal(created?.data.seats.p1,mp.getDeviceId());
  assert(writes.some(x=>x.path.includes('/players/')&&x.data?.side==='p1'));
 }
});
test('adapter registration rejects missing create/join/subscribe and accepts a valid adapter',()=>{
 const mp=harness();
 assert.throws(()=>mp.registerAdapter('broken',{}),/Multiplayer adapter/);
 assert.throws(()=>mp.registerAdapter('broken',{createRoom:()=>{}}),/Multiplayer adapter/);
 assert.throws(()=>mp.registerAdapter('broken',{createRoom:()=>{},joinRoom:()=>{}}),/Multiplayer adapter/);
 const unregister=mp.registerAdapter('tactics',{createRoom:async()=>({roomId:'ABC234'}),joinRoom:async()=>({roomId:'DEF456'}),subscribe:()=>()=>{}});
 assert.equal(typeof unregister,'function');
});
