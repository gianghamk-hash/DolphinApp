'use strict';
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),origin='http://127.0.0.1:8879';
const profile=fs.readFileSync(path.join(root,'dolphin-profile.html'),'utf8').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'');
const out=process.env.COMPANION_QA_OUTPUT||path.join(root,'reports/companion-preview');
fs.mkdirSync(out,{recursive:true});
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  const context=await browser.newContext({serviceWorkers:'block'});
  await context.route('**/*',route=>{
   const u=new URL(route.request().url());if(u.origin!==origin)return route.abort();
   if(u.pathname==='/dolphin-profile.html')return route.fulfill({contentType:'text/html; charset=utf-8',body:profile});
   const file=path.resolve(root,'.'+u.pathname);
   if(!file.startsWith(root+path.sep)||!fs.existsSync(file))return route.fulfill({status:404,body:''});
   const type={'.css':'text/css','.js':'application/javascript','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml'}[path.extname(file)]||'text/plain';
   return route.fulfill({contentType:type,body:fs.readFileSync(file)});
  });
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(origin+'/dolphin-profile.html');
  await page.evaluate(()=>{
   window.owner='DOL-0001';window.progress={employeeId:owner,level:100,xp:24012450};
   window.DolphinStaffId={get:()=>owner?{employeeId:owner}:null,ready:()=>Promise.resolve()};
   window.DolphinPrestige={getMine:()=>progress};
   document.getElementById('profile-name').textContent='Nguyễn Hoàng Minh Anh · Nhân viên thử nghiệm';
   document.getElementById('employee-id').textContent=owner;
   document.getElementById('profile-title').hidden=false;document.getElementById('profile-title').textContent='✦ Vĩnh cửu';
   document.getElementById('profile-avatar').dataset.frame='eternal';
  });
  await page.addScriptTag({url:origin+'/dolphin-avatars.js'});
  await page.waitForFunction(()=>window.DolphinFrameFX);
  await page.addScriptTag({url:origin+'/crew-character-card.js'});
  const positions=()=>page.evaluate(()=>['profile-avatar','profile-name','profile-title','employee-id','staff-xp-track'].map(id=>document.getElementById(id).getBoundingClientRect().toJSON()));
  const before=await positions();
  await page.addScriptTag({url:origin+'/crew-dolphin-companion.js'});
  assert.deepEqual(await positions(),before,'adding the pet must not move existing content');
  const asset=await page.evaluate(()=>new Promise(resolve=>{const i=new Image();i.onload=()=>resolve([i.naturalWidth,i.naturalHeight]);i.onerror=()=>resolve(null);i.src='assets/dolphin-companions-v1.png';}));
  assert(asset&&asset[0]>1000&&asset[1]>500,'real rendered atlas decodes');
  for(const width of [320,390,768,1280]){
   await page.setViewportSize({width,height:900});
   for(const level of [1,60,70,80,90,100]){
    await page.evaluate(level=>{
     progress={employeeId:owner,level,xp:2450*(level-1)**2,highestLevel:100};
     const avatar=document.getElementById('profile-avatar');avatar.dataset.frame=level>=70?'eternal':'none';
     window.DolphinFrameFX.refresh();
     document.getElementById('profile-state').textContent='Đã xác minh';
     document.getElementById('staff-level-tag').textContent='LEVEL '+level;
     document.getElementById('staff-xp-summary').textContent=progress.xp.toLocaleString('vi-VN')+' XP hiện tại';
     document.getElementById('staff-xp-fill').style.width=level===100?'100%':'0%';
     window.dispatchEvent(new CustomEvent('dolphin-my-progress-updated',{detail:progress}));
    },level);
    await page.waitForTimeout(30);
    const flight=page.locator('.dolphin-pet-flight');
    // Sample the entire orbit, checking the actual transformed rendered bounds.
    for(const time of [0,2000,4000,6000,8000,10000,12000,14000]){
     const result=await flight.evaluate((n,time)=>{
      for(const node of [n.parentElement,n]){const a=node.getAnimations()[0];a.pause();a.currentTime=time;}
      const r=n.getBoundingClientRect(),host=document.getElementById('crew-profile-banner').getBoundingClientRect();
      const overlaps=['profile-name','profile-title','employee-id','crew-card-level-number','staff-xp-track'].filter(id=>{
       const q=document.getElementById(id).getBoundingClientRect();return q.width&&q.height&&r.left<q.right&&r.right>q.left&&r.top<q.bottom&&r.bottom>q.top;
      });
      return {overlaps,inside:r.left>=host.left&&r.right<=host.right&&r.top>=host.top&&r.bottom<=host.bottom,overflow:document.documentElement.scrollWidth>innerWidth};
     },time);
     assert.deepEqual(result.overlaps,[],`${width}px Lv${level} orbit ${time}`);assert(result.inside);assert(!result.overflow);
    }
   }
   await page.screenshot({path:path.join(out,'level100-'+width+'.png'),fullPage:true});
  }
  const smooth=await page.locator('.dolphin-pet-flight').evaluate(n=>{
   const at=time=>{
    for(const node of [n.parentElement,n])node.getAnimations()[0].currentTime=time;
    const r=n.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2,w:r.width,h:r.height};
   };
   const speeds=[],directions=[];
   for(let t=0;t<16000;t+=2000){
    const a=at(t===0?15990:t-10),b=at(t),c=at(t+10);
    const u={x:b.x-a.x,y:b.y-a.y},v={x:c.x-b.x,y:c.y-b.y};
    const su=Math.hypot(u.x,u.y),sv=Math.hypot(v.x,v.y);
    speeds.push(su,sv);directions.push((u.x*v.x+u.y*v.y)/(su*sv));
   }
   const start=at(0),end=at(16000);
   return {directions,speeds,wrap:Math.hypot(end.x-start.x,end.y-start.y),upright:Math.abs(start.w-end.w)};
  });
  assert(smooth.directions.every(d=>d>.999),'direction stays continuous at former corners and loop seam');
  assert(Math.max(...smooth.speeds)/Math.min(...smooth.speeds)<1.01,'orbit speed stays constant');
  assert(smooth.wrap<.01&&smooth.upright<.01,'loop returns upright without a jump');
  // A reaction must not replace/restart the existing idle animation.
  const idle=await page.locator('.dolphin-pet-sprite').evaluate(n=>{window.idleAnimation=n.getAnimations().find(a=>a.animationName==='dolphin-pet-bob');return getComputedStyle(n).animationName;});
  await page.locator('.dolphin-pet-flight').focus();await page.keyboard.press('Enter');
  assert.equal(await page.locator('.dolphin-pet-stage').getAttribute('data-reaction'),'hello');
  assert.equal(await page.locator('.dolphin-pet-sprite').evaluate(n=>!!window.idleAnimation&&n.getAnimations().includes(window.idleAnimation)),true);
  assert.equal(await page.locator('.dolphin-pet-sprite').evaluate(n=>getComputedStyle(n).animationName),idle);
  for(const selector of ['.dolphin-pet-orbit','.dolphin-pet-flight'])assert.equal(await page.locator(selector).evaluate(n=>getComputedStyle(n).animationPlayState),'paused','keyboard focus pauses both rotations together');
  await page.locator('.dolphin-pet-flight').evaluate(n=>n.blur());
  await page.locator('.dolphin-pet-flight').click();
  for(const selector of ['.dolphin-pet-orbit','.dolphin-pet-flight'])assert.equal(await page.locator(selector).evaluate(n=>getComputedStyle(n).animationPlayState),'running','pointer hover/click must not leave flight frozen');
  const update=async(level,xp)=>page.evaluate(({level,xp})=>{progress={employeeId:owner,level,xp,highestLevel:100};dispatchEvent(new CustomEvent('dolphin-my-progress-updated',{detail:progress}));},{level,xp});
  await update(1,0);assert.equal(await page.locator('.dolphin-pet-stage').getAttribute('data-form'),'0');
  assert.equal(await page.locator('.dolphin-pet-stage').getAttribute('data-reaction'),null);
  await update(1,100);assert.equal(await page.locator('.dolphin-pet-stage').getAttribute('data-reaction'),'xp');
  await update(10,198450);assert.equal(await page.locator('.dolphin-pet-stage').getAttribute('data-reaction'),'level');
  await page.evaluate(()=>{owner='DOL-0002';dispatchEvent(new Event('dolphin-staff-id-changed'));});
  assert(await page.locator('.dolphin-pet-stage').isHidden());
  await update(100,24012450);assert(await page.locator('.dolphin-pet-stage').isVisible());
  await page.emulateMedia({reducedMotion:'reduce'});
  assert.equal(await page.locator('.dolphin-pet-flight').evaluate(n=>getComputedStyle(n).animationName),'none');
  await page.evaluate(()=>{owner=null;dispatchEvent(new Event('dolphin-staff-id-changed'));});
  assert(await page.locator('.dolphin-pet-stage').isHidden());
  assert.deepEqual(errors,[]);
  console.log('PASS: continuous constant-speed orbit and loop seam, independent reactions, ten-form atlas, 320/390/768/1280px bounds, XP gain/deduction, identity switch, keyboard, reduced motion.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
