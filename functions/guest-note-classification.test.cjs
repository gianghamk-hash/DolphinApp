'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {validate,instruction}=require('./guest-note-classification');
const item=(category,evidence,extra={})=>({category,evidence,state:'confirmed',quantity:0,room:'',...extra});
test('grounded multi-category output retains source and explicit service quantities',()=>{
 const note='Đặt 2 bungalow, phòng 201; 3 suất tôm hùm; 1 khách ăn chay Việt';
 const r=validate(note,[item('bungalow','Đặt 2 bungalow, phòng 201',{quantity:2,room:'201'}),item('lobster','3 suất tôm hùm',{quantity:3}),item('Chay Việt','1 khách ăn chay Việt',{quantity:1})],false);
 assert.equal(r.items.length,3);assert.equal(r.needsReview,false);
});
test('invented evidence, quantities, rooms and categories cannot reach app',()=>{
 for(const x of [item('admin','Đặt 2 bungalow'),item('bungalow','Đặt 2 bungalow',{quantity:3}),item('bungalow','Đặt 2 bungalow',{room:'301'}),item('bungalow','Đã trả tiền')])assert.equal(validate('Đặt 2 bungalow',[x],false),null);
 assert.equal(validate('x',null,false),null);
});
test('cancellation and unresolved alternatives stay out of confirmed assignments',()=>{
 const note='Đặt 2 vé lounge; hủy vé lounge; bungalow hoặc lounge chưa chốt';
 const r=validate(note,[item('lounge','Đặt 2 vé lounge',{quantity:2}),item('lounge','hủy vé lounge',{state:'excluded'}),item('bungalow','bungalow hoặc lounge chưa chốt',{state:'uncertain'})],false);
 assert.equal(r.needsReview,true);assert(!r.items.some(x=>x.state==='confirmed'));
 assert.match(instruction,/không ăn tôm hùm => diet-note confirmed, lobster excluded/);
});
test('set-menu flag is explicit and never inferred from dietary category',()=>{
 const note='Đặt 2 set Veg';
 const ordered=validate(note,[item('Veg',note,{quantity:2,setMenu:true})],false);
 assert.equal(ordered.items[0].setMenu,true);
 for(const extra of [{},{setMenu:false},{setMenu:'true'}])assert.equal(validate('Khách ăn chay',[item('Veg','Khách ăn chay',extra)],false).items[0].setMenu,false);
});
test('focused summary includes only supported services, never original irrelevant text',()=>{
 const {focusedSummary}=require('./guest-note-classification');
 const items=[item('Chay Việt','2 khách ăn chay',{quantity:2,setMenu:true}),item('lobster','3 suất tôm hùm',{quantity:3}),item('bungalow','Bungalow 201',{room:'201'}),item('diet-note','HDV ăn như khách, guide Hàn, cửa sổ, dị ứng bò'),item('coconut-welcome','Tặng dừa')];
 const summary=focusedSummary({items});
 assert.equal(summary,'Chay Việt ×2 · Tôm hùm ×3 · Bungalow (201)');
 assert.equal(focusedSummary({items:[items[3],items[4]]}),'');
 for(const category of ['Chay Việt','Chay Âu','Indian Food','Veg','Non-veg','Jain','Halal'])assert.equal(focusedSummary({items:[item(category,'suất ăn',{setMenu:true})]}),category);
});
test('concise summary does not confirm alternatives, add overlapping counts or include canceled services',()=>{
 const {focusedSummary}=require('./guest-note-classification');
 assert.equal(focusedSummary({items:[item('lounge','hủy lounge',{state:'excluded'})]}),'');
 assert.equal(focusedSummary({items:[item('bungalow','hoặc bungalow',{state:'uncertain'}),item('lounge','hoặc lounge',{state:'uncertain'})]}),'Bungalow (chưa chốt) · Lounge (chưa chốt)');
 assert.equal(focusedSummary({items:[item('Veg','2 set',{quantity:2,setMenu:true}),item('Veg','2 khách',{quantity:2,setMenu:true})]}),'Veg');
});
test('one invalid model item cannot erase independent valid services',()=>{
 const note='bungalow 401, phụ thu 2tr trên tàu; 2 set Jain; 1 vé lounge';
 const r=validate(note,[item('bungalow','bungalow 401, phụ thu 2tr trên tàu',{quantity:3,room:'401'}),item('Jain','2 set Jain',{quantity:2,setMenu:true}),item('lounge','1 vé lounge',{quantity:1})],false);
 assert(r.needsReview);assert.deepEqual(r.items.map(x=>x.category),['Jain','lounge']);
 const correct=validate(note,[item('bungalow','bungalow 401, phụ thu 2tr trên tàu',{room:'401'})],false);
 assert.equal(correct.items[0].room,'401');assert.equal(correct.items[0].quantity,1);
});
test('a rejected cancellation never leaves the same category confirmed',()=>{
 const note='Đặt 2 bungalow; hủy bungalow';
 const r=validate(note,[item('bungalow','Đặt 2 bungalow',{quantity:2}),item('bungalow','hủy bungalow',{state:'excluded',quantity:99})],false);
 assert(r.needsReview);assert.equal(r.items[0].state,'uncertain');
});
test('one explicitly named confirmed room accepts or derives quantity one',()=>{
 const note='- bungalow 401, phụ thu 2tr trên tàu';
 for(const quantity of [0,1]){
  const r=validate(note,[item('bungalow',note,{quantity,room:'401'})],false);
  assert.equal(r.items[0].quantity,1);
  assert.equal(require('./guest-note-classification').focusedSummary(r),'Bungalow ×1 (401)');
 }
});
test('room inference excludes cancellations, alternatives, deck numbers and multiple rooms',()=>{
 for(const [note,room,state] of [
  ['hủy bungalow 401','401','excluded'],['bungalow 401 hoặc 402','401','uncertain'],
  ['bungalow 401/402','401','confirmed'],['2 bungalow 401','401','confirmed'],
  ['bungalow deck 3, phụ thu 2tr','','confirmed'],['chưa chốt bungalow 401','401','uncertain']
 ]){
  const r=validate(note,[item('bungalow',note,{quantity:0,room,state})],false);
  assert.equal(r.items[0].quantity,0,note);
 }
});
