/* Optional integration check: Playwright + a local Firestore emulator only.
 * Serve the repo on TFT_BASE_URL (default http://127.0.0.1:8765).
 * FIRESTORE_EMULATOR_HOST must be set; this script never uses production Firebase.
 */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright');
const E=require('../../../functions/tactics/engine');
const {opponentText}=require('./phase-banner');
const host=process.env.FIRESTORE_EMULATOR_HOST;
assert.ok(host&&/^(127\.0\.0\.1|localhost):\d+$/.test(host),'A local FIRESTORE_EMULATOR_HOST is required');
const [emulatorHost,emulatorPort]=host.split(':');
const base=process.env.TFT_BASE_URL||'http://127.0.0.1:8765';
assert.ok(/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(base),'Use a local HTTP server');
const game=base+'/giaitri/games/tactics-online/index.html';
const runId=Date.now().toString(36),errors=[];
async function main(){
 const browser=await chromium.launch({headless:true,executablePath:process.env.TFT_CHROMIUM_PATH||undefined,args:['--no-sandbox','--enable-unsafe-swiftshader']});
 try{
  const contexts=[],pages=[];
  for(let i=0;i<4;i++){
   const context=await browser.newContext({viewport:{width:1280,height:720}});contexts.push(context);
   if(process.env.TFT_ASSET_CACHE)await context.route(/https:\/\/(www\.gstatic\.com|cdn\.jsdelivr\.net)\//,async route=>{
    const asset=path.join(process.env.TFT_ASSET_CACHE,new URL(route.request().url()).pathname.split('/').pop());
    if(fs.existsSync(asset))return route.fulfill({path:asset,contentType:'application/javascript',headers:{'Access-Control-Allow-Origin':'*'}});
    return route.continue();
   });
   await context.addInitScript(({id,emulatorHost,emulatorPort})=>{
    localStorage.setItem('dolphinStaffName','Tester '+id);localStorage.setItem('dolphin_device_id',id);
    let firebase;
    Object.defineProperty(window,'firebase',{configurable:true,get:()=>firebase,set:value=>{
     firebase=value;if(!value.initializeApp||value.__emulatorPatched)return;
     value.__emulatorPatched=true;const initialize=value.initializeApp.bind(value);
     value.initializeApp=(config,...args)=>{
      const app=initialize({...config,projectId:'demo-dolphin-tft'},...args);
      if(app.firestore){const db=app.firestore();db.useEmulator(emulatorHost,Number(emulatorPort));}
      return app;
     };
    }});
   },{id:'browser-'+runId+'-'+i,emulatorHost,emulatorPort});
   const page=await context.newPage();pages.push(page);page.on('pageerror',error=>errors.push(error.message));
   page.on('console',message=>{if(message.type()==='error'&&message.text().includes('[MP]'))errors.push(message.text());});
  }
  await Promise.all(pages.map(p=>p.goto(game,{waitUntil:'networkidle',timeout:60000})));
  await Promise.all(pages.map(p=>p.waitForFunction(()=>typeof window.createRoom==='function')));
  await Promise.all(pages.map(p=>p.evaluate(()=>window.chooseOnline())));
  await pages[0].evaluate(()=>window.createRoom());
  const code=await pages[0].evaluate(()=>DolphinMP.getRoomId());assert.ok(code,await pages[0].locator('#loginStatus').textContent());
  for(const p of pages.slice(1)){await p.locator('#code').fill(code);await p.evaluate(()=>window.joinRoom());}
  await pages[0].waitForFunction(()=>document.getElementById('lobbyStatus').textContent.startsWith('4/4'));
  await pages[0].evaluate(()=>window.startRoom());
  await Promise.all(pages.map(p=>p.locator('#game:not(.hidden)').waitFor()));
  const read=p=>p.evaluate(async()=> (await db.collection('mp_rooms').doc(DolphinMP.getRoomId()).collection('data').doc('state').get({source:'server'})).data());
  const before=await read(pages[1]),started=Date.now();
  const buys=await Promise.all(pages.map(p=>p.evaluate(()=>window.send({type:'BUY',index:0}))));assert.ok(buys.every(Boolean));
  const after=await read(pages[1]),ids=[];
  for(const uid of after.playerOrder){const p=after.players[uid];assert.equal(Object.keys(p.units).length,1);ids.push(...Object.keys(p.units));assert.ok(p.gold<before.players[uid].gold);}
  assert.equal(new Set(ids).size,4);
  console.log('Four simultaneous purchases, emulator:',Date.now()-started,'ms');
  await Promise.all(pages.map(p=>p.evaluate(async()=>{
   const s=(await db.collection('mp_rooms').doc(DolphinMP.getRoomId()).collection('data').doc('state').get()).data();
   const id=DolphinMP.getPlayerId(),unit=Object.keys(s.players[id].units)[0];
   return window.send({type:'MOVE',unitId:unit,to:'board',index:'r0c3'});
  })));
  await pages[1].waitForFunction(()=>document.querySelector('#stage canvas'));
  // Remove the creator completely. Other clients must keep the round moving.
  await pages[0].close();
  async function expire(page){await page.evaluate(async()=>{
   const ref=db.collection('mp_rooms').doc(DolphinMP.getRoomId()).collection('data').doc('state'),snap=await ref.get();
   await ref.update({phaseEndsAt:Date.now()-1000,revision:snap.data().revision+1});
  });}
  async function phase(value){await pages[1].waitForFunction(value=>document.getElementById('phaseLabel').textContent.includes(value),value,{timeout:20000});}
  await expire(pages[1]);await phase('CHIẾN ĐẤU');assert.equal((await read(pages[1])).roundPhase,'COMBAT');
  await pages[1].waitForTimeout(500);await expire(pages[1]);await phase('KẾT QUẢ');
  const transition=await read(pages[1]);assert.ok(transition.reports.every(r=>!('events' in r)));
  await expire(pages[1]);await phase('CHUẨN BỊ');const next=await read(pages[1]);assert.equal(next.round,2);
  assert.equal(next.players[next.playerOrder[1]].xp,2);
  // Reconnect keeps ownership, economy and room membership.
  await pages[1].reload({waitUntil:'networkidle'});await pages[1].evaluate(()=>window.reconnectRoom());
  await pages[1].locator('#game:not(.hidden)').waitFor();assert.equal((await read(pages[1])).round,2);
  await contexts[2].setOffline(true);const offline=await pages[2].evaluate(()=>window.send({type:'ROLL'}));assert.equal(offline,false);
  await contexts[2].setOffline(false);
  await pages[2].waitForFunction(()=>document.getElementById('networkStatus').textContent.includes('Đã đồng bộ'),null,{timeout:20000});
  // Deterministic PvP fixture in the emulator: one deployed copy and one bench
  // copy of H01. Buying the third in COMBAT must not change this battle.
  const current=await read(pages[1]),time=Date.now();
  const fixture=E.roomNew(current.hostId,'Host',time,123456);
  fixture.playerOrder=current.playerOrder;fixture.players={};fixture.round=4;fixture.status='in_game';fixture.phaseEndsAt=time;
  for(const id of fixture.playerOrder){
   const p=E.freshPlayer(id,current.players[id].displayName,fixture);fixture.players[id]=p;p.gold=80;p.inventory=['sword'];p.shop=['H01','H01','H02','H01','H05'];
   for(const index of [0,1,2])E.action(fixture,id,{type:'BUY',index},time);
   E.action(fixture,id,{type:'MOVE',unitId:Object.keys(p.units)[0],to:'board',index:'r0c3'},time);p.ready=true;
  }
  E.advance(fixture,time);fixture.phaseEndsAt=time+60000;fixture.revision=current.revision+1;
  fixture.mode='casual';fixture.rankingEligible=false;
  await pages[1].evaluate(async fixture=>{await db.collection('mp_rooms').doc(DolphinMP.getRoomId()).collection('data').doc('state').set(fixture);},fixture);
  const me=current.playerOrder[1],reserve=fixture.players[me].bench['1'],extra=fixture.players[me].bench['2'];
  await pages[1].waitForFunction(text=>document.getElementById('battleBanner').textContent===text,opponentText(fixture,me));
  assert.ok(await pages[1].locator('#battleBanner').isVisible());
  if(process.env.TFT_SCREENSHOT)await pages[1].screenshot({path:process.env.TFT_SCREENSHOT.replace('.png','-combat.png'),fullPage:true});
  await pages[1].locator('#shop .shopInspect').nth(1).click();assert.match(await pages[1].locator('#heroInfo').textContent(),/Trong Shop/);
  assert.equal((await read(pages[1])).players[me].gold,fixture.players[me].gold);
  await pages[1].locator('#shop .shopHero').nth(3).click();
  async function playerMatches(fn,args){
   const until=Date.now()+15000;let observed;
   do{
    // Read from another participant: local prediction must not satisfy a
    // persistence assertion before the transaction has actually committed.
    observed=await read(pages[2]);if(fn(observed.players[me],args))return;
    await pages[1].waitForTimeout(150);
   }while(Date.now()<until);
   assert.fail('Player condition not committed: '+JSON.stringify(observed.players[me]));
  }
  await playerMatches(p=>Object.keys(p.units).length===4);
  const purchased=await read(pages[1]);assert.equal(purchased.players[me].pendingMerge,true);assert.ok(Object.values(purchased.players[me].units).every(u=>u.star===1));
  assert.deepEqual(purchased.combatSnapshot,fixture.combatSnapshot);
  async function dragBench(from,to){
   const source=await pages[1].locator('#bench [data-bench="'+from+'"]').boundingBox(),target=await pages[1].locator('#bench [data-bench="'+to+'"]').boundingBox();
   assert.ok(source&&target);await pages[1].mouse.move(source.x+source.width/2,source.y+source.height/2);await pages[1].mouse.down();
   await pages[1].mouse.move(target.x+target.width/2,target.y+target.height/2,{steps:12});await pages[1].mouse.up();
  }
  await dragBench(1,7);await playerMatches((p,id)=>p.bench['7']===id&&!p.bench['1'],reserve);assert.equal((await read(pages[1])).players[me].bench['7'],reserve);
  await dragBench(2,7);await playerMatches((p,id)=>p.bench['2']===id,reserve);const swapped=await read(pages[1]);
  assert.equal(swapped.players[me].bench['7'],extra);assert.equal(swapped.players[me].bench['2'],reserve);assert.deepEqual(swapped.combatSnapshot,fixture.combatSnapshot);
  await pages[1].waitForTimeout(400);await pages[1].locator('#bench [data-bench="7"]').click();
  assert.ok((await pages[1].locator('#heroInfo').textContent()).includes(E.HERO.H02.name));
  await pages[1].locator('#touchItemSlots [data-select-item]').first().click();
  assert.ok(await pages[1].locator('#itemInfoModal').isVisible());
  assert.ok((await pages[1].locator('#itemInfoContent').textContent()).includes(E.COMP.sword.name));
  assert.equal(await pages[1].locator('[data-equip-target]:not(:disabled)').count(),0);
  await pages[1].getByRole('button',{name:'Đóng chi tiết trang bị'}).click();
  await pages[1].locator('#lockShopBtn').click();await playerMatches(p=>p.shopLocked);assert.ok(await pages[1].locator('#rollShopBtn').isDisabled());
  await pages[1].locator('#lockShopBtn').click();await playerMatches(p=>!p.shopLocked);
  await pages[1].locator('#buyXpBtn').click();await playerMatches(p=>p.xp===4);
  const rollGold=(await read(pages[1])).players[me].gold;await pages[1].locator('#rollShopBtn').click();
  await playerMatches((p,gold)=>p.gold===gold-2,rollGold);
  // Inspection is still usable when purchasing is disabled by insufficient gold.
  await pages[1].evaluate(async uid=>{
   const ref=db.collection('mp_rooms').doc(DolphinMP.getRoomId()).collection('data').doc('state'),s=(await ref.get()).data();
   s.players[uid].gold=0;s.revision++;await ref.set(s);
  },me);
  await pages[1].waitForFunction(()=>Array.from(document.querySelectorAll('#shop .shopHero')).every(b=>b.disabled));
  await pages[1].locator('#shop .shopInspect').first().click();assert.match(await pages[1].locator('#heroInfo').textContent(),/Trong Shop/);
  await pages[1].locator('#battleBanner').waitFor({state:'hidden',timeout:6000});
  await pages[1].locator('#lockShopBtn').click();await playerMatches(p=>p.shopLocked);assert.ok(await pages[1].locator('#battleBanner').isHidden());
  await expire(pages[1]);await phase('KẾT QUẢ');assert.equal(Object.keys((await read(pages[1])).players[me].units).length,4);
  await expire(pages[1]);await phase('CHUẨN BỊ');
  const merged=await read(pages[1]);assert.equal(merged.round,5);assert.equal(merged.players[me].pendingMerge,false);
  assert.equal(Object.values(merged.players[me].units).filter(u=>u.heroId==='H01').length,1);
  assert.equal(Object.values(merged.players[me].units).find(u=>u.heroId==='H01').star,2);
  await pages[1].setViewportSize({width:390,height:844});
  assert.ok(await pages[1].locator('#networkStatus').isVisible());
  if(process.env.TFT_SCREENSHOT)await pages[1].screenshot({path:process.env.TFT_SCREENSHOT,fullPage:true});
  assert.deepEqual(errors,[]);console.log('PASS: four clients, timed named PvP/PvE banner, combat shop/info/XP/lock/reroll, physical bench drag/swap, unchanged combat snapshot, deferred fusion, host removal and reconnect');
 }finally{await browser.close();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
