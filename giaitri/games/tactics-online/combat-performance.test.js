const test=require('node:test');
const assert=require('node:assert/strict');
require('./combat-fx.js');
class Vector3{set(){}}
class Mesh{
 constructor(geometry,material){this.geometry=geometry;this.material=material;this.rotation={x:0};this.position=new Vector3();this.scale={setScalar(){}};this.parent=null;}
}
class Material{constructor(){this.opacity=1;}dispose(){}}
const T={RingGeometry:class {},MeshBasicMaterial:Material,Mesh,DoubleSide:2};
test('CombatFX caps simultaneous meshes and drains them cleanly',()=>{
 const fx=globalThis.DolphinCreateCombatFX(T);
 const scene={children:[],add(o){this.children.push(o);o.parent=this;},remove(o){this.children=this.children.filter(x=>x!==o);o.parent=null;}};
 const node={parent:scene,position:{x:0,z:0}};
 for(let i=0;i<100;i++)fx.pulse(scene,node,'critical');
 assert.equal(fx.activeCount,fx.maxEffects);
 assert.equal(scene.children.length,fx.maxEffects);
 fx.tick(performance.now()+1000);
 assert.equal(fx.activeCount,0);
 assert.equal(scene.children.length,0);
 fx.pulse(scene,node);
 assert.equal(fx.activeCount,1);
 fx.clear();
 assert.equal(fx.activeCount,0);
});
