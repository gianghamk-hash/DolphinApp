'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
function setup(){let calls=0,fail=false;const nodes=[];const window={DolphinStaffId:{summarizeGuestNotes:async notes=>{calls++;if(fail)throw Error('offline');return {summaries:notes.map((n,id)=>({id,text:'Tóm tắt '+n}))};}}};vm.runInNewContext(fs.readFileSync(require.resolve('../dolphin-guest-note-summary.js'),'utf8'),{window,document:{querySelectorAll:()=>nodes}});return {api:window.DolphinGuestNoteSummary,nodes,calls:()=>calls,fail:()=>fail=true};}
test('AI responses update only the matching note without replacing disclosure DOM',async()=>{
 const h=setup(),node={dataset:{guestSummary:h.api.key('Ghi chú A')},textContent:''};h.nodes.push(node);
 await h.api.ensure([{noteRaw:'Ghi chú A'}]);assert.equal(node.textContent,'Tóm tắt Ghi chú A');
 node.dataset.guestSummary=h.api.key('Ghi chú B');await h.api.ensure([{noteRaw:'Ghi chú A'}]);assert.equal(node.textContent,'Ghi chú B');
 await h.api.ensure([{noteRaw:'Ghi chú A'}]);assert.equal(h.calls(),1);
});
test('missing AI keeps source preview and backs off instead of blocking notes',async()=>{
 const h=setup();h.fail();await h.api.ensure([{noteRaw:'Ghi chú gốc'}]);assert.equal(h.api.preview('Ghi chú gốc'),'Ghi chú gốc');
 await h.api.ensure([{noteRaw:'Ghi chú gốc'}]);assert.equal(h.calls(),1);
});
