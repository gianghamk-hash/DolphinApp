const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const hints=require('./shop-hints.js').hints;
const cat=JSON.parse(fs.readFileSync(path.join(__dirname,'catalog.json'),'utf8'));
const hero=cat.heroes[0],other=cat.heroes.find(h=>h.id!==hero.id);
function p(units,board){return {units,board};}
test('two identical one-star copies flag immediate upgrade',()=>{
 const u={a:{id:'a',heroId:hero.id,star:1},b:{id:'b',heroId:hero.id,star:1}};
 assert.equal(hints(p(u,{}),hero.id,cat).upgrade,true);
 assert.equal(hints(p({a:u.a},{}),hero.id,cat).upgrade,false);
 assert.equal(hints(p({a:{...u.a,star:2},b:u.b},{}),hero.id,cat).upgrade,false);
});
test('only deployed field units provide trait matches',()=>{
 const same=cat.heroes.find(h=>h.id!==hero.id&&[...h.origins,...h.classes].some(t=>[...hero.origins,...hero.classes].includes(t)));
 assert.ok(same);
 const u={a:{id:'a',heroId:hero.id,star:1}};
 assert.equal(hints(p(u,{r0c0:'a'}),same.id,cat).synergy,true);
 assert.equal(hints(p(u,{}),same.id,cat).synergy,false);
 assert.deepEqual(hints(p({},{}),'missing',cat),{upgrade:false,synergy:false,traits:[]});
});
test('both catalog copies define 30 second combat',()=>{
 const server=JSON.parse(fs.readFileSync(path.join(__dirname,'../../../functions/tactics/catalog.json'),'utf8'));
 assert.equal(cat.phases.COMBAT,30000);assert.equal(server.phases.COMBAT,30000);
 assert.equal(cat.phases.PREPARATION,server.phases.PREPARATION);
});
test('shop UI retains purchase action and uses hints',()=>{
 const html=fs.readFileSync(path.join(__dirname,'index.html'),'utf8'),css=fs.readFileSync(path.join(__dirname,'tactics-ui.css'),'utf8');
 assert.match(html,/shop-hints\.js/);assert.match(html,/DolphinTFTShopHints\.hints/);assert.match(html,/buyHero\('/);
 assert.match(css,/shopHero\.shopRecommended/);assert.match(css,/@keyframes tftShopGoldPulse/);assert.match(css,/prefers-reduced-motion/);
});