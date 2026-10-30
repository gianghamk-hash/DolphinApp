'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),{create}=require('./match-results'),{rowsFor}=require('../../../dolphin-tactics-results');
const settle=()=>new Promise(resolve=>setImmediate(resolve));
function element(){const classes=new Set(['hidden']);return {textContent:'',innerHTML:'',dataset:{},classList:{add:c=>classes.add(c),remove:c=>classes.delete(c),contains:c=>classes.has(c),toggle:(c,on)=>on?classes.add(c):classes.delete(c)},addEventListener(){},focus(){},querySelectorAll:()=>[]};}
function state(){return {status:'finished',seed:1,round:19,winnerId:'a',playerOrder:['a','b','c','d'],finalPlacements:{a:1,b:2,c:3,d:4},players:Object.fromEntries(['a','b','c','d'].map(uid=>[uid,{displayName:uid==='b'?'<img onerror=evil()>':uid,hp:uid==='a'?50:0,level:8}]))};}
function harness(sync){const nodes=Object.fromEntries(['modal','title','subtitle','table','status','retryButton','closeButton'].map(key=>[key,element()]));let calls=0;const view=create({...nodes,rowsFor,sync:(...args)=>{calls++;return sync(...args);}});return {...nodes,view,calls:()=>calls};}
test('game-over automatically opens four placements, highlights self and synchronizes only once',async()=>{
 const h=harness(async()=>{}),s=state();h.view.update(s,{uid:'a',roomId:'ABC234',offline:false});await settle();
 assert.equal(h.modal.classList.contains('hidden'),false);assert.match(h.title.textContent,/CHIẾN THẮNG/);assert.match(h.subtitle.textContent,/hạng 1\/4/);
 assert.equal((h.table.innerHTML.match(/<tr /g)||[]).length,4);assert.match(h.table.innerHTML,/class="isMe"/);assert.ok(h.table.innerHTML.includes('&lt;img'));assert.ok(!h.table.innerHTML.includes('<img'));
 assert.match(h.status.textContent,/Đã đồng bộ/);h.view.close();h.view.update({...s,revision:22},{uid:'a',roomId:'ABC234',offline:false});
 assert.equal(h.calls(),1);assert.equal(h.modal.classList.contains('hidden'),true);h.view.open();assert.equal(h.modal.classList.contains('hidden'),false);
});
test('offline results display all four players without adding online statistics',async()=>{
 const h=harness(async()=>{});h.view.update(state(),{uid:'b',roomId:'',offline:true});await settle();
 assert.equal(h.calls(),0);assert.match(h.status.textContent,/không cộng/);assert.match(h.title.textContent,/KẾT THÚC/);
});
test('sync failure is visible and retry succeeds without hiding the results',async()=>{
 let fail=true;const h=harness(async()=>{if(fail)throw Error('Mất mạng');});h.view.update(state(),{uid:'a',roomId:'ABC234',offline:false});await settle();
 assert.equal(h.retryButton.classList.contains('hidden'),false);assert.match(h.status.textContent,/Chưa đồng bộ/);
 fail=false;await h.view.retry();assert.match(h.status.textContent,/Đã đồng bộ/);assert.equal(h.retryButton.classList.contains('hidden'),true);
});
test('late network response from a previous room cannot change a reset result screen',async()=>{
 let finish;const h=harness(()=>new Promise(resolve=>{finish=resolve;}));h.view.update(state(),{uid:'a',roomId:'ABC234',offline:false});await settle();
 h.view.reset();h.status.textContent='new room';finish();await settle();assert.equal(h.status.textContent,'new room');assert.equal(h.modal.classList.contains('hidden'),true);
});
