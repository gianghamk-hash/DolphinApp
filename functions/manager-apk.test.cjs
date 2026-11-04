'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
function fixture(){
 let now=10000,failProjection=false;
 const data={staffRegistry:{'DOL-0001':{employeeId:'DOL-0001',name:'Nguyễn Văn An',active:true,xp:4321,levelPeak:5},
  'DOL-0002':{employeeId:'DOL-0002',name:'Trần Văn Bình',active:true}},
  staffIdentity:{owner:{employeeId:'DOL-0001',verified:true},second:{employeeId:'DOL-0001',verified:true},staff:{employeeId:'DOL-0002',verified:true},forged:{employeeId:'DOL-0001',verified:false}},
  tacticsRankVerified:{owner:{employeeId:'DOL-0001',player:'Nguyễn Văn An',totalScore:52}},staffPrestige:{legends:{'DOL-0001':{name:'Nguyễn Văn An',firstAt:100}}}};
 const clone=v=>v===undefined?null:structuredClone(v);
 const get=p=>p.split('/').reduce((v,k)=>v?.[k],data);
 const set=(p,v)=>{const keys=p.split('/'),last=keys.pop();let node=data;for(const k of keys)node=node[k]??={};node[last]=clone(v);};
 const snap=v=>({val:()=>clone(v)});
 const ref=p=>({once:async()=>snap(get(p)),transaction:async fn=>{
  if(failProjection&&p==='staffIdentity/second')throw Error('projection unavailable');
  let proposed=fn(null);if(proposed===undefined)return {committed:false,snapshot:snap(get(p))};
  proposed=fn(clone(get(p)));if(proposed===undefined)return {committed:false,snapshot:snap(get(p))};
  set(p,proposed);return {committed:true,snapshot:snap(get(p))};
 }});
 const api={};class Clock extends Date{static now(){return now;}}
 vm.runInNewContext(fs.readFileSync(__dirname+'/staff-profile.js','utf8'),{exports:api,Date:Clock,console,require:id=>{
  if(id==='firebase-admin/database')return {getDatabase:()=>({ref})};
  if(id==='firebase-functions/v2/https')return {onCall:(_,fn)=>fn,HttpsError:class extends Error{constructor(code,msg){super(msg);this.code=code;}}};
  if(id==='./staff-prestige')return {_rebuildPrestige:async()=>{}};
  return require(id);
 }});
 return {api,data,tick:()=>{now+=2000;},fail:on=>{failProjection=on;}};
}
const req=(uid,data={})=>({auth:uid?{uid}:null,data});
test('Manager session and rename require the token UID, verified mapping and active trusted master',async()=>{
 const f=fixture();
 for(const uid of [null,'unknown','staff','forged'])for(const name of ['staffGetManagerIdentity','staffRenameManager','staffListApprovedProfiles'])
  await assert.rejects(()=>f.api[name](req(uid,{employeeId:'DOL-0001',name:'Tên Giả Mạo',managerSession:true})),e=>['unauthenticated','permission-denied'].includes(e.code));
 assert.equal((await f.api.staffGetManagerIdentity(req('owner'))).managerSession,true);
 f.data.staffRegistry['DOL-0001'].active=false;
 await assert.rejects(()=>f.api.staffGetManagerIdentity(req('owner')),e=>e.code==='permission-denied');
 f.data.staffRegistry['DOL-0001'].active=true;f.data.staffRegistry['DOL-0001'].registrationSource='self';
 await assert.rejects(()=>f.api.staffGetManagerIdentity(req('owner')),e=>e.code==='permission-denied');
});
test('repeated manager renames synchronize devices, rank and legends without changing XP or other employees',async()=>{
 const f=fixture(),staff=structuredClone(f.data.staffRegistry['DOL-0002']);
 for(let n=0;n<25;n++){f.tick();await f.api.staffRenameManager(req('owner',{name:'Nguyễn Quản Lý '+n}));}
 const profile=f.data.staffRegistry['DOL-0001'];assert.equal(profile.name,'Nguyễn Quản Lý 24');
 assert.equal(profile.xp,4321);assert.equal(profile.levelPeak,5);assert.equal(profile.profileVersion,25);
 assert.equal(profile.nameAliases.length,25);
 assert.equal(f.data.staffIdentity.second.name,profile.name);assert.equal(f.data.tacticsRankVerified.owner.player,profile.name);
 assert.equal(f.data.tacticsRankVerified.owner.totalScore,52);assert.equal(f.data.staffPrestige.legends['DOL-0001'].firstAt,100);
 assert.deepEqual(f.data.staffRegistry['DOL-0002'],staff);
 const directory=await f.api.staffListApprovedProfiles(req('owner'));
 assert.deepEqual(Object.keys(directory.profiles[0]).sort(),['avatar','employeeId','name']);
});
test('rename keeps validation, uniqueness and normal staff immutable-name policy',async()=>{
 const f=fixture();
 for(const name of ['x','<script>','Tran Van Binh']){f.tick();await assert.rejects(()=>f.api.staffRenameManager(req('owner',{name})));}
 f.tick();await assert.rejects(()=>f.api.staffUpdateMyProfile(req('staff',{name:'Trần Văn Mới'})),e=>e.code==='permission-denied');
 assert.equal(f.data.staffRegistry['DOL-0001'].name,'Nguyễn Văn An');
});
test('failed synchronization reports failure; retry repairs projections without a second rename',async()=>{
 const f=fixture();f.fail(true);
 await assert.rejects(()=>f.api.staffRenameManager(req('owner',{name:'Nguyễn Tên Mới'})),/projection unavailable/);
 f.fail(false);f.tick();await f.api.staffRenameManager(req('owner',{name:'Nguyễn Tên Mới'}));
 assert.equal(f.data.staffRegistry['DOL-0001'].profileVersion,1);assert.equal(f.data.staffIdentity.second.name,'Nguyễn Tên Mới');
});
test('stale name synchronization cannot overwrite newer device projection',async()=>{
 const f=fixture();f.data.staffIdentity.second.profileVersion=99;f.data.staffIdentity.second.name='Tên Mới Hơn';
 await f.api.staffRenameManager(req('owner',{name:'Nguyễn Tên Mới'}));
 assert.equal(f.data.staffIdentity.second.name,'Tên Mới Hơn');
});
