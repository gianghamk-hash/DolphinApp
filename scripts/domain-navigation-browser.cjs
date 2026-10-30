/* Browser acceptance for custom-domain root and legacy subdirectory; no external services or writes. */
'use strict';
const {chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),origin='http://127.0.0.1:8765';
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.TFT_CHROMIUM_PATH,args:['--no-sandbox']});
 try{
 for(const prefix of ['', '/DolphinApp']){
  const context=await browser.newContext({serviceWorkers:'block',viewport:{width:390,height:740}}),base=origin+prefix+'/';
  await context.addInitScript(()=>{localStorage.setItem('dolphinStaffName','Navigation Tester');localStorage.setItem('dolphinHomeBtnHidden','1');localStorage.setItem('dolphinHomeBtnPos',JSON.stringify({x:9999,y:9999}));});
  await context.route('**/*',async route=>{
   const url=new URL(route.request().url());
   if(url.origin===origin){
    let target=path.join(root,decodeURIComponent(url.pathname.slice(prefix.length+1)));
    if(!target.startsWith(root+path.sep)&&target!==root)return route.abort();
    if(fs.existsSync(target)&&fs.statSync(target).isDirectory())target=path.join(target,'index.html');
    if(!fs.existsSync(target))return route.fulfill({status:404,body:'Missing local asset'});
    const ext=path.extname(target),types={'.html':'text/html; charset=utf-8','.js':'application/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.svg':'image/svg+xml'};
    return route.fulfill({path:target,contentType:types[ext]||'application/octet-stream'});
   }
   if(url.hostname==='cdn.tailwindcss.com')return route.fulfill({path:path.join(process.env.TFT_ASSET_CACHE,'tailwind.js'),contentType:'application/javascript'});
   return route.abort();
  });
  const page=await context.newPage();
  await page.goto(base+'index.html#giaitri');await page.waitForFunction(()=>document.body.classList.contains('app-mode'));
  await page.waitForTimeout(1500);
  const button=page.locator('#btn-home');await button.waitFor({state:'visible'});
  const box=await button.boundingBox();assert.ok(box.width>=44&&box.x>=0&&box.y>=0&&box.x+box.width<=390&&box.y+box.height<=740);
  await button.click();await page.waitForFunction(()=>!document.getElementById('home-controls').classList.contains('minimized'));
  assert.ok(await page.locator('#app-view').isVisible(),'first click restores button without leaving');
  await button.click();await page.waitForFunction(()=>!document.body.classList.contains('app-mode'));
  console.log(prefix||'root','shell: restored minimized/offscreen button, then returned home');
  // Restricted home-button storage must not prevent the app logic from initializing.
  await page.addInitScript(()=>{const original=Storage.prototype.getItem;Storage.prototype.getItem=function(key){if(key==='dolphinHomeBtnHidden')throw Error('storage denied');return original.call(this,key);};});
  await page.goto(base+'index.html?storage=denied#giaitri');await page.waitForFunction(()=>document.body.classList.contains('app-mode'));
  await page.waitForTimeout(1300);assert.equal(await page.evaluate(()=>typeof openApp),'function');
  await page.locator('#btn-home').click();await page.waitForFunction(()=>!document.body.classList.contains('app-mode'));
  console.log(prefix||'root','shell: home controls still initialize when storage is denied');
  // Standalone section pages get a visible floating Back action.
  for(const file of ['dolphin-bungalow.html','dolphin-lounge.html','dolphin-restaurant.html','dolphin-show.html','dolphin-guests.html','giaitri/index.html','manager/dashboard.html','ranking/index.html','caro/index.html']){
   await page.goto(base+file);await page.getByRole('button',{name:'Quay lại trang chủ',exact:true}).waitFor({state:'visible'});
   await page.locator('#dolphinBackAction').click();await page.waitForURL(base);
  }
  console.log(prefix||'root','all 9 standalone section pages: visible and working Back action');
  // Embedded games go back through their hub, preserving the outer shell.
  await page.goto(base+'giaitri/index.html');await page.evaluate(()=>openGame('snake'));
  const frame=page.frameLocator('#gameFrame');await page.waitForFunction(()=>!!document.getElementById('gameFrame').contentWindow.DolphinNavigation);
  await frame.locator('body').evaluate(()=>window.DolphinNavigation.back());
  await page.waitForFunction(()=>document.getElementById('gameFrame').getAttribute('src')==='about:blank');
  assert.equal(page.url(),base+'giaitri/index.html');
  console.log(prefix||'root','nested game Back closes game in its hub');
  await context.close();
 }
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
