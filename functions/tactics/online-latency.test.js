'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname,'..','..','dolphin-multiplayer.js'),'utf8');

function harness(opts={}){
  const values = new Map(), writes = [], timers = new Map(), elements = new Map();
  const pendingInputs=[],pendingStates=[],listeners=new Map();
  let now=Date.now();
  let reads = 0, nextTimer = 0;
  const localStorage = { getItem:key=>values.get(key)||null, setItem:(key,value)=>values.set(key,String(value)) };
  const document = {
    body:{appendChild(el){elements.set(el.id,el);}},
    getElementById:id=>elements.get(id)||null,
    createElement:()=>({style:{},textContent:'',setAttribute(){}})
  };
  const doc = p=>({
    get:async()=>{reads++;return {exists:false};},
    set:async value=>{
      writes.push({path:p,value});
      if(opts.holdInputs&&p.includes('/inputs/'))
        await new Promise(resolve=>pendingInputs.push(resolve));
      if(opts.holdStates&&p.endsWith('/data/state'))
        await new Promise(resolve=>pendingStates.push(resolve));
    },
    update:async value=>{writes.push({path:p,value});},
    delete:async()=>{writes.push({path:p,deleted:true});},
    onSnapshot:callback=>{
      listeners.set(p,callback);
      return ()=>listeners.delete(p);
    },
    collection:name=>collection(p+'/'+name),
  });
  const collection = p=>({doc:id=>doc(p+'/'+id),onSnapshot:callback=>{
    listeners.set(p,callback);
    return ()=>listeners.delete(p);
  }});
  const window = {localStorage,document,navigator:{onLine:true},db:{collection}};
  const fakeDate={now:()=>now};
  const context = {window,document,localStorage,Date:fakeDate,Math,console,
    setInterval:(fn,ms)=>{const id=++nextTimer;timers.set(id,{fn,ms});return id;},
    clearInterval:id=>timers.delete(id)};
  vm.runInNewContext(source,context,{filename:'dolphin-multiplayer.js'});
  return {mp:window.DolphinMP,window,reads:()=>reads,writes,timers,elements,
    advance:ms=>{now+=ms;},pendingInputs,pendingStates,
    releaseInput:()=>{const fn=pendingInputs.shift();assert.ok(fn,'No queued input write');fn();},
    releaseState:()=>{const fn=pendingStates.shift();assert.ok(fn,'No queued state write');fn();},
    emitInput:(room,docs)=>{
      const listener=listeners.get('mp_rooms/'+room+'/inputs');
      assert.equal(typeof listener,'function');
      listener({docChanges:()=>docs.map(d=>({type:d.type||'modified',doc:{id:d.id,data:()=>d.value}}))});
    }
  };
}
test('live ping HUD uses existing heartbeat acknowledgement and cleans up on leave',async()=>{
  const h=harness();
  const room=await h.mp.createRoom('dolphin-chess',{name:'Tester'});
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(h.mp.getRoomId(),room.roomId);
  assert.equal(h.reads(),1,'no additional polling reads for ping');
  const sample=h.mp.getPing();
  assert.equal(sample.online,true);
  assert.ok(Number.isInteger(sample.rttMs) && sample.rttMs>=0);
  const badge=h.elements.get('dolphin-online-ping');
  assert.ok(badge?.textContent.includes('PING'));
  assert.equal(badge.style.display,'block');
  assert.equal(h.timers.size,2,'one presence timer and one local UI timer');
  h.window.navigator.onLine=false;
  for(const {fn,ms} of h.timers.values())if(ms===1000)fn();
  assert.match(badge.textContent,/OFFLINE/);
  h.window.navigator.onLine=true;
  await h.mp.leaveRoom();
  assert.equal(h.mp.getRoomId(),null);
  assert.equal(h.timers.size,0,'no leaked timer after leaving');
  assert.equal(badge.style.display,'none');
});
test('Snake events bypass ordinary 100ms frame throttle without changing the API',async()=>{
  const h=harness();
  await h.mp.createRoom('snake-coop',{name:'Tester'});
  await h.mp.sendState({tick:1,snakes:[]});
  await h.mp.sendState({tick:2,__event:{type:'eat',id:'p1'}});
  const stateWrites=h.writes.filter(w=>w.path.endsWith('/data/state'));
  assert.equal(stateWrites.length,2,'critical event must not be dropped');
  assert.equal(stateWrites[1].value.__event.type,'eat');
  await h.mp.leaveRoom();
});
test('Tactics adapter supplies real Firebase RTT and shares the same HUD lifecycle',async()=>{
  const h=harness();
  let emit,cleaned=0;
  h.mp.registerAdapter('dolphin-tactics',{
    createRoom:async()=>({roomId:'ABC234',playerId:'staff',isHost:true,side:'p1'}),
    joinRoom:async code=>({roomId:code,playerId:'staff',isHost:false,side:'p2'}),
    subscribe:args=>{emit=args.emit;return()=>cleaned++;},
    leaveRoom:async()=>{}
  });
  await h.mp.createRoom('dolphin-tactics',{name:'Tester'});
  emit('network',{rttMs:123,online:true});
  assert.equal(h.mp.getPing().rttMs,123);
  assert.match(h.elements.get('dolphin-online-ping').textContent,/123 ms/);
  assert.equal(h.reads(),0,'adapter should not create a Firestore ping request');
  await h.mp.leaveRoom();
  assert.equal(cleaned,1);
  assert.equal(h.elements.get('dolphin-online-ping').style.display,'none');
});

test('Sprint 1: rapid distinct inputs are serialized and buffered in the same document',async()=>{
  const h=harness({holdInputs:true});
  const {roomId}=await h.mp.createRoom('dolphin-chess',{name:'Tester'});
  const p1=h.mp.sendInputStrict({type:'chess-move',ply:0,from:'e2',to:'e4'});
  const p2=h.mp.sendInputStrict({type:'chess-move',ply:2,from:'g1',to:'f3'});
  const p3=h.mp.sendInputStrict({type:'chess-move',ply:4,from:'d2',to:'d4'});
  await new Promise(resolve=>setImmediate(resolve));
  const inputWrites=()=>h.writes.filter(w=>w.path.endsWith('/inputs/'+h.mp.getDeviceId()));
  assert.equal(inputWrites().length,1,'second write waits for first server ACK');
  assert.equal(h.pendingInputs.length,1);
  h.releaseInput();await p1;await new Promise(resolve=>setImmediate(resolve));
  assert.equal(inputWrites().length,2);
  h.releaseInput();await p2;await new Promise(resolve=>setImmediate(resolve));
  assert.equal(inputWrites().length,3);
  h.releaseInput();await p3;
  const log=inputWrites().at(-1).value.__mpInputLog;
  assert.deepEqual(Array.from(log,x=>x.data.ply),[0,2,4]);
  assert.equal(new Set(log.map(x=>x.id)).size,3);
  assert.equal(inputWrites()[2].value.ply,4,'latest command remains at legacy document root');
  assert.equal(h.mp.getNetworkStats().pendingInputs,0);
  assert.equal(h.mp.getNetworkStats().failedWrites,0);
  await h.mp.leaveRoom();
});
test('Sprint 1: delayed listener unpacks unseen commands once while legacy messages still work',async()=>{
  const h=harness(),{roomId}=await h.mp.createRoom('dolphin-caro',{name:'Host'});
  const events=[];h.mp.onInput(p=>events.push(p));
  const make=(id,n)=>({id,data:{type:'caro-chat',text:'message '+n,at:n}});
  const a=make('session:1',1),b=make('session:2',2),c=make('session:3',3),d=make('session:4',4);
  h.emitInput(roomId,[{id:'remote',value:{...b.data,__mpInputLog:[a,b]}}]);
  assert.deepEqual(events.map(e=>e.text),['message 2'],'initial subscription should not replay old chat history');
  h.emitInput(roomId,[{id:'remote',value:{...d.data,__mpInputLog:[a,b,c,d]}}]);
  h.emitInput(roomId,[{id:'remote',value:{...d.data,__mpInputLog:[a,b,c,d]}}]);
  assert.deepEqual(events.map(e=>e.text),['message 2','message 3','message 4']);
  h.emitInput(roomId,[{id:'legacy',value:{type:'caro-chat',text:'old client'}}]);
  assert.equal(events.at(-1).text,'old client');
  // An offline first snapshot may be empty: when a player appears later,
  // never replay their entire old log as if every action were new.
  h.emitInput(roomId,[]);
  h.emitInput(roomId,[{id:'late-player',value:{...b.data,__mpInputLog:[a,b]}}]);
  assert.equal(events.at(-1).text,'message 2');
  assert.equal(events.length,5);
  await h.mp.leaveRoom();
});
test('Sprint 1: slow state ACK coalesces normal frames without dropping critical Snake events',async()=>{
  const h=harness({holdStates:true}),{roomId}=await h.mp.createRoom('snake-coop',{name:'Host'});
  const tick=n=>({tick:n,snakes:[],ts:n});
  h.advance(200);const one=h.mp.sendState(tick(1));
  h.advance(200);const two=h.mp.sendState(tick(2));
  h.advance(200);const three=h.mp.sendState(tick(3));
  const event=h.mp.sendState({tick:3,__event:{type:'eat',id:'p1'}});
  h.advance(200);const four=h.mp.sendState(tick(4));
  const stateWrites=()=>h.writes.filter(w=>w.path.endsWith('/data/state'));
  assert.equal(stateWrites().length,1,'only first state is in flight');
  h.releaseState();await one;await new Promise(resolve=>setImmediate(resolve));
  assert.equal(stateWrites().length,2);assert.equal(stateWrites()[1].value.tick,3);
  h.releaseState();await Promise.all([two,three]);await new Promise(resolve=>setImmediate(resolve));
  assert.equal(stateWrites()[2].value.__event.type,'eat');
  h.releaseState();await event;await new Promise(resolve=>setImmediate(resolve));
  assert.equal(stateWrites()[3].value.tick,4);
  h.releaseState();await four;
  assert.deepEqual(stateWrites().map(w=>w.value.tick),[1,3,3,4]);
  assert.equal(h.mp.getNetworkStats().pendingStates,0);
  await h.mp.leaveRoom();
});
test('Sprint 1: write failures do not deadlock later inputs and ACK diagnostics reset on leave',async()=>{
  const h=harness({holdInputs:true});
  await h.mp.createRoom('dolphin-caro',{name:'Tester'});
  const first=h.mp.sendInputStrict({type:'caro-chat',text:'A'});
  await new Promise(resolve=>setImmediate(resolve));
  h.releaseInput();await first;
  const stats=h.mp.getNetworkStats();
  assert.ok(Number.isInteger(stats.ackMs));
  assert.ok(Number.isInteger(stats.ackP95Ms));
  assert.ok(Number.isInteger(stats.jitterMs));
  assert.equal(stats.failedWrites,0);
  await h.mp.leaveRoom();
  assert.equal(h.mp.getNetworkStats().ackMs,null);
  assert.equal(h.mp.getNetworkStats().pendingInputs,0);
});

test('Sprint 1: input queue is bounded under a hung network and room leave cancels queued commands',async()=>{
  const h=harness({holdInputs:true});
  await h.mp.createRoom('snake-coop',{name:'Guest'});
  const errors=[];h.mp.onError(e=>errors.push(e.type));
  const sends=Array.from({length:33},(_,i)=>h.mp.sendInput({dir:i%2?'up':'left'}));
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(h.mp.getNetworkStats().pendingInputs,32);
  assert.equal(h.pendingInputs.length,1,'one active write, not 32 simultaneous writes');
  assert.deepEqual(errors,['input_backpressure']);
  await h.mp.leaveRoom();
  h.releaseInput();
  await Promise.all(sends);
  assert.equal(h.mp.getRoomId(),null);
  assert.equal(h.mp.getNetworkStats().pendingInputs,0);
});
test('Sprint 1: leaving a room settles unsent normal states without spilling into another room',async()=>{
  const h=harness({holdStates:true});
  await h.mp.createRoom('snake-coop',{name:'Host'});
  h.advance(200);
  const first=h.mp.sendState({tick:1});
  h.advance(200);
  const queued=h.mp.sendState({tick:2});
  assert.equal(h.writes.filter(w=>w.path.endsWith('/data/state')).length,1);
  await h.mp.leaveRoom();
  await queued;
  h.releaseState();await first;
  assert.equal(h.writes.filter(w=>w.path.endsWith('/data/state')).length,1);
});

test('Sprint 2: Snake guest head interpolation is bounded and never predicts game state',()=>{
  const html=fs.readFileSync(path.join(__dirname,'..','..','giaitri/games/snake-coop-online.html'),'utf8');
  const marker='function interpolateSnakeHead(previous, current, progress){';
  const start=html.indexOf(marker),end=html.indexOf('\nfunction stopSnakeSmoothing()',start);
  assert.ok(start>0&&end>start,'Pure interpolation helper must exist');
  const interpolate=vm.runInNewContext(html.slice(start,end)+'; interpolateSnakeHead;');
  const snake=(x,y,alive=true)=>({id:'p1',alive,body:[{x,y}]});
  assert.deepEqual(JSON.parse(JSON.stringify(interpolate(snake(2,3),snake(3,3),.5))),{x:2.5,y:3});
  assert.deepEqual(JSON.parse(JSON.stringify(interpolate(snake(2,3),snake(3,3),12))),{x:3,y:3});
  assert.deepEqual(JSON.parse(JSON.stringify(interpolate(snake(2,3),snake(3,3),-2))),{x:2,y:3});
  assert.equal(interpolate(snake(2,3),snake(6,3),.5),null,'Packet gaps must snap rather than predict');
  assert.equal(interpolate(snake(2,3),snake(3,3,false),.5),null,'Death must snap');
  assert.equal(interpolate(snake(2,3,false),snake(3,3),.5),null,'Respawn must snap');
  assert.equal(interpolate(null,snake(3,3),.5),null);
  assert.match(html,/smoothSnakeSnapshot\(previous,st\)/,'Only guest snapshots trigger visual interpolation');
  assert.match(html,/if \(!Array\.isArray\(st\.snakes\)\) return/,'Event-only packets do not reset authoritative game state');
  assert.match(html,/stopSnakeSmoothing\(\);[\s\S]{0,150}if \(gameOverFlag\) return/,'Game over stops animation');
  assert.match(html,/prefers-reduced-motion: reduce/,'Reduced motion must be respected');
  assert.match(html,/snakeSmoothFrame=requestAnimationFrame\(paintSnakeSmoothFrame\)/);
  assert.match(html,/#board\.snake-smoothing/);
});
