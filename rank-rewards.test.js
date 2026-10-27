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
 assert.equal(api.history().length,2);
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
