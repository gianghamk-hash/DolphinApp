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
     repairName:async name=>{window.__staff={...window.__staff,name,requiresNameChange:false,verified:true};return window.__staff;},
     register:async info=>{
      window.__registered=info;
      window.__staff={...info,employeeId:'DOL-ABCDEF1234',verified:false,linked:true,approved:false};
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
  assert.equal(await fresh.page.locator('[data-tab=register]').isVisible(),false);
  assert.equal(await fresh.page.locator('[data-tab=link]').isVisible(),false);
  assert.equal(await fresh.page.locator('[data-tab=recovery]').isVisible(),false);
  assert.equal(await fresh.page.locator('[data-action=switch]').count(),0);
  assert.equal(await fresh.page.locator('#dag-register-form [name=department]').count(),0);
  console.log('PASS: new staff choose avatar, register without department and wait for manager.');
  await fresh.context.close();

  const rename=await device({employeeId:'DOL-0007',name:'Minh',verified:false,approved:true,linked:true,requiresNameChange:true});
  await rename.page.locator('[data-panel=rename]:not([hidden])').waitFor();
  assert.equal(await rename.page.locator('[data-tab=register]').isVisible(),false);
  await rename.page.locator('#dag-rename-name').fill('Nguyen Van Minh');
  await rename.page.locator('#dag-rename-form button[type=submit]').click();
  await rename.page.waitForFunction(()=>window.DolphinStaffAccess.isAllowed());
  assert.equal(await rename.page.evaluate(()=>window.__staff.employeeId),'DOL-0007');
  console.log('PASS: legacy invalid name is repaired without replacing Staff ID.');
  await rename.context.close();

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
