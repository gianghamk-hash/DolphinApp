const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'index.html'),'utf8');
const css=fs.readFileSync(path.join(__dirname,'tactics-ui.css'),'utf8');
const catalog=JSON.parse(fs.readFileSync(path.join(__dirname,'catalog.json'),'utf8'));
test('inventory tray is next to board and before bench',()=>{
 const stage=html.indexOf('id="stage"'),tray=html.indexOf('id="touchItemTray"'),bench=html.indexOf('class="benchBar"');
 assert.ok(stage>=0&&stage<tray&&tray<bench);
 assert.match(html,/id="touchItemSlots"/);
 assert.match(html,/data-item-index/);
});
test('touch drag still sends validated equipment action',()=>{
 assert.match(html,/send\(\{type:'EQUIP',unitId:target,component:drag\.item\}\)/);
 assert.match(html,/boardUnitAt\(e\.clientX,e\.clientY\)/);
 assert.match(html,/p\.inventory\.includes\(drag\.item\)/);
 assert.match(html,/state\.roundPhase!=='PREPARATION'/);
});
test('pinch handles two pointers without breaking unit selection',()=>{
 assert.match(html,/pinchPointers\.size<2/);
 assert.match(html,/zoomLevel\*d\/pinchDistance/);
 assert.match(html,/lastPinchAt/);
 assert.match(css,/#game #stage canvas\{touch-action:none!important\}/);
 assert.doesNotMatch(html,/id="zoomControls"/);
});
test('round labels match engine PVE rotation',()=>{
 assert.match(html,/round<=3\|\|round%5===0/);
 assert.match(html,/PvE · ĐẤU QUÁI/);
 assert.match(html,/PvP · ĐẤU NGƯỜI/);
 assert.equal(catalog.phases.COMBAT,30000);
});

test('gear drag captures on stable tray instead of rerendered item button',()=>{
 assert.match(html,/trayRoot\.setPointerCapture\(e\.pointerId\)/);
 assert.doesNotMatch(html,/tile\.setPointerCapture\(e\.pointerId\)/);
 assert.match(html,/trayRoot\.releasePointerCapture\(e\.pointerId\)/);
 assert.match(css,/#game \.touchItemTray \.touchGear\{touch-action:none!important/);
});
test('gear drops fall back to occupied board tile and bench slot',()=>{
 assert.match(html,/const tile=boardHit\(e\.clientX,e\.clientY\)/);
 assert.match(html,/target=p\.board\['r'\+\(tile\.row-4\)\+'c'\+tile\.col\]/);
 assert.match(html,/target=p\.bench\[String\(b\.dataset\.bench\)\]/);
 assert.match(html,/chờ đồng bộ từ chủ phòng/);
});
