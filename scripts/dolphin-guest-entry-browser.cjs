'use strict';
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),html=fs.readFileSync(path.join(root,'dolphin-guests.html'),'utf8');
const part=(a,b)=>html.slice(html.indexOf(a),html.indexOf(b));
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  const page=await browser.newPage({viewport:{width:390,height:844}});
  await page.setContent('<style>'+html.match(/<style>([\s\S]*?)<\/style>/)[1]+'</style><button id="assignTables"></button><section id="unassignedBookings"></section><main id="out"></main><section id="noteTest"></section>');
  await page.addScriptTag({path:path.join(root,'dolphin-guest-table-input.js')});
  await page.evaluate(()=>{
   window.$=id=>document.getElementById(id);window.esc=s=>String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
   window.B=[{stt:'17',code:'DP4634118',name:'Khách thử nghiệm',agent:'Agent',pax:36,tbl:'',tb:[]},{stt:'18',code:'OTHER-BKK',name:'Khách khác',tb:['A15'],tbl:'A15'}];
   window.syncingSheets=false;window.status='ok';window.foundName='DOLPHIN 14.11';window.tour='am';
   window.load=async()=>{};window.toast=()=>{};window.saved=[];
   window.DolphinStaffId={assignGuestTable:async p=>{if(window.remoteConflict)throw Error('Bàn đã có booking khác.');window.saved.push(p);}};
  });
  await page.addScriptTag({content:part('function renderUnassigned(){','function updateMiniStats(){')+'\nrenderUnassigned();'});
  let dialogs=[];page.on('dialog',async dialog=>{dialogs.push(dialog.message());await dialog.accept();});
  await page.locator('input[name=table]').fill('A11-A16');await page.locator('form button').click();
  await page.waitForFunction(()=>document.querySelector('[role=status]').textContent.includes('BÀN ĐÃ BỊ TRÙNG'));
  assert.equal(dialogs.length,1);assert.match(dialogs[0],/A15 · BKK OTHER-BKK/);
  assert.equal(await page.evaluate(()=>saved.length),0);assert(await page.locator('form button').isEnabled());
  await page.locator('input[name=table]').fill('B1-B2');await page.locator('form button').click();
  assert.equal(await page.evaluate(()=>saved[0].table),'B1,B2');
  await page.evaluate(()=>{remoteConflict=true;renderUnassigned();});
  await page.locator('input[name=table]').fill('C1');await page.locator('form button').click();
  await page.waitForFunction(()=>document.querySelector('form button').disabled===false);
  assert.equal(dialogs.length,2);assert.match(dialogs[1],/booking khác/);
  await page.addScriptTag({content:part('var SPECIAL_CATEGORIES=[','function getPriority(b){')});
  const raw='FOC 01 HDV ăn như khách\nGhi chú chưa phân loại '+ 'nguyên văn '.repeat(30)+'<img src=x onerror=alert(1)>';
  await page.evaluate(raw=>{
   const b={dietNoteRaw:raw,noteRaw:raw+'\nKhông kayak/bamboo',diet:[],lob:[],specialFood:[],bung:[],showSlots:[]};
   document.getElementById('noteTest').innerHTML=tagHtml(b,false);
  },raw);
  assert.equal(await page.locator('#noteTest details').getAttribute('open'),null);
  assert.equal(await page.locator('#noteTest .special-source-text').isVisible(),false);
  await page.locator('#noteTest summary').click();
  assert(await page.locator('#noteTest .special-source-text').isVisible());
  assert.equal(await page.locator('#noteTest .special-source-text').textContent(),raw+'\nKhông kayak/bamboo');
  assert.equal(await page.locator('#noteTest img').count(),0);
  await page.locator('#noteTest summary').press('Enter');
  assert.equal(await page.locator('#noteTest .special-source-text').isVisible(),false);
  assert.equal(dialogs.length,2,'Note text must never execute HTML');
  console.log('PASS: mobile local/server duplicate popups, corrected save, complete notes, click/keyboard disclosure and escaping');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
