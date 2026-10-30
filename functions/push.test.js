'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { _pushTest } = require('./push');

test('only new or newly pending orders trigger staff/Manager push', () => {
  assert.equal(_pushTest.needsAlert(null, {status:'pending',timestamp:100}), true);
  assert.equal(_pushTest.needsAlert({status:'cooking',timestamp:100}, {status:'pending',timestamp:100}), true);
  assert.equal(_pushTest.needsAlert({status:'pending',timestamp:100}, {status:'pending',timestamp:100}), false);
  assert.equal(_pushTest.needsAlert({status:'pending',timestamp:100}, {status:'pending',timestamp:200}), true);
  assert.equal(_pushTest.needsAlert(null,{status:'done',timestamp:100}),false);
  assert.equal(_pushTest.needsAlert({status:'pending'},null),false);
});

test('payload is scoped to a real Dolphin outlet and contains only safe public preview', () => {
  const message = _pushTest.notificationPayload('bun_orders','Bungalow','order','test-201',{status:'pending',table:'BGL 201',timestamp:17},'bungalow');
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

test('server normalizes requested outlet assignments and removes duplicates', () => {
  assert.deepEqual(_pushTest.normalizeOutlets(['lounge','lounge','show','invalid']), ['lounge','show']);
});

test('Show service is read from embedded table order, not top-level booking status', () => {
  const before = _pushTest.showService({label:'S01'});
  const fresh = _pushTest.showService({label:'S01',service:{status:'pending',savedAt:100}});
  const cooking = _pushTest.showService({label:'S01',service:{status:'preparing',savedAt:100}});
  assert.equal(before,null);
  assert.equal(_pushTest.needsAlert(before,fresh),true);
  assert.equal(_pushTest.needsAlert(fresh,cooking),false);
  const next = _pushTest.showService({label:'S01',service:{status:'pending',savedAt:200}});
  assert.equal(_pushTest.needsAlert(fresh,next),true);
  const msg = _pushTest.notificationPayload('show_tables','Show','order','S01',next,'show');
  assert.equal(msg.outlet,'show');
  assert.match(msg.body,/S01/);
});
