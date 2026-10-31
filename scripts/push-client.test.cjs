'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
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

test('opt-in consent remains independent of Staff ID and any optional Manager activation code',()=>{
  assert.match(client,/consent:true/);
  assert.match(client,/'staff-android':'manager-android'/);
  assert.match(client,/pushClaimDeviceCode/);
  assert.match(client,/pushIssueDeviceCodes/);
  assert.doesNotMatch(client,/if\(!access\?\.authorized\)\{[^}]*return/);
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

test('legacy browser alerts stay active if Firebase Web Push configuration is incomplete',()=>{
  assert.match(client,/if \(!native && \(!cfg\.messagingSenderId \|\| !cfg\.appId \|\| !cfg\.vapidKey\)\)/);
  assert.match(client,/legacy notifications remain active/);
});

test('Firebase anonymous identity is restored before sign-in on iPhone reopen',()=>{
  assert.match(client,/auth\.authStateReady\(\)/);
  assert.match(client,/if\(!auth\.currentUser\)await authSdk\.signInAnonymously/);
});

test('Manager can inspect push delivery health without reading sensitive tokens',()=>{
  assert.match(client,/pushGetDeliveryHealth/);
  assert.match(client,/Kiểm tra tình trạng Push/);
  assert.match(client,/function mountManager\(container\)/);
});

function browserFixture({permission='granted',native=false,optIn=false,registered=false,notificationState='default',role='staff',registrationFailure=false}={}){
  const calls=[],events=[],nodes=[],store=new Map(),apps=[];
  if(optIn)store.set('dolphinPushEnabled','1');
  if(registered)store.set('dolphinPushRegistered','1');
  const registration={};
  const document={readyState:'loading',currentScript:{src:'https://dolphinfb.store/dolphin-push.js'},
    events:{},addEventListener(name,fn){this.events[name]=fn;},getElementById(){return null;},
    createElement(tag){const node={tag,style:{},hidden:false,children:[],listeners:{},attributes:{},
      setAttribute(key,value){this.attributes[key]=value;},
      replaceChildren(...items){this.children=[...items];},
      addEventListener(name,fn){this.listeners[name]=fn;},
      append(...items){this.children.push(...items);}};nodes.push(node);return node;},
    body:{appendChild(){}}};
  const mockSDK={
    'firebase-app.js':{getApps:()=>apps,initializeApp:(config,name)=>{const app={name};apps.push(app);return app;}},
    'firebase-auth.js':{getAuth:()=>({currentUser:{uid:'new-public-user'},authStateReady:async()=>{events.push('auth');}})},
    'firebase-functions.js':{getFunctions:()=>({}),httpsCallable:(functions,name)=>async data=>{
      calls.push({name,data});
      if(name==='pushRegisterDevice'&&registrationFailure)throw new Error('Registration offline');
      return {data:name==='pushGetMyAccess'?{uid:'new-public-user',authorized:true,role}:name==='pushGetDeliveryHealth'?{enabled:true,activeDevices:1,recent:[]}:{registered:true,role}};
    }},
    'firebase-messaging.js':{isSupported:async()=>true,getMessaging:()=>({}),getToken:async()=>{events.push('token');return 'test-fcm-token-123456789012345';}}
  };
  const window={document,matchMedia:()=>({matches:true}),PushManager:class {},
    DOLPHIN_PUSH_CONFIG:{apiKey:'public',projectId:'test',authDomain:'test',appId:'web',messagingSenderId:'123',vapidKey:'public-key'}};
  const Notification={permission:notificationState,requestPermission(){events.push('permission');this.permission=permission;return Promise.resolve(permission);}};
  window.Notification=Notification;window.top=window;
  if(native)window.AndroidPush={requestToken(){events.push('native-permission');},readToken(){events.push('native-resume');}};
  const context={window,document,Notification,URL,console:{...console,warn(){}},mockSDK,
    navigator:{userAgent:native?'DolphinStaff/1.0':'iPhone',standalone:true,
      serviceWorker:{register:async()=>registration,ready:Promise.resolve(registration)}},
    location:{href:'https://dolphinfb.store/'},
    localStorage:{getItem:key=>store.get(key),setItem:(k,v)=>store.set(k,v),removeItem:k=>store.delete(k)}};
  const source=client.replace(/import\(sdk\+'([^']+)'\)/g,(_,file)=>`Promise.resolve(mockSDK['${file}'])`);
  vm.runInNewContext(source,context);
  return {api:window.DolphinPush,ready:()=>document.events.DOMContentLoaded(),calls,events,nodes,store,Notification,
    panel:()=>nodes.find(n=>n.id==='dolphin-push-control')};
}


test('fresh iPhone opt-in requests OS permission synchronously and registers with consent, without a code',async()=>{
  const f=browserFixture();await f.ready();f.events.length=0;
  assert.equal(f.nodes.length,0,'no Push buttons or controls appended at startup');
  const done=f.api.enable();
  assert.equal(f.events[0],'permission');
  await done;
  const registered=f.calls.filter(c=>c.name==='pushRegisterDevice');
  assert.equal(registered.length,1);assert.equal(registered[0].data.consent,true);
  assert.equal(f.api.active,true);
  assert.equal(f.nodes.length,0,'enabling Push must not create a floating control');
  await f.api.disable();
  assert.equal(f.api.active,false);
  assert.equal(f.calls.filter(c=>c.name==='pushUnregisterDevice').length,1);
});

test('permission denial does not request a token or enroll the device, and opens no overlay',async()=>{
  const f=browserFixture({permission:'denied'});await f.ready();await f.api.enable();
  assert.equal(f.calls.some(c=>c.name==='pushRegisterDevice'),false);
  assert.equal(f.events.includes('token'),false);assert.equal(f.api.active,false);
  assert.equal(f.nodes.length,0);
});

test('Staff APK native permission registers token with staff-android without requiring Manager UID',async()=>{
  const f=browserFixture({native:true});await f.ready();await f.api.enable();
  assert.equal(f.events.includes('native-permission'),true);
  await f.api.receiveNativeToken('native-fcm-token-123456789012345');
  assert.equal(f.calls.find(c=>c.name==='pushRegisterDevice').data.platform,'staff-android');
  assert.equal(f.calls.find(c=>c.name==='pushRegisterDevice').data.consent,true);
  assert.equal(f.api.active,true);
  assert.equal(f.nodes.length,0);
});

test('Manager health and activation/revoke controls appear only when Manager deliberately mounts its settings',async()=>{
  const f=browserFixture({native:true,role:'manager'});await f.ready();
  assert.equal(f.nodes.length,0,'nothing generated over outlet buttons on landing');
  const manager={children:[],replaceChildren(...items){this.children=[...items];}};
  f.api.mountManager(manager);
  const health=f.nodes.find(n=>n.textContent==='📡 Kiểm tra tình trạng Push');
  assert.ok(health,'health tool created inside Manager settings');
  const controls=manager.children.find(n=>n.tag==='div');
  assert.equal(controls.hidden,false,'Manager access allows these controls');
  await f.api.enable();await f.api.receiveNativeToken('manager-fcm-token-123456789012345');
  assert.equal(f.api.active,true);
  await health.listeners.click();
  assert.equal(f.nodes.some(n=>n.id==='dolphin-push-control'),false);
  f.api.unmountManager();
  assert.equal(manager.children.length,0,'Manager close removes all click targets');
});

test('Web reload restores an opted-in token and never asks for notification permission again',async()=>{
  const f=browserFixture({optIn:true,notificationState:'granted',role:'manager'});
  const ready=f.ready();assert.equal(f.nodes.length,0);
  await ready;
  assert.equal(f.api.active,true);
  assert.equal(f.events.includes('permission'),false);
  f.Notification.permission='denied';await f.api.resume();
  assert.equal(f.api.active,false);
  assert.equal(f.nodes.length,0);
});

test('native reload restores its token silently; failed web setup shows no overlay',async()=>{
  const native=browserFixture({native:true,optIn:true});await native.ready();
  assert.equal(native.events.includes('native-resume'),true);
  assert.equal(native.nodes.length,0);
  await native.api.receiveNativeToken('restored-native-token-123456789012345');
  assert.equal(native.api.active,true);
  const web=browserFixture({optIn:true,notificationState:'granted',registrationFailure:true});
  await web.ready();assert.equal(web.api.active,false);
  assert.equal(web.nodes.length,0,'errors never mount floating UI');
});

test('a previously registered session preserves consent during temporary network outage',async()=>{
  const f=browserFixture({optIn:true,registered:true,notificationState:'granted',registrationFailure:true});
  await f.ready();
  assert.equal(f.api.active,false);
  assert.equal(f.store.get('dolphinPushEnabled'),'1');
  assert.equal(f.store.get('dolphinPushRegistered'),'1');
  assert.equal(f.nodes.length,0);
});

test('staff settings can be closed without unregistering Push, including on reopen',async()=>{
  const f=browserFixture({optIn:true,notificationState:'granted'});await f.ready();
  const container={children:[],replaceChildren(...nodes){this.children=[...nodes];}};
  assert.equal(f.api.active,true);
  f.api.mountSettings(container);
  assert.ok(container.children.length>0);
  f.api.unmountSettings();
  assert.equal(container.children.length,0);
  assert.equal(f.api.active,true,'UI close must not unregister or disable Push');
  assert.equal(f.calls.filter(c=>c.name==='pushUnregisterDevice').length,0);
});
