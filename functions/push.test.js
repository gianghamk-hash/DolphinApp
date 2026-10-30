'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { _pushTest } = require('./push');

test('only new or newly pending orders trigger Manager push', () => {
  assert.equal(_pushTest.needsAlert(null, {status:'pending',timestamp:100}), true);
  assert.equal(_pushTest.needsAlert({status:'cooking',timestamp:100}, {status:'pending',timestamp:100}), true);
  assert.equal(_pushTest.needsAlert({status:'pending',timestamp:100}, {status:'pending',timestamp:100}), false);
  assert.equal(_pushTest.needsAlert({status:'pending',timestamp:100}, {status:'pending',timestamp:200}), true);
  assert.equal(_pushTest.needsAlert(null,{status:'done',timestamp:100}),false);
  assert.equal(_pushTest.needsAlert({status:'pending'},null),false);
});

test('payload is scoped to a real Dolphin outlet and contains only safe public preview', () => {
  const message = _pushTest.notificationPayload('bun_orders','Bungalow','order','test-201',{status:'pending',table:'BGL 201',timestamp:17});
  assert.equal(message.type,'dolphin-order');
  assert.equal(message.outlet,'bungalow');
  assert.match(message.title,/Bungalow/);
  assert.match(message.body,/BGL 201/);
  assert.equal(new URL(message.url).searchParams.get('pushId'),'test-201');
  assert.equal(new URL(message.url).origin,'https://dolphinfb.store');
  assert.doesNotMatch(message.body,/guest|telephone|phone/i);
});

test('table labels cannot insert markup into notifications', () => {
  assert.equal(_pushTest.safeTable({table:'<script>alert(1)</script>'}),'scriptalert1script');
});
