'use strict';
/* Visual/structural acceptance for the real Character Card markup and styles.
 * No Firebase calls or employee data modifications.
 */
const {chromium}=require('playwright'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),origin='http://127.0.0.1:8879';
const profile=fs.readFileSync(path.join(root,'dolphin-profile.html'),'utf8')
 .replace(/<script\b[^>]*\bsrc="[^"]+"[^>]*><\/script>/gi,'')
 .replace('</head>','<script src="./crew-character-card.js?v=xp-lock-v4" defer></script></head>');
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
   const type=filepath.endsWith('.css')?'text/css':filepath.endsWith('.js')?'application/javascript':filepath.endsWith('.webp')?'image/webp':filepath.endsWith('.svg')?'image/svg+xml':'text/plain';
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
    visual:getComputedStyle($('crew-profile-banner'),'::before').display,
    artworkZ:getComputedStyle(document.querySelector('.crew-profile-frame-image')).zIndex,
    portraitZ:getComputedStyle(document.querySelector('.crew-card-portrait')).zIndex,
    portraitOverflow:getComputedStyle(document.querySelector('.crew-card-portrait')).overflow,
    avatarOverflow:getComputedStyle($('profile-avatar')).overflow,
    cardOverflow:getComputedStyle($('crew-profile-banner')).overflow,
    frameImg:(()=>{const im=document.querySelector('.crew-profile-frame-image');return {src:im?.getAttribute('src'),ready:im?.complete&&im?.naturalWidth===1200&&im?.naturalHeight===400,rect:im?.getBoundingClientRect().toJSON()}})(),
    level:r('crew-card-level-number').toJSON(),staffid:r('employee-id').toJSON(),rankName:r('crew-card-rank-name').toJSON(),
    tilesColumns:getComputedStyle(document.querySelector('.crew-chibi-grid')).gridTemplateColumns.split(' ').length,
    equipmentVisible:getComputedStyle(document.querySelector('.crew-card-equipment')).display!=='none'};
  });
  assert.equal(await page.locator('.crew-chibi-grid .crew-chibi-tile').count(),8,'Eight chibi function tiles replace legacy utility buttons');
  assert.equal(await page.locator('.crew-chibi-tools button').count(),2,'Style and device actions remain accessible');
  assert.equal(await page.locator('.crew-profile-utility').count(),0,'Old utility shortcuts are removed');
  assert.equal(await page.locator('[data-crew-tile="ranking"]').count(),1,'Only one ranking tile remains');
  assert.equal(await page.locator('#crew-ocean-journey').count(),0,'The cluttered Ocean Journey map is gone');
  assert.equal(await page.locator('.crew-card-footer-action').count(),0,'No duplicated style/reward footer buttons');
  const assets=await page.evaluate(async()=>{
   const files=['assets/dolphin-chibi-ship.svg','assets/crew-profile-icons-v2.webp','assets/crew-cosmetic-icons-v2.webp',
    'assets/crew-card-profile.webp','assets/crew-card-daily.webp','assets/crew-card-xp.webp','assets/crew-card-achievements.webp','assets/crew-card-work.webp','assets/crew-card-revenue.webp','assets/crew-card-ranking.webp','assets/crew-card-rewards.webp'];
   return Promise.all(files.map(src=>new Promise(resolve=>{
    const img=new Image();img.onload=()=>resolve({src,loaded:true,w:img.naturalWidth,h:img.naturalHeight});
    img.onerror=()=>resolve({src,loaded:false});img.src=src;
   })));
  });
  assert(assets.every(x=>x.loaded&&x.w>0&&x.h>0),'Chibi artwork and bright legacy atlases must all decode');
  assert.equal(await page.locator('.crew-chibi-tile img.crew-chibi-image').count(),8,'Eight cards are real image elements');
  const cardImages=await page.locator('.crew-chibi-tile .crew-chibi-image').evaluateAll(images=>images.map(im=>({src:im.getAttribute('src'),ready:im.complete&&im.naturalWidth===420&&im.naturalHeight===315})));
  assert(cardImages.every(x=>x.ready&&x.src.endsWith('.webp')),'Eight illustrated WebP images decode independently');
  const mobile=await sample();
  for(const [label,s] of [['390px',mobile]]){
   assert.equal(s.artworkZ,'0',label+' approved WebP artwork stays behind avatar FX');
   assert.equal(s.portraitZ,'3',label+' avatar effects render in foreground');
   assert.equal(s.portraitOverflow,'visible',label+' portrait ornaments are not clipped');
   assert.equal(s.avatarOverflow,'visible',label+' rings, aura and motion remain visible');
   assert.equal(s.cardOverflow,'hidden',label+' card frame still bounds effects to artwork');
  }
  assert(mobile.width<=mobile.viewport+2,'Character Card must not cause horizontal scrolling on phones');
  assert(mobile.card.width<=mobile.viewport,'Card must fit within viewport');
  assert(mobile.portrait.x<mobile.name.x,'Phone layout places avatar beside the identity');
  assert(mobile.progress.y>mobile.name.y,'XP progress must appear below the identity');
  assert(mobile.tilesColumns===2,'Compact phones show two columns of chibi tiles');
  assert.equal(mobile.equipmentVisible,false,'Dashboard hides duplicated cosmetic equipment controls');
  assert.equal(mobile.frame,'Silver');assert.equal(mobile.rank,'PLATINUM RANK');
  assert.equal(mobile.visual,'none','Decorative pseudo-background is hidden so the approved WebP remains visible');
  const mapped=(s,label)=>{
   assert(s.frameImg.ready,label+' uses the approved real 1200x400 WebP');
   assert(Math.abs(s.card.height/s.card.width-1/3)<0.025,label+' keeps the illustration aspect ratio');
   const pos=r=>({x:(r.x-s.card.x)/s.card.width,y:(r.y-s.card.y)/s.card.height,
     centerX:(r.x+r.width/2-s.card.x)/s.card.width,centerY:(r.y+r.height/2-s.card.y)/s.card.height});
   const avatar=pos(s.portrait),name=pos(s.name),level=pos(s.level),xp=pos(s.progress),id=pos(s.staffid),rank=pos(s.rankName);
   console.log('VISUAL COORD',label,JSON.stringify({card:s.card,avatar,name,level,xp,id,rank,staffid:s.staffid}));
   assert(avatar.centerX>.11&&avatar.centerX<.19&&avatar.centerY>.40&&avatar.centerY<.60,label+' avatar inside pictured gold ring');
   assert(name.x>.30&&name.x<.39&&name.y>.20&&name.y<.40,label+' live staff name inside illustration nameplate');
   assert(level.centerX>.82&&level.centerX<.94&&level.centerY>.33&&level.centerY<.56,label+' live level in crown shield');
   assert(id.centerX>.54&&id.centerX<.64&&id.y>.40&&id.y<.55,label+' staff ID in the card ID slot');
   assert(rank.centerX>.33&&rank.centerX<.43&&rank.y>.70&&rank.y<.85,label+' live rank in bottom rank badge');
   assert(xp.x>.47&&xp.x<.55&&xp.y>.68&&xp.y<.82,label+' XP progress track in illustrated XP bar');
  };
  mapped(mobile,'390px phone');
  assert(mobile.portrait.width>=60,'Compact hero avatar remains legible at 66px');
  await page.setViewportSize({width:320,height:700});
  const compact=await sample();
  assert.equal(compact.avatarOverflow,'visible','320px icon supports orbit FX');
  assert.equal(compact.artworkZ,'0','320px illustration remains background');
  assert(compact.width<=compact.viewport+2,'320px screen must not scroll horizontally');
  assert(compact.card.width<=compact.viewport,'320px card should fit within viewport');
  mapped(compact,'320px phone');
  await page.setViewportSize({width:1040,height:900});
  const desktop=await sample();
  assert.equal(desktop.avatarOverflow,'visible','Desktop icon supports orbit FX');
  assert.equal(desktop.portraitZ,'3','Desktop avatar layer is above artwork');
  assert(desktop.width<=desktop.viewport+2,'Desktop should not overflow');
  assert(desktop.portrait.x<desktop.name.x,'Desktop portrait is next to the identity');
  assert(desktop.tilesColumns===4,'Desktop shows four columns of chibi tiles');
  mapped(desktop,'Desktop');
  await page.emulateMedia({reducedMotion:'reduce'});
  const stopped=await page.evaluate(()=>getComputedStyle(document.querySelector('.crew-card-dial-track')).animationName);
  assert.equal(stopped,'none','Reduced Motion disables decorative orbit');
  assert.deepEqual(errors,[],'No browser script exceptions');
  console.log('PASS: Chibi dashboard, eight illustrated tiles, Character Card, 320/390px mobile, desktop and Reduced Motion.');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
