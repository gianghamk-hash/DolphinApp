'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const source=fs.readFileSync(path.join(root,'crew-chibi-dashboard.js'),'utf8');
const html=fs.readFileSync(path.join(root,'dolphin-profile.html'),'utf8');
function harness(ownerId='DOL-0002'){
 const nodes=new Map(),events={};
 function node(id){
  if(!nodes.has(id))nodes.set(id,{id,textContent:'',hidden:false,children:[],replaceChildren(){this.children=[];},
   append(...items){this.children.push(...items);},dataset:{},closest:()=>null});
  return nodes.get(id);
 }
 const doc={
  readyState:'complete',getElementById:node,querySelectorAll:()=>[],
  createElement:tag=>({tag,children:[],textContent:'',append(...items){this.children.push(...items);}}),
  createTextNode:text=>({textContent:text})
 };
 const window={DolphinStaffId:{get:()=>ownerId?{employeeId:ownerId}:null},
  DolphinPrestige:{getMine:()=>null},
  addEventListener:(key,cb)=>events[key]=cb
 };
 vm.runInNewContext(source,{window,document:doc,Number,Math,Array,Object,String});
 return {api:window.DolphinCrewChibiDashboard,window,events,nodes,node};
}
const payload=(employeeId='DOL-0002',xp=4102.5,level=2)=>({
 employeeId,name:'Nhân viên thử nghiệm',xp,level,rank:'Bronze',
 dailyMissions:{tasks:[{id:'checkin',done:true},{id:'order',done:false}],completedCount:1,total:2,todayXP:600},
 unlocked:['avatar-bronze','basic-profile']
});
test('live staff profile XP and Level are projected, never hardcoded from mockup',()=>{
 const h=harness();
 let p=h.api.model(payload());
 assert.equal(p.xp,4102.5);assert.equal(p.level,2);assert.equal(p.employeeId,'DOL-0002');
 assert.equal(p.completed,1);assert.equal(p.total,2);
 h.api.render(payload());
 assert.match(h.node('crew-chibi-current-xp').textContent,/4.102,5 XP/);
 assert.equal(h.node('crew-chibi-current-level').textContent,'Lv. 2');
 assert.equal(h.node('crew-chibi-current-daily').textContent,'1/2');
 assert.equal(h.node('crew-chibi-daily-count').textContent,'1/2');
 assert.match(h.node('crew-dashboard-xp-detail').textContent,/DOL-0002/);
 assert.equal(h.node('crew-dashboard-achievements').children.length,5);
 assert.doesNotMatch(h.node('crew-dashboard-xp-detail').textContent,/78,450|42/);
});
test('unlinked and switched accounts never render stale employee statistics',()=>{
 const h=harness();
 const p=payload('DOL-0003',200000,12);
 assert.equal(h.api.model(p),null);
 h.api.render(p);
 assert.equal(h.node('crew-chibi-current-level').textContent,'—');
 assert.equal(h.node('crew-chibi-current-xp').textContent,'—');
 assert.equal(h.node('crew-chibi-daily-count').hidden,true);
 h.events['dolphin-my-progress-updated']({detail:payload()});
 assert.equal(h.node('crew-chibi-current-level').textContent,'Lv. 2');
 h.events['dolphin-staff-id-changed']();
 assert.equal(h.node('crew-chibi-current-level').textContent,'—');
});
test('XP zero shows Level 1, and tasks without verified data show placeholders',()=>{
 const h=harness(),p={employeeId:'DOL-0002',name:'New Crew',xp:0,level:1,rank:'Bronze'};
 const result=h.api.render(p);
 assert.equal(result.xp,0);
 assert.equal(h.node('crew-chibi-current-xp').textContent,'0 XP');
 assert.equal(h.node('crew-chibi-current-level').textContent,'Lv. 1');
 assert.equal(h.node('crew-chibi-current-daily').textContent,'—');
 assert.equal(h.node('crew-chibi-daily-count').hidden,true);
});
test('invalid identity, NaN and inconsistent Levels never appear on the profile',()=>{
 const h=harness();
 for(const values of [{...payload(),level:0},{...payload(),level:61},{...payload(),xp:-3},{...payload(),xp:NaN},{...payload(),employeeId:''}])
  assert.equal(h.api.model(values),null);
});
test('eight visual card controls, daily modal and official existing actions exist once',()=>{
 const tiles=html.match(/data-crew-tile="[^"]+"/g)||[];
 assert.equal(tiles.length,8);
 for(const action of ['profile','daily','xp','achievements','work','revenue','ranking','rewards'])
  assert.equal(tiles.filter(x=>x.includes('"'+action+'"')).length,1);
 for(const id of ['crew-daily-dialog','crew-xp-dialog','crew-achievements-dialog',
  'crew-work-dialog','crew-revenue-dialog','profile-edit-dialog','devices-dialog','rewards-dialog','style-dialog','staff-daily-card'])
  assert.equal((html.match(new RegExp('id="'+id+'"','g'))||[]).length,1,id);
 assert.match(html,/data-crew-tile="daily" data-open-dialog="crew-daily-dialog"/);
 assert.match(html,/data-crew-tile="profile" data-open-dialog="profile-edit-dialog"/);
 assert.match(html,/data-crew-tile="rewards" data-open-dialog="rewards-dialog"/);
 assert.match(html,/data-crew-tile="ranking" href="\.\/ranking\/index\.html#level"/);
 assert.match(html,/crew-chibi-dashboard\.js\?v=chibi-v1/);
 assert.match(html,/crew-chibi-dashboard\.css\?v=chibi-cards-v2/);
});
test('the display illustration contains no literal personal identity or mockup revenue/XP',()=>{
 const js=source;
 const svg=fs.readFileSync(path.join(root,'assets/dolphin-chibi-ship.svg'),'utf8');
 const art=fs.readFileSync(path.join(root,'assets/crew-chibi-function-art.svg'),'utf8');
 const css=fs.readFileSync(path.join(root,'crew-chibi-dashboard.css'),'utf8');
 const worker=fs.readFileSync(path.join(root,'service-worker.js'),'utf8');
 for(const content of [html,js,svg,art,css]) {
  assert.doesNotMatch(content,/Đoàn Đình Giang|Nguyễn Minh Anh|78.?450\s*\/\s*88.?000|16.?302.?500/);
 }
 assert.match(svg,/DOLPHIN/);
 assert.match(css,/assets\/dolphin-chibi-ship\.svg/);
 assert.match(css,/assets\/crew-chibi-function-art\.svg/);
 assert.match(worker,/crew-chibi-dashboard\.js/);
 assert.match(worker,/assets\/crew-chibi-function-art\.svg/);
 assert.doesNotMatch(js,/httpsCallable|staffRecordLiveAction|staffAdjustOwnTestXP|firebase\.|revenue\s*=/i);
});
