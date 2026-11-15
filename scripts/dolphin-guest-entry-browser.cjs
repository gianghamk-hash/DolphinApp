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
  await page.addScriptTag({path:path.join(root,'dolphin-guest-note-summary.js')});
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
  assert.equal(await page.locator('#noteTest .special-source-text').textContent(),raw);
  assert.equal(await page.locator('#noteTest img').count(),0);
  assert.equal(await page.locator('#noteTest .special-compact').count(),0,'No generic F&B heading');
  await page.evaluate(async raw=>{
   DolphinStaffId.summarizeGuestNotes=async notes=>({summaries:notes.map((n,id)=>({id,summaryScope:'services-v2',text:'Yêu cầu phục vụ đã tóm tắt',classification:{items:[],needsReview:false}}))});
   await DolphinGuestNoteSummary.ensure([{dietNoteRaw:raw,noteRaw:raw+'\nKhông kayak/bamboo'}]);
  },raw);
  assert.equal(await page.locator('#noteTest summary span').textContent(),'Yêu cầu phục vụ đã tóm tắt');
  assert(await page.locator('#noteTest .special-source-text').isVisible(),'AI update must not close an open note');
  assert.equal(await page.locator('#noteTest .special-source-text').textContent(),raw);
  await page.locator('#noteTest summary').press('Enter');
  assert.equal(await page.locator('#noteTest .special-source-text').isVisible(),false);
  assert.equal(dialogs.length,2,'Note text must never execute HTML');
  const classified=await page.evaluate(async()=>{
   const note='Không ăn tôm hùm; đặt 2 bungalow; hủy lounge';
   const b=DolphinGuestNoteSummary.prepare({dietNoteRaw:note,lob:['old keyword hit'],bung:[],showSlots:[]});
   DolphinStaffId.summarizeGuestNotes=async()=>({summaries:[{id:0,text:note,classification:{needsReview:false,items:[
    {category:'diet-note',state:'confirmed',evidence:'Không ăn tôm hùm',quantity:0,room:''},
    {category:'bungalow',state:'confirmed',evidence:'đặt 2 bungalow',quantity:2,room:''},
    {category:'lounge',state:'excluded',evidence:'hủy lounge',quantity:0,room:''}
   ]}}]});
   await DolphinGuestNoteSummary.ensure([b]);
   return {keys:specialCategoryKeys(b),bung:b.bung.length,lob:b.lob.length,lounge:b.loungeTicket};
  });
  assert.deepEqual(classified,{keys:[],bung:1,lob:0,lounge:null});
  await page.addScriptTag({path:path.join(root,'dolphin-country-data.js')});
  await page.addScriptTag({path:path.join(root,'dolphin-guest-flags.js')});
  await page.route('https://flags.test/assets/flags/**',route=>route.fulfill({contentType:'image/svg+xml',body:fs.readFileSync(path.join(root,'assets/flags',path.basename(route.request().url())))}));
  await page.evaluate(()=>{
   const base=document.createElement('base');base.href='https://flags.test/';document.head.appendChild(base);
   document.getElementById('noteTest').innerHTML=DolphinGuestFlags.html('Đài Loan + Việt Nam');
  });
  await page.waitForFunction(()=>Array.from(document.querySelectorAll('.guest-flag')).every(i=>i.complete&&i.naturalWidth>0));
  assert.equal(await page.locator('.guest-flag').count(),2);
  const flagBox=await page.locator('.guest-flag').first().boundingBox();assert.equal(flagBox.width,18);assert.equal(flagBox.height,14);
  assert.equal(await page.locator('.guest-flag').first().getAttribute('alt'),'Cờ Đài Loan');
  await page.addScriptTag({content:part('function nationalitySummary(A){','function viewOverview(L){')});
  await page.evaluate(()=>document.getElementById('noteTest').innerHTML=nationalitySummary({nationalities:{'Ả RẬP XÊ ÚT':2,'VIỆT NAM':6,'ĐÀI LOAN':1}}));
  await page.waitForFunction(()=>Array.from(document.querySelectorAll('.guest-flag')).every(i=>i.complete&&i.naturalWidth>0));
  assert.equal(await page.locator('.nationality-summary img').count(),3);
  assert.equal(await page.locator('.nationality-summary img[src$="sa.svg"]').count(),1);
  assert.deepEqual((await page.locator('.nationality-summary dd').allTextContents()).sort(),['01','02','06']);
  await page.addScriptTag({path:path.join(root,'dolphin-guest-audit.js')});
  await page.evaluate(()=>DolphinGuestAudit.open([{code:'AUDIT-BKK',stt:'5',name:'Test',paxRaw:'bad',tbl:'',tb:[],dietNoteRaw:'<script>bad</script>'}],'15/11 · Sáng',b=>window.auditSelected=b.code));
  assert(await page.locator('dialog').isVisible());
  await page.locator('dialog details summary').first().click();
  await page.locator('dialog details button').first().click();
  assert.equal(await page.evaluate(()=>window.auditSelected),'AUDIT-BKK');
  assert.equal(await page.locator('dialog').isVisible(),false);
  await page.addScriptTag({content:part('function serviceReview(L,group){','function loungeView(L){')});
  await page.evaluate(async()=>{
   window.card=b=>'<article>'+esc(b.code)+'</article>';
   window.recoveryBooking=DolphinGuestNoteSummary.prepare({code:'DP4634122',dietNoteRaw:'- bungalow 401, phụ thu 2tr trên tàu <img src=x onerror=alert(1)>'});
   DolphinStaffId.summarizeGuestNotes=async()=>{throw Error('offline');};
   await DolphinGuestNoteSummary.ensure([recoveryBooking]);
   document.getElementById('noteTest').innerHTML=serviceReview([recoveryBooking],'bungalow');
  });
  assert.match(await page.locator('#noteTest').textContent(),/DP4634122/);
  assert.match(await page.locator('#noteTest h3').textContent(),/Cần kiểm tra/);
  assert.equal(await page.locator('#noteTest [data-push]').count(),0);
  assert.equal(await page.locator('#noteTest img').count(),0);
  await page.locator('#noteTest summary').click();
  assert(await page.locator('#noteTest .slot-note').isVisible());
  await page.evaluate(async()=>{
   DolphinStaffId.summarizeGuestNotes=async()=>({summaries:[{id:0,text:'Bungalow (P.401)',summaryScope:'services-v2',classification:{needsReview:false,items:[{category:'bungalow',state:'confirmed',quantity:0,room:'401',evidence:recoveryBooking.dietNoteRaw}]}}]});
   await DolphinGuestNoteSummary.retry();
   document.getElementById('noteTest').innerHTML=serviceReview([recoveryBooking],'bungalow');
  });
  assert.equal(await page.locator('#noteTest .service-review').count(),0);
  assert.equal(await page.evaluate(()=>recoveryBooking.bung[0].num),'401');
  console.log('PASS: mobile local/server duplicate popups, corrected save, complete notes, click/keyboard disclosure and escaping');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
