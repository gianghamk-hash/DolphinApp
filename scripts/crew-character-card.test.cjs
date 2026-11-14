'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const source=read('crew-character-card.js');
function harness(){
 const handlers=new Map(),nodes=new Map(),writes=[];
 const make=id=>{
  const state={id,textContent:'',dataset:{},attributes:{},style:{
   values:{},setProperty(key,value){this.values[key]=value;writes.push({id,key,value});}
  },title:'',setAttribute(k,v){this.attributes[k]=String(v);}};
  nodes.set(id,state);return state;
 };
 for(const id of ['crew-profile-banner','crew-card-rank-badge','crew-card-rank-name',
  'crew-card-level-number','crew-card-portrait-bottom','crew-card-equipped-frame',
  'crew-card-equipped-aura','crew-card-equipped-motion','crew-card-equipped-title',
  'crew-card-xp-dial','crew-card-xp-percent'])make(id);
 const win={DolphinPrestige:{getMine:()=>null},DolphinStaffId:{get:()=>({employeeId:'DOL-0002'})},
  addEventListener:(key,callback)=>handlers.set(key,callback)};
 const doc={readyState:'loading',getElementById:id=>nodes.get(id)||null,
  addEventListener:(key,callback)=>handlers.set(key,callback)};
 const ctx={window:win,document:doc,Object,Array,Number,Math,String};
 vm.runInNewContext(source,ctx);
 return {api:win.DolphinCrewCharacter,nodes,writes,handlers,win};
}
const xpAt=level=>2450*(level-1)**2;
test('Card model renders verified Level without altering XP, levelPeak or cosmetics',()=>{
 const h=harness(),staff=Object.freeze({employeeId:'DOL-0002',xp:xpAt(22)+24500,level:22,
  levelPeak:22,rank:'Platinum',selectedFrame:'silver',selectedAura:'dual',
  selectedAvatarMotion:'wave',selectedTitle:'guardian',autoStyleLevel:20});
 const before=JSON.stringify(staff);
 const view=h.api.model(staff);
 assert.equal(view.ready,true);assert.equal(view.level,22);
 assert.equal(view.rank,'platinum');assert.equal(view.rankName,'PLATINUM');
 assert.equal(view.equipped.frame,'Silver');assert.equal(view.equipped.aura,'Dual Halo');
 assert.equal(view.equipped.motion,'Wave Spin');assert.equal(view.equipped.title,'Coral Guardian');
 assert(view.percent>0&&view.percent<100);
 h.api.render(staff);
 assert.equal(h.nodes.get('crew-profile-banner').dataset.crewRank,'platinum');
 assert.equal(h.nodes.get('crew-card-level-number').textContent,'22');
 assert.equal(h.nodes.get('crew-card-equipped-aura').textContent,'Dual Halo');
 assert.match(h.nodes.get('crew-card-xp-dial').style.values['--crew-progress'],/^\d+%$/);
 assert.equal(JSON.stringify(staff),before,'Card must never mutate the employee record');
});
test('No linked staff means no old employee Level/Rank leaks',()=>{
 const h=harness();
 h.api.render({employeeId:'DOL-0003',xp:xpAt(60),level:60,rank:'Legend'});
 assert.equal(h.nodes.get('crew-card-level-number').textContent,'—');
 assert.equal(h.nodes.get('crew-card-rank-badge').textContent,'CREW CARD');
 assert.equal(h.nodes.get('crew-card-xp-dial').style.values['--crew-progress'],'0%');
 assert.equal(h.nodes.get('crew-card-equipped-frame').textContent,'Chưa trang bị');
});
test('Prestige Lv60 is capped and LevelPeak preserves unlocked styles when XP has been deducted',()=>{
 const h=harness();
 const max=h.api.model({employeeId:'DOL-0002',xp:xpAt(60),level:60,rank:'Legend'});
 assert.equal(max.level,60);assert.equal(max.percent,100);
 assert.equal(h.api.model({employeeId:'DOL-0002',xp:xpAt(60)+500,level:70}).level,60);
 const preserved=h.api.model({employeeId:'DOL-0002',xp:3200,level:2,highestLevel:40,levelPeak:40,
  selectedFrame:'gold',selectedAura:'nebula',selectedTitle:'titan'});
 assert.equal(preserved.level,2);assert.equal(preserved.highestLevel,40);assert.equal(preserved.preserved,true);
 assert(preserved.percent>0);assert.equal(preserved.equipped.frame,'Gold');
 h.api.render({employeeId:'DOL-0002',xp:3200,level:2,highestLevel:40,levelPeak:40,selectedFrame:'gold'});
 assert.match(h.nodes.get('crew-card-xp-percent').textContent,/^\d+%$/);
 assert.equal(h.nodes.get('crew-card-level-number').textContent,'2');
 assert.match(h.nodes.get('crew-card-xp-dial').title,/Mốc cao nhất từng đạt/);
});
test('Rank reflects the existing backend rank and defaults to verified Level band only when omitted',()=>{
 const h=harness();
 assert.equal(h.api.model({employeeId:'DOL-0002',xp:0,level:5}).rank,'bronze');
 assert.equal(h.api.model({employeeId:'DOL-0002',xp:0,level:6}).rank,'silver');
 assert.equal(h.api.model({employeeId:'DOL-0002',xp:0,level:11}).rank,'gold');
 assert.equal(h.api.model({employeeId:'DOL-0002',xp:0,level:21}).rank,'platinum');
 assert.equal(h.api.model({employeeId:'DOL-0002',xp:0,level:31}).rank,'diamond');
 assert.equal(h.api.model({employeeId:'DOL-0002',xp:0,level:41}).rank,'legend');
});
test('Card is HTML/CSS only, and retains every existing business/profile handler binding',()=>{
 const html=read('dolphin-profile.html'),css=read('crew-character-card.css');
 for(const id of ['crew-profile-banner','profile-avatar','profile-name','profile-title',
  'employee-id','profile-state','staff-progress-card','staff-level-tag','staff-xp-summary',
  'staff-xp-track','staff-xp-fill','staff-next-level','staff-next-reward',
  'crew-card-xp-dial','crew-card-equipped-frame','crew-card-equipped-aura',
  'crew-card-equipped-motion','crew-card-equipped-title']){
  assert.equal((html.match(new RegExp('id="'+id+'"','g'))||[]).length,1,'Unique binding: '+id);
 }
 assert.match(html,/crew-character-card\.css\?v=character-v1/);
 assert.match(html,/crew-character-card\.js\?v=xp-lock-v4/);
 assert.equal((html.match(/data-open-dialog="style-dialog"/g)||[]).length>=4,true);
 assert.match(css,/#crew-profile-banner #profile-avatar/);
 assert.match(css,/@media\(max-width:450px\)/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
 assert.doesNotMatch(html,/id="crew-ocean-journey"|crew-ocean-journey|id="crew-journey-dialog"/);
 assert.equal((html.match(/data-crew-tile=/g)||[]).length,8,'Eight chibi functional cards must replace old utilities');
 assert.equal(html.split('href="./ranking/index.html#level"').length-1,1,'No duplicate ranking shortcut');
 assert.match(html,/data-open-dialog="devices-dialog"/);
 assert.match(html,/id="staff-reward-highlights"/);
 assert.doesNotMatch(source,/\.set\(|\.update\(|localStorage\.setItem|httpsCallable|fetch\(/,
  'Card must not write employee fields');
});

test('XP zero displays Level 1 despite old Level 54 unlock, without removing cosmetics',()=>{
 const h=harness(),view=h.api.model({employeeId:'DOL-0002',xp:0,level:1,highestLevel:54,rank:'Bronze',selectedFrame:'gold',selectedAvatarMotion:'phoenix'});
 assert.equal(view.level,1);assert.equal(view.highestLevel,54);
 assert.equal(view.percent,0);assert.equal(view.rank,'bronze');
 assert.equal(view.equipped.frame,'Gold');assert.equal(view.equipped.motion,'Phoenix');
 h.api.render({employeeId:'DOL-0002',xp:0,level:1,highestLevel:54,rank:'Bronze',selectedFrame:'gold'});
 assert.equal(h.nodes.get('crew-card-level-number').textContent,'1');
 assert.equal(h.nodes.get('crew-card-xp-percent').textContent,'0%');
 assert.match(h.nodes.get('crew-card-xp-dial').title,/Mốc cao nhất từng đạt: Level 54/);
});

test('live portrait retains room for equipped avatar effects',()=>{
 const css=read('crew-profile-illustrated.css');
 assert.match(css,/overflow:visible!important/);
 assert.match(css,/z-index:3!important/);
 assert.match(read('dolphin-profile.html'),/chibi-clean-v5/);
 assert.match(read('service-worker.js'),/chibi-clean-v5/);
});
