'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const client=fs.readFileSync(path.join(__dirname,'../dolphin-push.js'),'utf8');
const sw=fs.readFileSync(path.join(__dirname,'../service-worker.js'),'utf8');
const originalStaff=fs.readFileSync(path.join(__dirname,'../staff-id.js'),'utf8');

test('Push shares Manager Firebase Auth UID without requiring a verified Staff ID',()=>{
  assert.match(client,/name==='staff-identity-app'/);
  assert.match(client,/fnSdk\.getFunctions\(authApp/);
  assert.match(client,/name==='dolphin-push'/);
  assert.match(client,/msg\.getMessaging\(fb\.messagingApp\)/);
  assert.doesNotMatch(client,/DolphinStaffId\.get|staffIdentity\/|staffRegistry\/|employeeId/);
});

test('iPhone Safari must install to Home Screen before requesting notifications',()=>{
  assert.match(client,/if\(ios&&!standalone\(\)&&!native\)\{setupGuide\(\);return;\}/);
  assert.match(client,/Notification\.requestPermission\(\)/);
  assert.match(client,/Chia sẻ → Thêm vào Màn hình chính/);
});

test('iPhone PWA enrollment panel explicitly removes hidden attribute',()=>{
  assert.match(client,/enrollPanel\.hidden=false/);
  assert.match(client,/enrollPanel\.style\.display='flex'/);
  assert.match(client,/pushClaimDeviceCode/);
  assert.match(client,/pushIssueDeviceCodes/);
});

test('Safari push is always user-visible, even with a foreground client',()=>{
  assert.match(sw,/self\.addEventListener\('push'/);
  assert.match(sw,/registration\.showNotification\(/);
  assert.doesNotMatch(sw,/visible\.length\)\s*\{[^}]*return/);
});

test('legacy Staff ID manager enrollment remains a separate optional workflow',()=>{
  assert.match(originalStaff,/staffClaimLinkCode/);
  assert.match(originalStaff,/staffGetIdentity/);
});
