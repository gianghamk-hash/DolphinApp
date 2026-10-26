/* Timeline cue scheduler: cosmetic wind-up precedes authoritative hit events. */
(function(root){'use strict';
const LEAD=Object.freeze({attack:150,cast:260});
function createCombatCueScheduler(){
 const primed=new Set();
 function advance(events,index,elapsed,onCue){
  for(let i=index;i<events.length;i++){
   const e=events[i],lead=LEAD[e.type];
   if(!lead)continue;
   if(e.t>elapsed+lead)break;
   if(e.t<=elapsed||primed.has(i))continue;
   primed.add(i);onCue(e,i);
  }
 }
 function consume(index){const found=primed.has(index);primed.delete(index);return found;}
 function reset(){primed.clear();}
 return {advance,consume,reset,get pending(){return primed.size;}};
}
root.DolphinTacticsCreateCombatCueScheduler=createCombatCueScheduler;
if(typeof module!=='undefined'&&module.exports)module.exports={createCombatCueScheduler,LEAD};
})(typeof window!=='undefined'?window:globalThis);
