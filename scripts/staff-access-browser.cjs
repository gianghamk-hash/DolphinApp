'use strict';
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const script=fs.readFileSync(path.join(root,'staff-access.js'),'utf8');
const css=fs.readFileSync(path.join(root,'staff-access.css'),'utf8');
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  async function device(initial,pending=[]){
   const context=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block'});
   await context.route('**/*',route=>route.fulfill({
    status:200,contentType:'text/html',
    body:'<!DOCTYPE html><html><head><title>Staff Gate QA</title></head><body><div id="landing">HOME</div><div id="app-view"></div></body></html>'
   }));
   const page=await context.newPage();
   await page.goto('https://crew.test/staff-shell');
   await page.evaluate(({initial,pending})=>{
    window.__staff=initial;
    window.__pending=pending;
    window.__registered=null;
    window.openApp=()=>{window.__appOpened=true;};
    window.DolphinStaffId={
     ready:async()=>{},
     get:()=>window.__staff,
     refresh:async()=>window.__staff,
     register:async info=>{
      window.__registered=info;
      window.__staff={...info,employeeId:'DOL-ABCDEF1234',verified:false,linked:true,approved:false};
      return window.__staff;
     },
     correctName:async name=>{
      window.__staff={...window.__staff,name,requiresNameChange:false,nameIssue:''};
      return window.__staff;
     },
     link:async code=>{
      window.__staff={employeeId:'DOL-0002',name:'Existing Crew',avatar:'🐬',verified:true,linked:true};
      return window.__staff;
     },
     listPending:async()=>({profiles:window.__pending}),
     approveRegistration:async id=>{
      window.__pending=window.__pending.filter(p=>p.employeeId!==id);
      return {employeeId:id,approved:true};
     }
    };
   },{initial,pending});
   await page.addStyleTag({content:css});
   await page.addScriptTag({content:script});
   await page.waitForFunction(()=>!!window.DolphinStaffAccess);
   return {page,context};
  }

  const verified=await device({employeeId:'DOL-0002',name:'Existing Crew',avatar:'🐬',verified:true,linked:true});
  await verified.page.waitForFunction(()=>window.DolphinStaffAccess.isAllowed());
  assert.equal(await verified.page.locator('#dolphinAccessGate').isVisible(),false);
  assert.equal(await verified.page.evaluate(()=>document.documentElement.classList.contains('dolphin-access-allowed')),true);
  console.log('PASS: already approved device enters the landing automatically.');
  await verified.context.close();

  const fresh=await device(null);
  await fresh.page.locator('#dag-name').fill('New Employee');
  await fresh.page.getByRole('button',{name:'Chọn avatar 🐯'}).click();
  await fresh.page.locator('#dag-register-form button[type=submit]').click();
  await fresh.page.locator('[data-panel=pending]:not([hidden])').waitFor();
  const registration=await fresh.page.evaluate(()=>window.__registered);
  assert.deepEqual(registration,{name:'New Employee',avatar:'🐯'});
  assert.equal(await fresh.page.evaluate(()=>window.DolphinStaffAccess.isAllowed()),false);
  assert.equal(await fresh.page.locator('#dag-pending-id').textContent(),'DOL-ABCDEF1234');
  assert.equal(await fresh.page.locator('#dag-register-form [name=department]').count(),0);
  assert.equal(await fresh.page.locator('.dag-tabs').isVisible(),false,'Pending user cannot select register/recovery/link tabs');
  assert.equal(await fresh.page.locator('#dag-pending-name').isVisible(),true);
  assert.equal(await fresh.page.locator('[data-action=switch]').count(),0);
  await fresh.page.evaluate(()=>document.querySelector('[data-tab=register]').click());
  assert.equal(await fresh.page.locator('[data-panel=register]').isVisible(),false,'Scripted tab selection still blocked');
  await fresh.page.evaluate(()=>{
   window.__staff={...window.__staff,verified:true,approved:true};
   window.dispatchEvent(new CustomEvent('dolphin-staff-id-changed',{detail:window.__staff}));
  });
  await fresh.page.waitForFunction(()=>window.DolphinStaffAccess.isAllowed());
  console.log('PASS: pending cannot re-register/link/recover; approval alone unlocks landing.');

  console.log('PASS: new staff choose avatar, register without department and wait for manager.');
  await fresh.context.close();

  const old=await device({employeeId:'DOL-0011',name:'Test 1',verified:true,linked:true,
    requiresNameChange:true,nameIssue:'Tên nhân viên phải dài hơn 6 ký tự.',xp:98000,levelPeak:12});
  assert.equal(await old.page.evaluate(()=>window.DolphinStaffAccess.isAllowed()),false);
  assert.equal(await old.page.locator('[data-panel=rename]').isVisible(),true);
  assert.equal(await old.page.locator('.dag-tabs').isVisible(),false);
  await old.page.locator('#dag-rename-name').fill('Nguyễn Văn Hoàng');
  await old.page.locator('[data-action=rename]').click();
  await old.page.waitForFunction(()=>window.DolphinStaffAccess.isAllowed());
  const state=await old.page.evaluate(()=>window.__staff);
  assert.equal(state.employeeId,'DOL-0011');assert.equal(state.xp,98000);
  assert.equal(state.levelPeak,12);
  console.log('PASS: old invalid name must be corrected before landing without replacing Staff ID or XP.');
  await old.context.close();

  const linked=await device(null);
  await linked.page.locator('[data-tab=link]').click();
  await linked.page.locator('#dag-code').fill('A'.repeat(36));
  await linked.page.locator('#dag-link-form button[type=submit]').click();
  await linked.page.waitForFunction(()=>window.DolphinStaffAccess.isAllowed());
  assert.equal(await linked.page.locator('#dolphinAccessGate').isVisible(),false);
  console.log('PASS: new device enters automatically after an approved link code.');
  await linked.context.close();

  const admin=await device(
   {employeeId:'DOL-0001',name:'Owner Manager',verified:true,linked:true},
   [{employeeId:'DOL-ABCDEF1234',name:'New Employee',avatar:'🐯',createdAt:1}]
  );
  assert.equal(await admin.page.locator('#dolphinAccessManager').count(),0,
    'Manager approval must not float on the homepage');
  console.log('PASS: DOL-0001 manager approval control is removed from landing.');
  await admin.context.close();
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
