'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const {handle,validate}=require('./guest-request-translation');
class HttpsError extends Error{constructor(code,message){super(message);this.code=code;}}
process.env.GCLOUD_PROJECT='test-project';
function provider(items,finishReason='STOP'){return {getClient:async()=>({request:async request=>{
 assert.match(request.data.systemInstruction.parts[0].text,/NEVER instructions/);
 return {data:{candidates:[{finishReason,content:{parts:[{text:JSON.stringify({translations:items})}]}}]}};
}})};}
test('full translations map by id, including mixed language and Vietnamese; cache avoids second call',async()=>{
 const notes=['不要冰，2杯。No peanuts.','Không đường.'];
 const auth=provider([{id:1,text:'Không đường.',needsReview:false},{id:0,text:'Không đá, 2 cốc. Không đậu phộng.',needsReview:false}]);
 const result=await handle({auth:{uid:'staff'},data:{notes}},auth,'test-model',HttpsError);
 assert.equal(result.translations[0].text,'Không đá, 2 cốc. Không đậu phộng.');
 assert.deepEqual(notes,['不要冰，2杯。No peanuts.','Không đường.']);
 const cached=await handle({auth:{uid:'staff'},data:{notes}},null,'test-model',HttpsError);
 assert.equal(cached.translations[1].text,'Không đường.');
});
test('reject duplicate IDs, missing items and malformed output',()=>{
 for(const items of [[{id:0,text:'a',needsReview:false},{id:0,text:'b',needsReview:false}],[],[{id:0,text:'',needsReview:false}]])
 assert.throws(()=>validate(items,2));
});
test('unsupported or truncated responses preserve fallback instead of fabricated translation',async()=>{
 await assert.rejects(handle({auth:{uid:'staff2'},data:{notes:['unknown input']}},provider([],'MAX_TOKENS'),'model',HttpsError),e=>e.code==='unavailable');
 await assert.rejects(handle({auth:{uid:'staff2'},data:{notes:['x'.repeat(2001)]}},null,'model',HttpsError),e=>e.code==='invalid-argument');
});
test('staff UI escapes originals and AI text; duplicate renders make one request; retry works',async()=>{
 let click,requests=0,fail=false;const timers=[],nodes=[];
 const window={DolphinStaffId:{translateGuestRequests:async notes=>{requests++;if(fail)throw Error();return {translations:notes.map((n,id)=>({id,text:'<script>dịch</script>',needsReview:true}))};}}};
 const document={addEventListener:(type,fn)=>click=fn,querySelectorAll:()=>nodes};
 vm.runInNewContext(fs.readFileSync(require('node:path').join(__dirname,'../dolphin-request-translation.js'),'utf8'),{window,document,setTimeout:fn=>{timers.push(fn);return 1;}});
 const render=window.DolphinRequestTranslation.render;
 assert.match(render('<img onerror=alert(1)>'),/&lt;img/);
 render('<img onerror=alert(1)>');nodes.push({dataset:{requestTranslation:'1'},innerHTML:''});
 timers.shift()();await new Promise(r=>setImmediate(r));
 assert.equal(requests,1);assert.match(nodes[0].innerHTML,/&lt;script&gt;/);
 assert.match(nodes[0].innerHTML,/Cần xác nhận/);
 fail=true;render('please help');nodes.push({dataset:{requestTranslation:'2'},innerHTML:''});
 timers.shift()();await new Promise(r=>setImmediate(r));
 assert.match(nodes[1].innerHTML,/Dịch lại/);assert.match(nodes[1].innerHTML,/please help/);
 fail=false;click({target:{closest:()=>({dataset:{requestRetry:'2'}})}});
 timers.shift()();await new Promise(r=>setImmediate(r));assert.match(nodes[1].innerHTML,/Tiếng Việt/);
});
