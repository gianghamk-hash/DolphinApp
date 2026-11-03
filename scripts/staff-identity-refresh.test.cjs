'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync(require.resolve('../staff-id.js'),'utf8');
const first=source.indexOf('function refresh(){');
const last=source.indexOf('\nfunction ui(){',first);
assert.ok(first>0&&last>first,'refresh function must exist');

function harness(responses){
 const events=[];
 const state={
  identity:{employeeId:'DOL-0001',name:'Manager',linked:true,verified:true},
  rejection:false,refreshPending:null,refreshSequence:0,unlinkedConfirmations:0,
  api:()=>async()=>{const next=responses.shift();if(typeof next==='function')return next();if(next instanceof Error)throw next;return {data:next};},
  emit:()=>events.push(state.identity),
  console:{warn:()=>{}},JSON,Promise,Error
 };
 const context=vm.createContext(state);
 vm.runInContext(source.slice(first,last),context);
 return {state,events,refresh:context.refresh};
}
test('transient unlinked response never immediately hides verified Manager',async()=>{
 const h=harness([{linked:false},{linked:true,employeeId:'DOL-0001',verified:true,name:'Manager'}]);
 await h.refresh();
 assert.equal(h.state.identity.employeeId,'DOL-0001');
 assert.equal(h.events.length,0);
 await h.refresh();
 assert.equal(h.state.identity.verified,true);
 assert.equal(h.events.length,0);
});
test('network failure preserves verified Staff ID',async()=>{
 const h=harness([new Error('network unavailable')]);
 await h.refresh();
 assert.equal(h.state.identity.employeeId,'DOL-0001');
 assert.equal(h.events.length,0);
});
test('two authoritative unlinked responses eventually clear identity',async()=>{
 const h=harness([{verified:false},{verified:false}]);
 await h.refresh();assert.equal(h.state.identity.employeeId,'DOL-0001');
 await h.refresh();assert.equal(h.state.identity,null);
 assert.equal(h.events.length,1);
});
test('concurrent refresh calls share a single in-flight backend request',async()=>{
 let release;const wait=new Promise(resolve=>{release=resolve});
 let requests=0;
 const h=harness([()=>{requests++;return wait.then(()=>({data:{linked:true,employeeId:'DOL-0001',name:'Manager',verified:true}}));}]);
 const a=h.refresh(),b=h.refresh();
 assert.equal(a,b);
 release();await Promise.all([a,b]);
 assert.equal(requests,1);
 assert.equal(h.state.identity.employeeId,'DOL-0001');
});
test('all identity asset entry points use consistent cache version',()=>{
 for(const file of ['index.html','dolphin-profile.html','staff-access.js','service-worker.js','scripts/staff-access.test.cjs']){
  const text=fs.readFileSync(require('node:path').join(__dirname,'..',file),'utf8');
  assert.match(text,/crew-identity-stable-v2/);
 }
});
