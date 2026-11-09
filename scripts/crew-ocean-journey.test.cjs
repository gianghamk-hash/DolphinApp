'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),
 fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const read=name=>fs.readFileSync(path.join(root,name),'utf8');
const source=read('crew-ocean-journey.js');
function fixture(id='DOL-0002'){
 const win={DolphinStaffId:{get:()=>({employeeId:id})},addEventListener:()=>{}};
 const doc={readyState:'loading',addEventListener:()=>{}};
 vm.runInNewContext(source,{window:win,document:doc,Number,Math,Object,Array,Map,Set,String,Intl});
 return win.DolphinOceanJourney;
}
const xp=level=>2450*(level-1)**2;
test('Ocean Journey always has sixty distinct levels and six ten-level ocean regions',()=>{
 const api=fixture(),model=api.model({employeeId:'DOL-0002',level:22,xp:xp(22)});
 assert.equal(model.levels.length,60);
 assert.deepEqual(Array.from(model.levels,x=>x.level),Array.from({length:60},(_,i)=>i+1));
 assert.equal(api.regions.length,6);
 api.regions.forEach((zone,i)=>{
  assert.equal(zone.from,i*10+1);
  assert.equal(zone.to,(i+1)*10);
 });
 assert.equal(model.current,22);
 assert.equal(model.regionIndex,2);
 assert.equal(model.levels[21].state,'current');
 assert.equal(model.levels[20].state,'complete');
 assert.equal(model.levels[22].state,'locked');
 assert.equal(model.levels[59].xp,xp(60));
});
test('Uses verified reward and perk catalogs without inventing rewards or granting XP',()=>{
 const api=fixture();
 const employee={employeeId:'DOL-0002',level:25,xp:xp(25),levelPeak:25,
  rewardCatalog:[{id:'c1',level:26,label:'Frame Ruby'},{id:'c2',level:27,label:'Aura Star'}],
  perkCatalog:[{id:'p1',level:26,name:'Title Ocean'}],
  selectedFrame:'silver',selectedAura:'spark'};
 const frozen=JSON.stringify(employee),model=api.model(employee);
 assert.equal(model.levels[25].rewards.length,2);
 assert.equal(model.levels[26].rewards.length,1);
 assert.equal(model.levels[27].rewards.length,0);
 assert.equal(model.levels[25].state,'locked');
 assert.equal(JSON.stringify(employee),frozen);
 assert.doesNotMatch(source,/(httpsCallable|staffSetPersonalStyle|firebase-functions|localStorage\.setItem|fetch\()/);
});
test('Previously unlocked Levels remain shown as unlocked when current XP drops',()=>{
 const api=fixture(),model=api.model({
  employeeId:'DOL-0002',level:21,levelPeak:40,xp:xp(18),
  rewardCatalog:[{id:'old',level:40,label:'Mythic banner'}]
 });
 assert.equal(model.highest,40);
 assert.equal(model.current,21);
 assert.equal(model.levels[20].state,'current');
 assert.equal(model.levels[39].state,'complete');
 assert.equal(model.levels[40].state,'locked');
 assert.equal(model.levels[39].rewards[0].label,'Mythic banner');
});
test('Uses correct backend Rank thresholds on all sixty levels',()=>{
 const model=fixture().model({employeeId:'DOL-0002',level:60,levelPeak:60,xp:xp(60)});
 const expected={1:'BRONZE',5:'BRONZE',6:'SILVER',10:'SILVER',
  11:'GOLD',20:'GOLD',21:'PLATINUM',30:'PLATINUM',
  31:'DIAMOND',40:'DIAMOND',41:'LEGEND',60:'LEGEND'};
 for(const [str,rank]of Object.entries(expected))assert.equal(model.levels[Number(str)-1].rank,rank);
 assert.equal(model.current,60);
 assert.equal(model.highest,60);
 assert.equal(model.levels.filter(x=>x.state==='locked').length,0);
});
test('New or switched Staff ID never exposes the previous employee history',()=>{
 const api=fixture('DOL-0002');
 const none=api.model({employeeId:'DOL-0003',level:60,levelPeak:60,xp:xp(60),
  rewardCatalog:[{level:60,label:'PRIVATE'}]});
 assert.equal(none.ready,false);
 assert.equal(none.rewardMap.size,0);
 assert.equal(none.levels.every(x=>x.state==='locked'),true);
 assert.equal(api.model(null).ready,false);
});
test('2D ocean atlases exist and all old data binding targets are retained without duplicate panels',()=>{
 const html=read('dolphin-profile.html'),css=read('crew-2d-icons.css');
 const atlasNames=['assets/crew-profile-icons.webp','assets/crew-journey-icons.webp'];
 for(const file of atlasNames){
  const body=fs.readFileSync(path.join(root,file));
  assert.equal(body.subarray(0,4).toString(),'RIFF');
  assert.equal(body.subarray(8,12).toString(),'WEBP');
  assert(body.length>15000&&body.length<80000,'Icon atlas must stay fast on staff devices');
  assert(css.includes(file));
 }
 assert.match(html,/crew-ocean-journey\.js\?v=journey-v1/);
 assert.match(html,/crew-2d-icons\.css\?v=journey-v1/);
 assert.match(html,/crew-journey-regions/);
 assert.match(html,/crew-journey-dialog/);
 assert.equal(html.includes('class="quick-actions"'),false);
 assert.equal(html.includes('class="card reward-preview"'),false);
 for(const id of ['profile-avatar','profile-name','staff-xp-summary','staff-next-reward',
  'staff-reward-highlights','crew-card-equipped-frame','crew-levelup-replay','devices-dialog','rewards-dialog']){
  assert.equal((html.match(new RegExp('id="'+id+'"','g'))||[]).length,1);
 }
 assert.match(html,/data-open-dialog="devices-dialog"/);
 assert.match(html,/data-open-dialog="style-dialog"/);
 assert.match(html,/data-open-dialog="rewards-dialog"/);
});
