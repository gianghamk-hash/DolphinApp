/* Lightweight battlefield spell impacts, telegraphs and defeat cues, visuals only. */
(function(root){'use strict';
function createCombatFX(T){
 const active=[],pool=[];const POOL_LIMIT=28;
 function acquire(geometry,color){const mesh=pool.pop()||new T.Mesh(geometry,new T.MeshBasicMaterial({transparent:true,depthWrite:false,side:T.DoubleSide}));mesh.geometry=geometry;mesh.material.color.set(color);mesh.material.opacity=.85;mesh.scale.setScalar(1);return mesh;}
 function release(mesh){mesh.parent?.remove(mesh);if(pool.length<POOL_LIMIT)pool.push(mesh);else mesh.material.dispose();}
 const MAX_FX=28;
 const ringGeometry=new T.RingGeometry(.3,.42,20);
 const auraGeometry=new T.RingGeometry(.65,.82,24);
 function pulse(scene,node,type='spell',radius=.7){
  if(!node||!node.parent||active.length>=MAX_FX)return;
  const colors={spell:0x9577ff,aoe:0xffb15e,heal:0x69e5a0,shield:0x6ccaff,critical:0xffde83,death:0xee7084,cleanse:0x9fffe3,slow:0x79baff,stun:0xffdb73,burn:0xff683e,dash:0x61dfff,drain:0x8aeea1,blast:0xff975a,bolt:0x7ec7ff,strike:0xffcf77};
  const heroMatch=/^hero-h(\d{2})$/.exec(type);const color=heroMatch?new T.Color().setHSL((Number(heroMatch[1])*.61803398875)%1,.78,.59):colors[type]||colors.spell,mesh=acquire(ringGeometry,color);
  mesh.rotation.x=-Math.PI/2;mesh.position.set(node.position.x,.18,node.position.z);scene.add(mesh);
  active.push({mesh,start:performance.now(),radius:Math.min(2.1,Math.max(.6,radius)),duration:type==='aoe'?650:450});
 }
 function castAura(scene,node,type){
  if(!node?.parent||active.length>=MAX_FX)return;
  const matched=/^hero-h(\d{2})$/.exec(type||"");
  const color=matched?new T.Color().setHSL((Number(matched[1])*.61803398875)%1,.9,.67):new T.Color(0xffe18b);
  const mesh=acquire(auraGeometry,color);
  mesh.rotation.x=Math.PI/2;mesh.position.copy(node.position);mesh.position.y+=1.05;scene.add(mesh);
  active.push({mesh,start:performance.now(),radius:1.6,duration:700,aura:true});
 }
 function tick(now){
  for(let i=active.length-1;i>=0;i--){
   const f=active[i],t=Math.min(1,(now-f.start)/f.duration);
   f.mesh.scale.setScalar(f.aura?.55+t*1.9:1+t*f.radius*2);f.mesh.material.opacity=(1-t)*.7;
   if(t>=1){release(f.mesh);active.splice(i,1);}
  }
 }
 function clear(){for(const f of active)release(f.mesh);active.length=0;}
 return {pulse,castAura,tick,clear,get activeCount(){return active.length;},maxEffects:MAX_FX,get pooledCount(){return pool.length;}};
}
root.DolphinCreateCombatFX=createCombatFX;
})(typeof window!=='undefined'?window:globalThis);