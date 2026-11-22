'use strict';
const {chromium}=require('playwright'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),origin='http://127.0.0.1:8891';
const output=process.env.COMPANION_QA_OUTPUT||path.join(root,'reports/companion-preview');
fs.mkdirSync(output,{recursive:true});
const index=fs.readFileSync(path.join(root,'index.html'),'utf8')
 .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 try{
  const context=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block',reducedMotion:'no-preference'});
  await context.route('**/*',route=>{
   const u=new URL(route.request().url());
   if(u.origin!==origin)return route.abort();
   if(u.pathname==='/index.html'||u.pathname==='/')return route.fulfill({contentType:'text/html; charset=utf-8',body:index});
   const file=path.resolve(root,'.'+u.pathname);
   if(!file.startsWith(root+path.sep)||!fs.existsSync(file))return route.fulfill({status:404,body:''});
   const type={'.css':'text/css','.js':'application/javascript','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.glb':'model/gltf-binary'}[path.extname(file)]||'text/plain';
   return route.fulfill({contentType:type,body:fs.readFileSync(file)});
  });
  const page=await context.newPage(),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.goto(origin+'/index.html');
  await page.evaluate(()=>{
   window.owner='DOL-0001';
   window.progress={employeeId:owner,level:100,xp:24012450,dailyMissions:{date:new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Ho_Chi_Minh',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()),tasks:[{id:'checkin',done:true}]}};
   window.DolphinStaffId={get:()=>owner?{employeeId:owner,verified:true,name:'Nhân viên thử nghiệm'}:null};
   window.DolphinPrestige={getMine:()=>progress,call:()=>{throw Error('Landing must not write XP or mission state')}};
   document.documentElement.classList.remove('dolphin-access-pending');
   document.documentElement.classList.add('dolphin-access-allowed');
  });
  await page.addScriptTag({url:origin+'/crew-dolphin-companion.js'});
  await page.addScriptTag({url:origin+'/crew-dolphin-landing.js'});
  const pet=page.locator('.dcl-flight'),stage=page.locator('#dolphinLandingCompanion');
  assert(await stage.isVisible(),'verified staff gets a visible companion');
  assert.equal(await stage.getAttribute('data-form'),'9','Level 100 uses Eternal Dolphin');
  const asset=await page.evaluate(()=>new Promise(resolve=>{
   const image=new Image();image.onload=()=>resolve([image.naturalWidth,image.naturalHeight]);
   image.onerror=()=>resolve(null);image.src='assets/dolphin-companions-v1.png';
  }));
  assert(asset&&asset[0]>1000&&asset[1]>500,'reuse actual 10-form raster atlas');
  const sprite=pet.locator('.dcl-sprite');
  const imageCSS=await sprite.evaluate(el=>getComputedStyle(el).backgroundImage);
  assert(imageCSS.includes('eternal-dolphin-swim-v3.png'),'Level 100 uses the corrected 2D fallback');
  const milestones=[1,10,20,30,40,50,60,70,90];
  for(let form=0;form<milestones.length;form++){
   await stage.evaluate((node,index)=>node.dataset.form=String(index),form);
   const formImage=await sprite.evaluate(el=>getComputedStyle(el).backgroundImage);
   assert(formImage.includes('dolphin-level-'+milestones[form]+'.png'),'Level '+milestones[form]+' uses its own image asset');
  }
  await stage.evaluate(node=>node.dataset.form='9');
  assert.equal(await sprite.evaluate(el=>getComputedStyle(el).animationName),'dcl-eternal-swim','Level 100 runs the frame animation');
  const swim=await page.evaluate(()=>new Promise(resolve=>{
   const image=new Image();image.onload=()=>resolve([image.naturalWidth,image.naturalHeight]);
   image.onerror=()=>resolve(null);image.src='assets/eternal-dolphin-swim-v3.png';
  }));
  assert.deepEqual(swim,[516,172],'swim frames preserve their fixed 3:1 sheet proportions');
  const positions=await sprite.evaluate(el=>{
   const animation=el.getAnimations().find(a=>a.animationName==='dcl-eternal-swim');
   animation.pause();
   const positions=[5,175,185,355,365,535,545,715].map(ms=>{
    animation.currentTime=ms;
    return Number.parseFloat(getComputedStyle(el).backgroundPositionX);
   });
   animation.play();
   return positions;
  });
  for(const [index,value] of positions.entries()){
   assert(Math.abs(value-Math.floor(index/2)*100/3)<.001,'hold an exact cell start for the full frame');
  }
  const model=pet.locator('canvas.dcl-model');
  await model.waitFor({state:'visible'});
  assert.equal(await model.getAttribute('data-level'),'100','landing loads the rig for the current form');
  assert.equal(await sprite.evaluate(el=>getComputedStyle(el).visibility),'hidden','3D hides the 2D fallback');
  const rendered=await page.evaluate(async()=>{
   const {createDolphinModel}=await import('/crew-dolphin-landing-3d.js?v=rig-v1');
   const host=document.createElement('span');
   const model=await createDolphinModel(host);
   const canvas=host.querySelector('canvas');
   const gl=canvas.getContext('webgl2');
   const results=[];
   function pose(now){
    model.draw({now,size:64,facing:-1,dx:-1,dy:0});
    const pixels=new Uint8Array(canvas.width*canvas.height*4);
    gl.readPixels(0,0,canvas.width,canvas.height,gl.RGBA,gl.UNSIGNED_BYTE,pixels);
    const alpha=pixels.filter((_,index)=>index%4===3);
    let checksum=0;
    for(let i=0;i<pixels.length;i++) checksum=(checksum*31+pixels[i])>>>0;
    return {transparent:alpha[0]===0,drawn:alpha.some(value=>value>0),checksum};
   }
   for(let form=0;form<10;form++){
    model.setForm(form);
    model.pause();
    results.push({level:Number(canvas.dataset.level),...pose(form*100)});
   }
   return {results,animated:pose(950).checksum!==pose(1000).checksum};
  });
  assert.deepEqual(rendered.results.map(x=>x.level),[...milestones,100]);
  assert(rendered.results.every(x=>x.transparent&&x.drawn),'every form renders on a transparent canvas');
  assert.equal(new Set(rendered.results.map(x=>x.checksum)).size,10,'all ten forms look different');
  assert(rendered.animated,'the rig changes rendered pixels while the viewport and facing stay fixed');
  for(const width of [320,390,768,1280]){
   await page.setViewportSize({width,height:860});
   await page.waitForTimeout(100);
   assert(await stage.isVisible());
   const p=await pet.boundingBox();
   assert(p&&p.x>=-1&&p.x+p.width<=width+1,'pet stays in viewport at '+width);
   const logo=await page.locator('#landing .logo-img').boundingBox();
   assert(logo&&(p.x+p.width<=logo.x||p.x>=logo.x+logo.width||p.y+p.height<=logo.y||p.y>=logo.y+logo.height),'pet stays clear of logo at '+width);
   assert(!(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)),'no horizontal overflow at '+width);
   if(width===390||width===1280)await page.screenshot({path:path.join(output,'landing-level100-'+width+'.png'),fullPage:true});
  }
  await page.setViewportSize({width:390,height:844});
  await page.waitForTimeout(720);
  assert((await page.locator('.dcl-bubble-text').innerText()).length>10,'time-aware greeting appears');
  for(let i=0;i<5;i++)await pet.evaluate(el=>el.click());
  assert.match(await page.locator('.dcl-bubble-text').innerText(),/Bí mật Eternal Dolphin/,'high-level secret reaction');
  assert.equal(await pet.getAttribute('data-reaction'),'secret');
  await page.evaluate(()=>{
   progress={...progress,level:60,xp:8450000};
   dispatchEvent(new CustomEvent('dolphin-my-progress-updated',{detail:progress}));
  });
  assert.equal(await stage.getAttribute('data-form'),'6','Level deduction selects lower form');
  assert.equal(await model.getAttribute('data-level'),'60','3D form tracks a level decrease');
  assert.equal(await pet.getAttribute('data-reaction'),null,'deduction cancels cinematics');
  assert((await sprite.evaluate(el=>getComputedStyle(el).backgroundImage)).includes('dolphin-level-60.png'),'lower levels use their own image asset');
  await page.evaluate(()=>{
   progress={...progress,level:70,xp:11800000};
   dispatchEvent(new CustomEvent('dolphin-my-progress-updated',{detail:progress}));
  });
  await page.waitForTimeout(300);
  assert.equal(await stage.getAttribute('data-form'),'7');
  assert.equal(await model.getAttribute('data-level'),'70','3D form tracks a level increase');
  assert.match(await page.locator('.dcl-bubble-text').innerText(),/Tiến hóa thành Cosmic Dolphin/);
  await page.evaluate(()=>{document.getElementById('orderNotif').classList.add('show');});
  assert(await stage.isHidden(),'urgent operational order alert has priority');
  await page.evaluate(()=>{document.getElementById('orderNotif').classList.remove('show');});
  assert(await stage.isVisible());
  await page.evaluate(()=>document.body.classList.add('app-mode'));
  assert(await stage.isHidden(),'landing companion does not cover subapps');
  await page.evaluate(()=>document.body.classList.remove('app-mode'));
  assert(await stage.isVisible());
  await page.evaluate(()=>{
   owner='DOL-0002';dispatchEvent(new Event('dolphin-staff-id-changed'));
  });
  assert(await stage.isHidden(),'switching ID must not show previous staff pet');
  await page.evaluate(()=>{
   progress={employeeId:owner,level:1,xp:0};
   dispatchEvent(new CustomEvent('dolphin-my-progress-updated',{detail:progress}));
  });
  assert(await stage.isVisible());
  assert.equal(await stage.getAttribute('data-form'),'0');
  await model.waitFor({state:'visible'});
  const contextLost=await model.evaluate(canvas=>{
   const extension=canvas.getContext('webgl2').getExtension('WEBGL_lose_context');
   extension?.loseContext();
   return !!extension;
  });
  if(contextLost){
   await model.waitFor({state:'hidden'});
   assert.equal(await sprite.evaluate(el=>getComputedStyle(el).visibility),'visible','a lost WebGL context restores the PNG fallback');
  }
  await page.evaluate(()=>document.documentElement.classList.remove('dolphin-access-allowed'));
  assert(await stage.isHidden(),'access gate blocks companion');
  await page.evaluate(()=>document.documentElement.classList.add('dolphin-access-allowed'));
  assert(await stage.isVisible());
  await page.emulateMedia({reducedMotion:'reduce'});
  assert(await model.isHidden(),'reduced motion uses a static fallback instead of rendering the rig');
  assert.equal(await sprite.evaluate(el=>getComputedStyle(el).visibility),'visible');
  await page.waitForTimeout(180);
  const before=await pet.boundingBox();
  await page.waitForTimeout(240);
  const after=await pet.boundingBox();
  assert(Math.hypot(before.x-after.x,before.y-after.y)<1,'reduced-motion freezes flight');
  await page.evaluate(()=>{owner=null;dispatchEvent(new Event('dolphin-staff-id-changed'));});
  assert(await stage.isHidden());
  assert.deepEqual(errors,[],'no runtime errors');
  console.log('PASS: atlas/10 forms, responsive flight, secret petting, level evolution/loss, alerts, navigation, access gate, account isolation and reduced motion.');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
