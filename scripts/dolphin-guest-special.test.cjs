'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const rules=require('../dolphin-guest-special-rules.js');
const html=fs.readFileSync(path.join(__dirname,'..','dolphin-guests.html'),'utf8');
function segment(start,end){
 const i=html.indexOf(start),j=html.indexOf(end,i+start.length);
 assert(i>=0&&j>i,'Missing Dolphin Guest section '+start);
 return html.slice(i,j);
}
function originalParser(){
 const source=segment('function parse(rows){','function scopeOk(b){');
 const dietary=segment('var BUNG=/bungalow/i,LOB=','/* ═══════════════════════════════════════════════════════════');
 const context={
  window:{DolphinGuestSpecialRules:rules},
  ROOMS:['201','202','203','204'],
  seg:s=>String(s||'').split(/\n/).map(s=>s.replace(/^\s*[-–]\s*/,'').trim()).filter(Boolean),
  detectLoungeTicket:()=>null,detectShowSlots:()=>[],
  normalizeTables:s=>String(s||''),tables:()=>[],areaName:s=>s,
 };
 return rows=>vm.runInNewContext(dietary+source+';parse(rows)',{...context,rows});
}
const pakoraNote=[
 '- Đặt 02 bungalow (1tr8) đã thanh toán',
 '- 13 set Veg 1 => nhờ bếp chia thành 14 set giúp em vì có 01 bạn 2024 (gói không dùng buffet)',
 '- Đặt 01 set pakora cho 04 khách (200k) đã thanh toán'
].join('\n');
test('11/11 booking DP4633710: Pakora is not lost behind Veg and Bungalow notes',()=>{
 const fnb=rules.detect(pakoraNote);
 assert.equal(fnb.length,1);
 assert.deepEqual(fnb.map(x=>x.type),['pakora']);
 const p=fnb[0];
 assert.equal(p.label,'Pakora');assert.equal(p.quantity,1);assert.equal(p.guests,4);
 assert.equal(p.price,'200k');assert.equal(p.payment,'paid');
 assert.match(p.note,/01 set pakora cho 04 khách/);
 assert.match(p.note,/đã thanh toán/);
 const rows=[['1','DP4633710','Crossing Vietnam Tour','Kushal','14','Ấn Độ','D5-D6',pakoraNote,'']];
 const bookings=originalParser()(rows);
 assert.equal(bookings.length,1);
 assert.equal(bookings[0].code,'DP4633710');
 assert.equal(bookings[0].bung.length,1);
 assert.equal(bookings[0].diet.length,1);
 assert.equal(bookings[0].specialFood.length,1);
 assert.equal(bookings[0].specialFood[0].payment,'paid');
});
test('10/11: Coconut Welcome and Trà Ấn are independent F&B services even on one line in the secondary note column',()=>{
 const note='Coconut Welcome + Trà Ấn';
 const rows=[['1','DP000010','Partner Agency','Guest A','6','Ấn Độ','A1','',note]];
 const items=originalParser()(rows)[0].specialFood;
 assert.deepEqual(items.map(x=>x.type),['coconut-welcome','indian-tea']);
 assert.deepEqual(items.map(x=>x.label),['Coconut Welcome','Trà Ấn']);
 assert.equal(items[0].payment,null);
 assert.equal(items[1].payment,null);
});
test('spelling variants, accent-free notes, and paid/unpaid status',()=>{
 assert.equal(rules.detect('Welcome coconut')[0].type,'coconut-welcome');
 assert.equal(rules.detect('Nước dừa chào mừng')[0].type,'coconut-welcome');
 assert.equal(rules.detect('02 coconut welcome')[0].quantity,2);
 assert.equal(rules.detect('Trà Ấn Độ')[0].type,'indian-tea');
 assert.equal(rules.detect('tra an')[0].type,'indian-tea');
 assert.equal(rules.detect('Indian tea')[0].type,'indian-tea');
 assert.equal(rules.detect('Masala chai')[0].type,'indian-tea');
 const unpaid=rules.detect('Đặt 01 set pakoda cho 02 khách chưa thanh toán')[0];
 assert.equal(unpaid.type,'pakora');assert.equal(unpaid.guests,2);
 assert.equal(unpaid.payment,'unpaid');
});
test('booking notes are deduplicated by product and exact line, but multiple distinct add-ons are retained',()=>{
 const note='Đặt 01 set Pakora cho 04 khách (200k) đã thanh toán';
 assert.equal(rules.detect(note+'\n'+note).length,1);
 const all=rules.detect(note+'\nCoconut Welcome\nTrà Ấn');
 assert.deepEqual(all.map(x=>x.type),['pakora','coconut-welcome','indian-tea']);
});
test('do not convert Bungalow, show, tickets, nationality or canceled food requests into paid orders',()=>{
 const nonOrders=[
  'Đặt 02 bungalow (1tr8) đã thanh toán',
  'Khách quốc tịch Ấn Độ; D5-D6',
  '13 set Veg 1 chia thành 14 set',
  'Đặt 02 vé Lounge',
  'Không đặt Pakora',
  'Hủy set Pakora',
  'Coconut Welcome đã hủy'
 ];
 for(const note of nonOrders)assert.equal(rules.detect(note).length,0,'Unexpected F&B: '+note);
});
test('future explicit add-on dish is included, while room, show and Veg packages are excluded',()=>{
 const result=rules.detect('Mua thêm 02 set bánh xèo cho 06 khách (300k) đã thanh toán');
 assert.equal(result.length,1);
 assert.equal(result[0].type,'custom-order');
 assert.equal(result[0].quantity,2);assert.equal(result[0].guests,6);
 assert.equal(result[0].payment,'paid');
 assert.equal(rules.detect('Đặt thêm 02 set Veg 1').length,0);
});
test('overview cards stay compact; F&B categories only render in special tab with one source panel',()=>{
 const helpers=segment('var SPECIAL_CATEGORIES=[','function getPriority(b){');
 const context={
  esc:value=>String(value??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;'),
  slotIcon:()=>'',bungTxt:()=>'',tour:'am'
 };
 const note='Đặt 01 set pakora cho 04 khách (200k) đã thanh toán';
 const b={diet:[{t:'Veg',s:'02 set veg'},{t:'Veg',s:'We are pure vegetarian'}],
  lob:[],bung:[],showSlots:[],specialFood:rules.detect(note),noteRaw:'02 set veg\n'+note};
 const overview=vm.runInNewContext(helpers+';tagHtml(b)',{...context,b});
 assert.equal(overview,'','Overview must not repeat 3+ dietary/add-on content cards');
 const compact=vm.runInNewContext(helpers+';tagHtml(b,true)',{...context,b});
 assert.match(compact,/class="special-compact"/);
 assert.match(compact,/Veg · Pakora/);
 assert.equal((compact.match(/class="special-compact"/g)||[]).length,1);
 assert.equal((compact.match(/<details/g)||[]).length,1);
 assert.match(compact,/Xem ghi chú gốc/);
 assert.match(compact,/200k/);
 assert.match(compact,/đã thanh toán/);
 assert.doesNotMatch(compact,/class="tag f"/);
 const injected=vm.runInNewContext(helpers+';tagHtml(b,true)',{...context,b:{...b,noteRaw:'<script>alert(1)</script>'}});
 assert.doesNotMatch(injected,/<script>/);
 const cardSource=segment('function card(b,showSpecial){','function statBox(');
 assert.match(cardSource,/tagHtml\(b,!!showSpecial\)/);
 assert.match(html,/b\.specialFood = window\.DolphinGuestSpecialRules\.detect\(b\.noteRaw\)/);
});
test('all categories including Chay Âu and mixed Non-veg are recognized and deduplicated',()=>{
 const categories=[
  ['Veg','pure vegetarian'],['Non-veg','non-veg'],['Jain','Jain'],
  ['Halal','Halal'],['Chay Việt','Chay Việt'],
  ['Chay Âu','chay Âu'],['Chay Âu','Western vegetarian'],
  ['Indian Food','Indian food']
 ];
 for(const [wanted,note] of categories){
  const rows=[['1','DP101','Agent','Guest','2','India','A1',note,'']];
  const booking=originalParser()(rows)[0];
  assert(booking.diet.some(x=>x.t===wanted),note+' expected '+wanted);
 }
 const rows=[['1','DP102','Agent','Guest','2','India','A1',
  '02 set veg 02 phụ thu 260k trên tàu (pure veg)\nwe are pure vegetarian, please provide good vegetarian set menu','']];
 const one=originalParser()(rows)[0];
 assert.equal(one.diet.filter(x=>x.t==='Veg').length,1,'two notes collapse to one Veg category');
 const mix=originalParser()([['1','DP103','Agent','Guest','2','India','A1','Non-veg + Jain + Halal','']])[0];
 assert.deepEqual(Array.from(mix.diet,x=>x.t).sort(),['Halal','Jain','Non-veg']);
});
test('special BKK tab filters only existing categories and counts each booking once',()=>{
 const helpers=segment('var SPECIAL_CATEGORIES=[','function getPriority(b){');
 const view=segment("var specialCategoryFilter='all';","function pushKey(b,i,j){");
 const b1={code:'DP-COCONUT-TEA',diet:[],lob:[],bung:[],noteRaw:'Coconut Welcome + Trà Ấn',
  specialFood:rules.detect('Coconut Welcome + trà Ấn')};
 const b2={code:'DP-VEG',diet:[{t:'Veg',s:'Veg'},{t:'Veg',s:'pure veg'}],lob:[],bung:[],noteRaw:'Veg',
  specialFood:[]};
 const context={b1,b2,esc:x=>String(x??''),card:b=>'<article>'+b.code+'</article>'};
 const all=vm.runInNewContext(helpers+view+';viewSpecial([b1,b2])',context);
 assert.match(all,/DP-COCONUT-TEA/);
 assert.match(all,/DP-VEG/);
 assert.match(all,/Coconut Welcome · 1/);
 assert.match(all,/Trà Ấn \(Indian Tea\) · 1/);
 assert.match(all,/Veg · 1/);
 assert.match(all,/2 BKK có yêu cầu/);
 assert.doesNotMatch(all,/class="st"/,'no oversized counters for each category');
 const onlyTea=vm.runInNewContext(helpers+view+";specialCategoryFilter='indian-tea';viewSpecial([b1,b2])",context);
 assert.match(onlyTea,/DP-COCONUT-TEA/);
 assert.doesNotMatch(onlyTea,/DP-VEG/);
 assert.match(onlyTea,/aria-pressed="true">Trà Ấn/);
 const priority=segment('function getPriority(b){','function card(b,showSpecial){');
 assert.equal(vm.runInNewContext(priority+';getPriority(b1)',{b1}),'pri-food');
});
test('Pakora lobster Coconut Welcome Indian Tea map to distinct special categories',()=>{
 const helpers=segment('var SPECIAL_CATEGORIES=[','function getPriority(b){');
 const b={diet:[],lob:['Tôm hùm'],bung:[],noteRaw:'Coconut Welcome + Trà Ấn + Pakora',
  specialFood:rules.detect('Coconut Welcome + Trà Ấn + Đặt 01 set Pakora')};
 const keys=vm.runInNewContext(helpers+';specialCategoryKeys(b)',{b});
 assert.deepEqual(Array.from(keys).sort(),['lobster','coconut-welcome','indian-tea','pakora'].sort());
});

test('Premium Lounge guest transfer offers VISA and preserves all existing payments',()=>{
 const block=segment('<select id="lgPayment">','</select>');
 const options=Array.from(block.matchAll(/<option value="([^"]*)">/g),m=>m[1]);
 assert.deepEqual(options,['','TA_PAID','TA_UNPAID','TM','CK','VISA','FOC']);
 assert.match(html,/paymentMethod:payment/,'Selected payment is sent unchanged to Lounge');
 assert.match(html,/var table=\$\('lgTable'\)\.value,pax=Number\(\$\('lgPax'\)\.value\),payment=\$\('lgPayment'\)\.value/);
});

test('every nonempty dietary-note cell appears with a clickable preview and complete escaped notes',()=>{
 const note='FOC 01HDV có thẻ, ăn như khách\nĐăng ký xe vào cảng: 29E-584.78\n'+ 'Ghi chú thêm '.repeat(30)+'<img src=x onerror=alert(1)>';
 const b=originalParser()([['17','DP463411','F5 Travel','MR KHỞI','36','Đài Loan','B5-B9',note,'Không kayak/bamboo']])[0];
 assert.equal(b.dietNoteRaw,note);assert.equal(b.diet.length,0);
 const helpers=segment('var SPECIAL_CATEGORIES=[','function getPriority(b){');
 const ctx={b,esc:x=>String(x??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'),tour:'am',bungTxt:()=>'',slotIcon:()=>''};
 const out=vm.runInNewContext(helpers+';tagHtml(b,false)',ctx);
 assert.match(out,/Ghi chú kiêng chay/);assert.match(out,/special-note-preview/);
 assert.match(out,/…/);assert.equal((out.match(/<details/g)||[]).length,1);
 assert.match(out,/Không kayak\/bamboo/);assert.match(out,/&lt;img/);assert.doesNotMatch(out,/<img/);
 const full=out.match(/<div class="special-source-text">([\s\S]*?)<\/div>/)[1];
 assert(full.includes(ctx.esc(note)),'Full content is never truncated');
 const view=segment("var specialCategoryFilter='all';","function pushKey(b,i,j){");
 const special=vm.runInNewContext(helpers+view+';viewSpecial([b])',{...ctx,card:b=>'<article>'+b.code+'</article>'});
 assert.match(special,/DP463411/);assert.match(special,/Ghi chú kiêng chay · 1/);
 const empty=originalParser()([['1','DP0','Agent','Guest','2','','A1','   ','Chỉ ghi chú cột I']])[0];
 assert.equal(vm.runInNewContext(helpers+';tagHtml(b,false)',{...ctx,b:empty}),'');
});
