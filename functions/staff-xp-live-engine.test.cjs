'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const live=require('./staff-xp-live-engine.cjs');
test('one-time eligible live Lounge and Bungalow table openings',()=>{
 const lounge={openedByStaff:'Lan',pax:3,paymentMethod:'TM'};
 assert.deepEqual(live.revenueTransition('lounge_tables',null,lounge),[{name:'Lan',source:'revenue',amount:750}]);
 assert.deepEqual(live.revenueTransition('lounge_tables',lounge,{...lounge,pax:4}),[]);
 assert.deepEqual(live.revenueTransition('bun_tables',null,{openedByStaff:'Mai'}),[{name:'Mai',source:'revenue',amount:2000}]);
 assert.deepEqual(live.revenueTransition('lounge_tables',null,{...lounge,paymentMethod:'FOC'}),[]);
});
test('Show only credits paid known combos after selection',()=>{
 assert.deepEqual(live.revenueTransition('show_tables',{seller:'Lan',service:{}},{seller:'Lan',service:{combo:'combo2'}}),[{name:'Lan',source:'revenue',amount:790}]);
 assert.deepEqual(live.revenueTransition('show_tables',null,{seller:'Lan',payment:'FOC',service:{combo:'combo2'}}),[]);
 assert.deepEqual(live.revenueTransition('show_tables',null,{seller:'Lan',service:{combo:'unknown'}}),[]);
});
test('completed work is credited once per person, with role precedence',()=>{
 const done={status:'completed',preparedBy:'Mai & Lan',completedBy:'Mai & Binh'};
 assert.deepEqual(live.workTransition('lounge_orders',{status:'preparing'},done),[
  {name:'Mai',source:'work',amount:2.5},{name:'Lan',source:'work',amount:1},{name:'Binh',source:'work',amount:2.5}
 ]);
 assert.deepEqual(live.workTransition('lounge_orders',done,{...done,notes:'changed'}),[]);
 assert.deepEqual(live.workTransition('res_orders',null,done),[
  {name:'Mai',source:'work',amount:10},{name:'Lan',source:'work',amount:5},{name:'Binh',source:'work',amount:10}
 ]);
});
test('stable receipt id for a document incarnation prevents retry double-credits',()=>{
 const a=live.eventId('lounge_tables','L-01',123,'DOL-0001','revenue');
 assert.match(a,/^live:[a-f0-9]{40}$/);
 assert.equal(a,live.eventId('lounge_tables','L-01',123,'DOL-0001','revenue'));
 assert.notEqual(a,live.eventId('lounge_tables','L-01',124,'DOL-0001','revenue'));
});
