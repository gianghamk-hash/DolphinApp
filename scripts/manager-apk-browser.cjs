'use strict';
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8');
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  for(const ua of ['DolphinManager/1.0','DolphinStaff/1.0','Mozilla/5.0']){
   const context=await browser.newContext({userAgent:ua,viewport:{width:390,height:844}}),page=await context.newPage(),errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   await page.route('**/*',r=>r.fulfill({status:200,contentType:'text/html',body:read('dolphin-profile.html').replace(/<script\b[^>]*>[\s\S]*?<\/script>/g,'').replace(/<link\b[^>]*>/g,'')}));
   await page.goto('https://manager.test/dolphin-profile.html');
   await page.addStyleTag({content:read('staff-profile.css')});
   await page.evaluate(()=>{
    window.__me={employeeId:'DOL-0001',name:'Nguyễn Quản Lý',verified:true,linked:true,managerSession:/DolphinManager/.test(navigator.userAgent),avatar:'🐬'};
    window.__renames=[];window.__updates=0;
    window.DolphinStaffId={get:()=>window.__me,ready:async()=>{},listPending:async()=>({profiles:[]}),listRecoveryRequests:async()=>({requests:[]}),
     listApproved:async()=>({profiles:[{employeeId:'DOL-0002',name:'Nguyễn Nhân Viên'}]}),
     renameManager:async name=>{window.__renames.push(name);window.__me.name=name;},update:async()=>{window.__updates++;},
     issueLink:async()=>({code:'A'.repeat(36),expiresInMinutes:10}),link:async()=>{}};
   });
   for(const f of ['staff-profile.js','staff-admin-profile.js','manager-apk-profile.js'])await page.addScriptTag({content:read(f)});
   const manager=ua.includes('DolphinManager');
   assert.equal(await page.locator('#staff-daily-card').isVisible(),!manager);
   await page.locator('.quick-actions [data-open-dialog="profile-edit-dialog"]').click();
   assert.equal(await page.locator('#profile-name-input').isEnabled(),manager);
   if(manager){
    await page.locator('#profile-name-input').fill('Nguyễn Quản Lý Mới');await page.locator('#save-profile').click();
    assert.deepEqual(await page.evaluate(()=>window.__renames),['Nguyễn Quản Lý Mới']);
    assert.equal(await page.evaluate(()=>window.__updates),0,'rename and avatar use one request, avoiding the profile throttle');
    await page.getByText('Danh bạ đã phê duyệt',{exact:true}).click();await page.getByText('🐬 Nguyễn Nhân Viên · DOL-0002',{exact:true}).waitFor();
    await page.locator('#manager-directory-search').fill('không có');assert.equal(await page.locator('.manager-directory-person').count(),0);
    await page.getByRole('button',{name:'Đóng danh bạ',exact:true}).click();
    await page.getByText('Khôi phục tài khoản / thiết bị',{exact:true}).click();assert.equal(await page.locator('#crew-approval-dialog').isVisible(),true);
    await page.locator('#crew-approval-close').click();
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    if(process.env.MANAGER_QA_OUTPUT){await page.screenshot({path:process.env.MANAGER_QA_OUTPUT,fullPage:true});}
    await page.evaluate(()=>{window.__me=null;dispatchEvent(new CustomEvent('dolphin-staff-id-changed',{detail:null}));});
    assert.equal(await page.locator('html').evaluate(el=>el.classList.contains('manager-owner-verified')),false);
   }else{await page.locator('#profile-edit-dialog [data-close-dialog]').click();assert.equal(await page.locator('.manager-action-grid').count(),0);}
   assert.deepEqual(errors,[]);await context.close();
  }
  // A verified normal staff record must still fail the Manager gate.
  const context=await browser.newContext({userAgent:'DolphinManager/1.0'}),page=await context.newPage();
  await page.route('**/*',r=>r.fulfill({status:200,contentType:'text/html',body:'<!doctype html><html><body></body></html>'}));
  await page.goto('https://manager.test/');
  await page.evaluate(()=>{window.DolphinStaffId={ready:async()=>{},get:()=>({employeeId:'DOL-0002',verified:true,approved:true}),refresh:async()=>null};});
  await page.addScriptTag({content:read('staff-access.js')});
  assert.equal(await page.evaluate(()=>DolphinStaffAccess.isAllowed()),false);
  assert.equal(await page.locator('[data-panel=link]').isVisible(),true);
  assert.equal(await page.locator('[data-tab=register]').isVisible(),false);
  await context.close();
  console.log('Manager, Staff, web, rename, directory, recovery and denied-session browser checks passed');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
