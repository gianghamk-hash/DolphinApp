/* Phase 1: lightweight procedural 3D combat presentation; no gameplay writes. */
(function(root){
function makeVisuals(T,profiles={}){
 const gold=0xffd98b, teal=0x54decb;
 const nameplates=new Map();
 function nameplate(name,enemy){
  if(typeof document==='undefined'||!T.Sprite||!T.CanvasTexture)return null;
  const text=String(name||'').slice(0,22),key=(enemy?'enemy:':'ally:')+text;
  if(!nameplates.has(key)){
   const canvas=document.createElement('canvas');canvas.width=256;canvas.height=52;
   const ctx=canvas.getContext('2d');if(!ctx)return null;
   ctx.fillStyle='rgba(4,18,30,.82)';ctx.beginPath();ctx.roundRect(4,3,248,45,10);ctx.fill();
   ctx.strokeStyle=enemy?'#ff9fa3':'#8ce9de';ctx.lineWidth=2;ctx.stroke();
   ctx.font='bold 25px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#fff9e6';ctx.fillText(text,128,25,238);
   const texture=new T.CanvasTexture(canvas);texture.needsUpdate=true;
   nameplates.set(key,new T.SpriteMaterial({map:texture,transparent:true,depthTest:false,depthWrite:false}));
  }
  const label=new T.Sprite(nameplates.get(key));label.position.y=2.27;label.scale.set(1.53,.32,1);label.renderOrder=30;
  return label;
 }
 function mesh(geometry,color,metalness=.18){return new T.Mesh(geometry,new T.MeshStandardMaterial({color,roughness:.47,metalness}));}
 function role(hero){if(hero.classes.includes('Guardian')||hero.classes.includes('Brawler'))return 'tank';
 if(hero.classes.includes('Ranger'))return 'ranger';
 if(hero.classes.includes('Sorcerer'))return 'mage';return 'assassin';}
 function unit(hero,star,enemy,displayName){
  const g=new T.Group(),roleName=role(hero),profile=profiles[hero.id]||{},c=enemy?0xe56870:[0x59cbd3,0x80d9b0,0xe1a3fa,0xf1bf69,0xf37fbe][hero.cost-1];
  const ring=mesh(new T.TorusGeometry(.43,.042,5,14),enemy?0xf98b92:teal);ring.rotation.x=Math.PI/2;ring.position.y=.08;g.add(ring);
  const movingLegs=[];const arms=[];
  const legs=[-.16,.16];for(const z of legs){let m=mesh(new T.BoxGeometry(.17,.42,.22),0x344656);m.position.set(z,.34,0);g.add(m);movingLegs.push(m);}
  const body=mesh(new T.CylinderGeometry(roleName==='tank'?.39:.27,.32,.64,7),c);body.position.y=.79;g.add(body);
  const head=mesh(new T.SphereGeometry(.23,9,7),0xf2cc9b);head.position.y=1.23;g.add(head);
  const helmet=mesh(new T.ConeGeometry(.26,.28,7),c);helmet.position.y=1.49;g.add(helmet);
  const left=mesh(new T.BoxGeometry(.14,.48,.16),c);left.position.set(-.39,.83,0);g.add(left);arms.push(left);
  const right=mesh(new T.BoxGeometry(.14,.48,.16),c);right.position.set(.39,.83,0);g.add(right);arms.push(right);
  if(roleName==='tank'){const shield=mesh(new T.BoxGeometry(.45,.54,.1),0xd8c177,.75);shield.position.set(-.49,.81,.15);g.add(shield);}
  else if(roleName==='ranger'){const bow=mesh(new T.TorusGeometry(.38,.045,6,14,Math.PI),gold);bow.position.set(.47,.87,.15);g.add(bow);}
  else if(roleName==='mage'){const crystal=mesh(new T.OctahedronGeometry(.23,0),0xc68cff);crystal.position.set(.5,1.45,.12);g.add(crystal);}
  else {const blade=mesh(new T.ConeGeometry(.09,.67,5),0xd1faff,.76);blade.position.set(.49,1.17,0);g.add(blade);}
  // Distinguishable weapon silhouettes and elemental halos for every signature.
  const weapon=profile.weapon||'sword',accent=profile.color||gold;
  const sig=mesh(weapon==='shield'?new T.BoxGeometry(.23,.36,.1):
    weapon==='staff'?new T.CylinderGeometry(.05,.05,.7,7):
    weapon==='bow'?new T.TorusGeometry(.23,.035,6,12,Math.PI):
    weapon==='claws'?new T.ConeGeometry(.12,.4,4):
    weapon==='hammer'?new T.BoxGeometry(.28,.22,.2):
    new T.ConeGeometry(.09,.55,5),accent,.48);
  sig.position.set(.48,1.03,.11);g.add(sig);
  const crest=mesh(new T.OctahedronGeometry(.08+hero.cost*.013,0),accent,.35);
  crest.position.set(0,1.77,0);g.add(crest);
  const bars=new T.Group();bars.position.y=1.95;
  const bg=mesh(new T.BoxGeometry(.85,.1,.06),0x12242f);bars.add(bg);
  const hp=mesh(new T.BoxGeometry(.82,.075,.08),0x6ff2a0);hp.position.z=.048;bars.add(hp);
  const mp=mesh(new T.BoxGeometry(.82,.045,.065),0x7eafff);mp.position.set(0,-.105,.052);bars.add(mp);g.add(bars);
  // The HTML stage overlay handles labels across mobile browsers; no canvas sprite dependency.
  const scale=1+Math.max(0,star-1)*.11;g.scale.setScalar(scale);
  g.userData={bars,ring,health:hp,mana:mp,body,head,arm:right,arms,legs:movingLegs,baseY:0,star,heroId:hero.id,idleOffset:hero.cost*1.6};
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
