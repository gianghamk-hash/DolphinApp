/* Optional browser integration: local HTTP + Firestore emulator only.
   NODE_PATH, TFT_ASSET_CACHE and TFT_CHROMIUM_PATH follow the TFT browser harness. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const base='http://127.0.0.1:8765',host=process.env.FIRESTORE_EMULATOR_HOST;
assert.equal(host,'127.0.0.1:8088','Use the local test emulator only');
const cache=process.env.TFT_ASSET_CACHE,root=path.resolve(__dirname,'..');
async function write(col,id,data){
 if(col.endsWith('_orders'))data.items=[];
 const fields=Object.fromEntries(Object.entries(data).map(([k,v])=>[k,Array.isArray(v)?{arrayValue:{values:[]}}:typeof v==='number'?{integerValue:String(v)}:{stringValue:v}]));
 const r=await fetch('http://'+host+'/v1/projects/demo-dolphin-tft/databases/(default)/documents/'+col+'/'+id,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({fields})});assert.ok(r.ok,await r.text());
}
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.TFT_CHROMIUM_PATH,args:['--no-sandbox']});
 try{
 const context=await browser.newContext({serviceWorkers:'block'}),errors=[];
 await context.route('**/*',async route=>{
  const url=new URL(route.request().url()),name=url.pathname.split('/').pop();
  if(url.hostname==='127.0.0.1'){

   if(url.pathname.startsWith('/__sdk/'))return route.fulfill({path:path.join(cache,name),contentType:'application/javascript'});
   return route.continue();
  }
  if(url.hostname==='www.gstatic.com' && url.pathname.includes('/10.12.2/')){
   let body;
   if(name==='firebase-app.js')body=`export * from '${base}/__sdk/firebase-app.js';import {initializeApp as real} from '${base}/__sdk/firebase-app.js';export function initializeApp(c,...args){return real({...c,projectId:'demo-dolphin-tft'},...args);}`;
   else if(name==='firebase-auth.js')body=`export function getAuth(){return {currentUser:{uid:'emulator-staff'}}}export async function signInAnonymously(){return {user:{uid:'emulator-staff'}}}`;
   else if(name==='firebase-firestore.js')body=`export * from '${base}/__sdk/firebase-firestore.js';import {initializeFirestore as real,connectFirestoreEmulator} from '${base}/__sdk/firebase-firestore.js';const seen=new WeakSet();export function getFirestore(app){let db=real(app,{experimentalForceLongPolling:true,useFetchStreams:false});if(!seen.has(db)){connectFirestoreEmulator(db,'127.0.0.1',8088);seen.add(db)}return db}`;
   if(body)return route.fulfill({body,contentType:'application/javascript',headers:{'Access-Control-Allow-Origin':'*'}});
  }
  if(name==='tailwind.js'||url.hostname==='cdn.tailwindcss.com')return route.fulfill({path:path.join(cache,'tailwind.js'),contentType:'application/javascript'});
  // No production Firebase or remote writes are allowed in this test.
  if(url.hostname==='www.gstatic.com' && fs.existsSync(path.join(cache,name)))return route.fulfill({path:path.join(cache,name),contentType:'application/javascript'});
  return route.abort();
 });
 const home=await context.newPage();home.on('console',m=>{if(m.type()==='error'||m.text().startsWith('SNAP'))console.log('HOME',m.text())});home.on('response',async r=>{if(r.status()>=400&&r.url().includes('8088'))console.log('EMULATOR HTTP',r.status(),r.url(),(await r.text()).slice(0,350))});home.on('pageerror',e=>errors.push('home: '+e.message));
 await home.goto(base+'/index.html');await home.waitForFunction(()=>window.dolphinOrderNotificationsReady,null,{timeout:15000}).catch(e=>{console.log(errors);throw e});
 await home.waitForTimeout(1500);await home.mouse.click(15,15);
 for(const col of ['bun_orders','lounge_orders','res_orders','bun_calls','lounge_calls','res_calls']){
  const id='browser-'+Date.now();await write(col,id,{status:'pending',timestamp:Date.now(),table:'TEST-'+col});
  
  await home.waitForFunction(col=>document.getElementById('orderNotif').classList.contains('show')&&document.getElementById('orderNotif').dataset.collection===col,col,{timeout:15000}).catch(async e=>{console.log('NOTIFICATION FAILURE',col,errors,await home.locator('#orderNotif').evaluate(el=>el.outerHTML));throw e;});console.log('Alert passed',col);
  assert.match(await home.locator('#orderNotifSub').textContent(),new RegExp('TEST-'+col));
  if(col==='lounge_orders'){
   await home.evaluate(()=>window.closeOrderNotif());await write(col,id,{status:'pending',timestamp:Date.now()+1,table:'TEST-addon'});
   await home.waitForFunction(()=>document.getElementById('orderNotif').classList.contains('show')&&document.getElementById('orderNotifSub').textContent.includes('TEST-addon'));
  }
 }
 console.log('Home: all six collections + modified Lounge order displayed real emulator events');await home.close();
 const manager=await context.newPage();manager.on('pageerror',e=>errors.push('dashboard: '+e.message));await manager.goto(base+'/manager/dashboard.html');await manager.waitForFunction(()=>window.__db);await manager.waitForTimeout(1000);
 await write('res_calls','manager-'+Date.now(),{status:'pending',timestamp:Date.now(),table:'MANAGER-TEST'});
 await manager.getByRole('alert').filter({hasText:'MANAGER-TEST'}).waitFor();console.log('Standalone dashboard service call: visible alert');await manager.close();
 // Each customer outlet must initialize and receive staff events without JS errors.
 for(const [pageName,role,col] of [['bungalow','bungalow','bun_orders'],['restaurant','staff','res_orders'],['lounge','staff','lounge_orders']]){
  const page=await context.newPage();page.on('pageerror',e=>errors.push(pageName+': '+e.message));await page.goto(base+'/dolphin-'+pageName+'.html');await page.waitForFunction(()=>typeof window.changeRole==='function');
  await page.evaluate(role=>window.changeRole(role),role);await page.waitForTimeout(1400);
  await write(col,'outlet-'+Date.now(),{status:'pending',timestamp:Date.now(),table:'OUTLET-TEST'});
  await page.waitForFunction(()=>document.getElementById('toast-msg')?.textContent.includes('MỚI'));
  await write(col.replace('_orders','_calls'),'outlet-call-'+Date.now(),{status:'pending',timestamp:Date.now(),table:'OUTLET-CALL'});
  await page.waitForFunction(()=>document.getElementById('toast-msg')?.textContent.includes('GỌI PHỤC VỤ'));await page.close();
 }
 console.log('All three standalone staff outlet pages: new order and service call toasts');
 const music=await context.newPage();music.on('pageerror',e=>errors.push('music: '+e.message));
 await music.addInitScript(()=>localStorage.setItem('dolphin_sound_tracks_cache_v2',JSON.stringify({ts:Date.now(),tracks:[null,{key:'broken',file:'bad'}]})));
 await music.goto(base+'/giaitri/index.html');await music.waitForFunction(()=>window.DolphinSound && document.querySelectorAll('#trackList .track-row').length===15);
 await music.evaluate(()=>showTab('music'));assert.equal(await music.locator('#trackList .track-row').count(),15);
 await music.evaluate(()=>pickTrack('summer'));await music.waitForFunction(()=>window.DolphinSound.getTrack()==='summer');
 assert.equal(await music.locator('audio').count(),0); // Audio is detached; inspect its actual network URL below.
 const audioRequest=music.waitForRequest(r=>r.url().includes('/sounds/soundscape-winter.mp3'));
 await music.evaluate(()=>pickTrack('winter'));const req=await audioRequest;assert.equal(new URL(req.url()).pathname,'/sounds/soundscape-winter.mp3');
 console.log('Music: invalid cache recovers 15 tracks; selected MP3 resolves from custom-domain root');
 assert.deepEqual(errors,[]);console.log('No page JavaScript exceptions');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
