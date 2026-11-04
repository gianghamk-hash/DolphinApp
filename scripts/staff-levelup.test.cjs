const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
function fixture(){
 const elements=[],storage=new Map();let blocked=false;
 function node(tag){return {tag,children:[],style:{},open:false,textContent:'',append(...c){this.children.push(...c);},setAttribute(){},addEventListener(){},showModal(){this.open=true;},close(){this.open=false;},remove(){}};}
 const style=node('dialog');
 const document={createElement:tag=>{const el=node(tag);elements.push(el);return el;},body:{append(){}},querySelector:()=>blocked||elements.some(e=>e.tag==='dialog'&&e.open)};
 const source=fs.readFileSync(require('node:path').join(__dirname,'../staff-prestige-profile.js'),'utf8');
 const fn=source.slice(source.indexOf('function celebrateLevel('),source.indexOf("window.addEventListener('dolphin-my-progress-updated'"));
 const ctx={document,localStorage:{getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v)},$:()=>style};
 vm.runInNewContext(fn+';this.notify=celebrateLevel;',ctx);
 return {notify:ctx.notify,storage,elements,style,block:v=>{blocked=v;}};
}
const me=(level,id='DOL-0002')=>({employeeId:id,level,rewardCatalog:[{level:3,label:'Tên phát sáng'},{level:5,label:'Khung Bronze'}],perkCatalog:[{level:3,id:'avatar-explorer',name:'Avatar Khám phá'}]});
test('level jumps list every newly unlocked reward and open interface settings only on the action',()=>{
 const h=fixture();h.notify(me(5));const dialog=h.elements.find(e=>e.tag==='dialog');assert.equal(dialog.open,true);
 const list=dialog.children.find(e=>e.tag==='ul');assert.equal(list.children.length,3);
 assert.equal(h.style.open,false);dialog.children.find(e=>e.tag==='button').onclick();assert.equal(h.style.open,true);
 h.notify(me(5));assert.equal(h.elements.filter(e=>e.tag==='dialog').length,1);
});
test('existing modal defers the notification; another Staff ID gets a separate level baseline',()=>{
 const h=fixture();h.block(true);h.notify(me(3));assert.equal(h.storage.size,0);
 h.block(false);h.notify(me(3));const dialog=h.elements.find(e=>e.tag==='dialog');dialog.close();
 h.notify(me(3,'DOL-0003'));assert.equal(h.elements.filter(e=>e.tag==='dialog').length,2);
});
