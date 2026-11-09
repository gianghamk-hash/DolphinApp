'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const path=require('node:path');
const src=fs.readFileSync(path.join(__dirname,'..','crew-arcade-missions.js'),'utf8');
function runBridge(options={}){
 const source=src.replace(/import\('https:\/\/www\.gstatic\.com\/firebasejs\/10\.12\.2\/firebase-(app|auth|functions)\.js'\)/g,
  (_,kind)=>'window.__arcadeModule.'+kind+'()');
 const callLog=[],events=[],node={textContent:'',style:{},children:[],appendChild(v){this.children.push(v);return v;}};
 const win={parent:null,dispatchEvent:ev=>events.push(ev),DolphinArcadeProof:{random:()=>()=>0.5},
  DolphinStaffId:{ready:async()=>{},get:()=>({verified:options.verified!==false,employeeId:'DOL-0002'})}};
 win.parent=win;
 let finishCalls=0;
 win.__arcadeModule={
  app:async()=>({getApp:()=>({})}),
  auth:async()=>({getAuth:()=>({currentUser:{uid:'worker'},authStateReady:async()=>{}})}),
  functions:async()=>({getFunctions:()=>({}),httpsCallable:(_,name)=>async payload=>{
   callLog.push({name,payload});
   if(name==='staffStartArcadeMission')return {data:{challengeId:'f'.repeat(32),seed:1234}};
   if(name==='staffFinishArcadeMission'){
    finishCalls++;
    if(options.failOnce&&finishCalls===1){
     const error=Error('Temporary network outage');error.code='functions/unavailable';throw error;
    }
    return {data:{awarded:true,addedXP:1500,missions:{tasks:[{id:'snake_100',done:true}]}}};
   }
   throw Error('Unexpected callable '+name);
  }})
 };
 const doc={getElementById:()=>node,createElement:tag=>({tag,type:'',textContent:'',style:{},onclick:null})};
 const CEvent=class{constructor(type,opt){this.type=type;this.detail=opt?.detail;}};
 const ctx={window:win,document:doc,console,setTimeout,clearTimeout,CustomEvent:CEvent,
  Promise,Object,Number,Uint8Array};
 vm.runInNewContext(source,ctx);
 return {api:win.DolphinCrewArcade,node,callLog,events};
}
test('game requires a verified Staff ID before issuing a reward challenge',async()=>{
 const h=runBridge({verified:false});
 assert.equal(await h.api.start('snake'),null);
 assert.equal(h.callLog.length,0);
 assert.match(h.node.textContent,/Xác minh Staff ID/);
});
test('a transient claim failure retries the SAME verified result and awards once',async()=>{
 const h=runBridge({failOnce:true}),run=await h.api.start('snake');
 assert.equal(run.eligible,true);
 h.api.move(run,'right');h.api.move(run,'up');
 await h.api.claim(run,200);
 const calls=h.callLog.filter(x=>x.name==='staffFinishArcadeMission');
 assert.equal(calls.length,2);
 assert.equal(calls[0].payload.score,200);
 assert.equal(calls[0].payload.moves,'RU');
 assert.equal(calls[1].payload,calls[0].payload,'A retry must reuse immutable replay evidence');
 assert.equal(run.claimed,true);
 assert.match(h.node.textContent,/1\.500 XP/);
 assert.equal(h.events.length,1);
 await h.api.claim(run,200);
 assert.equal(h.callLog.filter(x=>x.name==='staffFinishArcadeMission').length,2);
});
test('both games load bridge version 2 and display current verified XP rewards',()=>{
 const snake=fs.readFileSync(path.join(__dirname,'..','giaitri/games/snake.html'),'utf8');
 const game2048=fs.readFileSync(path.join(__dirname,'..','giaitri/games/game2048.html'),'utf8');
 const sw=fs.readFileSync(path.join(__dirname,'..','service-worker.js'),'utf8');
 for(const file of [snake,game2048,sw])assert.match(file,/crew-arcade-missions\.js\?v=2/);
 assert.match(snake,/score>=200/);assert.match(snake,/Đạt 200 điểm trong một ván: \+1\.500 XP/);
 assert.match(game2048,/Đạt 1\.000 điểm trong một ván: \+3\.000 XP/);
 assert.match(src,/bounded\(api\('staffStartArcadeMission',\{game\}\),20000\)/);
});
