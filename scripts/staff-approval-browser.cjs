'use strict';
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'..','staff-admin-profile.js'),'utf8');
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  const context=await browser.newContext({viewport:{width:390,height:844}});
  const page=await context.newPage();
  page.on('dialog',d=>d.accept());
  await page.goto('about:blank');
  await page.setContent('<!DOCTYPE html><html><body>'+
  '<section id="crew-manager-approvals" hidden>'+
  '<span id="crew-approval-count"></span><p id="crew-manager-feedback"></p>'+
  '<div id="crew-manager-access-status" hidden><span id="crew-manager-access-message"></span>'+
  '<p id="crew-manager-auth-diagnostic"></p><button id="crew-manager-verify-retry">Kiểm tra lại</button></div>'+
  '<button id="crew-manager-link-open">Liên kết lại</button>'+
  '<button id="crew-manager-copy-uid">Sao chép UID</button>'+
  '<button id="crew-approved-open">Đã duyệt</button><span id="crew-approved-count"></span>'+
  '<button id="crew-recovery-open">Khôi phục</button><span id="crew-recovery-count"></span>'+
  '<button id="crew-approval-open"><span id="crew-approval-open-label">Duyệt nhân viên</span><span id="crew-approval-badge" hidden>🔴</span></button>'+
  '<span id="crew-pending-description"></span><input type="checkbox" id="crew-manager-ranking-toggle"></section>'+
  '<dialog id="crew-approved-dialog"><button id="crew-approved-close">Đóng</button>'+
  '<input id="crew-approved-search"><select id="crew-approved-sort"><option value="name">Tên</option></select>'+
  '<p id="crew-approved-summary"></p><div id="crew-approved-list"></div>'+
  '<button id="crew-approved-refresh">Làm mới</button></dialog>'+
  '<dialog id="devices-dialog"><input id="claim-code"></dialog>'+
  '<dialog id="crew-approval-dialog"><div id="crew-approval-list"></div>'+
  '<section id="crew-recovery-section"><div id="crew-recovery-list"></div>'+
  '<div id="crew-recovery-code"></div><button id="crew-recovery-copy"></button></section>'+
  '<p id="crew-approval-dialog-status"></p><button id="crew-approval-refresh">Làm mới</button>'+
  '<button id="crew-approval-close">Đóng</button></dialog></body></html>');
  await page.evaluate(()=>{
   window.__pending=Array.from({length:3},(_,i)=>({employeeId:'DOL-ABCDE000'+i,name:'Nhân viên '+(i+1),avatar:'🐬',createdAt:i}));
   window.__rejected=[];window.__approved=[];
   let release;
   const held=new Promise(resolve=>release=resolve);
   window.__releaseInitial=()=>release();
   let queries=0;
   window.DolphinStaffId={
    get:()=>({employeeId:'DOL-0001',verified:true}),
    getVerificationStatus:()=>({state:'verified',uid:'test-admin-uid'}),
    listApproved:async()=>({profiles:[]}),
    listRecoveryRequests:async()=>({requests:[]}),
    listPending:async()=>{if(++queries===1)await held;return {profiles:window.__pending.slice()};},
    rejectRegistration:async id=>{window.__rejected.push(id);window.__pending=window.__pending.filter(p=>p.employeeId!==id);},
    approveRegistration:async id=>{window.__approved.push(id);window.__pending=window.__pending.filter(p=>p.employeeId!==id);}
   };
   window.DolphinPrestige={getMine:()=>({employeeId:'DOL-0001',rankingVisible:false}),call:async()=>({}),refresh:async()=>{}};
  });
  await page.addScriptTag({content:source});
  await page.locator('#crew-approval-open').click();
  assert.equal(await page.locator('#crew-approval-dialog').evaluate(el=>el.open),true);
  await page.evaluate(()=>window.__releaseInitial());
  await page.waitForFunction(()=>document.querySelectorAll('#crew-approval-list .crew-approval-row').length===3);
  assert.equal(await page.locator('#crew-approval-open-label').textContent(),'Duyệt nhân viên (3)');
  assert.equal(await page.locator('#crew-approval-badge').count(),1);
  assert.equal(await page.locator('#crew-approval-badge').isVisible(),true);
  console.log('PASS: clicking while previous refresh is in flight still displays all 3 applications.');

  await page.locator('#crew-approval-list .crew-approval-row').first().getByRole('button',{name:/Từ chối/}).click();
  await page.waitForFunction(()=>document.querySelectorAll('#crew-approval-list .crew-approval-row').length===2);
  assert.equal(await page.locator('#crew-approval-open-label').textContent(),'Duyệt nhân viên (2)');
  assert.deepEqual(await page.evaluate(()=>window.__rejected),['DOL-ABCDE0000']);
  console.log('PASS: reject asks for confirmation, invokes backend and removes the row.');

  await page.locator('#crew-approval-refresh').click();
  await page.waitForFunction(()=>document.querySelectorAll('#crew-approval-list .crew-approval-row').length===2);
  await page.locator('#crew-approval-list .crew-approval-row').first().getByRole('button',{name:/Phê duyệt/}).click();
  await page.waitForFunction(()=>document.querySelectorAll('#crew-approval-list .crew-approval-row').length===1);
  assert.deepEqual(await page.evaluate(()=>window.__approved),['DOL-ABCDE0001']);
  console.log('PASS: refresh and approval preserve the remaining queue.');

  await page.evaluate(()=>{
   window.__pending=[];window.DolphinStaffId.get=()=>({employeeId:'DOL-0002',verified:true});
   window.dispatchEvent(new CustomEvent('dolphin-staff-id-changed'));
  });
  assert.equal(await page.locator('#crew-manager-approvals').isVisible(),false);
  console.log('PASS: manager controls disappear on non-manager identity.');
  await context.close();
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
