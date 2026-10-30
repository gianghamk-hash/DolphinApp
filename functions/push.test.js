'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync(__dirname+'/push.js','utf8');
// Pure-helper tests run in the Tactics CI workflow too, which deliberately
// does not install Firebase Admin. Stub module imports, never production code.
const fakeModules={
  'node:crypto':require('node:crypto'),
  'firebase-admin/firestore':{getFirestore:()=>null,FieldPath:{documentId:()=>null}},
  'firebase-admin/messaging':{getMessaging:()=>null},
  'firebase-functions/v2/https':{onCall:(opts,fn)=>fn,HttpsError:class HttpsError extends Error{}},
  'firebase-functions/v2/firestore':{onDocumentWritten:(opts,fn)=>fn}
};
const ctx={exports:{},process,URLSearchParams,Date,console,
  require:name=>{if(!(name in fakeModules))throw Error('Unknown mock: '+name);return fakeModules[name];}};
vm.runInNewContext(source,ctx,{filename:'push.js'});
const { _pushTest }=ctx.exports;

test('new and reopened pending orders/calls trigger a notification',()=>{
  assert.equal(_pushTest.needsAlert(null,{status:'pending',timestamp:100}),true);
  assert.equal(_pushTest.needsAlert({status:'cooking',timestamp:100},{status:'pending',timestamp:100}),true);
  assert.equal(_pushTest.needsAlert({status:'pending',timestamp:100},{status:'pending',timestamp:100}),false);
  assert.equal(_pushTest.needsAlert({status:'pending',timestamp:100},{status:'pending',timestamp:200}),true);
  assert.equal(_pushTest.needsAlert(null,{status:'done',timestamp:100}),false);
  assert.equal(_pushTest.needsAlert({status:'pending'},null),false);
});

test('every active approved staff token qualifies, independent of Staff ID and outlet',()=>{
  const base={uid:'uid-one',token:'web-token-123456',role:'staff',active:true};
  assert.equal(_pushTest.eligibleDevice({...base}),true);
  assert.equal(_pushTest.eligibleDevice({...base,staffId:'DOL-0001',verified:true}),true);
  assert.equal(_pushTest.eligibleDevice({...base,staffId:null,verified:false}),true);
  assert.equal(_pushTest.eligibleDevice({...base,updatedAt:1}),true); // no 30-day cutoff
  assert.equal(_pushTest.eligibleDevice({...base,active:false}),false);
  assert.equal(_pushTest.eligibleDevice({...base,role:'unknown'}),false);
});

test('Manager devices require server allowlist, not User-Agent',()=>{
  process.env.PUSH_MANAGER_UIDS='trusted-manager';
  assert.equal(_pushTest.eligibleDevice({uid:'trusted-manager',token:'abc',role:'manager',active:true}),true);
  assert.equal(_pushTest.eligibleDevice({uid:'guest-uid',token:'abc',role:'manager',active:true}),false);
  delete process.env.PUSH_MANAGER_UIDS;
});

test('alert previews carry only outlet, table and a safe URL',()=>{
  const message=_pushTest.notificationPayload('bun_orders','Bungalow','order','test-201',
    {status:'pending',table:'BGL 201',timestamp:17,customerName:'Private Guest'},'bungalow');
  assert.equal(message.type,'dolphin-order');
  assert.equal(message.outlet,'bungalow');
  assert.match(message.body,/BGL 201/);
  assert.doesNotMatch(message.body,/Private Guest/);
  assert.equal(new URL(message.url).searchParams.get('pushId'),'test-201');
  assert.equal(new URL(message.url).origin,'https://dolphinfb.store');
});

test('table labels cannot inject markup',()=>{
  assert.equal(_pushTest.safeTable({table:'<script>alert(1)</script>'}),'scriptalert1script');
});

test('Show pending service is read from nested table data, not booking status',()=>{
  const before=_pushTest.showService({label:'S01'});
  const fresh=_pushTest.showService({label:'S01',service:{status:'pending',savedAt:100}});
  const cooking=_pushTest.showService({label:'S01',service:{status:'preparing',savedAt:100}});
  const updated=_pushTest.showService({label:'S01',service:{status:'pending',savedAt:200}});
  assert.equal(before,null);
  assert.equal(_pushTest.needsAlert(before,fresh),true);
  assert.equal(_pushTest.needsAlert(fresh,cooking),false);
  assert.equal(_pushTest.needsAlert(fresh,updated),true);
  assert.equal(_pushTest.notificationPayload('show_tables','Show','order','S01',updated,'show').outlet,'show');
});

test('push code must be wholly independent of Staff ID workflows',()=>{
  const source=fs.readFileSync(__dirname+'/push.js','utf8');
  assert.doesNotMatch(source,/staffIdentity|staffRegistry|pushOutlets/);
  assert.match(source,/pushIssueDeviceCodes/);
  assert.match(source,/pushClaimDeviceCode/);
});
