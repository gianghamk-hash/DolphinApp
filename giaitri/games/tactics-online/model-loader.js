/* Dolphin Tactics GLB model library. Cache each asset once; gracefully preserve procedural fallback. */
(function(root){
'use strict';
function createModelLibrary(THREE,GLTFLoader,basePath='assets/models/',rigFactory=null){
 const loader=new GLTFLoader(),cache=new Map();
 let manifest=null,manifestPromise=null;
 async function getManifest(){
  if(manifest)return manifest;
  if(!manifestPromise)manifestPromise=fetch(basePath+'manifest.json').then(r=>{if(!r.ok)throw Error('Model manifest unavailable');return r.json()}).then(data=>{manifest=data;return data;});
  return manifestPromise;
 }
 function get(heroId){
  if(!cache.has(heroId)){
   const load=getManifest().then(m=>{
    const def=m.heroes?.[heroId];if(!def)throw Error('Missing GLB '+heroId);
    return loader.loadAsync(basePath+def.file).then(gltf=>({model:gltf.scene,scale:def.scale||1}));
   }).catch(e=>{console.warn('[Tactics model]',heroId,e.message);return null;});
   cache.set(heroId,load);
  }
  return cache.get(heroId);
 }
 async function attach(heroId,holder){
  const asset=rigFactory?null:await get(heroId);
  if(!holder.parent)return false;
  const scene=rigFactory?rigFactory.make(heroId):(asset?asset.model.clone(true):null);
  if(!scene)return false;
  scene.scale.setScalar(asset?.scale||1);
  scene.traverse(o=>{if(o.isMesh){o.castShadow=false;o.receiveShadow=false;}});
  // Keep world-space bars and ring, replace only placeholder character.
  const bars=holder.userData.bars,ring=holder.userData.ring;
  for(const c of holder.children)if(c!==bars&&c!==ring)c.visible=false;
  holder.add(scene);holder.userData.gltfModel=scene;holder.userData.articulatedRig=scene.userData.rig||null;
  return true;
 }
 function preload(ids){if(rigFactory)return;for(const id of ids)get(id);}
 return {get,attach,preload,getManifest,cache};
}
root.DolphinTacticsCreateModelLibrary=createModelLibrary;
})(typeof window!=='undefined'?window:globalThis);