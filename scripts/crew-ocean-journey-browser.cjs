'use strict';
/* Browser acceptance for Ocean Journey 60 Level and the actual 2D atlas files.
 * No Firebase, no writing employee data, 320px and desktop coverage.
 */
const {chromium}=require('playwright'),assert=require('node:assert/strict'),
 fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),origin='http://127.0.0.1:8879';
const profile=fs.readFileSync(path.join(root,'dolphin-profile.html'),'utf8')
 .replace(/<script\b[^>]*\bsrc="[^"]+"[^>]*><\/script>/gi,'')
 .replace('</head>','<script src="./crew-ocean-journey.js?v=journey-v1" defer></script></head>');
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  const context=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block'});
  const logErrors=[];
  await context.route('**/*',route=>{
   const url=new URL(route.request().url());
   if(url.origin!==origin)return route.abort();
   if(url.pathname==='/dolphin-profile.html')
    return route.fulfill({contentType:'text/html; charset=utf-8',body:profile});
   const file=path.resolve(root,'.'+url.pathname);
   if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||fs.statSync(file).isDirectory())
    return route.fulfill({status:404,body:'Not found'});
   const type=file.endsWith('.css')?'text/css':
    file.endsWith('.js')?'application/javascript':
    file.endsWith('.webp')?'image/webp':'application/octet-stream';
   return route.fulfill({contentType:type,body:fs.readFileSync(file)});
  });
  const page=await context.newPage();
  page.on('pageerror',error=>logErrors.push(error.message));
  await page.addInitScript(()=>{
   window.__journeyData={
    employeeId:'DOL-0002',level:22,levelPeak:25,xp:2450*21*21,
    rewardCatalog:[{id:'r22',level:22,label:'Khung Silver'},
     {id:'r25',level:25,label:'Bộ avatar mới'},
     {id:'r26',level:26,label:'Aura Đại Dương'}],
    perkCatalog:[{id:'p22',level:22,name:'Danh hiệu Ngôi Sao'}]
   };
   window.DolphinStaffId={get:()=>({employeeId:'DOL-0002'})};
   window.DolphinPrestige={getMine:()=>window.__journeyData};
  });
  await page.goto(origin+'/dolphin-profile.html');
  await page.waitForFunction(()=>window.DolphinOceanJourney&&
   document.querySelectorAll('.crew-journey-node').length===60);
  assert.equal(await page.locator('.crew-journey-region').count(),6);
  assert.equal(await page.locator('.crew-journey-node').count(),60);
  assert.equal(await page.locator('.crew-journey-region[open]').count(),1);
  assert.equal(await page.locator('.crew-journey-node[data-level="22"]').getAttribute('data-state'),'current');
  assert.equal(await page.locator('.crew-journey-node[data-level="25"]').getAttribute('data-state'),'complete');
  assert.equal(await page.locator('.crew-journey-node[data-level="26"]').getAttribute('data-state'),'locked');
  const imgs=await page.evaluate(async()=>{
   const names=['crew-profile-icons.webp','crew-journey-icons.webp'];
   return await Promise.all(names.map(async name=>{
    const img=new Image();img.src='./assets/'+name;await img.decode();
    return {name,width:img.naturalWidth,height:img.naturalHeight};
   }));
  });
  assert(imgs.every(x=>x.width===448&&x.height===224),'Both approved icon atlases should decode at 448×224');
  const visual=()=>page.evaluate(()=>{
   const card=document.getElementById('crew-ocean-journey').getBoundingClientRect();
   const icon=document.querySelector('.crew-journey-node[data-level="22"] .crew-2d-icon');
   return {scroll:document.documentElement.scrollWidth,width:innerWidth,card:card.toJSON(),
    img:getComputedStyle(icon).backgroundImage};
  });
  let v=await visual();
  assert(v.scroll<=v.width+2,'390px mobile viewport cannot scroll horizontally');
  assert(v.card.width<=v.width+1,'Map should fit on a phone');
  assert.match(v.img,/crew-journey-icons\.webp/);
  await page.locator('.crew-journey-node[data-level="22"]').click();
  await page.locator('#crew-journey-dialog[open]').waitFor();
  assert.match(await page.locator('#crew-journey-dialog-rewards').innerText(),/Khung Silver/);
  assert.match(await page.locator('#crew-journey-dialog-rewards').innerText(),/Danh hiệu Ngôi Sao/);
  await page.locator('#crew-journey-open-rewards').click();
  await page.locator('#rewards-dialog[open]').waitFor();
  await page.evaluate(()=>document.getElementById('rewards-dialog').close());
  await page.locator('#crew-journey-expand').click();
  assert.equal(await page.locator('.crew-journey-region[open]').count(),6);
  await page.locator('#crew-journey-expand').click();
  assert.equal(await page.locator('.crew-journey-region[open]').count(),1);
  await page.setViewportSize({width:320,height:700});
  v=await visual();
  assert(v.scroll<=v.width+2,'320px mobile viewport cannot scroll horizontally');
  assert(v.card.width<=v.width+1,'Map fits within a 320px device');
  await page.emulateMedia({reducedMotion:'reduce'});
  assert.equal(await page.evaluate(()=>
   getComputedStyle(document.querySelector('.crew-journey-node[data-state="current"] .crew-2d-icon')).animationName),
   'none','Reduced Motion disables decorative pulse');
  await page.setViewportSize({width:1040,height:900});
  v=await visual();assert(v.scroll<=v.width+2,'Desktop has no overflow');
  await page.evaluate(()=>{
   window.__journeyData={...window.__journeyData,level:60,levelPeak:60,xp:2450*59*59};
   dispatchEvent(new CustomEvent('dolphin-my-progress-updated',{detail:window.__journeyData}));
  });
  assert.equal(await page.locator('.crew-journey-node[data-state="locked"]').count(),0);
  assert.equal(await page.locator('.crew-journey-node[data-level="60"]').getAttribute('data-state'),'current');
  assert.equal(await page.locator('#crew-journey-level').textContent(),'LEVEL 60 / 60');
  assert.deepEqual(logErrors,[],'No runtime exceptions with backend-free UI');
  console.log('PASS: Ocean Journey 60 levels, live refresh, 2D icon sheets, 320px/390px/desktop, accessibility and read-only rewards.');
 }finally{await browser.close();}
})().catch(err=>{console.error(err);process.exitCode=1;});
