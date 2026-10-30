'use strict';
const assert=require('node:assert/strict');
const copy=value=>value===undefined?undefined:JSON.parse(JSON.stringify(value));
class Store{
 constructor(){this.values=new Map();this.versions=new Map();this.listeners=new Map();this.writes=[];this.repeatAfterCommit=false;}
 collection(path){return this.ref(path,true);}
 ref(path,collection=false){
  const store=this;
  return {path,collection:name=>store.ref(path+'/'+name,true),doc:name=>store.ref(path+'/'+name),
   where:(field,op,value)=>({get:async()=>({docs:store.query(path).docs.filter(d=>d.data()[field]===value),forEach(fn){this.docs.forEach(fn);}})}),
   get:async()=>collection?store.query(path):store.snap(path),update:async fields=>{store.commit([{path,value:{...copy(store.values.get(path)),...fields}}]);},
   onSnapshot(...args){const cb=args.find(x=>typeof x==='function');const key=(collection?'collection:':'doc:')+path;
    const list=store.listeners.get(key)||new Set();list.add(cb);store.listeners.set(key,list);
    cb(collection?store.query(path):store.snap(path));return()=>list.delete(cb);
   }};
 }
 snap(path){const value=copy(this.values.get(path));return {exists:value!==undefined,data:()=>copy(value),metadata:{fromCache:false,hasPendingWrites:false}};}
 query(path){return {docs:[...this.values.keys()].filter(k=>k.startsWith(path+'/')&&k.slice(path.length+1).indexOf('/')<0).map(k=>({id:k.slice(path.length+1),...this.snap(k)}))};}
 commit(writes){
  for(const {path,value} of writes){value===undefined?this.values.delete(path):this.values.set(path,copy(value));this.versions.set(path,(this.versions.get(path)||0)+1);this.writes.push({path,value:copy(value)});}
  for(const {path} of writes){for(const fn of this.listeners.get('doc:'+path)||[])fn(this.snap(path));const collection=path.slice(0,path.lastIndexOf('/'));for(const fn of this.listeners.get('collection:'+collection)||[])fn(this.query(collection));}
 }
 async runTransaction(callback){
  for(let retry=0;retry<20;retry++){
   const reads=new Map(),writes=[];
   const result=await callback({get:async ref=>{assert.equal(writes.length,0,'all transaction reads precede writes');reads.set(ref.path,this.versions.get(ref.path)||0);return this.snap(ref.path);},
    set:(ref,value,opts)=>writes.push({path:ref.path,value:opts?.merge?{...copy(this.values.get(ref.path)),...copy(value)}:copy(value)}),
    update:(ref,value)=>writes.push({path:ref.path,value:{...copy(this.values.get(ref.path)),...copy(value)}}),
    delete:ref=>writes.push({path:ref.path,value:undefined})});
   if([...reads].some(([path,version])=>(this.versions.get(path)||0)!==version))continue;
   this.commit(writes);
   if(this.repeatAfterCommit&&writes.some(w=>w.path.endsWith('/data/state'))){this.repeatAfterCommit=false;continue;}
   return result;
  }
  throw Error('transaction conflict');
 }
}
module.exports={Store};
