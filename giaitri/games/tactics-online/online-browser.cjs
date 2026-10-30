/* Optional integration check: Playwright + a local Firestore emulator only.
 * Serve the repo on TFT_BASE_URL (default http://127.0.0.1:8765).
 * FIRESTORE_EMULATOR_HOST must be set; this script never uses production Firebase.
 */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright');
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
  await pages[1].setViewportSize({width:390,height:844});
  assert.ok(await pages[1].locator('#networkStatus').isVisible());
  if(process.env.TFT_SCREENSHOT)await pages[1].screenshot({path:process.env.TFT_SCREENSHOT,fullPage:true});
  assert.deepEqual(errors,[]);console.log('PASS: 4 browser clients, purchases, movement, host removal, worker combat, exactly-once round XP, reconnect, offline rejection and portrait HUD');
 }finally{await browser.close();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
