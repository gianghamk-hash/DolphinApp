'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
function setup(){let calls=0,fail=false;const nodes=[],status={textContent:''};const window={DolphinStaffId:{summarizeGuestNotes:async notes=>{calls++;if(fail)throw Error('offline');return {summaries:notes.map((n,id)=>({id,text:'Tóm tắt '+n,classification:{items:[],needsReview:false}}))};}}};vm.runInNewContext(fs.readFileSync(require.resolve('../dolphin-guest-note-summary.js'),'utf8'),{window,document:{querySelectorAll:()=>nodes,getElementById:()=>status}});return {status,api:window.DolphinGuestNoteSummary,nodes,calls:()=>calls,fail:()=>fail=true};}
test('AI responses update only the matching note without replacing disclosure DOM',async()=>{
 const h=setup(),node={dataset:{guestSummary:h.api.key('Ghi chú A')},textContent:''};h.nodes.push(node);
 await h.api.ensure([{dietNoteRaw:'Ghi chú A'}]);assert.equal(node.textContent,'Tóm tắt Ghi chú A');
 node.dataset.guestSummary=h.api.key('Ghi chú B');await h.api.ensure([{dietNoteRaw:'Ghi chú A'}]);assert.equal(node.textContent,'Ghi chú B');
 await h.api.ensure([{dietNoteRaw:'Ghi chú A'}]);assert.equal(h.calls(),1);
});
test('missing AI keeps source preview and backs off instead of blocking notes',async()=>{
 const h=setup();h.fail();await h.api.ensure([{dietNoteRaw:'Ghi chú gốc'}]);assert.equal(h.api.preview('Ghi chú gốc'),'Ghi chú gốc');assert.match(h.status.textContent,/Chưa tạo được tóm tắt/);
 await h.api.ensure([{dietNoteRaw:'Ghi chú gốc'}]);assert.equal(h.calls(),1);
});

test('column I is never sent to AI; I-only booking has no summary request',async()=>{
 const h=setup();await h.api.ensure([{noteRaw:'Không kayak/bamboo',dietNoteRaw:''}]);assert.equal(h.calls(),0);
 await h.api.ensure([{noteRaw:'H + Không kayak/bamboo',dietNoteRaw:'H'}]);assert.equal(h.api.preview('H'),'Tóm tắt H');
});
test('AI classifications replace keyword hits, exclude canceled tickets, preserve mixed service groups',async()=>{
 const window={},document={querySelectorAll:()=>[],getElementById:()=>null};
 vm.runInNewContext(fs.readFileSync(require.resolve('../dolphin-guest-note-summary.js'),'utf8'),{window,document});
 const api=window.DolphinGuestNoteSummary,note='Không ăn tôm hùm; đặt 2 bungalow; hủy lounge; 1 khách chay Việt';
 const b={dietNoteRaw:note,lob:['incorrect regex hit'],loungeTicket:{},bung:[]};api.prepare(b);
 assert.equal(b.lob.length,0);assert.equal(b.loungeTicket,null);
 window.DolphinStaffId={summarizeGuestNotes:async()=>({summaries:[{id:0,text:note,source:'original',classification:{needsReview:false,items:[
 {category:'diet-note',evidence:'Không ăn tôm hùm',state:'confirmed',quantity:0,room:''},
 {category:'lobster',evidence:'Không ăn tôm hùm',state:'excluded',quantity:0,room:''},
 {category:'bungalow',evidence:'đặt 2 bungalow',state:'confirmed',quantity:2,room:''},
 {category:'lounge',evidence:'hủy lounge',state:'excluded',quantity:0,room:''},
 {category:'Chay Việt',evidence:'1 khách chay Việt',state:'confirmed',quantity:1,room:''}
 ]}}]})};
 let renders=0;await api.ensure([b],()=>renders++);
 assert.equal(b.lob.length,0);assert.equal(b.loungeTicket,null);assert.equal(b.bung[0].n,2);assert.equal(b.diet.length,2);assert.equal(renders,1);
 const fresh={dietNoteRaw:note};api.prepare(fresh);await api.ensure([fresh]);assert.equal(fresh.bung[0].n,2);
});
test('switching tours while AI is pending never assigns old requirements to the new booking',async()=>{
 const window={},document={querySelectorAll:()=>[],getElementById:()=>null};
 vm.runInNewContext(fs.readFileSync(require.resolve('../dolphin-guest-note-summary.js'),'utf8'),{window,document});
 const api=window.DolphinGuestNoteSummary;let release,calls=0;
 window.DolphinStaffId={summarizeGuestNotes:async notes=>{calls++;if(calls===1)await new Promise(r=>release=r);return {summaries:notes.map((n,id)=>({id,text:n,classification:{needsReview:false,items:[{category:n==='A'?'lobster':'lounge',evidence:n,state:'confirmed',quantity:0,room:''}]}}))};}};
 const a=api.prepare({dietNoteRaw:'A'}),b=api.prepare({dietNoteRaw:'B'});
 const first=api.ensure([a]);await api.ensure([b]);release();await first;await new Promise(r=>setImmediate(r));
 assert.equal(b.lob.length,0);assert.equal(b.loungeTicket.note,'B');
});
