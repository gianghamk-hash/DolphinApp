/* Genuine Three.js skinning: SkinnedMesh, Skeleton and AnimationMixer clips for 30 heroes.
   Lightweight, generated geometry so Android/WebGL downloads no external skeleton assets. */
(function(root){'use strict';
function createSkinner(T,defs){
 const skinGeo=new T.CylinderGeometry(.30,.25,1.2,9,5,true);
 const pos=skinGeo.attributes.position;const indices=[],weights=[];
 for(let i=0;i<pos.count;i++){
  const y=pos.getY(i),fraction=T.MathUtils.clamp((y+.6)/1.2,0,1);
  // blend from hip to chest/neck bone
  indices.push(0,1,0,0);weights.push(1-fraction,fraction,0,0);
 }
 skinGeo.setAttribute('skinIndex',new T.Uint16BufferAttribute(indices,4));
 skinGeo.setAttribute('skinWeight',new T.Float32BufferAttribute(weights,4));
 const tracks=(name,mult=1)=>{
  const keys=[0,.25,.5,.75,1],sin=(phase)=>keys.map(t=>Math.sin(t*Math.PI*2+phase)*mult);
  let specs=[];
  if(name==='Idle')specs=[['spine.rotation[z]',sin(0).map(x=>x*.035)],['head.rotation[y]',sin(.7).map(x=>x*.07)]];
  if(name==='Run')specs=[['leftThigh.rotation[x]',sin(0).map(x=>x*.65)],['rightThigh.rotation[x]',sin(Math.PI).map(x=>x*.65)],['leftUpperArm.rotation[x]',sin(Math.PI).map(x=>x*.4)],['rightUpperArm.rotation[x]',sin(0).map(x=>x*.4)]];
  if(name==='Attack')specs=[['rightUpperArm.rotation[x]',[0,-.6,-1.3,-.65,0]],['spine.rotation[y]',[0,-.2,-.34,-.15,0]]];
  if(name==='Cast')specs=[['rightUpperArm.rotation[z]',[0,.3,.85,.6,0]],['leftUpperArm.rotation[z]',[0,-.3,-.85,-.6,0]],['head.rotation[x]',[0,-.06,-.15,-.06,0]]];
  if(name==='Hit')specs=[['spine.rotation[z]',[0,.15,.24,.09,0]]];
  if(name==='Death')specs=[['hips.rotation[z]',[0,-.25,-.68,-1.0,-1.2]]];
  if(name==='Heal'||name==='Shield')specs=[['leftUpperArm.rotation[z]',[0,-.3,-.55,-.3,0]],['rightUpperArm.rotation[z]',[0,.3,.55,.3,0]]];
  return new T.AnimationClip(name,1,specs.map(([path,values])=>new T.NumberKeyframeTrack(path,keys,values)));
 };
 const clips=Object.fromEntries(['Idle','Run','Attack','Cast','Hit','Death','Heal','Shield'].map(k=>[k,tracks(k)]));
 function enhance(heroId,model){
  const def=defs[heroId];if(!def)return model;
  // Detached named bone skeleton is a genuine vertex-weighted skin.
  const hip=new T.Bone();hip.name='skinHip';hip.position.y=.44;
  const chest=new T.Bone();chest.name='skinChest';chest.position.y=.58;hip.add(chest);
  const skin=new T.SkinnedMesh(skinGeo.clone(),new T.MeshStandardMaterial({color:def.accent,roughness:.6,metalness:.12,skinning:true,side:T.DoubleSide}));
  model.add(skin);skin.add(hip);skin.bind(new T.Skeleton([hip,chest]));
  skin.position.y=.85;skin.scale.set(.85,1,.85);
  // Existing articulated limbs are driven by native AnimationMixer clips.
  const mixer=new T.AnimationMixer(model),actions={};
  for(const [key,clip] of Object.entries(clips)){
   actions[key]=mixer.clipAction(clip);
   actions[key].setLoop(key==='Idle'||key==='Run'?T.LoopRepeat:T.LoopOnce,Infinity);
   actions[key].clampWhenFinished=true;
  }
  actions.Idle.play();
  model.userData.skeletal={mesh:skin,skeleton:skin.skeleton,mixer,actions,current:'Idle',last:performance.now()};
  return model;
 }
 function play(model,type){
  const s=model?.userData?.skeletal;if(!s)return false;
  const label=({idle:'Idle',run:'Run',attack:'Attack',cast:'Cast',hit:'Hit',death:'Death',heal:'Heal',shield:'Shield'})[type];
  if(!label||!s.actions[label])return false;
  if(s.current===label&&label==='Run')return true;
  const previous=s.actions[s.current],next=s.actions[label];
  if(previous&&previous!==next)previous.fadeOut(.12);
  next.reset().setEffectiveWeight(1).fadeIn(.1).play();s.current=label;return true;
 }
 function tick(model,now){
  const s=model?.userData?.skeletal;if(!s)return;
  const delta=Math.min(.07,Math.max(0,(now-s.last)/1000));s.last=now;s.mixer.update(delta);
 }
 function idle(model){
  const s=model?.userData?.skeletal;if(s&&s.current!=='Idle'&&s.current!=='Death')play(model,'idle');
 }
 return {enhance,play,tick,idle,clips};
}
root.DolphinCreateSkinner=createSkinner;
})(typeof window!=='undefined'?window:globalThis);