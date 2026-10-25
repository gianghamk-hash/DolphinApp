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
