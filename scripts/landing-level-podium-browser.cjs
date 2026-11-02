'use strict';
/* Browser acceptance of the real Landing podium and ranking relay, no Firebase writes. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),origin='http://127.0.0.1:8877';
const champion={
 employeeId:'DOL-0022',name:'Huyền Thoại 🐬',avatar:'🐬',level:60,xp:12183500,rank:'Legend',
 selectedFrame:'mythic',selectedAvatarMotion:'ascension',selectedAura:'celestial',
 selectedTrail:'nova',selectedNameFx:'celestial',selectedTitle:'legend',
 selectedBanner:'mythic',selectedCardFx:'mythic',personalTheme:'winter'
};
const rankingPage='<!doctype html><html><body>'+
 '<span id="leader-emperor-avatar"></span><span id="leader-emperor-name"></span><span id="leader-emperor-value"></span>'+
 '<script>window.fixtureBoard={leaderboard:'+JSON.stringify([champion,{...champion,employeeId:'DOL-0100',name:'Second place',xp:100000}])+',champion:null};'+
 'window.DolphinPrestige={getBoard:()=>window.fixtureBoard,getMine:()=>null};'+
 'window.DolphinAvatars={profile:()=>null,get:()=>null,subscribe:()=>()=>{}};</script>'+
 '<script src="/ranking/staff-prestige-ranking.js" defer></script></body></html>';
const landingPage='<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1">'+
 '<script>window.fixtureBoard={leaderboard:'+JSON.stringify([champion,{...champion,employeeId:'DOL-0100',name:'Second place',xp:100000}])+',champion:null};'+
 'window.DolphinPrestige={getBoard:()=>window.fixtureBoard};</script>'+
 '<script src="/royal-leaders.js" defer></script><script src="/dolphin-avatars.js" defer></script></head>'+
 '<body style="background:#071d1b;color:#fff;margin:0"><div id="landing" style="width:100%;max-width:1100px;margin:auto">'+
 '<div id="announcementBar">Thông báo</div></div></body></html>';
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  const context=await browser.newContext({viewport:{width:1180,height:890},serviceWorkers:'block',reducedMotion:'no-preference'});
  await context.route('**/*',async route=>{
   const url=new URL(route.request().url());
   if(url.origin!==origin)return route.abort();
   if(url.pathname==='/landing-podium-test.html')return route.fulfill({contentType:'text/html; charset=utf-8',body:landingPage});
   if(url.pathname==='/ranking/'||url.pathname==='/ranking/index.html')return route.fulfill({contentType:'text/html; charset=utf-8',body:rankingPage});
   const file=path.resolve(root,'.'+url.pathname);
   if(!file.startsWith(root+path.sep)||!fs.existsSync(file))return route.fulfill({status:404,body:'missing '+url.pathname});
   const type=file.endsWith('.css')?'text/css':file.endsWith('.js')?'application/javascript':'text/plain';
   return route.fulfill({contentType:type,body:fs.readFileSync(file)});
  });
  const page=await context.newPage();
  page.setDefaultTimeout(20000);
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(origin+'/landing-podium-test.html');
  await page.waitForFunction(()=>document.querySelector('#drl-level')?.dataset.status==='ready'&&
   document.querySelectorAll('#drl-level-avatar .crew-mythic-orbit').length===4&&
   !!document.getElementById('crew-cosmetics-stylesheet')?.sheet);
  let state=await page.evaluate(()=>{
   const $=id=>document.getElementById(id);
   const avatar=$('drl-level-avatar'),name=$('drl-level-name'),surface=$('drl-level-surface');
   return {who:name.textContent,frame:avatar.dataset.frame,motion:avatar.dataset.avatarMotion,
    aura:avatar.dataset.crewAura,trail:$('drl-level-name-wrap').dataset.crewTrail,
    title:$('drl-level-title').textContent,score:$('drl-level-score').textContent,
    banner:surface.dataset.banner,cardFx:surface.dataset.crewCard,theme:surface.dataset.personalTheme,
    nameFx:name.dataset.nameFx,orbitCount:avatar.querySelectorAll('.crew-mythic-orbit').length,
    hasMotion:!!avatar.querySelector('.crew-avatar-motion'),
    orbitAnimation:getComputedStyle(avatar.querySelector('.crew-mythic-orbit')).animationName,
    motionAnimation:getComputedStyle(avatar.querySelector('.crew-avatar-motion')).animationName,
    trailAnimation:getComputedStyle($('drl-level-name-wrap')).animationName,
    nameBackground:getComputedStyle(name).backgroundImage,
    bannerBackground:getComputedStyle(surface).backgroundImage,
    bannerGlow:getComputedStyle(surface,'::before').backgroundImage,
    bannerColor:getComputedStyle(surface).backgroundColor
   };
  });
  assert.equal(state.who,champion.name);
  assert.deepEqual([state.frame,state.motion,state.aura,state.trail,state.banner,state.cardFx,state.theme,state.nameFx],
   ['mythic','ascension','celestial','nova','mythic','mythic','winter','celestial']);
  assert.equal(state.title,'👑 Dolphin Legend');
  assert.match(state.score,/Lv\.60/);assert.equal(state.orbitCount,4);
  assert.equal(state.hasMotion,true);assert.match(state.orbitAnimation,/crew-mythic-rotate/);
  assert.match(state.motionAnimation,/crew-mythic-rotate/);
  assert.match(state.trailAnimation,/crew-v5-name-nova/);
  assert.match(state.nameBackground,/gradient/);
  assert.equal(state.bannerBackground,'none','Level podium must not have an opaque panel');
  assert.match(state.bannerGlow,/gradient/,'equipped banner still appears as a subtle translucent light accent');
  const desktop=await page.evaluate(()=>{
   const b=id=>document.getElementById(id).getBoundingClientRect();
   return {left:b('drl-revenue').toJSON(),middle:b('drl-level').toJSON(),right:b('drl-work').toJSON()};
  });
  assert(desktop.left.right<=desktop.middle.left+3);
  assert(desktop.middle.right<=desktop.right.left+3);
  assert(desktop.middle.y<desktop.left.y,'Level appears slightly higher');
  assert(desktop.middle.x>desktop.left.x&&desktop.middle.x<desktop.right.x);
  console.log('PASS: desktop three-place podium and all 9 selected Level cosmetics, including moving Mythic rings.');
  await page.setViewportSize({width:360,height:800});
  const mobile=await page.evaluate(()=>{
   const b=id=>document.getElementById(id).getBoundingClientRect();
   return {level:b('drl-level').toJSON(),revenue:b('drl-revenue').toJSON(),work:b('drl-work').toJSON(),width:document.documentElement.scrollWidth};
  });
  assert(mobile.level.y<mobile.revenue.y&&mobile.level.y<mobile.work.y,'Level is slightly raised');
  assert(mobile.revenue.x<mobile.level.x&&mobile.level.x<mobile.work.x,'Level is between Revenue and Work, not above them in a separate row');
  assert(Math.abs(mobile.level.width-mobile.revenue.width)<=8,'Level and Revenue widths must match');
  assert(Math.abs(mobile.level.width-mobile.work.width)<=8,'Level and Work widths must match');
  assert(mobile.level.height<=Math.max(mobile.revenue.height,mobile.work.height)+55,'Level must not dominate vertical space');
  assert(mobile.width<=361,'no horizontal landing overflow on mobile');
  console.log('PASS: 360px mobile compact three-column podium with transparent Level cosmetics.');
  // Any other window attempting to post a forged champion must be rejected.
  await page.evaluate(()=>window.postMessage({type:'dolphin-level-leader',leader:{employeeId:'DOL-0009',name:'FORGED',level:60}},location.origin));
  await page.waitForTimeout(60);
  assert.equal(await page.locator('#drl-level-name').textContent(),champion.name);
  const rankingFrame=page.frames().find(f=>f.url().endsWith('/ranking/'));
  assert(rankingFrame,'same-origin ranking iframe must exist');
  // The legacy ranking iframe may broadcast its own Level leader; Landing
  // deliberately ignores that untrusted relay and listens to its own board.
  await rankingFrame.evaluate(()=>{
   window.fixtureBoard={leaderboard:[{employeeId:'DOL-0099',name:'Iframe candidate',level:59}]};
   window.dispatchEvent(new CustomEvent('dolphin-prestige-updated',{detail:window.fixtureBoard}));
  });
  await page.waitForTimeout(100);
  assert.equal(await page.locator('#drl-level-name').textContent(),champion.name);
  await page.evaluate(()=>{
   window.fixtureBoard={leaderboard:[{
    employeeId:'DOL-0077',name:'New leader',avatar:'🐯',level:45,xp:700000,rank:'Legend',
    selectedFrame:'gold',selectedAvatarMotion:'float',selectedAura:'spark',
    selectedTrail:'wave',selectedNameFx:'prism',selectedTitle:'wave',selectedBanner:'wave',selectedCardFx:'energy',
    personalTheme:'summer'
   }]};
   window.dispatchEvent(new CustomEvent('dolphin-prestige-updated',{detail:window.fixtureBoard}));
  });
  await page.waitForFunction(()=>document.getElementById('drl-level-name').textContent==='New leader'&&
   document.querySelectorAll('#drl-level-avatar .crew-fx-ring').length===3);
  assert.equal(await page.locator('#drl-level-avatar .crew-mythic-orbit').count(),0);
  assert.equal(await page.locator('#drl-level-avatar').getAttribute('data-avatar-motion'),'float');
  assert.equal(await page.locator('#drl-level-surface').getAttribute('data-banner'),'wave');
  console.log('PASS: new Level #1 replaces all equipped effects without stale Mythic satellites.');
  await rankingFrame.evaluate(()=>window.parent.postMessage({
   type:'dolphin-rank-leaders',
   revenue:{entries:[{name:'Chiến',value:4000000}]},
   work:{entries:[{name:'Louis Đặng',value:3}]}
  },location.origin));
  await page.waitForFunction(()=>document.querySelector('#drl-revenue .drl-name')?.textContent==='Chiến'&&document.querySelector('#drl-work .drl-name')?.textContent==='Louis Đặng');
  assert.equal(await page.locator('#drl-level-name').textContent(),'New leader','Revenue/Work updates must not overwrite Level');
  await page.evaluate(()=>{
   window.fixtureBoard={leaderboard:[]};
   window.dispatchEvent(new CustomEvent('dolphin-prestige-updated',{detail:window.fixtureBoard}));
  });
  await page.waitForFunction(()=>document.getElementById('drl-level')?.dataset.status==='empty');
  assert.equal(await page.locator('#drl-level-avatar .crew-fx-orbits').count(),0);
  assert.equal(await page.locator('#drl-level-avatar .crew-avatar-motion').count(),0);
  assert.equal(errors.length,0,'browser runtime errors: '+errors.join('; '));
  console.log('PASS: no leader state clears chosen effects, frame remains stable.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
