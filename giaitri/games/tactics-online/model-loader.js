/* GLB-first Stylized Chibi model loading; procedural rigs are fallback only. */
(function(root){'use strict';
function createModelLibrary(T,GLTFLoader,basePath='assets/models/',rigFactory=null,skinner=null,cloneSkeleton=null){
 const loader=new GLTFLoader(),cache=new Map();
 let manifest=null,manifestPromise=null;
 function getManifest(){
  if(manifest)return Promise.resolve(manifest);
  if(!manifestPromise)manifestPromise=fetch(basePath+'manifest.json').then(r=>{if(!r.ok)throw Error('Model manifest unavailable');return r.json()}).then(m=>(manifest=m)).catch(e=>{manifestPromise=null;throw e;});
  return manifestPromise;
 }
 function get(id){
  if(!cache.has(id))cache.set(id,getManifest().then(m=>{
   const def=m.heroes?.[id];if(!def||def.quality!=='stylized-chibi'||!def.file)return null;
   return loader.loadAsync(basePath+def.file).then(gltf=>({model:gltf.scene,animations:gltf.animations||[],def}));
  }).catch(e=>{console.warn('[Tactics GLB]',id,e.message);return null;}));
  return cache.get(id);
 }
 function normalize(model,def){
  model.updateMatrixWorld(true);
  const b=new T.Box3().setFromObject(model),size=b.getSize(new T.Vector3());
  const target=Math.max(.55,Math.min(1.65,Number(def.targetHeight)||1.02));
  const scale=target/(size.y||1)*Math.max(.1,Math.min(5,Number(def.scale)||1));
  model.scale.multiplyScalar(scale);model.updateMatrixWorld(true);
  const corrected=new T.Box3().setFromObject(model);
  model.position.y-=corrected.min.y;
  return model;
 }
 async function attach(id,holder){
  const asset=await get(id);if(!holder.parent)return false;
  let model=null,isAsset=false;
  if(asset){
   model=cloneSkeleton?cloneSkeleton(asset.model):asset.model.clone(true);normalize(model,asset.def);isAsset=true;
   if(asset.animations.length){
    const mixer=new T.AnimationMixer(model),actions={};
    for(const clip of asset.animations)actions[clip.name.toLowerCase()]=mixer.clipAction(clip);
    model.userData.externalAnimations={mixer,actions,current:null,last:performance.now()};
   }
  }else if(rigFactory){
   model=rigFactory.make(id);
   if(skinner)skinner.enhance(id,model);
  }
  if(!model)return false;
  model.traverse(o=>{if(o.isMesh){o.castShadow=false;o.receiveShadow=false;}});
  const bars=holder.userData.bars,ring=holder.userData.ring;
  for(const child of holder.children)if(child!==bars&&child!==ring)child.visible=false;
  holder.add(model);holder.userData.gltfModel=model;holder.userData.articulatedRig=model.userData.rig||null;holder.userData.realGLB=isAsset;
  return true;
 }
 function preload(ids){for(const id of ids)get(id);}
 return {get,attach,preload,getManifest,cache,normalize};
}
root.DolphinTacticsCreateModelLibrary=createModelLibrary;
if(typeof module!=='undefined'&&module.exports)module.exports=createModelLibrary;
})(typeof window!=='undefined'?window:globalThis);
