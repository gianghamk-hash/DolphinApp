/* Phase 1: lightweight procedural 3D combat presentation; no gameplay writes. */
(function(root){
function makeVisuals(T){
 const gold=0xffd98b, teal=0x54decb;
 function mesh(geometry,color,metalness=.18){return new T.Mesh(geometry,new T.MeshStandardMaterial({color,roughness:.47,metalness}));}
 function role(hero){if(hero.classes.includes('Guardian')||hero.classes.includes('Brawler'))return 'tank';
 if(hero.classes.includes('Ranger'))return 'ranger';
 if(hero.classes.includes('Sorcerer'))return 'mage';return 'assassin';}
 function unit(hero,star,enemy){
  const g=new T.Group(),roleName=role(hero),c=enemy?0xe56870:[0x59cbd3,0x80d9b0,0xe1a3fa,0xf1bf69,0xf37fbe][hero.cost-1];
  const ring=mesh(new T.TorusGeometry(.43,.042,5,14),enemy?0xf98b92:teal);ring.rotation.x=Math.PI/2;ring.position.y=.08;g.add(ring);
  const legs=[-.16,.16];for(const z of legs){let m=mesh(new T.BoxGeometry(.17,.42,.22),0x344656);m.position.set(z,.34,0);g.add(m);}
  const body=mesh(new T.CylinderGeometry(roleName==='tank'?.39:.27,.32,.64,7),c);body.position.y=.79;g.add(body);
  const head=mesh(new T.SphereGeometry(.23,9,7),0xf2cc9b);head.position.y=1.23;g.add(head);
  const helmet=mesh(new T.ConeGeometry(.26,.28,7),c);helmet.position.y=1.49;g.add(helmet);
  const left=mesh(new T.BoxGeometry(.14,.48,.16),c);left.position.set(-.39,.83,0);g.add(left);
  const right=mesh(new T.BoxGeometry(.14,.48,.16),c);right.position.set(.39,.83,0);g.add(right);
  if(roleName==='tank'){const shield=mesh(new T.BoxGeometry(.45,.54,.1),0xd8c177,.75);shield.position.set(-.49,.81,.15);g.add(shield);}
  else if(roleName==='ranger'){const bow=mesh(new T.TorusGeometry(.38,.045,6,14,Math.PI),gold);bow.position.set(.47,.87,.15);g.add(bow);}
  else if(roleName==='mage'){const crystal=mesh(new T.OctahedronGeometry(.23,0),0xc68cff);crystal.position.set(.5,1.45,.12);g.add(crystal);}
  else {const blade=mesh(new T.ConeGeometry(.09,.67,5),0xd1faff,.76);blade.position.set(.49,1.17,0);g.add(blade);}
  const bars=new T.Group();bars.position.y=1.83;
  const bg=mesh(new T.BoxGeometry(.85,.1,.06),0x12242f);bars.add(bg);
  const hp=mesh(new T.BoxGeometry(.82,.075,.08),0x6ff2a0);hp.position.z=.048;bars.add(hp);
  const mp=mesh(new T.BoxGeometry(.82,.045,.065),0x7eafff);mp.position.set(0,-.105,.052);bars.add(mp);g.add(bars);
  const scale=1+Math.max(0,star-1)*.11;g.scale.setScalar(scale);
  g.userData={health:hp,mana:mp,body,baseY:0,star};
  return g;
 }
 function updateBars(g,hp,mana){if(!g)return;
  if(Number.isFinite(hp))g.userData.health.scale.x=Math.max(.001,Math.min(1,hp));
  if(Number.isFinite(mana))g.userData.mana.scale.x=Math.max(.001,Math.min(1,mana));
 }
 function strike(scene,from,to,isSpell,fx){
  if(!from||!to)return;
  const start=from.position.clone().add(new T.Vector3(0,1.1,0)),end=to.position.clone().add(new T.Vector3(0,1,0));
  const mat=new T.MeshBasicMaterial({color:isSpell?0xc98fff:gold,transparent:true,opacity:.98,depthWrite:false});
  const orb=new T.Mesh(new T.SphereGeometry(isSpell?.14:.09,7,6),mat);orb.position.copy(start);scene.add(orb);
  fx.push({obj:orb,start,end,t0:performance.now(),life:isSpell?450:300});
 }
 function animateFX(scene,fx,now){
  for(let i=fx.length-1;i>=0;i--){const f=fx[i],a=Math.min(1,(now-f.t0)/f.life);
   f.obj.position.lerpVectors(f.start,f.end,a);f.obj.position.y+=Math.sin(a*Math.PI)*.44;
   f.obj.material.opacity=1-a;
   if(a>=1){scene.remove(f.obj);f.obj.geometry.dispose();f.obj.material.dispose();fx.splice(i,1);}
  }
 }
 return {unit,updateBars,strike,animateFX};
}
root.DolphinTacticsVisuals=makeVisuals;
})(typeof window!=='undefined'?window:globalThis);
