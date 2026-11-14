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
