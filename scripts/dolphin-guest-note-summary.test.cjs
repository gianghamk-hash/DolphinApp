'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
function setup(){let calls=0,fail=false;const nodes=[],status={textContent:''};const window={DolphinStaffId:{summarizeGuestNotes:async notes=>{calls++;if(fail)throw Error('offline');return {summaries:notes.map((n,id)=>({id,summaryScope:'services-v2',text:'Tóm tắt '+n,classification:{items:[],needsReview:false}}))};}}};vm.runInNewContext(fs.readFileSync(require.resolve('../dolphin-guest-note-summary.js'),'utf8'),{window,document:{querySelectorAll:()=>nodes,getElementById:()=>status}});return {status,api:window.DolphinGuestNoteSummary,nodes,calls:()=>calls,fail:()=>fail=true};}
test('AI responses update only the matching note without replacing disclosure DOM',async()=>{
 const h=setup(),node={dataset:{guestSummary:h.api.key('Ghi chú A')},textContent:''};h.nodes.push(node);
 await h.api.ensure([{dietNoteRaw:'Ghi chú A'}]);assert.equal(node.textContent,'Tóm tắt Ghi chú A');
 node.dataset.guestSummary=h.api.key('Ghi chú B');await h.api.ensure([{dietNoteRaw:'Ghi chú A'}]);assert.equal(node.textContent,'Xem ghi chú gốc');
 await h.api.ensure([{dietNoteRaw:'Ghi chú A'}]);assert.equal(h.calls(),1);
});
test('missing AI keeps source preview and backs off instead of blocking notes',async()=>{
 const h=setup();h.fail();await h.api.ensure([{dietNoteRaw:'Ghi chú gốc'}]);assert.equal(h.api.preview('Ghi chú gốc'),'Xem ghi chú gốc');assert.match(h.status.textContent,/Chưa tạo được tóm tắt/);
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

test('old backend text never leaks ignored guide, seat or allergy notes into preview',async()=>{
 const window={DolphinStaffId:{summarizeGuestNotes:async()=>({summaries:[{id:0,text:'HDV ăn như khách; dị ứng; cửa sổ',classification:{items:[],needsReview:false}}]})}};
 vm.runInNewContext(fs.readFileSync(require.resolve('../dolphin-guest-note-summary.js'),'utf8'),{window,document:{querySelectorAll:()=>[]}});
 await window.DolphinGuestNoteSummary.ensure([{dietNoteRaw:'Original H'}]);
 assert.equal(window.DolphinGuestNoteSummary.preview('Original H'),'Xem ghi chú gốc');
});
test('DP4634122 remains discoverable in Bungalow when AI fails or silently omits it',async()=>{
 const h=setup(),b=h.api.prepare({code:'DP4634122',dietNoteRaw:'- bungalow 401, phụ thu 2tr trên tàu'});
 assert(h.api.pending(b,'bungalow'));assert.equal(b.bung.length,0,'review cannot create a room assignment');
 await h.api.ensure([b]);assert(h.api.pending(b,'bungalow'),'empty AI output cannot hide the evidence');
 assert.match(h.status.textContent,/cần kiểm tra/);
});
test('missing service categories remain in review even when another service is confirmed',()=>{
 const h=setup(),b={dietNoteRaw:'2 set Veg; 1 tôm hùm; bungalow 401; 1 Lounge',_aiClassification:{needsReview:false,items:[{category:'Veg',state:'confirmed',setMenu:true}]}};
 assert(h.api.pending(b,'food'));assert(h.api.pending(b,'bungalow'));assert(h.api.pending(b,'lounge'));
 b._aiClassification.items.push({category:'lobster',state:'excluded'},{category:'bungalow',state:'confirmed'},{category:'lounge',state:'excluded'});
 assert(!h.api.pending(b,'food'));assert(!h.api.pending(b,'bungalow'));assert(!h.api.pending(b,'lounge'));
});
test('all requested meal labels, compact room notes and irrelevant notes are covered',()=>{
 const h=setup();
 for(const note of ['Chay Việt','Chay Âu','Indian Food','Veg','Non-veg','Jain','Halal','Gói menu Ấn','2 set noveg 1','1 suất tôm hùm'])assert(h.api.pending({dietNoteRaw:note},'food'),note);
 for(const note of ['01 HDV ăn như khách; đoàn không ăn bò','dị ứng tôm, bò, dê; cửa sổ; guide Trung','Không kayak/bamboo'])assert.equal(h.api.candidates(note).length,0,note);
 assert(h.api.pending({dietNoteRaw:'1private bungalow.'},'bungalow'));
 assert(!h.api.pending({noteRaw:'Đặt bungalow 401',dietNoteRaw:''},'bungalow'),'column I never used');
 assert.deepEqual(Array.from(h.api.candidates('2 set Non-veg')),['Non-veg']);
});
test('a failed batch does not prevent later bookings from being classified and manual retry is allowed',async()=>{
 let calls=0,forced=false;
 const window={DolphinStaffId:{summarizeGuestNotes:async(notes,options)=>{calls++;forced=options.refresh;if(calls===1)throw Error('offline');return {summaries:notes.map((note,id)=>({id,text:'',classification:{items:[],needsReview:false}}))};}}};
 vm.runInNewContext(fs.readFileSync(require.resolve('../dolphin-guest-note-summary.js'),'utf8'),{window,document:{querySelectorAll:()=>[],getElementById:()=>null}});
 const api=window.DolphinGuestNoteSummary,rows=Array.from({length:21},(_,i)=>api.prepare({dietNoteRaw:'Note '+i}));
 await api.ensure(rows);assert.equal(calls,2);assert(rows[20]._aiClassification);assert(!rows[0]._aiClassification);
 await api.retry();assert.equal(calls,4);assert(forced);assert(rows[0]._aiClassification);
});
