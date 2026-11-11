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
 const context={
  window:{DolphinGuestSpecialRules:rules},BUNG:/bungalow/i,LOB:/tôm hùm|lobster/i,
  DIET:/\bveg\b|chay|halal|jain|indian food/i,
  ROOMS:['201','202','203','204'],
  seg:s=>String(s||'').split(/\n/).map(s=>s.replace(/^\s*[-–]\s*/,'').trim()).filter(Boolean),
  dietType:()=> 'Veg',
  detectLoungeTicket:()=>null,detectShowSlots:()=>[],
  normalizeTables:s=>String(s||''),tables:()=>[],areaName:s=>s,
 };
 return rows=>vm.runInNewContext(source+';parse(rows)',{...context,rows});
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
test('special tab and booking cards expose full source notes without mutating orders or guest data',()=>{
 const source=segment('function tagHtml(b){','function getPriority(b){');
 const context={
  esc:s=>String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;'),
  slotIcon:()=>'',bungTxt:()=>'',tour:'am'
 };
 const b={diet:[],lob:[],bung:[],specialFood:rules.detect('Đặt 01 set pakora cho 04 khách (200k) đã thanh toán')};
 const htmlTags=vm.runInNewContext(source+';tagHtml(b)',{...context,b});
 assert.match(htmlTags,/class="tag f"/);
 assert.match(htmlTags,/Pakora/);
 assert.match(htmlTags,/cho 4 khách/);
 assert.match(htmlTags,/ĐÃ THANH TOÁN/);
 assert.match(htmlTags,/200k/);
 assert.match(htmlTags,/01 set pakora cho 04 khách/);
 const view=segment('function viewSpecial(L){','function pushKey(b,i,j){');
 assert.match(view,/specialFood/);
 assert.match(view,/Coconut Welcome/);
 assert.match(view,/Trà Ấn/);
 assert.match(html,/b\.specialFood = window\.DolphinGuestSpecialRules\.detect\(b\.noteRaw\)/);
 assert.match(html,/dolphin-guest-special-rules\.js\?v=fnb-notes-v1/);
 const tag=vm.runInNewContext(source+';tagHtml(b)',{...context,b:{
  diet:[],lob:[],bung:[],specialFood:rules.detect('Đặt 01 set Pakora <script>alert(1)</script>')
 }});
 assert.doesNotMatch(tag,/<script>/);
});


test('special BKK tab includes a booking that only has Coconut Welcome and Trà Ấn',()=>{
 const view=segment('function viewSpecial(L){','function pushKey(b,i,j){');
 const booking={code:'DP-COCONUT-TEA',diet:[],lob:[],bung:[],
  specialFood:rules.detect('Coconut Welcome + trà Ấn')};
 const output=vm.runInNewContext(view+';viewSpecial([booking])',{
  booking,statBox:(icon,count,label)=>'<span>'+label+': '+count+'</span>',
  card:b=>'<article>'+b.code+'</article>'
 });
 assert.match(output,/DP-COCONUT-TEA/);
 assert.match(output,/Coconut Welcome: 1/);
 assert.match(output,/Trà Ấn: 1/);
 assert.doesNotMatch(output,/Không có booking nào có yêu cầu/);
 const priority=segment('function getPriority(b){','function card(b){');
 assert.equal(vm.runInNewContext(priority+';getPriority(booking)',{booking}),'pri-food');
});
