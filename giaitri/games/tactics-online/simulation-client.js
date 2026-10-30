(function(root){'use strict';
function create(E,catalog,options={}){
 let worker=null,sequence=0,ready=null;const tasks=new Map();
 const timeout=options.timeout||15000;
 function close(){if(worker)worker.terminate();worker=null;for(const task of tasks.values()){clearTimeout(task.timer);task.reject(Error('Simulation worker unavailable'));}tasks.clear();}
 function request(type,payload){return new Promise((resolve,reject)=>{
  const id=++sequence,timer=setTimeout(()=>{tasks.delete(id);reject(Error('Simulation worker timeout'));close();},timeout);
  tasks.set(id,{resolve,reject,timer});worker.postMessage({id,type,payload});
 });}
 function init(){
  if(ready)return ready;
  ready=Promise.resolve().then(()=>{
   worker=options.workerFactory?options.workerFactory():new root.Worker('simulation-worker.js?v=2');
   worker.onmessage=event=>{const task=tasks.get(event.data.id);if(!task)return;clearTimeout(task.timer);tasks.delete(event.data.id);event.data.error?task.reject(Error(event.data.error)):task.resolve(event.data.result);};
   worker.onerror=close;return request('init',catalog);
  });return ready;
 }
 async function run(type,payload){
  try{await init();if(worker)return await request(type,payload);}catch(error){close();}
  // Browsers that cannot create workers still have a functional deterministic game.
  await new Promise(resolve=>setTimeout(resolve,0));
  return type==='advance'?E.advance(E.clone(payload.state),payload.now,{recordEvents:false}):E.simulate(payload.pair,{round:payload.round},payload.players,payload.seed);
 }
 return {advance:(state,now)=>run('advance',{state,now}),simulate:(pair,round,players,seed)=>run('simulate',{pair,round,players,seed}),close};
}
root.DolphinTacticsSimulation={create};
if(typeof module!=='undefined'&&module.exports)module.exports=root.DolphinTacticsSimulation;
})(typeof window!=='undefined'?window:globalThis);
