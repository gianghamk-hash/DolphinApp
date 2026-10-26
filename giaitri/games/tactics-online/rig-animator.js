/* Per-joint animation overlay for articulated hero rigs. */
(function(root){'use strict';
function createRigAnimator(){
 function pose(node,type,t,style=''){
  const rig=node?.userData?.rig;if(!rig)return false;
  const progress=Math.min(1,Math.max(0,t)),wave=Math.sin(progress*Math.PI),speed=style.includes('dash')||style.includes('step')?8:5;
  for(const k of ['hips','spine','head','leftUpperArm','rightUpperArm','leftForearm','rightForearm','leftThigh','rightThigh','leftCalf','rightCalf'])rig[k]?.rotation.set(0,0,0);
  const left=rig.leftUpperArm,right=rig.rightUpperArm;
  if(type==='run'){
   const gait=Math.sin(progress*Math.PI*speed);
   rig.leftThigh.rotation.x=gait*.7;rig.rightThigh.rotation.x=-gait*.7;
   rig.leftCalf.rotation.x=Math.max(0,-gait)*.48;rig.rightCalf.rotation.x=Math.max(0,gait)*.48;
   left.rotation.x=-gait*.47;right.rotation.x=gait*.47;rig.spine.rotation.x=-.1;
  }else if(type==='attack'){
   const ranged=/arrow|shot|barrage|bow/i.test(style);
   const caster=/staff|spell|arcane|ward|surge|rift|collapse/i.test(style);
   const heavy=/hammer|bulwark|titan/i.test(style);
   const dual=/dagger|claw|dash|step|edge/i.test(style);
   rig.spine.rotation.y=wave*(ranged?-.08:dual?-.42:-.25);
   right.rotation.x=-wave*(ranged?.72:caster?.45:heavy?1.7:1.15);
   rig.rightForearm.rotation.x=-wave*(ranged?.18:.52);
   left.rotation.x=-wave*(ranged?.65:dual?1.05:.24);
   if(caster){right.rotation.z=wave*.8;left.rotation.z=-wave*.4;}
   if(heavy)rig.spine.rotation.x=-wave*.2;
  }else if(type==='cast'){
   left.rotation.z=-wave*.85;right.rotation.z=wave*.85;
   rig.leftForearm.rotation.x=-wave*.64;rig.rightForearm.rotation.x=-wave*.64;
   rig.head.rotation.x=-wave*.12;rig.spine.rotation.y=wave*.3;
  }else if(type==='hit'){rig.spine.rotation.z=wave*.2;rig.head.rotation.z=wave*.12;}
  else if(type==='death'){rig.hips.rotation.z=-progress*1.1;rig.spine.rotation.x=progress*.3;}
  else if(type==='heal'||type==='shield'){left.rotation.z=-wave*.4;right.rotation.z=wave*.4;rig.head.rotation.x=-wave*.09;}
  return true;
 }
 function idle(node,now){const r=node?.userData?.rig;if(!r)return;
  const q=Math.sin(now*.0019+(node.userData.idleOffset||0));
  r.spine.rotation.z=q*.025;r.head.rotation.y=Math.sin(now*.0012)*.06;
 }
 return {pose,idle};
}
root.DolphinCreateRigAnimator=createRigAnimator;
})(typeof window!=='undefined'?window:globalThis);