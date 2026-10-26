const test=require('node:test'),assert=require('node:assert/strict');
const createLibrary=require('./model-loader.js');
test('new chibi GLB loads ahead of fallback and preserves geometry',async()=>{
 const original=globalThis.fetch;
 globalThis.fetch=async()=>({ok:true,json:async()=>({heroes:{H01:{file:'heroes/hero.glb',quality:'stylized-chibi',targetHeight:1.02}}})});
 class Model{
  constructor(){this.parent=null;this.userData={};this.position={y:0};this.scale={x:1,y:1,z:1,multiplyScalar(n){this.x*=n;this.y*=n;this.z*=n;}};}
  clone(){return new Model();}updateMatrixWorld(){}traverse(fn){fn({isMesh:true});}
 }
 class Loader{async loadAsync(){return {scene:new Model(),animations:[]};}}
 const T={Box3:class{setFromObject(){this.min={y:0};return this;}getSize(){return {y:2};}},Vector3:class{}};
 const library=createLibrary(T,Loader,'assets/models/',{make(){throw Error('fallback used for valid asset')}});
 const holder={parent:{},userData:{bars:null,ring:null},children:[],add(m){this.children.push(m);m.parent=this;}};
 try{
  assert.equal(await library.attach('H01',holder),true);
  assert.equal(holder.userData.realGLB,true);
  assert.equal(holder.children.length,1);
  assert.equal(holder.children[0].scale.x,.51);
 }finally{globalThis.fetch=original;}
});
