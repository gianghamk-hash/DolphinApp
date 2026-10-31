'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=file=>fs.readFileSync(path.join(__dirname,'..',file),'utf8');
const push=read('dolphin-push.js');
const index=read('index.html');
const dashboard=read('manager/dashboard.html');

test('the landing has NO floating Push buttons or intercepting overlay',()=>{
  assert.doesNotMatch(push,/position\s*:\s*fixed/i);
  assert.doesNotMatch(push,/document\.body\.appendChild/);
  assert.doesNotMatch(push,/dolphin-push-control/);
  assert.doesNotMatch(index,/id=["']notifPermBtn["']/);
  assert.doesNotMatch(index,/#notifPermBtn\s*\{/);
  assert.match(index,/id="open-notification-settings"/);
  assert.match(index,/<dialog id="notification-settings-dialog"/);
  assert.match(index,/#notification-settings-dialog:not\(\[open\]\)\{display:none!important;pointer-events:none!important\}/);
  assert.match(index,/d\.showModal\(\)/);
  assert.match(index,/pagehide.*d\.close\(\)/);
  assert.match(index,/e\.persisted&&d\.open/);
  // Button is below the actual outlet cards within the landing (normal flow).
  assert.ok(index.indexOf('id="open-notification-settings"')>index.indexOf('id="card-dashboard"'));
  assert.ok(index.indexOf('id="open-notification-settings"')<index.indexOf('id="app-view"'));
});

test('Manager code issue/revoke/health controls exist ONLY within the Manager settings tab',()=>{
  assert.match(dashboard,/data-stab="push"/);
  assert.match(dashboard,/id="stab-push" class="hidden"/);
  assert.match(dashboard,/id="manager-push-admin"/);
  assert.match(dashboard,/push\.mountManager\(target\)/);
  assert.match(dashboard,/push\.unmountManager\(\)/);
  assert.match(dashboard,/if\(tab!=='push'\)unmountManagerPushSettings\(\)/);
  assert.match(push,/function mountManager\(container\)/);
  assert.match(push,/pushRevokeDeviceAccess/);
  assert.match(push,/pushIssueDeviceCodes/);
  assert.match(push,/pushGetDeliveryHealth/);
  assert.match(push,/if\(managerControls\)managerControls\.hidden=!manager/);
});

test('background FCM registration still starts without mounting any UI',()=>{
  assert.match(push,/async function start\(\)\{/);
  assert.match(push,/try\{await loadAccess\(\);if\(optedIn\(\)\)await resume\(\);\}/);
  assert.match(push,/function unmountSettings\(\)/);
  assert.match(push,/function unmountManager\(\)/);
  assert.match(push,/Un(?:mounting|mount).*NEVER unregisters an active FCM token/);
  assert.match(push,/Notification\.requestPermission\(\)/);
  assert.match(push,/pushRegisterDevice/);
});

test('staff settings mount/unmount and Manager mount/unmount have no DOM overlay',async()=>{
  class FakeNode {
    constructor(tag){this.tag=tag;this.children=[];this.style={cssText:''};this.attributes={};this.listeners={};this.textContent='';this.hidden=false;}
    append(...nodes){this.children.push(...nodes);}
    replaceChildren(...nodes){this.children=[...nodes];}
    setAttribute(key,value){this.attributes[key]=value;}
    addEventListener(event,callback){this.listeners[event]=callback;}
  }
  let bodyAppends=0,created=0;
  const doc={
    readyState:'loading',
    currentScript:{src:'https://dolphinfb.store/dolphin-push.js'},
    addEventListener(){},
    createElement(tag){created++;return new FakeNode(tag);},
    body:{appendChild(){bodyAppends++;}},
  };
  const navigator={userAgent:'Android Chrome',platform:'Linux',maxTouchPoints:0};
  const location={href:'https://dolphinfb.store/index.html'};
  const root={
    document:doc,navigator,location,
    DOLPHIN_PUSH_CONFIG:{apiKey:'public',authDomain:'dolphin-f6d67.firebaseapp.com',
      projectId:'dolphin-f6d67',messagingSenderId:'123',appId:'1:123:web:abcdef',vapidKey:'public-web-push-key'},
    matchMedia(){return {matches:false};}
  };
  root.top=root;
  const vm=require('node:vm');
  vm.runInNewContext(push,{
    window:root,document:doc,navigator,location,URL,console:{warn(){},info(){}},
    localStorage:{getItem(){return null},setItem(){},removeItem(){}}
  },{filename:'dolphin-push.js'});
  assert.equal(bodyAppends,0,'startup must not create floating controls');
  assert.equal(created,0,'startup must not even create a panel');
  assert.equal(typeof root.DolphinPush.mountSettings,'function');
  const staff=new FakeNode('div');
  root.DolphinPush.mountSettings(staff);
  assert.ok(staff.children.some(c=>c.tag==='button'),'staff enable button exists in settings');
  assert.ok(staff.children.some(c=>c.tag==='div'),'activation field is inside settings only');
  assert.equal(bodyAppends,0,'staff panel must remain inside explicitly provided settings element');
  root.DolphinPush.unmountSettings();
  assert.equal(staff.children.length,0,'staff close removes every node and click target');
  const manager=new FakeNode('div');
  root.DolphinPush.mountManager(manager);
  assert.ok(manager.children.length>0,'Manager controls render inside dashboard settings');
  const controls=manager.children.find(x=>x.tag==='div');
  assert.equal(controls.hidden,true,'unauthorized Manager controls remain hidden');
  root.DolphinPush.unmountManager();
  assert.equal(manager.children.length,0,'closing Manager settings removes controls');
  assert.equal(bodyAppends,0,'Manager UI never appends to main screen');
  await Promise.resolve();
});
