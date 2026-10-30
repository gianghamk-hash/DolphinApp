/* Simulation is CPU work; keep it off the WebGL/input thread. */
'use strict';
importScripts('../../../functions/tactics/engine.js');
let engine=null;
self.onmessage=event=>{
 const {id,type,payload}=event.data;
 try{
  if(type==='init'){engine=self.DolphinTacticsCreateEngine(payload);self.postMessage({id,result:true});return;}
  if(!engine)throw Error('Simulation worker is not initialized');
  const result=type==='advance'
   ?engine.advance(payload.state,payload.now,{recordEvents:false})
   :engine.simulate(payload.pair,{round:payload.round},payload.players,payload.seed);
  self.postMessage({id,result});
 }catch(error){self.postMessage({id,error:String(error.message||error)});}
};
