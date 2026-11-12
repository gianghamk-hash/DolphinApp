/* Opt-in Sprint 3 browser render-cadence probe.
 * Enable with ?benchfps=1; samples real game rendering callbacks, NOT network RTT
 * or GPU presentation timestamps. Disabled by default and has no timers.
 */
(function(root){'use strict';
const MAX_FRAMES=600,series=new Map();
let enabled=/(?:^|[?&])benchfps=1(?:&|$)/.test(root.location?.search||'');
function start(label){
  series.set(label,[]);
  enabled=true;
}
function frame(label,timestamp){
  if(!enabled||!Number.isFinite(timestamp))return;
  let times=series.get(label);
  if(!times){times=[];series.set(label,times);}
  if(times.length&&timestamp<=times[times.length-1])return;
  times.push(timestamp);
  if(times.length>MAX_FRAMES)times.shift();
}
function percentile(values,q){
  if(!values.length)return null;
  const sorted=values.slice().sort((a,b)=>a-b);
  return sorted[Math.ceil(sorted.length*q)-1];
}
function report(label){
  const times=series.get(label)||[],gaps=[];
  for(let i=1;i<times.length;i++)gaps.push(times[i]-times[i-1]);
  const elapsed=times.length>1?times[times.length-1]-times[0]:0;
  return {source:'browser-render-callbacks',label,frames:times.length,
    intervalSamples:gaps.length,
    fps:elapsed>0?Math.round(gaps.length*10000/elapsed)/10:null,
    medianFrameMs:percentile(gaps,.5),
    p95FrameMs:percentile(gaps,.95),
    longFrames:gaps.filter(ms=>ms>50).length,
    note:'This measures render callback cadence on this browser, not GPU display FPS'};
}
function reset(label){if(label)series.delete(label);else series.clear();}
const api={frame,report,start,reset,isEnabled:()=>enabled,MAX_FRAMES};
root.DolphinRenderMetrics=api;
if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
