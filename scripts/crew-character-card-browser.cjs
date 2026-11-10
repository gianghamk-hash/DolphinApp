'use strict';
/* Visual/structural acceptance for the real Character Card markup and styles.
 * No Firebase calls or employee data modifications.
 */
const {chromium}=require('playwright'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),origin='http://127.0.0.1:8879';
const profile=fs.readFileSync(path.join(root,'dolphin-profile.html'),'utf8')
 .replace(/<script\b[^>]*\bsrc="[^"]+"[^>]*><\/script>/gi,'')
 .replace('</head>','<script src="./crew-character-card.js?v=xp-level-v3" defer></script></head>');
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  const context=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block'});
  await context.route('**/*',route=>{
   const u=new URL(route.request().url());
   if(u.origin!==origin)return route.abort();
   if(u.pathname==='/dolphin-profile.html')return route.fulfill({contentType:'text/html; charset=utf-8',body:profile});
   const filepath=path.resolve(root,'.'+u.pathname);
   if(!filepath.startsWith(root+path.sep)||!fs.existsSync(filepath))
    return route.fulfill({status:404,body:'Not found'});
   const type=filepath.endsWith('.css')?'text/css':filepath.endsWith('.js')?'application/javascript':filepath.endsWith('.webp')?'image/webp':'text/plain';
   return route.fulfill({contentType:type,body:fs.readFileSync(filepath)});
  });
  const page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(origin+'/dolphin-profile.html');
  await page.waitForFunction(()=>!!window.DolphinCrewCharacter);
  const staff={employeeId:'DOL-0002',name:'Louis Đặng',xp:1107000,level:22,levelPeak:22,rank:'Platinum',
   selectedFrame:'silver',selectedAura:'dual',selectedAvatarMotion:'wave',selectedTitle:'guardian'};
  await page.evaluate(staff=>window.DolphinCrewCharacter.render(staff),staff);
  const sample=async()=>page.evaluate(()=>{
   const $=id=>document.getElementById(id),r=id=>$(id).getBoundingClientRect();
   return {width:document.documentElement.scrollWidth,viewport:window.innerWidth,
    card:r('crew-profile-banner').toJSON(),portrait:r('profile-avatar').toJSON(),
    name:r('profile-name').toJSON(),progress:r('staff-xp-track').toJSON(),
    equipment:r('crew-card-equipped-frame').toJSON(),
    percent:$('crew-card-xp-percent').textContent,rank:$('crew-card-rank-badge').textContent,
    frame:$('crew-card-equipped-frame').textContent,
    size:getComputedStyle($('profile-avatar')).width,
    visual:getComputedStyle($('crew-profile-banner'),'::before').backgroundImage,
    slotColumns:getComputedStyle(document.querySelector('.crew-card-equipment')).gridTemplateColumns.split(' ').length};
  });
  assert.equal(await page.locator('.crew-profile-utility').count(),2,'Only two account utilities remain');
  assert.equal(await page.locator('#crew-ocean-journey').count(),0,'The cluttered Ocean Journey map is gone');
  assert.equal(await page.locator('.crew-card-footer-action').count(),0,'No duplicated style/reward footer buttons');
  const assets=await page.evaluate(async()=>{
   const files=['assets/crew-profile-icons-v2.webp','assets/crew-cosmetic-icons-v2.webp'];
   return Promise.all(files.map(src=>new Promise(resolve=>{
    const img=new Image();img.onload=()=>resolve({src,loaded:true,w:img.naturalWidth,h:img.naturalHeight});
    img.onerror=()=>resolve({src,loaded:false});img.src=src;
   })));
  });
  assert(assets.every(x=>x.loaded&&x.w===384&&x.h===192),'Both approved bright icon atlases decode at full size');
  const icon=await page.locator('.crew-profile-utility .crew-2d-icon').first().evaluate(el=>getComputedStyle(el).backgroundImage);
  assert(icon.includes('crew-profile-icons-v2.webp'),'Account buttons display the bright atlas');
  const mobile=await sample();
  assert(mobile.width<=mobile.viewport+2,'Character Card must not cause horizontal scrolling on phones');
  assert(mobile.card.width<=mobile.viewport,'Card must fit within viewport');
  assert(mobile.portrait.y<mobile.name.y,'Phone layout must lead with the avatar portrait');
  assert(mobile.progress.y>mobile.name.y,'XP progress must appear below the identity');
  assert(mobile.slotColumns===2,'Compact phones use 2 columns of equipped cosmetics');
  assert.equal(mobile.frame,'Silver');assert.equal(mobile.rank,'PLATINUM RANK');
  assert.match(mobile.visual,/gradient/,'Card should preserve rich ocean ambient light');
  assert(mobile.portrait.width>=95,'Hero avatar must remain large enough for animated rings');
  await page.setViewportSize({width:320,height:700});
  const compact=await sample();
  assert(compact.width<=compact.viewport+2,'320px screen must not scroll horizontally');
  assert(compact.card.width<=compact.viewport,'320px card should fit within viewport');
  await page.setViewportSize({width:1040,height:900});
  const desktop=await sample();
  assert(desktop.width<=desktop.viewport+2,'Desktop should not overflow');
  assert(desktop.portrait.x<desktop.name.x,'Desktop portrait is next to the identity');
  assert(desktop.slotColumns===4,'Desktop shows four equipment slots');
  await page.emulateMedia({reducedMotion:'reduce'});
  const stopped=await page.evaluate(()=>getComputedStyle(document.querySelector('.crew-card-dial-track')).animationName);
  assert.equal(stopped,'none','Reduced Motion disables decorative orbit');
  assert.deepEqual(errors,[],'No browser script exceptions');
  console.log('PASS: Character Card visual layout on 390px phone and desktop, 4 equipment slots, rank and Reduced Motion.');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
