'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {createFeed}=require('../dolphin-alerts');
function snapshot(rows,{cache=false,local=false}={}){return {metadata:{fromCache:cache},forEach(fn){rows.forEach(([id,status,timestamp])=>fn({id,metadata:{hasPendingWrites:local},data:()=>({status,timestamp})}));}};}
test('cache baseline and historical data do not trigger false alerts; first server new request does',()=>{
 const feed=createFeed(100);assert.equal(feed(snapshot([['old','pending',5]],{cache:true})).length,0);
 assert.deepEqual(feed(snapshot([['old','pending',5],['new','pending',101]])).map(d=>d.id),['new']);
 assert.equal(feed(snapshot([['old','pending',5],['new','pending',101]])).length,0);
});
test('additional Lounge order on same ID triggers once; status and metadata updates do not replay',()=>{
 const feed=createFeed(100);feed(snapshot([['o','pending',5]]));
 assert.equal(feed(snapshot([['o','pending',110]])).length,1);
 assert.equal(feed(snapshot([['o','pending',110]])).length,0);
 assert.equal(feed(snapshot([['o','preparing',110]])).length,0);
 assert.equal(feed(snapshot([['o','pending',120]])).length,1);
});
test('server acknowledgment of local request triggers; reconnect does not repeat',()=>{
 const feed=createFeed(100);feed(snapshot([]));assert.equal(feed(snapshot([['call','pending',110]],{local:true})).length,0);
 assert.equal(feed(snapshot([['call','pending',110]])).length,1);
 feed(snapshot([],{cache:true}));assert.equal(feed(snapshot([['call','pending',110]])).length,0);
 feed(snapshot([]));assert.equal(feed(snapshot([['call','pending',110]])).length,0);
 assert.equal(feed(snapshot([['call2','pending',1]])).length,1,'new event after baseline survives guest clock skew');
});
test('shared shell authentication is coalesced and can retry a failure',async()=>{
 const {signIn}=require('../dolphin-alerts');const auth={};let attempts=0;
 const authenticate=async()=>{attempts++;if(attempts===1)throw Error('offline');return 'ready'};
 const first=signIn(auth,authenticate);assert.equal(signIn(auth,authenticate),first);await assert.rejects(first,/offline/);
 assert.equal(await signIn(auth,authenticate),'ready');assert.equal(attempts,2);
});
