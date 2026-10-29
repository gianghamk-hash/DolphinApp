const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'index.html'),'utf8');
const css=fs.readFileSync(path.join(__dirname,'tactics-ui.css'),'utf8');
const catalog=JSON.parse(fs.readFileSync(path.join(__dirname,'catalog.json'),'utf8'));
test('inventory tray is between stage and bench',()=>{
 const stage=html.indexOf('id="stage"'),tray=html.indexOf('id="touchItemTray"'),bench=html.indexOf('class="benchBar"');
 assert.ok(stage>=0&&stage<tray&&tray<bench);
 assert.match(html,/data-select-item/);
});
test('tap gear opens catalog details and deployed hero choices',()=>{
 assert.match(html,/window\.openItemForEquip=/);
 assert.match(html,/function equipmentCandidateButtons/);
 assert.match(html,/Object\.entries\(player\.board\|\|\{\}\)/);
 assert.match(html,/data-equip-target/);
 assert.match(html,/send\(\{type:'EQUIP',unitId,component:item\.id\}\)/);
 assert.match(html,/player\.inventory\[item\.index\]!==item\.id/);
 assert.match(html,/state\.roundPhase!=='PREPARATION'/);
 assert.doesNotMatch(html,/function finishGearDrag/);
});
test('pinch zoom still handles two pointers',()=>{
 assert.match(html,/pinchPointers\.size<2/);
 assert.match(html,/zoomLevel\*d\/pinchDistance/);
 assert.match(html,/lastPinchAt/);
 assert.match(css,/#game #stage canvas\{touch-action:none!important\}/);
});
test('round labels match PVE rotation',()=>{
 assert.match(html,/round<=3\|\|round%5===0/);
 assert.equal(catalog.phases.COMBAT,30000);
});
