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
 const opening='<script type="module">',start=html.indexOf(opening),end=html.indexOf('</script>',start);
 assert.ok(start>=0&&end>start,'game ES module must be present');
 const source=html.slice(start+opening.length,end).split('\n').filter(line=>!line.trimStart().startsWith('import ')).join('\n');
 assert.doesNotThrow(()=>execFileSync(process.execPath,['--input-type=module','--check'],{input:source,encoding:'utf8'}));
});

test('phase 3 sound and VFX are driven by recorded combat events',()=>{
 assert.match(html,/id="combatSoundBtn"/);
 assert.match(html,/window\.toggleCombatSound=/);
 assert.match(html,/if\(e\.type==='stun'&&target\)/);
 assert.match(html,/if\(e\.type==='burn'&&target\)/);
 assert.match(html,/e\.skill\|\|'spell'/);
});

test('mana and casting effects are connected to replay events',()=>{
 assert.match(html,/e\.type==='mana'/);
 assert.match(html,/CombatFX\.castAura/);
 assert.match(html,/e\.type==='skill'/);
});

test('all 27 equipment entries have original vector icon symbols',()=>{
 const sprite=fs.readFileSync(path.join(__dirname,'assets/item-icons.svg'),'utf8');
 const catalog=JSON.parse(fs.readFileSync(path.join(__dirname,'catalog.json'),'utf8'));
 const ids=[...catalog.components,...catalog.recipes].map(x=>x.id);
 assert.equal(ids.length,27);
 assert.equal(new Set(ids).size,27);
 for(const id of ids)assert.ok(sprite.includes('id="item-'+id+'"'),'missing original artwork for '+id);
 assert.match(html,/ITEM_SPRITE='assets\/item-icons\.svg'/);
 assert.match(html,/class="tftItemArtwork"/);
 assert.match(html,/class="tftItemFallback"/);
 assert.match(css,/\.tftItemArtworkReady \.tftItemArtwork/);
});

test('battle characters show cached names for allies opponents and PvE',()=>{
 const visuals=require('node:fs').readFileSync(require('node:path').join(__dirname,'visuals.js'),'utf8');
 assert.match(visuals,/function nameplate\(name,enemy\)/);
 assert.match(visuals,/new T\.CanvasTexture\(canvas\)/);
 assert.match(visuals,/new T\.Sprite\(nameplates\.get\(key\)\)/);
 assert.match(html,/Visuals\.unit\(h,unit\.star\|\|1,enemy,displayName\|\|h\.name\)/);
 assert.match(html,/true,'Quái PvE'/);
});

test('hero names appear as HTML overlays during preparation and combat',()=>{
 assert.match(html,/id="heroNameLayer"/);
 assert.match(html,/function syncHeroNames\(\)/);
 assert.match(html,/tag\.textContent=displayName\|\|h\.name/);
 assert.match(html,/node\.localToWorld\(loc\)/);
 assert.match(html,/syncHeroNames\(\);renderer\.render/);
 assert.match(css,/#game #heroNameLayer/);
 assert.match(css,/#game \.battleHeroName/);
});
test('creating heroes does not require CanvasTexture support',()=>{
 const visuals=require('node:fs').readFileSync(require('node:path').join(__dirname,'visuals.js'),'utf8');
 assert.doesNotMatch(visuals,/const tag=nameplate\(displayName\|\|hero\.name,enemy\)/);
});

// Keep the handbook tests in the established UI CI workflow.
require('./guide.test.js');

test('online host persists both accepted and rejected action acknowledgements',()=>{
 assert.match(html,/hostState\.clientAcks\[playerId\]=\{sequence,actionId,accepted,reason\}/);
 assert.match(html,/catch\(error\)\{accepted=false/);
 assert.match(html,/hostState\.clientSequences\[playerId\]=sequence/);
 assert.match(html,/if\(sequence<=\(hostState\.clientSequences\[playerId\]\|\|0\)\)return/);
});
test('online guests wait for acknowledgement and do not overlap inputs',()=>{
 assert.match(html,/function sendOnlineAction\(action\)/);
 assert.match(html,/if\(onlinePending\)/);
 assert.match(html,/function settleOnlineAction\(snapshot\)/);
 assert.match(html,/if\(!ack\|\|ack\.sequence!==onlinePending\.sequence\|\|ack\.actionId!==uid\+':'\+onlinePending\.sequence\)return/);
 assert.match(html,/setTimeout\(\(\)=>\{if\(onlinePending!==pending\)return/);
 assert.match(html,/return sendOnlineAction\(action\)/);
});

test('phase 4 combat statistics are bounded and derived from replay events',()=>{
 for(const key of ['combatMetrics','combatStatuses','metricsHtml','m.damage+=e.amount','m.heal+=e.amount','m.shield+=e.amount','m.casts++'])assert.ok(html.includes(key),key);
 assert.match(html,/now-lastMetricPaint>=1000/);
 assert.match(css,/\.combatMetrics/);
});
test('phase 4 status tags follow 3D units and equipment confirmations respect host result',()=>{
 assert.match(html,/tag\.dataset\.status=statusName/);
 assert.match(html,/Object\.entries\(effects\)\.filter\(\(\[,until\]\)=>until>elapsed\)/);
 assert.match(css,/\.battleHeroName\[data-status/);
 assert.match(html,/if\(success===false\)return/);
 assert.match(html,/if\(!host\)\{return;\}/);
});

test('critical online actions reject expired and invalid request identifiers',()=>{
 assert.match(html,/MP\.onInput\(\(\{playerId,action,sequence,actionId,expiresAt\}\)=>/);
 assert.match(html,/receivedAt>expiresAt/);
 assert.match(html,/actionId!==playerId\+':'\+sequence/);
 assert.match(html,/hostState\.clientSequences\[playerId\]=sequence/);
 assert.match(html,/hostState\.clientAcks\[playerId\]=\{sequence,actionId,accepted,reason\}/);
 assert.match(html,/MP\.sendInputStrict\(\{action,sequence,actionId,expiresAt\}\)/);
 assert.match(html,/ack\.actionId!==uid\+':'\+onlinePending\.sequence/);
});

test('combat replay uses engine initial stats and displays burn damage plus concurrent effects',()=>{
 assert.match(html,/for\(const stat of report\.initialStats\|\|\[\]\)/);
 assert.match(html,/\['attack','cast','damageTick'\]\.includes\(e\.type\)/);
 assert.match(html,/if\(e\.type==='damageTick'&&target\)/);
 assert.match(html,/Object\.entries\(effects\)\.filter/);
 assert.match(html,/statuses\[e\.type\]=Math\.max/);
});

test('rendering retains Three.js models when online state changes without board changes',()=>{
 assert.match(html,/const boardSignature=\(\)=>/);
 assert.match(html,/signature!==lastBoardSignature/);
 assert.match(html,/lastBoardSignature=signature;renderBoard\(\)/);
 assert.doesNotMatch(html,/else if\(state\.roundPhase==='PREPARATION'\)renderBoard\(\)/);
});

test('TFT arena uses shared staff identity and exposes online, offline, guide and rankings',()=>{
 assert.match(html,/class="arenaHero"/);
 assert.match(html,/id="arenaStaffName"/);
 assert.match(html,/id="nick"[^>]*readonly/);
 assert.match(html,/getSyncedStaffName/);
 assert.match(html,/if\(!requireStaff\(\)\)return/);
 assert.match(html,/openTacticsRanking/);
 assert.match(html,/submitFinishedTacticsMatch/);
 assert.match(html,/if\(offline\|\|!roomId/);
 assert.match(html,/rankedMatchesSubmitted\.has\(matchId\)/);
 assert.match(css,/\.arenaHero/);
 assert.match(css,/prefers-reduced-motion/);
});
