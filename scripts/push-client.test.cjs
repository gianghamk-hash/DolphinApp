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

test('notification control has no activation-code UI or access precondition',()=>{
  assert.doesNotMatch(client,/pushClaimDeviceCode|pushIssueDeviceCodes|inviteInput|enrollPanel/);
  assert.doesNotMatch(client,/if\(!access\?\.authorized\)/);
  assert.match(client,/consent:true/);
  assert.match(client,/'staff-android':'manager-android'/);
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
  assert.match(client,/Manager: Kiểm tra Push/);
});

function browserFixture({permission='granted',native=false}={}){
  const calls=[],events=[],nodes=[],store=new Map(),apps=[];
  const registration={};
  const document={readyState:'loading',currentScript:{src:'https://dolphinfb.store/dolphin-push.js'},
    events:{},addEventListener(name,fn){this.events[name]=fn;},getElementById(){return null;},
    createElement(tag){const node={tag,style:{},hidden:false,listeners:{},
      addEventListener(name,fn){this.listeners[name]=fn;},append(...items){this.children=items;}};nodes.push(node);return node;},
    body:{appendChild(){}}};
  const mockSDK={
    'firebase-app.js':{getApps:()=>apps,initializeApp:(config,name)=>{const app={name};apps.push(app);return app;}},
    'firebase-auth.js':{getAuth:()=>({currentUser:{uid:'new-public-user'},authStateReady:async()=>{events.push('auth');}})},
    'firebase-functions.js':{getFunctions:()=>({}),httpsCallable:(functions,name)=>async data=>{
      calls.push({name,data});return {data:name==='pushGetMyAccess'?{uid:'new-public-user',authorized:false,role:'unregistered'}:{registered:true,role:'staff'}};
    }},
    'firebase-messaging.js':{isSupported:async()=>true,getMessaging:()=>({}),getToken:async()=>{events.push('token');return 'test-fcm-token-123456789012345';}}
  };
  const window={document,matchMedia:()=>({matches:true}),PushManager:class {},
    DOLPHIN_PUSH_CONFIG:{apiKey:'public',projectId:'test',authDomain:'test',appId:'web',messagingSenderId:'123',vapidKey:'public-key'}};
  const Notification={permission:'default',requestPermission(){events.push('permission');return Promise.resolve(permission);}};
  window.Notification=Notification;window.top=window;
  if(native)window.AndroidPush={requestToken(){events.push('native-permission');},readToken(){events.push('native-resume');}};
  const context={window,document,Notification,URL,console,mockSDK,
    navigator:{userAgent:native?'DolphinStaff/1.0':'iPhone',standalone:true,
      serviceWorker:{register:async()=>registration,ready:Promise.resolve(registration)}},
    location:{href:'https://dolphinfb.store/'},
    localStorage:{getItem:key=>store.get(key),setItem:(k,v)=>store.set(k,v),removeItem:k=>store.delete(k)}};
  const source=client.replace(/import\(sdk\+'([^']+)'\)/g,(_,file)=>`Promise.resolve(mockSDK['${file}'])`);
  vm.runInNewContext(source,context);
  return {api:window.DolphinPush,ready:()=>document.events.DOMContentLoaded(),calls,events,nodes,store};
}

test('fresh iPhone opt-in asks OS permission in the tap and registers without a code or access grant',async()=>{
  const f=browserFixture();await f.ready();f.events.length=0;
  const done=f.api.enable();
  assert.equal(f.events[0],'permission');
  await done;
  const registered=f.calls.filter(c=>c.name==='pushRegisterDevice');
  assert.equal(registered.length,1);assert.equal(registered[0].data.consent,true);
  assert.equal(f.api.active,true);assert.equal(f.nodes.some(n=>n.tag==='input'),false);
  await f.api.disable();assert.equal(f.api.active,false);
  assert.equal(f.calls.filter(c=>c.name==='pushUnregisterDevice').length,1);
});

test('permission denial does not request a token or enroll the device',async()=>{
  const f=browserFixture({permission:'denied'});await f.ready();await f.api.enable();
  assert.equal(f.calls.some(c=>c.name==='pushRegisterDevice'),false);
  assert.equal(f.events.includes('token'),false);assert.equal(f.api.active,false);
});

test('Staff APK uses native permission and registers its returned token without Manager UID',async()=>{
  const f=browserFixture({native:true});await f.ready();await f.api.enable();
  assert.equal(f.events.includes('native-permission'),true);
  await f.api.receiveNativeToken('native-fcm-token-123456789012345');
  assert.equal(f.calls.find(c=>c.name==='pushRegisterDevice').data.platform,'staff-android');
  assert.equal(f.api.active,true);
});
