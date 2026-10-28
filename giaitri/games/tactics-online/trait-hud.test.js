const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const base=__dirname,html=fs.readFileSync(path.join(base,'index.html'),'utf8'),css=fs.readFileSync(path.join(base,'tactics-ui.css'),'utf8');
const local=JSON.parse(fs.readFileSync(path.join(base,'catalog.json'),'utf8')),server=JSON.parse(fs.readFileSync(path.join(base,'../../../functions/tactics/catalog.json'),'utf8'));
test('both catalogs have matching Sorcerer 2/4/6 tiers',()=>{
 assert.deepEqual(local.origins.Sorcerer.thresholds,server.origins.Sorcerer.thresholds);
 assert.deepEqual(Object.keys(local.origins.Sorcerer.thresholds),['2','4','6']);
 assert.ok(local.heroes.filter(h=>h.classes.includes('Sorcerer')).length>=6);
});
test('each trait uses actual catalog thresholds and unique deployed heroes',()=>{
 assert.match(html,/Object\.keys\(def\.thresholds\)\.map\(Number\)\.sort/);
 assert.match(html,/unique\.has\(u\.heroId\)/);
 assert.match(html,/traitProgress\(p,k\)/);
 assert.match(html,/trait\.count|t\.count/);
 assert.match(html,/traitTier isCurrent|traitTier '/);
});
test('stage has left trait HUD and separate right HP rail',()=>{
 const stage=html.indexOf('id="stage"'),trait=html.indexOf('id="traitRail"'),bench=html.indexOf('id="bench"');
 assert.ok(stage>=0&&trait>stage&&trait<bench);
 assert.match(css,/#game #stage>\.traitRail/);
 assert.match(css,/#game>section>\.playerDock/);
 assert.match(css,/--tft-hud-scale/);
 assert.match(html,/syncBattleHudScale\(\);e\.preventDefault\(\)/);
});
test('old duplicate equipment panel removed, touch gear stays',()=>{
 assert.doesNotMatch(html,/id="equipButton"/);
 assert.doesNotMatch(html,/id="equipItem"/);
 assert.match(html,/id="touchItemTray"/);
 assert.match(html,/send\(\{type:'EQUIP',unitId:target,component:drag\.item\}\)/);
});
