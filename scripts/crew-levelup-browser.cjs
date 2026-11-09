'use strict';
/* Browser-only Level Up QA; no external API or production Firebase writes. */
const {chromium}=require('playwright'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),origin='http://127.0.0.1:8879';
const html=fs.readFileSync(path.join(root,'dolphin-profile.html'),'utf8')
 .replace(/<script\b[^>]*\bsrc="[^"]+"[^>]*><\/script>/gi,'')
 .replace('</head>','<script src="./crew-levelup-cinematic.js?v=levelup-v1" defer></script></head>');
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  const context=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block'});
  await context.route('**/*',route=>{
   const u=new URL(route.request().url());
   if(u.origin!==origin)return route.abort();
   if(u.pathname==='/dolphin-profile.html')return route.fulfill({contentType:'text/html; charset=utf-8',body:html});
   const f=path.resolve(root,'.'+u.pathname);
   if(!f.startsWith(root+path.sep)||!fs.existsSync(f))return route.fulfill({status:404,body:'missing'});
   return route.fulfill({contentType:f.endsWith('.css')?'text/css':'application/javascript',body:fs.readFileSync(f)});
  });
  const page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{
   window.DolphinStaffId={get:()=>({employeeId:'DOL-0002'})};
   window.DolphinPrestige={getMine:()=>({employeeId:'DOL-0002'})};
   localStorage.setItem('dolphin_level_seen:DOL-0002','20');
  });
  await page.goto(origin+'/dolphin-profile.html');
  await page.waitForFunction(()=>!!window.DolphinLevelUp);
  const profile={employeeId:'DOL-0002',avatar:'🐬',rank:'Platinum',level:21,
   xp:2450*20*20,selectedFrame:'silver',
   rewardCatalog:[{level:21,label:'Rank Platinum',icon:'✦'}],
   perkCatalog:[]};
  assert.equal(await page.evaluate(x=>window.DolphinLevelUp.notify(x),profile),true);
  await page.locator('#crew-levelup-cinematic[open]').waitFor();
  const get=()=>page.evaluate(()=>{
   const d=document.getElementById('crew-levelup-cinematic');
   return {title:document.getElementById('crew-lc-title')?.textContent,
    tier:d?.dataset.tier,scroll:document.documentElement.scrollWidth,
    viewport:innerWidth,modal:d?.getBoundingClientRect().toJSON(),
    animation:getComputedStyle(d.querySelector('.crew-lc-portal'),'::before').animationName};
  });
  let a=await get();
  assert.equal(a.tier,'rank');assert.match(a.title,/THĂNG HẠNG/);
  assert(a.scroll<=a.viewport+2,'390px screen must not horizontally overflow');
  assert.match(a.animation,/crew-lc-orbit/);
  await page.setViewportSize({width:320,height:700});
  a=await get();assert(a.scroll<=a.viewport+2,'320px screen must not overflow');
  assert(a.modal.width<=a.viewport+2);
  await page.emulateMedia({reducedMotion:'reduce'});
  a=await get();assert.equal(a.animation,'none','Reduced Motion should disable animation');
  await page.locator('.crew-lc-secondary').click();
  assert.equal(await page.locator('#crew-levelup-cinematic').count(),0);
  assert.equal(await page.evaluate(()=>localStorage.getItem('dolphin_level_seen:DOL-0002')),'21');
  assert.equal(await page.locator('#crew-levelup-replay').isHidden(),false);
  await page.locator('#crew-levelup-replay').click();
  await page.locator('#crew-levelup-cinematic[open]').waitFor();
  await page.locator('.crew-lc-primary').click();
  await page.locator('#rewards-dialog[open]').waitFor();
  assert.deepEqual(errors,[],'No page errors in cinematic lifecycle');
  console.log('PASS: Rank cinematic, rewards, replay, 320px/390px layouts and Reduced Motion.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
