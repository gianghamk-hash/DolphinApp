'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
function setup(approved=true){let calls=0,answer=null;class HttpsError extends Error{constructor(code,message){super(message);this.code=code;}}
 const context={exports:{},process:{env:{GCLOUD_PROJECT:'test-project'}},require:n=>n.endsWith('/https')?{onCall:(_,handler)=>handler,HttpsError}:n.endsWith('/params')?{defineString:()=>({value:()=> 'gemini-2.5-flash'})}:n.endsWith('/database')?{getDatabase:()=>({ref:p=>({get:async()=>({val:()=>p.startsWith('staffIdentity')?{employeeId:'DP1',verified:approved}:{active:true,approved,registrationSource:'self'}})})})}:n==='google-auth-library'?{GoogleAuth:class{async getClient(){return {request:async req=>{calls++;assert.match(req.url,/aiplatform.googleapis.com/);const notes=JSON.parse(req.data.contents[0].parts[0].text);return {data:{candidates:[{finishReason:'STOP',content:{parts:[{text:JSON.stringify(answer||{summaries:notes.map(n=>({id:n.id,text:n.note}))})}]}}]}};}};}}}:require(n)};
 vm.runInNewContext(fs.readFileSync(__dirname+'/guest-note-summary.js','utf8'),context);
 return {api:context.exports,calls:()=>calls,setAnswer:x=>answer=x};
}
test('AI callable requires approved staff and bounds note input before any model request',async()=>{
 const h=setup();await assert.rejects(h.api.guestSummarizeNotes({data:{notes:['x']}}),{code:'unauthenticated'});
 await assert.rejects(setup(false).api.guestSummarizeNotes({auth:{uid:'u'},data:{notes:['x']}}),{code:'permission-denied'});
 for(const notes of [[],Array(21).fill('x'),['x'.repeat(2001)],[null]])await assert.rejects(h.api.guestSummarizeNotes({auth:{uid:'u'},data:{notes}}),{code:'invalid-argument'});
 assert.equal(h.calls(),0);
});
test('Gemini result is cached by exact note; full numbers and OR remain intact',async()=>{
 const h=setup(),note='Tặng 1 móc chìa khóa Dolphin hoặc 1 lượt trải nghiệm Kid Club';
 h.setAnswer({summaries:[{id:0,text:'Tặng 1 móc khóa Dolphin hoặc 1 lượt Kid Club'}]});
 const req={auth:{uid:'u'},data:{notes:[note]}};
 const result=await h.api.guestSummarizeNotes(req);assert.equal(result.summaries[0].source,'ai');assert.equal(result.summaries[0].text,'Tặng 1 móc khóa Dolphin hoặc 1 lượt Kid Club');
 await h.api.guestSummarizeNotes(req);assert.equal(h.calls(),1);
});
test('unsafe quantity, allergy, payment and OR omissions fall back to original',async()=>{
 const h=setup(),ok=h.api._acceptable;
 assert.equal(ok('Tặng 1 móc khóa hoặc 1 lượt Kid Club','Tặng 1 móc khóa và 1 lượt Kid Club'),false);
 assert.equal(ok('2 khách dị ứng hải sản','2 khách hải sản'),false);
 assert.equal(ok('2 set chay chưa thanh toán','2 set chay'),false);
 assert.equal(ok('2 set chay','3 set chay'),false);
 h.setAnswer({summaries:[{id:0,text:'3 set chay'}]});
 const r=await h.api.guestSummarizeNotes({auth:{uid:'u'},data:{notes:['2 set chay']}});assert.equal(r.summaries[0].text,'2 set chay');assert.equal(r.summaries[0].source,'original');
});
test('missing and duplicate AI IDs are rejected instead of mapping notes to wrong guests',async()=>{
 const h=setup();h.setAnswer({summaries:[{id:0,text:'A'},{id:0,text:'B'}]});
 await assert.rejects(h.api.guestSummarizeNotes({auth:{uid:'u'},data:{notes:['A','B']}}),{code:'unavailable'});
});
