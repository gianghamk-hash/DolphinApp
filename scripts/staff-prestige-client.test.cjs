const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync(require('node:path').join(__dirname,'../staff-prestige-client.js'),'utf8').replace(/\bimport\(/g,'loadModule(');
function harness({linked=true,boardFails=false,mineFails=false,connectHangs=false}={}){
 const events=[],calls=[],timers=new Set();
 const window={DolphinStaffId:{ready:()=>connectHangs?new Promise(()=>{}):Promise.resolve(),get:()=>linked?{employeeId:'DOL-0001'}:null},dispatchEvent:e=>events.push(e),addEventListener(){}};
 const document={currentScript:{src:'https://example.test/staff-prestige-client.js'},readyState:'loading',hidden:false,addEventListener(){}};
 const modules={getApp:()=>({}),getAuth:()=>({currentUser:{uid:'test'},authStateReady:async()=>{}}),getFunctions:()=>({}),httpsCallable:(_,name)=>async()=>{
  calls.push(name);
  if(name==='staffGetPrestige'&&boardFails||name==='staffGetMyProgress'&&mineFails)throw Error('unavailable');
  return {data:name==='staffGetPrestige'?{champion:null,leaderboard:[]}:{level:1,xp:0}};
 }};
 vm.runInNewContext(source,{window,document,URL,location:{href:'https://example.test/'},console:{warn(){}},CustomEvent:class{constructor(type,opts){this.type=type;this.detail=opts.detail;}},loadModule:async()=>modules,setTimeout:fn=>{timers.add(fn);return fn;},clearTimeout:fn=>timers.delete(fn),localStorage:{getItem(){return null;},setItem(){}}});
 return {api:window.DolphinPrestige,calls,events,timers};
}
test('Hall of Fame failure does not block personal XP; failure is visible',async()=>{
 const h=harness({boardFails:true});await h.api.refresh();
 assert.equal(h.api.getMine().xp,0);
 assert.equal(h.api.getStatus().board.state,'error');
 assert.equal(h.api.getStatus().mine.state,'ready');
 assert.ok(h.events.some(e=>e.type==='dolphin-prestige-status'&&e.detail.state==='error'));
 assert.equal(h.timers.size,0);
});
test('personal XP failure does not discard public rankings',async()=>{
 const h=harness({mineFails:true});await h.api.refresh();
 assert.ok(h.api.getBoard());assert.equal(h.api.getStatus().mine.state,'error');
 assert.equal(h.api.getStatus().board.state,'ready');
});
test('unlinked profile has a registration message and no personal XP request',async()=>{
 const h=harness({linked:false});await h.api.refresh();
 assert.equal(h.api.getStatus().mine.state,'unlinked');
 assert.deepEqual(h.calls,['staffGetPrestige']);
 assert.equal(h.api.getMine(),null);
});
test('a stalled connection leaves loading state and allows another attempt',async()=>{
 const h=harness({connectHangs:true});
 let pending=h.api.refresh();for(const fn of [...h.timers])fn();await pending;
 assert.equal(h.api.getStatus().mine.state,'error');
 assert.equal(h.api.getStatus().board.state,'error');
 pending=h.api.refresh();assert.equal(h.api.getStatus().mine.state,'loading');
 for(const fn of [...h.timers])fn();await pending;
 assert.equal(h.api.getStatus().mine.state,'error');
});
