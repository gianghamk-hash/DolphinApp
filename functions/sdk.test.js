'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');

test('real Firebase SDK loads the Staff callable endpoints on the deployment runtime', () => {
  const endpoints = require('./index.js');
  for (const name of ['staffCreateProfile', 'staffIssueLinkCode', 'staffClaimLinkCode', 'staffGetIdentity']) {
    assert.equal(typeof endpoints[name], 'function', name);
    assert.ok(endpoints[name].__endpoint.callableTrigger, name + ' must remain callable');
    assert.deepEqual(endpoints[name].__endpoint.region, ['asia-southeast1']);
  }
});
