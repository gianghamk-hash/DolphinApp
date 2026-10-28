const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const catalog=require('./catalog.json'),createGuide=require('./guide.js');
const html=fs.readFileSync(path.join(__dirname,'index.html'),'utf8');
const css=fs.readFileSync(path.join(__dirname,'tactics-ui.css'),'utf8');
test('seven large start-screen guide sections are accessible',()=>{
 const guide=createGuide(catalog);
 assert.equal(guide.topics.length,7);
 assert.equal(new Set(guide.topics.map(x=>x[0])).size,7);
 for(const [key] of guide.topics){assert.match(html,new RegExp("openTacticsGuide\\('"+key+"'\\)"));assert.ok(guide.render(key).length>50,key);}
 assert.match(html,/id="guideModal"/);assert.match(html,/aria-modal="true"/);
 assert.match(html,/id="guideContent"/);assert.match(html,/closeTacticsGuide/);
 assert.match(css,/\.guideButtons/);assert.match(css,/\.guideModal/);
});
test('guide hero and skill pages reflect all live catalog characters',()=>{
 const output=createGuide(catalog).render('heroes');
 for(const h of catalog.heroes){assert.ok(output.includes(h.name),h.id);assert.ok(output.includes(h.ability.name),h.id);}
 assert.ok(output.includes(String(catalog.heroes.length)+' tướng'));
});
test('guide lists all live traits, thresholds, materials and full recipes',()=>{
 const guide=createGuide(catalog),traits=guide.render('traits'),items=guide.render('items');
 for(const [key,def] of Object.entries(catalog.origins)){
  assert.ok(traits.includes(def.label),key);
  for(const threshold of Object.keys(def.thresholds))assert.ok(traits.includes(threshold+' tướng:'),key+' '+threshold);
 }
 for(const item of [...catalog.components,...catalog.recipes])assert.ok(items.includes(item.name),item.id);
 assert.equal(catalog.recipes.length,21);
});
test('guide escapes catalog names rather than injecting markup',()=>{
 const copy=JSON.parse(JSON.stringify(catalog));copy.heroes[0].name='<img src=x onerror=alert(1)>';
 const rendered=createGuide(copy).render('heroes');
 assert.ok(rendered.includes('&lt;img'));
 assert.ok(!rendered.includes('<img src=x'));
});
