'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname,'..','..','dolphin-multiplayer.js'),'utf8');

function harness(){
  const values = new Map(), writes = [], timers = new Map(), elements = new Map();
  let reads = 0, nextTimer = 0;
  const localStorage = { getItem:key=>values.get(key)||null, setItem:(key,value)=>values.set(key,String(value)) };
  const document = {
    body:{appendChild(el){elements.set(el.id,el);}},
    getElementById:id=>elements.get(id)||null,
    createElement:()=>({style:{},textContent:'',setAttribute(){}})
  };
  const doc = p=>({
    get:async()=>{reads++;return {exists:false};},
    set:async value=>{writes.push({path:p,value});},
    update:async value=>{writes.push({path:p,value});},
    delete:async()=>{writes.push({path:p,deleted:true});},
    onSnapshot:()=>()=>{},
    collection:name=>collection(p+'/'+name),
  });
  const collection = p=>({doc:id=>doc(p+'/'+id),onSnapshot:()=>()=>{}});
  const window = {localStorage,document,navigator:{onLine:true},db:{collection}};
  const context = {window,document,localStorage,Date,Math,console,
    setInterval:(fn,ms)=>{const id=++nextTimer;timers.set(id,{fn,ms});return id;},
    clearInterval:id=>timers.delete(id)};
  vm.runInNewContext(source,context,{filename:'dolphin-multiplayer.js'});
  return {mp:window.DolphinMP,window,reads:()=>reads,writes,timers,elements};
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
