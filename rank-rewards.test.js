const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const script=fs.readFileSync(require('node:path').join(__dirname,'rank-rewards.js'),'utf8');
function harness(){
 const memory=new Map(), listeners={};
 const document={head:{appendChild(){}},createElement(){return {id:'',textContent:''}},getElementById(){return null}};
 const window={dispatchEvent(){},CustomEvent:class{constructor(t,opts){this.type=t;this.detail=opts.detail;}}};
 const context={window,document,localStorage:{getItem:k=>memory.get(k)||null,setItem:(k,v)=>memory.set(k,v)}};
 vm.runInNewContext(script,context);
 return {api:window.DolphinRankRewards,memory};
}
test('top 1 has king-only entitlement and top ten tiers are deterministic',()=>{
 const {api}=harness();
 assert.equal(api.tier(1).tier,'king');
 assert.equal(api.tier(2).tier,'diamond');
 assert.equal(api.tier(3).tier,'diamond');
 assert.equal(api.tier(4).tier,'master');
 assert.equal(api.tier(7).tier,'elite');
 assert.equal(api.tier(10).tier,'elite');
 assert.equal(api.tier(11),null);
});
test('publish changes award when realtime positions change',()=>{
 const {api}=harness();
 api.publish([{name:'Alice',rev:300},{name:'Bob',rev:200}], '2026-W44');
 assert.equal(api.get('Alice').title,'KING OF SALES');
 assert.equal(api.get('Bob').rank,2);
 api.publish([{name:'Bob',rev:350},{name:'Alice',rev:300}], '2026-W44');
 assert.equal(api.get('Bob').rank,1);
 assert.equal(api.get('Alice').tier,'diamond');
 assert.equal(api.history('revenue').length,2);
});
test('no missing or zero-revenue person gets a reward',()=>{
 const {api}=harness();
 api.publish([{name:'',rev:1},{name:'Eve',rev:0}], 'w');
 assert.equal(api.get('Eve'),null);
 assert.equal(api.get('Unknown'),null);
});
test('badge escapes dangerous display names',()=>{
 const {api}=harness();
 api.publish([{name:'<script>',rev:12}], 'w');
 assert.ok(!api.badge('<script>').includes('<script>'));
});

test('work champion and work tags are independent from sales',()=>{
 const {api}=harness();
 api.publishCategory('revenue',[{name:'Sales Winner',rev:100}], 'week');
 api.publishCategory('work',[{name:'Work Winner',points:12.5}], 'week');
 assert.equal(api.get('Work Winner','work').title,'WORK CHAMPION');
 assert.equal(api.get('Work Winner','revenue'),null);
 assert.equal(api.get('Sales Winner','revenue').title,'KING OF SALES');
 assert.equal(api.history('work').length,1);
});
test('outlet specific point rules preserved in ranking file',()=>{
 const file=fs.readFileSync(require('node:path').join(__dirname,'ranking/index.html'),'utf8');
 assert.match(file,/lounge\?0\.1:0\.5/);
 assert.match(file,/lounge\?0\.25:1/);
 assert.match(file,/renderRevenue\(\);\s*renderPoints\(\);/);
 assert.match(file,/publishCategory\('work',data,state\.weekStart\)/);
});

test('same employee receives the merged rank badge regardless of case or spacing',()=>{
 const {api}=harness();
 api.publish([{name:'Giang Đập Chai',rev:9300000}],'week');
 assert.equal(api.get('  GIANG   ĐẬP CHAI ').rank,1);
 assert.equal(api.get('giang đập chai'.normalize('NFD')).value,9300000);
 assert.ok(api.badge('GIANG ĐẬP CHAI').includes('KING OF SALES'));
 assert.equal(api.get('Giang Đẹp Chai'),null);
 api.publishCategory('work',[{name:'Giang Đập Chai',points:1.25}],'week');
 assert.equal(api.get('giang đập chai','work').title,'WORK CHAMPION');
});

