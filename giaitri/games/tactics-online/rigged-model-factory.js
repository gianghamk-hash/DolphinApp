/* Detailed articulated low-poly character assembly; original meshes, no external licensed assets. */
(function(root){'use strict';
function createRigFactory(T,defs){
 const geo=new Map(),mats=new Map();
 function box(w,h,d,c){const key=[w,h,d].join(':');if(!geo.has(key))geo.set(key,new T.BoxGeometry(w,h,d));const mkey=String(c);if(!mats.has(mkey))mats.set(mkey,new T.MeshStandardMaterial({color:c,roughness:.58,metalness:.27}));return new T.Mesh(geo.get(key),mats.get(mkey));}
 function part(parent,name,pos,size,color){const o=box(...size,color);o.name=name;o.position.set(...pos);parent.add(o);return o;}
 function pivot(parent,name,x,y,z){const n=new T.Group();n.name=name;n.position.set(x,y,z);parent.add(n);return n;}
 function make(id){const d=defs[id];if(!d)throw Error('Unknown hero '+id);const primary=d.accent,steel=0x283f55,skin=0xefc8a7,trim=0xe9c782;
  const root=new T.Group();root.name=id+'_rig';const hips=pivot(root,'hips',0,.82,0),spine=pivot(hips,'spine',0,.18,0),head=pivot(spine,'head',0,.44,0);
  const heavy=d.build==='heavy'||d.armor==='plate',width=heavy?.72:.48;
  part(spine,'breastplate',[0,.05,0],[width,.62,.39],primary);
  part(hips,'belt',[0,-.21,0],[.54,.14,.4],steel);
  part(head,'face',[0,.12,.04],[.36,.39,.31],skin);
  part(head,'nose',[0,.07,.225],[.10,.12,.1],skin);
  for(const sx of [-1,1]){part(head,'eye'+sx,[sx*.105,.18,.22],[.055,.047,.05],d.face==='visor'?0x52e4f5:0x182d40);
   if(d.headgear==='horns')part(head,'horn'+sx,[sx*.2,.43,0],[.12,.35,.12],trim);}
  if(d.face==='beard')part(head,'beard',[0,-.09,.18],[.29,.16,.15],steel);
  if(d.face==='mask')part(head,'mask',[0,.06,.22],[.35,.18,.1],steel);
  if(d.headgear==='helm'||d.headgear==='crown'||d.headgear==='crest')part(head,'helmet',[0,.36,0],[.43,.19,.38],d.headgear==='crown'?trim:steel);
  if(d.headgear==='hood')part(head,'hood',[0,.33,-.06],[.46,.24,.4],primary);
  const rig={root,hips,spine,head};
  for(const side of ['left','right']){const sign=side==='left'?-1:1;
   const upper=pivot(spine,side+'UpperArm',sign*(width/2+.07),.25,0);
   part(upper,side+'UpperArmMesh',[0,-.22,0],[.21,.43,.23],primary);
   const fore=pivot(upper,side+'Forearm',0,-.43,0);
   part(fore,side+'Bracer',[0,-.17,0],[.2,.34,.22],steel);
   const hand=pivot(fore,side+'Hand',0,-.37,0);part(hand,side+'Palm',[0,0,0],[.19,.18,.19],skin);
   const thigh=pivot(hips,side+'Thigh',sign*.19,-.22,0);
   part(thigh,side+'ThighArmor',[0,-.2,0],[.25,.42,.29],primary);
   const calf=pivot(thigh,side+'Calf',0,-.42,0);
   part(calf,side+'Boot',[0,-.19,.04],[.25,.4,.32],steel);
   part(spine,side+'Pauldron',[sign*(width/2+.07),.26,0],[heavy?.36:.22,.24,.4],d.armor==='scale'?trim:steel);
   Object.assign(rig,{[side+'UpperArm']:upper,[side+'Forearm']:fore,[side+'Hand']:hand,[side+'Thigh']:thigh,[side+'Calf']:calf});
  }
  // Hero silhouettes vary by build and weapon while sharing lightweight cached meshes.
  if(d.build==='tall')head.position.y+=.08;
  if(d.build==='slim')root.scale.set(.93,1.04,.93);
  if(d.build==='royal'){
   part(head,'royalCrest',[0,.51,-.03],[.18,.22,.2],trim);
   part(spine,'royalCollar',[0,.35,-.09],[width+.19,.13,.31],trim);
  }
  if(d.armor==='scale'){
   for(const sx of [-1,1])part(spine,'scalePlate'+sx,[sx*.16,-.09,.205],[.15,.28,.045],trim);
  }
  if(d.weapon==='bow')part(rig.leftHand,'bowGrip',[0,.04,.04],[.08,.33,.1],steel);
  if(d.weapon==='dagger'||d.weapon==='claws')part(hips,'utilityPouch',[-.27,-.19,.08],[.17,.22,.23],steel);
  if(d.weapon==='fists'){
   for(const hand of [rig.leftHand,rig.rightHand])part(hand,'gauntlet',[0,0,0],[.26,.22,.26],trim);
  }
  // Visible origin/class motifs sized for distant isometric camera.
  // Reuse shared box geometries/materials; avoid glow particles and extra render loops.
  if(d.motif){
   const aura=d.motifColor||trim,variant=d.silhouetteVariant||0;
   part(spine,'originChestCore',[0,.08,.235],[.23,.25,.095],aura);
   if(d.motif==='core'){
    for(const sign of [-1,1])part(spine,'mechShoulder'+sign,[sign*(width/2+.16),.25,0],[.3,.3,.44],aura);
    part(spine,'reactor',[0,.1,.31],[.13,.13,.08],0xe3fdff);
   }else if(d.motif==='spikes'){
    for(const sign of [-1,1])part(spine,'voidSpike'+sign,[sign*(width/2+.16),.44,-.08],[.16,.44,.2],aura);
   }else if(d.motif==='runes'){
    part(spine,'runePlate',[0,.02,.31],[.35,.31,.055],aura);
    for(const sign of [-1,1])part(head,'arcaneAntenna'+sign,[sign*.24,.45,0],[.1,.33,.11],aura);
   }else if(d.motif==='horns'){
    for(const sign of [-1,1])part(head,'beastAntler'+sign,[sign*.27,.42,-.04],[.15,.55,.17],aura);
   }else if(d.motif==='blades'){
    for(const sign of [-1,1])part(spine,'shadowFin'+sign,[sign*(width/2+.19),.34,-.12],[.12,.5,.24],aura);
   }else if(d.motif==='halo'){
    part(head,'celestialCrest',[0,.66,0],[.5,.085,.16],aura);
    for(const sign of [-1,1])part(spine,'celestialWing'+sign,[sign*(width/2+.25),.13,-.22],[.16,.7,.16],aura);
   }
   // Silhouette variation independent of origin color.
   if(variant===0)part(spine,'heroBanner',[0,.32,-.34],[.23,.78,.07],aura);
   if(variant===1)part(head,'heroTallCrown',[0,.58,0],[.17,.38,.17],aura);
   if(variant===2)for(const sign of [-1,1])part(spine,'heroWing'+sign,[sign*(width/2+.3),-.02,-.17],[.18,.56,.12],aura);
   if(variant===3)part(hips,'heroTabard',[0,-.43,.25],[.31,.54,.07],aura);
   if(variant===4)for(const sign of [-1,1])part(spine,'heroBannerArm'+sign,[sign*(width/2+.2),.31,-.15],[.18,.36,.15],aura);
   if(d.role==='Guardian')part(rig.leftForearm,'guardianGuard',[0,-.12,.12],[.4,.51,.12],aura);
   else if(d.role==='Ranger')part(spine,'rangerQuiver',[.32,.05,-.32],[.28,.45,.24],aura);
   else if(d.role==='Assassin')for(const h of [rig.leftHand,rig.rightHand])part(h,'assassinTip',[0,.37,.02],[.09,.35,.12],aura);
   else if(d.role==='Sorcerer')part(spine,'sorcererSigil',[0,.27,.26],[.3,.1,.08],aura);
   else if(d.role==='Brawler')for(const h of [rig.leftHand,rig.rightHand])part(h,'brawlerFist',[0,0,.04],[.31,.26,.29],aura);
  }
  if(d.cape)part(spine,'cape',[0,-.29,-.28],[width+.1,.94,.065],primary);
  if(d.armor==='robe')part(hips,'robe',[0,-.35,0],[.73,.7,.55],primary);
  if(d.armor==='arcane')part(spine,'arcaneCore',[0,.08,.23],[.19,.2,.09],trim);
  const w=rig.rightHand;
  if(d.weapon==='staff'){part(w,'staff',[0,-.05,.03],[.085,1.2,.085],steel);part(w,'crystal',[0,.57,.03],[.25,.27,.24],trim);}
  else if(d.weapon==='bow'){part(w,'bow',[0,0,.04],[.1,.87,.12],trim);part(spine,'quiver',[-.25,.05,-.25],[.21,.49,.19],steel);}
  else if(d.weapon==='hammer'){part(w,'handle',[0,-.03,0],[.09,.94,.09],steel);part(w,'hammerHead',[0,.43,0],[.6,.25,.24],trim);}
  else if(d.weapon==='shield'){part(rig.leftHand,'shield',[0,0,.11],[.55,.64,.12],steel);part(w,'sword',[0,.14,0],[.11,.79,.12],trim);}
  else if(d.weapon==='claws'||d.weapon==='dagger'){for(const h of [rig.leftHand,rig.rightHand])part(h,'twinBlade',[0,.19,.03],[.1,.58,.11],trim);}
  else part(w,'weapon',[0,.18,0],[.14,.76,.12],trim);
  // Phase 1D: hero-grade layered silhouette, compact 60% scale and readable weapon detail.
  // Detail remains attached to existing joints for animation; mesh geometries are cached.
  const jewel=d.motifColor||trim,variant=d.silhouetteVariant||0;
  part(spine,'chestUpperPlate',[0,.23,.205],[width*.82,.19,.13],steel);
  part(spine,'chestInlay',[0,.13,.287],[width*.44,.17,.06],jewel);
  part(spine,'waistGuard',[0,-.22,.19],[.42,.14,.12],trim);
  part(head,'browRidge',[0,.22,.21],[.34,.075,.075],steel);
  part(head,'chinPlate',[0,-.075,.13],[.28,.11,.22],d.face==='visor'?steel:skin);
  for(const side of ['left','right']){
   const sign=side==='left'?-1:1;
   part(rig[side+'Forearm'],side+'WristPlate',[0,-.28,.13],[.22,.12,.1],jewel);
   part(rig[side+'Thigh'],side+'KneeGuard',[0,-.4,.18],[.26,.15,.12],trim);
   part(rig[side+'Calf'],side+'BootToe',[0,-.37,.18],[.27,.12,.3],steel);
   part(spine,side+'ShoulderTrim',[sign*(width/2+.07),.34,.18],[.19,.11,.12],jewel);
  }
  if(d.motif==='core'){
   part(spine,'mechPowerpack',[0,.12,-.33],[.4,.49,.23],steel);
   part(spine,'mechPowerLine',[0,.12,-.465],[.17,.36,.07],jewel);
  }else if(d.motif==='horns'){
   part(spine,'beastBackRidge',[0,.16,-.33],[.23,.65,.22],jewel);
  }else if(d.motif==='runes'||d.motif==='halo'){
   part(head,'arcaneCrownGem',[0,.52,.16],[.17,.2,.11],jewel);
  }else if(d.motif==='blades'||d.motif==='spikes'){
   part(spine,'shadowSpine',[0,.21,-.33],[.13,.65,.18],jewel);
  }
  // Hero-index signature: broad forms remain recognizable at the game camera distance.
  if(variant===0)part(spine,'signatureBackCrest',[0,.55,-.31],[.3,.3,.16],jewel);
  if(variant===1)part(head,'signatureTopSpike',[0,.76,0],[.13,.39,.14],jewel);
  if(variant===2)for(const x of [-1,1])part(spine,'signatureSideFin'+x,[x*(width/2+.32),.17,-.17],[.21,.56,.13],jewel);
  if(variant===3)part(hips,'signatureCoat',[0,-.52,-.12],[.55,.5,.17],primary);
  if(variant===4)part(spine,'signatureBanner',[0,.46,-.32],[.25,.5,.1],primary);
  if(d.weapon==='bow'){
   part(w,'bowUpperLimb',[0,.42,.04],[.13,.37,.11],jewel);
   part(w,'bowLowerLimb',[0,-.42,.04],[.13,.37,.11],jewel);
   part(w,'bowString',[0,0,.13],[.025,1.06,.025],0xd9f7ff);
  }else if(d.weapon==='hammer'){
   part(w,'hammerRim',[0,.44,.15],[.68,.29,.09],jewel);
   part(w,'hammerPommel',[0,-.49,0],[.18,.16,.18],trim);
  }else if(d.weapon==='staff'){
   part(w,'staffCrown',[0,.72,0],[.37,.12,.22],jewel);
   part(w,'staffRuneGem',[0,.85,0],[.16,.2,.16],0xeafaff);
  }else if(d.weapon==='shield'){
   part(rig.leftHand,'shieldEmblem',[0,0,.2],[.31,.33,.08],jewel);
   part(w,'bladeEdge',[0,.31,.08],[.06,.53,.065],0xddeafa);
  }else if(d.weapon==='sword'){
   part(w,'swordGuard',[0,.05,.07],[.43,.1,.13],jewel);
   part(w,'bladeHighlight',[0,.48,.08],[.065,.64,.07],0xcceeff);
  }else if(d.weapon==='dagger'||d.weapon==='claws'){
   for(const hand of [rig.leftHand,rig.rightHand])part(hand,'bladeHighlight',[0,.39,.13],[.07,.4,.06],jewel);
  }
  // Preserve the factory's existing slim-build proportions; apply one final global reduction.
  root.scale.multiplyScalar(.6);
  root.userData.visualScale=.6;
  root.userData.rig=rig;root.userData.heroId=id;return root;
 }
 return {make};
}
root.DolphinCreateRigFactory=createRigFactory;
})(typeof window!=='undefined'?window:globalThis);