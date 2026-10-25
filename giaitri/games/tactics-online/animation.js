/* Dolphin Tactics procedural hero animation system, 30fps friendly, deterministic visual replay.
 * Gameplay authority remains in the host engine; this module is presentation only.
 */
(function(root){
'use strict';
function createAnimator(T){
 const motions=new Map(),effects=[],clock={now:0};
 const ease=t=>t*t*(3-2*t);
 function play(node,type,now=performance.now(),extra={}){
  if(!node||!node.parent)return;
  const duration={idle:1000,run:440,attack:340,cast:650,hit:250,death:800,heal:600,shield:700}[type]||500;
  motions.set(node,{type,start:now,duration,from:node.position.clone(),to:extra.to||null,baseY:node.userData.baseY||0});
 }
 function disposeFX(f){if(f.mesh.parent)f.mesh.parent.remove(f.mesh);f.mesh.geometry.dispose();f.mesh.material.dispose();}
 function burst(scene,node,type,now=performance.now()){
  if(!node||!node.parent||effects.length>55)return;
  const hue={cast:0x9a76ff,heal:0x5af9a0,shield:0x56c9ff,hit:0xffb26e,death:0xff657f}[type]||0xffdb84;
  const count=type==='cast'?9:6;
  for(let i=0;i<count;i++){
   const theta=(i/count)*Math.PI*2;
   const mat=new T.MeshBasicMaterial({color:hue,transparent:true,opacity:.88,depthWrite:false});
   const mesh=new T.Mesh(new T.OctahedronGeometry(type==='cast'?.09:.065,0),mat);
   const origin=node.position.clone().add(new T.Vector3(0,1,0));
   mesh.position.copy(origin);scene.add(mesh);
   effects.push({mesh,origin,dx:Math.cos(theta),dz:Math.sin(theta),start:now,duration:type==='death'?750:520});
  }
 }
 function tick(scene,nodes,now=performance.now()){
  for(const [node,m] of motions){
   if(!node.parent){motions.delete(node);continue;}
   const t=Math.min(1,Math.max(0,(now-m.start)/m.duration)),p=ease(t);
   const rig=node.userData.body, head=node.userData.head,arm=node.userData.arm,legs=node.userData.legs;
   if(m.type==='run'){
    if(m.to)node.position.lerpVectors(m.from,m.to,p);
    if(legs)legs.forEach((leg,i)=>leg.rotation.x=Math.sin(t*Math.PI*5+i*Math.PI)*.56*(1-t*.35));
    if(rig)rig.rotation.z=Math.sin(t*Math.PI*5)*.08;
   }else if(m.type==='attack'){
    if(arm)arm.rotation.x=-Math.sin(t*Math.PI)*1.3;
    if(rig)rig.rotation.x=-Math.sin(t*Math.PI)*.3;
   }else if(m.type==='cast'){
    if(arm)arm.rotation.z=Math.sin(t*Math.PI)*.9;
    if(rig)rig.position.y=.79+Math.sin(t*Math.PI)*.15;
   }else if(m.type==='hit'){
    node.rotation.z=Math.sin(t*Math.PI)*.25;
   }else if(m.type==='death'){
    node.rotation.z=-p*Math.PI*.47;
    node.position.y=m.baseY-p*.28;
    node.scale.multiplyScalar(1);node.visible=t<1;
   }else if(m.type==='heal'||m.type==='shield'){
    if(rig)rig.position.y=.79+Math.sin(t*Math.PI)*.08;
   }
   if(t>=1){motions.delete(node);if(m.type!=='death'){
    node.rotation.set(0,0,0);
    if(rig){rig.rotation.set(0,0,0);rig.position.y=.79;}
    if(arm)arm.rotation.set(0,0,0);
    if(legs)legs.forEach(leg=>leg.rotation.set(0,0,0));
   }}
  }
  for(const node of nodes.values()){
   if(!node.parent||motions.has(node)||!node.visible)continue;
   node.position.y=(node.userData.baseY||0)+Math.sin(now*.002+(node.userData.idleOffset||0))*.028;
  }
  for(let i=effects.length-1;i>=0;i--){const f=effects[i],t=Math.min(1,(now-f.start)/f.duration);
   f.mesh.position.set(f.origin.x+f.dx*t*.67,f.origin.y+Math.sin(t*Math.PI)*.46+t*.3,f.origin.z+f.dz*t*.67);
   f.mesh.material.opacity=1-t;f.mesh.scale.setScalar(1-t*.5);
   if(t>=1){disposeFX(f);effects.splice(i,1);}
  }
 }
 function clear(){motions.clear();for(const e of effects)disposeFX(e);effects.length=0;}
 return {play,burst,tick,clear};
}
root.DolphinTacticsAnimator=createAnimator;
})(typeof window!=='undefined'?window:globalThis);
