'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

function workerFixture(visible = []) {
  const handlers = new Map(), notifications = [], opened = [];
  const root = 'https://dolphinfb.store';
  const self = {
    location:{href:root+'/service-worker.js',origin:root},
    addEventListener(type,fn){handlers.set(type,fn);},
    registration:{async showNotification(title,options){notifications.push({title,options});}},
    clients:{
      async matchAll(){return visible;},
      async openWindow(url){opened.push(url);return {};}
    }
  };
  const code=fs.readFileSync(path.join(__dirname,'../service-worker.js'),'utf8');
  vm.runInNewContext(code,{self,URL,console,Date,setTimeout,clearTimeout,fetch(){},caches:{}});
  return {handlers,notifications,opened};
}
function fakeEvent(data) {
  return {
    data:{json(){return data;}},
    waitUntil(promise){this.work=promise;}
  };
}
test('FCM data-only web push displays a notification without open clients',async () => {
  const f=workerFixture();
  const e=fakeEvent({data:{type:'dolphin-order',title:'Order mới',body:'BGL 201',eventId:'abc',url:'https://dolphinfb.store/index.html?pushOutlet=bungalow'}});
  f.handlers.get('push')(e);
  await e.work;
  assert.equal(f.notifications.length,1);
  assert.equal(f.notifications[0].title,'Order mới');
  assert.equal(f.notifications[0].options.tag,'abc');
});
test('unrelated push payload never generates Dolphin notification',async () => {
  const f=workerFixture(), e=fakeEvent({data:{type:'unrelated'}});
  f.handlers.get('push')(e);
  assert.equal(f.notifications.length,0);
});
test('click opens the exact same-origin order link',async () => {
  const f=workerFixture(), url='https://dolphinfb.store/index.html?pushOutlet=lounge&pushId=abc';
  const e={notification:{data:{url},close(){}},waitUntil(promise){this.work=promise;}};
  f.handlers.get('notificationclick')(e);
  await e.work;
  assert.equal(f.opened[0],url);
});
test('notification clicks reject foreign origins',async () => {
  const f=workerFixture();
  const e={notification:{data:{url:'https://evil.example/'},close(){}},waitUntil(promise){this.work=promise;}};
  f.handlers.get('notificationclick')(e);
  await e.work;
  assert.equal(f.opened[0],'https://dolphinfb.store/');
});
