'use strict';
const fs=require('node:fs');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const input=fs.readFileSync('push-config.js','utf8');
const context={window:{}};
vm.runInNewContext(input,context,{filename:'push-config.js'});
const config=context.window.DOLPHIN_PUSH_CONFIG;
assert.equal(config.projectId,'dolphin-f6d67','Firebase project ID mismatch');
for(const key of ['apiKey','authDomain','projectId'])
  assert.ok(typeof config[key]==='string'&&config[key].length,'Missing Firebase public configuration: '+key);
const missing=['messagingSenderId','appId','vapidKey']
  .filter(key=>!config[key]||config[key]==='000000000000');
if(missing.length){
  console.log('::warning::Web Push is NOT release-ready. Missing public Firebase settings: '+missing.join(', '));
  process.exitCode=process.argv.includes('--strict') ? 1 : 0; // strict release gate, informational test
}else{
  assert.match(config.messagingSenderId,/^\d+$/);
  assert.match(config.appId,/^1:\d+:web:[A-Za-z0-9]+$/);
  assert.ok(config.vapidKey.length>60,'Invalid Firebase Web Push VAPID public key');
  console.log('Firebase Web Push public settings appear configured (not a live FCM delivery test).');
}
