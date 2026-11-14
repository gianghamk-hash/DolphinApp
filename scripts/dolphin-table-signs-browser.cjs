'use strict';
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.TFT_CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
 try{
 const page=await browser.newPage({viewport:{width:360,height:780}});
 await page.route('**/*',r=>r.fulfill({body:'<button id="host">Guest list</button><div id="delayAlert">CÓ ĐƠN QUÁ 5 PHÚT</div>',contentType:'text/html'}));
 await page.goto('https://dolphin.test/dolphin-guests.html');
 await page.addScriptTag({path:require('node:path').join(__dirname,'../dolphin-table-signs.js')});
 const result=await page.evaluate(()=>{
  window.open=()=>{throw Error('Popup must not be used')};
  return DolphinGuestTableSigns.openPrint([{code:'DP1',name:'Giang',tbl:'E16'},{code:'DP2',name:'B',tbl:'A1'}]);
 });
 assert.equal(result.ok,true);
 const frame=page.frameLocator('iframe');
 await frame.locator('#count').waitFor();
 assert.equal(await frame.locator('#count').textContent(),'2 biển · 2 trang');
 await frame.locator('#none').click();assert.equal(await frame.locator('#print').isDisabled(),true);
 await frame.locator('input[data-area="E"]').check();
 assert.equal(await frame.locator('#count').textContent(),'1 biển · 1 trang');
 await frame.locator('#print').evaluate(el=>{window.print=()=>{window.printCalled=true};el.click()});
 await page.waitForFunction(()=>document.querySelector('iframe').contentWindow.printCalled);
 await page.getByRole('button',{name:'← Đóng bản xem trước'}).click();
 assert.equal(await page.locator('#host').count(),1);
 assert.equal(await page.locator('iframe').count(),0);
 assert.equal(await page.locator('body').evaluate(b=>b.style.overflow),'');
 console.log('PASS: mobile preview, area filters, print invocation, close and host preservation');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
