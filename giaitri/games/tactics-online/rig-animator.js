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
   const ranged=style.includes('arrow')||style.includes('shot')||style.includes('barrage');
   rig.spine.rotation.y=wave*(ranged?-.1:-.31);
   right.rotation.x=wave*(ranged?-.75:-1.25);
   rig.rightForearm.rotation.x=-wave*.52;left.rotation.x=wave*.24;
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