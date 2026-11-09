'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const source=fs.readFileSync(path.resolve(__dirname,'../crew-levelup-cinematic.js'),'utf8');
function fixture(initial={},id='DOL-0002'){
 const nodes=[],storage=new Map(Object.entries(initial)),listeners=new Map(),byId=new Map(),audio=[];
 let owner=id,hidden=false,forceBlock=false;
 function node(tag){
  const n={tag,children:[],style:{values:{},setProperty(k,v){this.values[k]=v;}},open:false,
   textContent:'',className:'',dataset:{},hidden:false,attrs:{},listeners:{},type:'',
   setAttribute(k,v){this.attrs[k]=v;},addEventListener(k,fn){this.listeners[k]=fn;},
   append(...items){this.children.push(...items);},remove(){this.removed=true;},
   showModal(){this.open=true;},close(){this.open=false;this.listeners.close?.();}};
  nodes.push(n);return n;
 }
 const replay=node('button');replay.id='crew-levelup-replay';byId.set(replay.id,replay);
 const rewards=node('dialog');rewards.id='rewards-dialog';byId.set(rewards.id,rewards);
 const document={
  get hidden(){return hidden;},readyState:'loading',createElement:node,
  getElementById:id=>byId.get(id)||null,
  querySelector:q=>q==='dialog[open]'?(forceBlock?{open:true}:nodes.find(n=>n.tag==='dialog'&&n.open)||null):null,
  body:{append(n){if(n.id)byId.set(n.id,n);}},
  addEventListener:(name,fn)=>listeners.set(name,fn)
 };
 const localStorage={
  getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v),
  removeItem:k=>storage.delete(k)
 };
 const window={localStorage,addEventListener:(name,fn)=>listeners.set(name,fn),
  DolphinStaffId:{get:()=>({employeeId:owner})},DolphinPrestige:{getMine:()=>({employeeId:owner})}};
 const ctx={document,window,Map,JSON,Array,Object,Number,String,Math};
 vm.runInNewContext(source,ctx);
 listeners.get('DOMContentLoaded')?.();
 return {api:window.DolphinLevelUp,document,window,nodes,byId,storage,action:name=>listeners.get(name)?.(),
  setOwner:x=>owner=x,block:x=>forceBlock=x,hide:x=>hidden=x,dialogs:()=>nodes.filter(x=>x.tag==='dialog'&&x.id==='crew-levelup-cinematic'),
  events:audio};
}
const staff=(level,employeeId='DOL-0002',extra={})=>({employeeId,level,avatar:'🐬',
 rewardCatalog:[{level:3,label:'Tên phát sáng'},{level:5,label:'Khung Bronze'},{level:6,label:'Bậc Silver'}],
 perkCatalog:[{id:'avatar-explorer',level:3,name:'Avatar Khám phá'},{id:'buff-health',level:3,name:'Không thưởng avatar'}],
 ...extra});
test('first device baseline does not replay all historical Levels',()=>{
 const h=fixture(),before=staff(22),copy=JSON.stringify(before);
 assert.equal(h.api.notify(before),false);
 assert.equal(h.dialogs().length,0);
 assert.equal(h.storage.get('dolphin_level_seen:DOL-0002'),'22');
 assert.equal(JSON.stringify(before),copy);
 assert.equal(h.api.notify(staff(22)),false);
});
test('next verified level creates cinematic and rewards exactly once, can replay without XP',()=>{
 const h=fixture({'dolphin_level_seen:DOL-0002':'2'});
 const progress=staff(5);
 assert.equal(h.api.notify(progress),true);
 const dialog=h.dialogs()[0];
 assert.equal(dialog.open,true);
 assert.equal(dialog.dataset.tier,'normal');
 const scene=dialog.children[0],list=scene.children.find(c=>c.className==='crew-lc-awards')?.children.find(c=>c.tag==='ul');
 assert.equal(list.children.length,3,'Every newly unlocked reward is aggregated');
 assert.equal(h.storage.get('dolphin_level_seen:DOL-0002'),'5');
 assert.equal(h.api.notify(progress),false);
 const actions=scene.children.find(c=>c.className==='crew-lc-actions');
 assert.equal(actions.children.length,2);
 actions.children[1].onclick();
 assert.equal(dialog.open,false);
 assert.equal(h.api.replay(),true);
 const replay=h.dialogs()[1];assert.equal(replay.dataset.tier,'normal');
 const replayActions=replay.children[0].children.find(c=>c.className==='crew-lc-actions');
 replayActions.children[0].onclick();
 assert.equal(h.byId.get('rewards-dialog').open,true);
 assert.equal(h.storage.get('dolphin_level_seen:DOL-0002'),'5');
});
test('dialog/hidden screen defers without consuming, staff switch is isolated',()=>{
 const h=fixture({'dolphin_level_seen:DOL-0002':'20','dolphin_level_seen:DOL-0003':'10'});
 h.block(true);assert.equal(h.api.notify(staff(22)),false);
 assert.equal(h.storage.get('dolphin_level_seen:DOL-0002'),'20');
 h.block(false);h.hide(true);assert.equal(h.api.notify(staff(22)),false);
 h.hide(false);assert.equal(h.api.notify(staff(22)),true);
 const modal=h.dialogs()[0];assert.equal(modal.dataset.tier,'rank');
 modal.close();
 h.setOwner('DOL-0003');assert.equal(h.api.notify(staff(11,'DOL-0002')),false);
 h.window.DolphinPrestige.getMine=()=>({employeeId:'DOL-0002'});
 assert.equal(h.api.replay(),false,'A stale prior profile cannot be replayed under a new Staff ID');
 h.window.DolphinPrestige.getMine=()=>({employeeId:'DOL-0003'});
 assert.equal(h.api.notify(staff(11,'DOL-0003')),true);
 assert.equal(h.storage.get('dolphin_level_seen:DOL-0002'),'22');
 assert.equal(h.storage.get('dolphin_level_seen:DOL-0003'),'11');
});
test('major milestones and Mythic 60 use distinct cinematic tiers',()=>{
 const h=fixture({'dolphin_level_seen:DOL-0002':'9'});
 assert.equal(h.api.notify(staff(10)),true);
 assert.equal(h.dialogs()[0].dataset.tier,'milestone');
 h.dialogs()[0].close();
 h.storage.set('dolphin_level_seen:DOL-0002','59');
 assert.equal(h.api.notify(staff(60)),true);
 const mythic=h.dialogs()[1];
 assert.equal(mythic.dataset.tier,'mythic');
 assert.equal(mythic.children[0].children.find(c=>c.id==='crew-lc-title').textContent,'ĐỈNH CAO ĐẠI DƯƠNG');
});
test('manager sandbox reset decreases seen checkpoint without replaying old rewards',()=>{
 const h=fixture({'dolphin_level_seen:DOL-0002':'40'});
 assert.equal(h.api.notify(staff(1,'DOL-0002',{testAdmin:true})),false);
 assert.equal(h.storage.get('dolphin_level_seen:DOL-0002'),'1');
 assert.equal(h.dialogs().length,0);
 assert.equal(h.api.notify(staff(2,'DOL-0002',{testAdmin:true})),true);
});
test('cinematic stays read-only and old profile delegates to it',()=>{
 const old=fs.readFileSync(path.resolve(__dirname,'../staff-prestige-profile.js'),'utf8');
 assert.match(old,/return window\.DolphinLevelUp\?\.notify\(next\)===true/);
 assert.doesNotMatch(source,/(httpsCallable|firebase-functions|staffSetPersonalStyle|staffAdjustOwnTestXP|\.xp\s*=|\.levelPeak\s*=|autoStyleLevel\s*=)/);
 const css=fs.readFileSync(path.resolve(__dirname,'../crew-levelup-cinematic.css'),'utf8');
 const html=fs.readFileSync(path.resolve(__dirname,'../dolphin-profile.html'),'utf8');
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
 assert.match(html,/crew-levelup-cinematic\.js\?v=levelup-v1/);
 assert.match(html,/id="crew-levelup-replay"/);
});
