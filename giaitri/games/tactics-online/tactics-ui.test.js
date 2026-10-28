const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'index.html'),'utf8');
const css=fs.readFileSync(path.join(__dirname,'tactics-ui.css'),'utf8');
test('redesign stylesheet loaded and all action targets remain intact',()=>{
 assert.match(html,/href="tactics-ui\.css\?v=1"/);
 for(const id of ['stage','shop','touchItemTray','touchItemSlots','traitRail','traitInfo','bench','rollShopBtn','lockShopBtn','buyXpBtn']){
 assert.match(html,new RegExp('id="'+id+'"'));
 }
 for(const action of ['buyHero','finishGearDrag','TOGGLE_SHOP_LOCK','ROLL','BUY_XP']){
 assert.ok(html.includes(action),action+' must remain available');
 }
});
test('arena material and tier shop styles are present',()=>{
 assert.match(html,/metalness:\.27,roughness:\.46/);
 assert.match(css,/#game #stage/);
 for(let i=1;i<=5;i++)assert.match(css,new RegExp('shopHero\\.tier'+i));
 assert.match(css,/#game #stage>\.traitRail/);
});
test('responsive controls and reduced-motion design are preserved',()=>{
 assert.match(css,/@media\(max-height:520px\) and \(orientation:landscape\)/);
 assert.match(css,/@media\(orientation:portrait\) and \(max-width:650px\)/);
 assert.match(css, /prefers-reduced-motion:reduce/);
});

test('phase 2 portrait layout uses measured header and constrained viewport',()=>{
 assert.match(html,/function syncPortraitHeader\(/);
 assert.match(css,/--tft-header-height/);
 assert.match(css,/max-height:700px/);
 assert.match(css,/safe-area-inset-bottom/);
 assert.match(css,/#game>aside\{height:auto!important;min-height:0!important;flex:1 1 0!important;overflow-y:auto!important/);
});
test('drag interactions provide source and destination cues and clean up on cancel',()=>{
 assert.match(html,/function clearUnitDragFeedback\(/);
 assert.match(html,/isDragSource/);
 assert.match(html,/isDropTarget/);
 assert.match(html,/pointercancel.*clearUnitDragFeedback/);
 assert.match(css,/\.benchBar\.isDropTarget/);
});

test('game entry ES module parses without duplicate declarations',()=>{
 const {execFileSync}=require('node:child_process');
 const match=html.match(/<script type="module">([\\s\\S]*?)<\\/script>/);
 assert.ok(match,'game ES module must be present');
 const source=match[1].replace(/^import\\s+.*?;\\s*$/gm,'');
 assert.doesNotThrow(()=>execFileSync(process.execPath,['--input-type=module','--check'],{input:source,encoding:'utf8'}));
});
