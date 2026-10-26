const test=require('node:test'),assert=require('node:assert/strict');
const defs=require('./hero-visual-defs.js');
const catalog=require('./catalog.json');
const {buildIdentity}=require('./hero-identity.js');
require('./rigged-model-factory.js');
class Group{constructor(){this.children=[];this.userData={};this.position={set:(...v)=>this.pos=v};this.scale={x:1,y:1,z:1,set:(x,y,z)=>{Object.assign(this.scale,{x,y,z});},multiplyScalar:n=>{this.scale.x*=n;this.scale.y*=n;this.scale.z*=n;}};}add(o){this.children.push(o);o.parent=this;}}
class Mesh extends Group{constructor(g,m){super();this.geometry=g;this.material=m;}}
const T={Group,Mesh,BoxGeometry:class{},MeshStandardMaterial:class{}};
test('30 hero rigs are scaled to 60% and retain identifiable detailed parts',()=>{
 const factory=globalThis.DolphinCreateRigFactory(T,buildIdentity(defs,catalog));
 for(const hero of catalog.heroes){
  const model=factory.make(hero.id),names=[];
  function visit(x){if(x.name)names.push(x.name);for(const child of x.children||[])visit(child);}
  visit(model);
  assert.equal(model.userData.visualScale,.6);
  assert.ok(Math.abs(model.scale.y-(defs[hero.id].build==='slim'?.624:.6))<.0001);
  assert.ok(model.scale.x<=.6);
  assert.ok(names.includes('chestUpperPlate'));
  assert.ok(names.includes('originChestCore'));
  assert.ok(names.some(x=>x.startsWith('signature')));
  assert.ok(names.length>35,hero.id+' missing detail');
 }
});