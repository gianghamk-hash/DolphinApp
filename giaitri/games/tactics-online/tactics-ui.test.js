const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'index.html'),'utf8');
const css=fs.readFileSync(path.join(__dirname,'tactics-ui.css'),'utf8');
test('redesign stylesheet loaded and all action targets remain intact',()=>{
 assert.match(html,/href="tactics-ui\.css\?v=1"/);
 for(const id of ['stage','shop','items','equipItem','equipButton','equipmentOwners','bench','rollShopBtn','lockShopBtn','buyXpBtn']){
 assert.match(html,new RegExp('id="'+id+'"'));
 }
 for(const action of ['buyHero','equipSelected','TOGGLE_SHOP_LOCK','ROLL','BUY_XP']){
 assert.ok(html.includes(action),action+' must remain available');
 }
});
test('arena material and tier shop styles are present',()=>{
 assert.match(html,/metalness:\.27,roughness:\.46/);
 assert.match(css,/#game #stage/);
 for(let i=1;i<=5;i++)assert.match(css,new RegExp('shopHero\\.tier'+i));
 assert.match(css,/#game #equipmentOwners/);
});
test('responsive controls and reduced-motion design are preserved',()=>{
 assert.match(css,/@media\(max-height:520px\) and \(orientation:landscape\)/);
 assert.match(css,/@media\(orientation:portrait\) and \(max-width:650px\)/);
 assert.match(css, /prefers-reduced-motion:reduce/);
});
