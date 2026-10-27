const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const code=fs.readFileSync(require('node:path').join(__dirname,'staff-sync.js'),'utf8');
function harness(seed={},allow=true){
 const map=new Map(Object.entries(seed)), events=[],toasts=[],els={};
 const ctx={
   window:{confirm:()=>allow,alert:m=>toasts.push(m),showToast:m=>toasts.push(m),dispatchEvent:e=>events.push(e)},
   localStorage:{getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,v)},
   document:{readyState:'loading',addEventListener(){},getElementById:id=>els[id]||null},
   setInterval:()=>0,clearInterval(){},setTimeout(){},
   CustomEvent:class{constructor(type,v){this.type=type;this.detail=v.detail;}},
   console:{log(){}}
 };
 vm.runInNewContext(code,ctx);
 return {map,events,toasts,els,window:ctx.window};
}
test('new staff name is saved and locked on first confirmation',()=>{
 const h=harness();
 assert.equal(h.window.setSyncedStaffName(' Lan '),true);
 assert.equal(h.window.getSyncedStaffName(),'Lan');
 assert.equal(h.window.isStaffNameLocked(),true);
 assert.equal(h.window.setSyncedStaffName('Other'),false);
 assert.equal(h.window.getSyncedStaffName(),'Lan');
});
test('old staff has one final name update before lock',()=>{
 const h=harness({dolphinStaffName:'Old'});
 assert.equal(h.window.isStaffNameLocked(),false);
 assert.equal(h.window.setSyncedStaffName('New'),true);
 assert.equal(h.window.getSyncedStaffName(),'New');
 assert.equal(h.window.setSyncedStaffName('Third'),false);
});
test('declining confirmation does not lock or replace',()=>{
 const h=harness({dolphinStaffName:'Original'},false);
 assert.equal(h.window.setSyncedStaffName('Replacement'),false);
 assert.equal(h.window.getSyncedStaffName(),'Original');
 assert.equal(h.window.isStaffNameLocked(),false);
});
test('legacy Show seller is migrated to shared name',()=>{
 const h=harness({dolphinShowSeller:'Show Staff'});
 assert.equal(h.window.getSyncedStaffName(),'Show Staff');
 assert.equal(h.window.setSyncedStaffName('New Staff'),true);
 assert.equal(h.map.get('dolphinShowSeller'),'New Staff');
});
