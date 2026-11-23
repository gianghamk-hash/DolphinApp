'use strict';
const {chromium}=require('playwright'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const rules=require('../crew-dolphin-living.js');
const root=path.resolve(__dirname,'..'),origin='http://127.0.0.1:8893';
const output=process.env.COMPANION_QA_OUTPUT||path.join(root,'reports/companion-preview');
fs.mkdirSync(output,{recursive:true});
const pages={};
for(const name of ['index.html','dolphin-profile.html'])
 pages['/'+name]=fs.readFileSync(path.join(root,name),'utf8')
   .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'');
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  const context=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block'});
  await context.route('**/*',route=>{
   const u=new URL(route.request().url());
   if(u.origin!==origin)return route.abort();
   const uri=u.pathname==='/'?'/index.html':u.pathname;
   if(pages[uri])return route.fulfill({contentType:'text/html; charset=utf-8',body:pages[uri]});
   const file=path.resolve(root,'.'+uri);
   if(!file.startsWith(root+path.sep)||!fs.existsSync(file))return route.fulfill({status:404,body:''});
   const type={'.css':'text/css','.js':'application/javascript','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml'}[path.extname(file)]||'text/plain';
   return route.fulfill({contentType:type,body:fs.readFileSync(file)});
  });
  const today=rules.dateVN(new Date());
  const owner=Array.from({length:300},(_,i)=>'DOL-'+String(i+1).padStart(4,'0'))
    .find(id=>rules.offer(id,today,9,''));
  assert.ok(owner,'at least one deterministic cosmetic treasure is available today');
  const page=await context.newPage(),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.goto(origin+'/index.html');
  await page.evaluate(id=>{
   window.owner=id;
   window.progress={employeeId:id,level:100,xp:24012450};
   window.DolphinStaffId={get:()=>window.owner?{employeeId:window.owner,verified:true,approved:true,name:'Thử nghiệm'}:null};
   window.DolphinPrestige={getMine:()=>window.progress,call:()=>{throw Error('Pet cannot mutate XP')}};
   document.documentElement.classList.add('dolphin-access-allowed');
  },owner);
  for(const script of ['crew-dolphin-brief.js','crew-dolphin-wardrobe.js','crew-dolphin-wheel.js','crew-dolphin-companion.js','crew-dolphin-play.js','crew-dolphin-landing.js','crew-dolphin-living.js'])
   await page.addScriptTag({url:origin+'/'+script});
  const wheel=page.locator('.dcl-wheel'),pet=page.locator('.dcl-flight');
  const stage=page.locator('#dolphinLandingCompanion'),ball=stage.locator('.dcl-water-ball');
  const play=page.getByRole('button',{name:'Chuyền bóng nước',exact:true});
  assert.equal(await page.locator('.dcl-living-landing').count(),0);
  assert(await wheel.isHidden());
  async function openWheel(){
   await pet.waitFor({state:'visible'});const r=await pet.boundingBox();
   await page.mouse.dblclick(r.x+r.width/2,r.y+r.height/2);
   await wheel.waitFor({state:'visible',timeout:4000});
  }
  await openWheel();
  assert.equal(await wheel.locator('.dcl-wheel-item img').count(),8);
  await page.keyboard.press('ArrowRight');
  assert.equal(await wheel.locator(':focus').getAttribute('data-key'),'play');
  await page.mouse.move(388,840);await page.waitForTimeout(350);
  await page.screenshot({path:path.join(output,'dolphin-wheel-mobile.png')});
  await wheel.getByRole('button',{name:'Đặt tên cho linh thú'}).click();
  await wheel.locator('input').fill('Bông');await wheel.getByRole('button',{name:'Lưu tên'}).click();
  assert.equal(await wheel.locator('.dcl-wheel-hub strong').textContent(),'Bông');
  await wheel.getByRole('button',{name:'Chọn tư thế'}).click();
  await wheel.getByRole('button',{name:'Cúi chào'}).click();
  assert.equal(await pet.getAttribute('data-pose'),'bow');
  await openWheel();await wheel.getByRole('button',{name:'Chọn trạng thái'}).click();
  await wheel.getByRole('button',{name:'Thư thái'}).click();
  assert.equal(await pet.getAttribute('data-mood'),'calm');
  await openWheel();
  async function phase(value){
   try{
    await page.waitForFunction(p=>document.querySelector('#dolphinLandingCompanion').dataset.play===p,value,{timeout:12000});
   }catch(error){
    const info=await stage.evaluate(el=>({
     phase:el.dataset.play,hidden:el.hidden,passes:el.querySelector('.dcl-water-ball').dataset.hits,
     scroll:el.parentElement.scrollTop,status:document.querySelector('.dcl-bubble-text').textContent
    }));
    throw new Error('Waiting for '+value+' '+JSON.stringify(info),{cause:error});
   }
  }
  await play.click();
  await phase('ready');
  for(let pass=1;pass<=3;pass++){
   assert.equal(await ball.getAttribute('data-hits'),String(pass-1));
   const target=await ball.boundingBox();
   await ball.click();
   if(pass===1){
    // Simulate newly laid-out landing content taking the original catching spot.
    await page.evaluate(box=>{
     const obstacle=document.createElement('div');
     obstacle.id='late-card';obstacle.className='area-card';
     obstacle.style.cssText='position:fixed;width:32px;height:32px;min-height:0;padding:0;left:'+box.x+'px;top:'+box.y+'px';
     document.getElementById('landing').append(obstacle);
    },target);
   }
   await phase(pass===3?'finale':'ready');
   if(pass===1)await page.locator('#late-card').evaluate(el=>el.remove());
  }
  assert(await stage.locator('.dcl-signature').isVisible(),'third return draws the signature');
  await page.waitForTimeout(1150);
  await page.screenshot({path:path.join(output,'living-eternal-constellation.png')});
  await page.evaluate(()=>document.getElementById('orderNotif').classList.add('show'));
  assert(await ball.isHidden() && await stage.locator('.dcl-signature').isHidden(),'urgent alerts stop play');
  await page.evaluate(()=>document.getElementById('orderNotif').classList.remove('show'));
  await page.emulateMedia({reducedMotion:'reduce'});
  await pet.focus();await page.keyboard.press('Enter');await play.click();
  await phase('ready');
  for(let i=0;i<3;i++)await page.keyboard.press('Enter');
  await phase('finale');
  assert.equal(await pet.evaluate(el=>el===document.activeElement),true,'keyboard focus returns to the game launcher');
  await page.emulateMedia({reducedMotion:'no-preference'});
  await openWheel();await page.getByRole('button',{name:'Biểu diễn Eternal Ocean'}).click();
  assert(await page.locator('.dcl-living-scene[data-skill="eternal"]').isVisible());
  assert.match(await page.locator('.dcl-bubble-text').innerText(),/Eternal Ocean/);
  await page.screenshot({path:path.join(output,'living-landing-eternal.png'),fullPage:true});
  await page.waitForTimeout(9000);
  await openWheel();const chest=page.getByRole('button',{name:'Mở rương bí mật'});
  assert(await chest.isVisible(),'available one-per-day treasure is offered on Landing');
  await chest.click();
  const stored=await page.evaluate(id=>JSON.parse(localStorage.getItem('dolphin-companion-cosmetics-v1:'+id)),owner);
  assert.equal(stored.openedDay,today);
  assert.equal(stored.items.length,1);
  assert.equal(stored.items[0],rules.drawReward(owner,today,9).id);
  assert(await chest.isHidden(),'same-day chest is consumed');
  await openWheel();await page.getByRole('button',{name:'Bộ sưu tập kho báu'}).click();
  assert(await page.locator('.dcl-living-dialog').isVisible());
  assert(await page.locator('.dcl-living-item').count()===1);
  assert.match(await page.locator('.dcl-living-disclaimer').innerText(),/Không liên quan XP/);
  await page.locator('.dcl-living-close').click();
  await page.evaluate(()=>{
   window.progress={...window.progress,level:1,xp:0};
   dispatchEvent(new CustomEvent('dolphin-my-progress-updated',{detail:window.progress}));
  });
  await openWheel();assert(await wheel.getByRole('button',{name:'Biểu diễn Bubble Parade'}).isVisible());
  assert.equal(await wheel.locator('[data-key="chest"]').getAttribute('aria-disabled'),'true');
  await page.keyboard.press('Escape');
  const equipped=await page.locator('#dolphinLandingCompanion').getAttribute('data-cosmetic');
  const reward=rules.drawReward(owner,today,9);
  if(reward.min>0)assert.equal(equipped,'','cosmetic is locked when Level falls');
  await page.evaluate(()=>{
   window.owner='DOL-9999';
   dispatchEvent(new Event('dolphin-staff-id-changed'));
  });
  assert(await stage.isHidden(),'account mismatch hides inventory and actions');
  await page.evaluate(()=>{
   window.progress={employeeId:'DOL-9999',level:10,xp:0};
   dispatchEvent(new CustomEvent('dolphin-my-progress-updated',{detail:window.progress}));
  });
  assert(await stage.isVisible());
  await openWheel();await page.getByRole('button',{name:'Bộ sưu tập kho báu'}).click();
  assert.match(await page.locator('.dcl-living-empty').innerText(),/Chưa có vật phẩm/,'other account has separate collection');
  await page.locator('.dcl-living-close').click();
  await page.evaluate(()=>document.getElementById('orderNotif').classList.add('show'));
  assert(await stage.isHidden(),'operational alert overrides entertainment');
  await page.evaluate(()=>document.getElementById('orderNotif').classList.remove('show'));
  assert(await stage.isVisible());
  await page.evaluate(()=>document.body.classList.add('app-mode'));
  assert(await stage.isHidden(),'subapps hide entertainment');
  await page.evaluate(()=>document.body.classList.remove('app-mode'));
  assert(await stage.isVisible());
  await page.evaluate(()=>document.documentElement.classList.remove('dolphin-access-allowed'));
  assert(await stage.isHidden(),'access revocation hides actions');

  // Independent, parked companion with real touch events and deterministic social/weather data.
  const friend=await context.newPage();
  friend.on('pageerror',error=>errors.push(error.message));
  const clock=new Date('2026-12-24T02:00:00Z'),stamp=+clock;
  await friend.clock.install({time:clock});await friend.emulateMedia({reducedMotion:'reduce'});
  let reads=0;
  await friend.route('https://raw.githubusercontent.com/**',route=>{
   reads++;
   return route.fulfill({json:{trends:{updated:stamp,items:[{title:'#OceanArt',source:'Mastodon',category:'art',url:'https://mastodon.social/tags/OceanArt'}]},
    weather:{updated:stamp,hours:[{at:stamp,temperature:17,wind:2,sky:'fair_day'}]}}});
  });
  await friend.goto(origin+'/index.html');
  await friend.evaluate(()=>{
   window.DolphinStaffId={get:()=>({employeeId:'DOL-0001',verified:true,name:'Lan'})};
   window.DolphinPrestige={getMine:()=>({employeeId:'DOL-0001',xp:15,level:10})};
   document.documentElement.classList.add('dolphin-access-allowed');
  });
  for(const file of ['companion','wardrobe','brief','wheel','play','landing','living'])
   await friend.addScriptTag({url:origin+'/crew-dolphin-'+file+'.js'});
  const flight=friend.locator('.dcl-flight'),menu=friend.locator('.dcl-wheel');
  await friend.clock.runFor(6000);
  const target=await flight.boundingBox(),finger=await context.newCDPSession(friend);
  const tap=async()=>{
   await finger.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:target.x+target.width/2,y:target.y+target.height/2}]});
   await finger.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  };
  await tap();await friend.clock.runFor(400);
  assert.match(await friend.locator('.dcl-bubble-text').textContent(),/nhột quá/);
  await tap();await friend.clock.runFor(90);await tap();
  await menu.waitFor({state:'visible'});
  await menu.getByRole('button',{name:'Hỏi thời tiết Hạ Long'}).click();
  await friend.waitForFunction(()=>document.querySelector('.dcl-bubble-text').textContent.includes('đủ ấm'));
  assert.equal(await friend.locator('.dcl-stage').getAttribute('data-outfit'),'christmas');
  await friend.clock.runFor(14000);
  await friend.clock.fastForward(300000);
  await friend.waitForFunction(()=>document.querySelector('.dcl-bubble-text').textContent.includes('#OceanArt'));
  assert.match(await friend.locator('.dcl-bubble-text').textContent(),/Lan ơi/);
  assert.equal(await friend.locator('.dcl-bubble-source').getAttribute('href'),'https://mastodon.social/tags/OceanArt');
  assert.equal(reads,1,'weather and conversations share one cached bulletin');
  await finger.detach();await friend.close();
  for(const [width,height] of [[320,568],[1280,800]]){
   await page.setViewportSize({width,height});await page.emulateMedia({reducedMotion:'reduce'});
   await page.evaluate(()=>document.documentElement.classList.add('dolphin-access-allowed'));
   await pet.focus();await page.keyboard.press('Enter');await wheel.waitFor({state:'visible'});
   const r=await wheel.boundingBox();
   assert(r.x>=0&&r.y>=0&&r.x+r.width<=width&&r.y+r.height<=height,'radial picker fits '+width);
   for(const icon of await wheel.locator('.dcl-wheel-item img').all())
    assert(await icon.evaluate(img=>img.complete&&img.naturalWidth>0),'wheel icon loaded at '+width);
   await page.keyboard.press('Escape');
  }
  const profile=await context.newPage();
  profile.on('pageerror',error=>errors.push(error.message));
  await profile.goto(origin+'/dolphin-profile.html');
  await profile.evaluate(id=>{
   window.owner=id;
   window.progress={employeeId:id,level:100,xp:24012450};
   window.DolphinStaffId={get:()=>window.owner?{employeeId:window.owner,verified:true,approved:true}:null};
   window.DolphinPrestige={getMine:()=>window.progress,call:()=>{throw Error('No profile pet XP writes')}};
   document.documentElement.classList.add('dolphin-access-allowed');
  },owner);
  await profile.addScriptTag({url:origin+'/crew-dolphin-companion.js'});
  await profile.addScriptTag({url:origin+'/crew-dolphin-living.js'});
  const profilePanel=profile.locator('.dcl-living-panel');
  assert(await profilePanel.isVisible(),'Profile interaction panel is visible');
  await profile.getByRole('button',{name:'Tạo dáng với Avatar'}).click();
  assert.equal(await profile.locator('.dolphin-pet-stage').getAttribute('data-avatar'),'true');
  assert(await profile.locator('.dcl-living-avatar-fx').isVisible());
  await profile.screenshot({path:path.join(output,'living-profile-avatar.png'),fullPage:true});
  await profile.waitForTimeout(3300);
  assert.equal(await profile.locator('.dolphin-pet-stage').getAttribute('data-avatar'),null);
  await profile.getByRole('button',{name:'Biểu diễn Eternal Ocean'}).click();
  assert(await profile.locator('.dcl-living-scene[data-skill="eternal"]').isVisible());
  await profile.evaluate(()=>{
   window.progress={...window.progress,level:20,xp:2000};
   dispatchEvent(new CustomEvent('dolphin-my-progress-updated',{detail:window.progress}));
  });
  assert.equal(await profile.locator('.dcl-living-scene').isHidden(),true,'Level deduction cancels Level 100 effect');
  assert.equal(await profile.locator('.dcl-living-panel .dcl-living-button').first().getAttribute('aria-label'),
   'Biểu diễn Coral Bloom (Level 20)');
  await profile.evaluate(()=>{window.owner=null;dispatchEvent(new Event('dolphin-staff-id-changed'));});
  assert(await profilePanel.isHidden(),'unlinked profile cannot interact');
  assert.deepEqual(errors,[],'no browser runtime errors');
  console.log('PASS Living Pet: Level-exclusive FX, local decorative treasure, account separation, avatar interaction, access gate, operations, and Level deductions.');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
