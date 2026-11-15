'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {validate,handle}=require('./guest-nationalities');
test('only known ISO codes and complete unique ids accepted; ambiguity has no flag',()=>{
 assert.deepEqual(validate(['Đài Loan','?'],[{id:0,codes:['tw','tw'],uncertain:false},{id:1,codes:['cn'],uncertain:true}]),[{id:0,codes:['tw'],uncertain:false},{id:1,codes:[],uncertain:true}]);
 for(const r of [[{id:0,codes:['../evil'],uncertain:false}],[],[{id:3,codes:['vn'],uncertain:false}]])assert.throws(()=>validate(['a'],r));
 assert.throws(()=>validate(['a','b'],[{id:0,codes:[],uncertain:true},{id:0,codes:[],uncertain:true}]));
});
test('invalid input is rejected before requesting a model',async()=>{
 class HttpsError extends Error{};
 for(const names of [[],Array(21).fill('a'),['a'.repeat(121)],[null]])await assert.rejects(handle({auth:{uid:'x'},data:{names}},null,'model',HttpsError));
});
test('authenticated handler sends only labels and caches validated ISO results',async()=>{
 const previous=process.env.GCLOUD_PROJECT;process.env.GCLOUD_PROJECT='country-test';let calls=0;
 class HttpsError extends Error{};
 const auth={getClient:async()=>({request:async req=>{calls++;const rows=JSON.parse(req.data.contents[0].parts[0].text);assert.deepEqual(rows,[{id:0,name:'Taiwann'}]);return {data:{candidates:[{finishReason:'STOP',content:{parts:[{text:JSON.stringify({nationalities:[{id:0,codes:['tw'],uncertain:false}]})}]}}]}};}})};
 try{const req={auth:{uid:'test-country'},data:{names:['Taiwann']}};assert.deepEqual((await handle(req,auth,'test-model',HttpsError)).nationalities,[{id:0,codes:['tw'],uncertain:false}]);await handle(req,auth,'test-model',HttpsError);assert.equal(calls,1);}
 finally{if(previous===undefined)delete process.env.GCLOUD_PROJECT;else process.env.GCLOUD_PROJECT=previous;}
});
