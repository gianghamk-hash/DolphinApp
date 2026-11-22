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
  for(const script of ['crew-dolphin-companion.js','crew-dolphin-play.js','crew-dolphin-landing.js','crew-dolphin-living.js'])
   await page.addScriptTag({url:origin+'/'+script});
  const panel=page.locator('.dcl-living-landing');
  assert(await panel.isVisible(),'Landing control bar visible only for verified staff');
  const play=page.getByRole('button',{name:'Chuyền bóng nước',exact:true});
  const stage=page.locator('#dolphinLandingCompanion'), ball=stage.locator('.dcl-water-ball');
  const phase=value=>page.waitForFunction(p=>document.querySelector('#dolphinLandingCompanion').dataset.play===p,value,{timeout:5000});
  await play.click();
  await phase('ready');
  for(let pass=1;pass<=3;pass++){
   assert.equal(await ball.getAttribute('data-hits'),String(pass-1));
   await ball.click();
   await phase(pass===3?'finale':'ready');
  }
  assert(await stage.locator('.dcl-signature').isVisible(),'third return draws the signature');
  await page.waitForTimeout(1150);
  await page.screenshot({path:path.join(output,'living-eternal-constellation.png')});
  await page.evaluate(()=>document.getElementById('orderNotif').classList.add('show'));
  assert(await ball.isHidden() && await stage.locator('.dcl-signature').isHidden(),'urgent alerts stop play');
  await page.evaluate(()=>document.getElementById('orderNotif').classList.remove('show'));
  await page.emulateMedia({reducedMotion:'reduce'});
  await play.click();
  await phase('ready');
  for(let i=0;i<3;i++)await page.keyboard.press('Enter');
  await phase('finale');
  assert.equal(await play.evaluate(el=>el===document.activeElement),true,'keyboard focus returns to the game launcher');
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.getByRole('button',{name:'Biểu diễn Eternal Ocean'}).click();
  assert(await page.locator('.dcl-living-scene[data-skill="eternal"]').isVisible());
  assert.match(await panel.locator('.dcl-living-status').innerText(),/Eternal Ocean/);
  await page.screenshot({path:path.join(output,'living-landing-eternal.png'),fullPage:true});
  await page.waitForTimeout(9000);
  const chest=page.getByRole('button',{name:'🎁 Mở rương bí mật'});
  assert(await chest.isVisible(),'available one-per-day treasure is offered on Landing');
  await chest.click();
  const stored=await page.evaluate(id=>JSON.parse(localStorage.getItem('dolphin-companion-cosmetics-v1:'+id)),owner);
  assert.equal(stored.openedDay,today);
  assert.equal(stored.items.length,1);
  assert.equal(stored.items[0],rules.drawReward(owner,today,9).id);
  assert(await chest.isHidden(),'same-day chest is consumed');
  await page.getByRole('button',{name:'Bộ sưu tập kho báu'}).click();
  assert(await page.locator('.dcl-living-dialog').isVisible());
  assert(await page.locator('.dcl-living-item').count()===1);
  assert.match(await page.locator('.dcl-living-disclaimer').innerText(),/Không liên quan XP/);
  await page.locator('.dcl-living-close').click();
  await page.evaluate(()=>{
   window.progress={...window.progress,level:1,xp:0};
   dispatchEvent(new CustomEvent('dolphin-my-progress-updated',{detail:window.progress}));
  });
  assert.equal(await page.locator('.dcl-living-landing .dcl-living-button').first().getAttribute('aria-label'),
   'Biểu diễn Bubble Parade (Level 1)');
  const equipped=await page.locator('#dolphinLandingCompanion').getAttribute('data-cosmetic');
  const reward=rules.drawReward(owner,today,9);
  if(reward.min>0)assert.equal(equipped,'','cosmetic is locked when Level falls');
  await page.evaluate(()=>{
   window.owner='DOL-9999';
   dispatchEvent(new Event('dolphin-staff-id-changed'));
  });
  assert(await panel.isHidden(),'account mismatch hides inventory and actions');
  await page.evaluate(()=>{
   window.progress={employeeId:'DOL-9999',level:10,xp:0};
   dispatchEvent(new CustomEvent('dolphin-my-progress-updated',{detail:window.progress}));
  });
  assert(await panel.isVisible());
  await page.getByRole('button',{name:'Bộ sưu tập kho báu'}).click();
  assert.match(await page.locator('.dcl-living-empty').innerText(),/Chưa có vật phẩm/,'other account has separate collection');
  await page.locator('.dcl-living-close').click();
  await page.evaluate(()=>document.getElementById('orderNotif').classList.add('show'));
  assert(await panel.isHidden(),'operational alert overrides entertainment');
  await page.evaluate(()=>document.getElementById('orderNotif').classList.remove('show'));
  assert(await panel.isVisible());
  await page.evaluate(()=>document.body.classList.add('app-mode'));
  assert(await panel.isHidden(),'subapps hide entertainment');
  await page.evaluate(()=>document.body.classList.remove('app-mode'));
  assert(await panel.isVisible());
  await page.evaluate(()=>document.documentElement.classList.remove('dolphin-access-allowed'));
  assert(await panel.isHidden(),'access revocation hides actions');

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
