'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
function setup(api){const window={DolphinStaffId:{resolveGuestNationalities:api}},context={window,document:{querySelectorAll:()=>[]}};for(const f of ['dolphin-country-data.js','dolphin-guest-flags.js'])vm.runInNewContext(fs.readFileSync(path.join(root,f),'utf8'),context);return window;}
test('Taiwan and multi-national Vietnamese/English labels resolve locally without AI',()=>{
 const w=setup();for(const [name,codes]of [['Đài Loan',['tw']],['Đài',['tw']],['Mỹ + Trung Quốc',['us','cn']],['Việt Nam và Hàn Quốc',['vn','kr']],['Taiwan / Việt Nam / Taiwan',['tw','vn']],['Indonesia',['id']]]){
  const r=w.DolphinGuestFlags.resolve(name);assert.deepEqual(Array.from(r.codes),codes);assert.equal(r.unknown,false);
 }
 assert(w.DolphinGuestFlags.resolve('Châu Âu').unknown);assert(w.DolphinGuestFlags.resolve('Khách quốc tế').unknown);
});
test('all flag assets exist and labels are escaped with fixed local sources',()=>{
 const w=setup();for(const code of Object.keys(w.DolphinCountryData.names)){
  const svg=fs.readFileSync(path.join(root,'assets/flags',code+'.svg'),'utf8');assert.match(svg,/<svg/);assert.doesNotMatch(svg,/<script|onload=|<foreignObject/i);
 }
 const html=w.DolphinGuestFlags.html('Đài Loan');assert.match(html,/assets\/flags\/tw.svg/);assert.match(html,/width="18" height="14"/);assert.match(html,/Cờ Đài Loan/);
 assert.doesNotMatch(w.DolphinGuestFlags.html('<img src=x onerror=alert(1)>'),/<img src=x/);
});
test('AI resolves unknown labels once; uncertain output never chooses a flag',async()=>{
 let calls=0;const w=setup(async names=>{calls++;return {nationalities:names.map((n,id)=>({id,codes:['tw'],uncertain:n==='Không rõ'}))};});
 await w.DolphinGuestFlags.ensure([{nat:'Taiwann'},{nat:'Không rõ'}]);
 assert.equal(w.DolphinGuestFlags.resolve('Taiwann').codes[0],'tw');assert.equal(w.DolphinGuestFlags.resolve('Không rõ').codes.length,0);
 await w.DolphinGuestFlags.ensure([{nat:'Taiwann'}]);assert.equal(calls,1);
});
test('untrusted country codes cannot become image URLs; failed AI retains known flags',async()=>{
 const w=setup(async()=>({nationalities:[{id:0,codes:['../evil'],uncertain:false}]}));
 await w.DolphinGuestFlags.ensure([{nat:'Việt Nam + unknown'}]);
 const r=w.DolphinGuestFlags.resolve('Việt Nam + unknown');assert.deepEqual(Array.from(r.codes),['vn']);assert(r.unknown);
});
