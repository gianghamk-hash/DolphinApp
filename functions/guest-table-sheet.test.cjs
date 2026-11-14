'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),crypto=require('node:crypto');
function setup(approved=true){let sent=[];class HttpsError extends Error{constructor(code,msg){super(msg);this.code=code;}}
const sandbox={exports:{},AbortSignal,fetch:async(url,options)=>{sent.push(JSON.parse(options.body));return {ok:true,json:async()=>({ok:true,count:3,table:'A1'})}},require:n=>n==='node:crypto'?crypto:n.endsWith('/https')?{onCall:(_,h)=>h,HttpsError}:n.endsWith('/params')?{defineSecret:()=>({value:()=> 'x'.repeat(32)}),defineString:()=>({value:()=> 'https://script.google.com/macros/s/test/exec'})}:n.endsWith('/database')?{getDatabase:()=>({ref:p=>({get:async()=>({val:()=>p.startsWith('staffIdentity')?{employeeId:'DOL-1',verified:approved}:{active:true,approved,registrationSource:'self'}})})})}:require(n)};
vm.runInNewContext(fs.readFileSync(__dirname+'/guest-sheet-bridge.js','utf8'),sandbox);return {api:sandbox.exports,sent};}
test('rejects anonymous and unapproved staff without outgoing requests',async()=>{let s=setup();await assert.rejects(s.api.guestSheetBridge({data:{action:'sync'}}),{code:'unauthenticated'});assert.equal(s.sent.length,0);s=setup(false);await assert.rejects(s.api.guestSheetBridge({auth:{uid:'u'},data:{action:'sync'}}),{code:'permission-denied'});assert.equal(s.sent.length,0)});
test('signs permitted requests and rejects unknown actions',async()=>{const s=setup();await s.api.guestSheetBridge({auth:{uid:'u'},data:{action:'sync'}});const body=s.sent[0];assert.equal(body.signature,crypto.createHmac('sha256','x'.repeat(32)).update(body.payload).digest('hex'));assert.equal(JSON.parse(body.payload).action,'sync');await assert.rejects(s.api.guestSheetBridge({auth:{uid:'u'},data:{action:'delete'}}),{code:'invalid-argument'})});
test('legacy callable forwards table saves to the shared locked bridge',async()=>{const s=setup();await s.api.guestAssignTable({auth:{uid:'u'},data:{code:'DP1',table:'A1'}});const data=JSON.parse(s.sent[0].payload);assert.equal(data.action,'assign');assert.equal(data.data.table,'A1')});
const gas=fs.readFileSync(__dirname+'/../apps-script/DolphinBridge.gs','utf8');
function gasContext(){const s={Map,Set,console};vm.runInNewContext(gas,s);return s;}
test('preserves merged/reordered groups, does not match substrings and rejects split groups',()=>{const g=gasContext();const old=new Map([['DP1','A1'],['DP2','A2'],['DP10','B1']]);assert.equal(g.preserveDolphinTable_('DP2 + DP1',old),'A1-A2');assert.equal(g.preserveDolphinTable_('DP1',old),'A1');assert.equal(g.preserveDolphinTable_('DP1 + DP2',new Map([['DP2 + DP1','E22']])),'E22');assert.throws(()=>g.preserveDolphinTable_('DP1',new Map([['DP1 + DP2','E22']])),/đã tách/)});
test('lock rejects concurrent operations and releases after exceptions',()=>{const g=gasContext();let released=0;g.LockService={getScriptLock:()=>({tryLock:()=>false,releaseLock:()=>released++})};assert.throws(()=>g.dolphinLock_(()=>{throw Error('must not run')}),/Đang đồng bộ/);g.LockService.getScriptLock=()=>({tryLock:()=>true,releaseLock:()=>released++});assert.throws(()=>g.dolphinLock_(()=>{throw Error('failure')}),/failure/);assert.equal(released,1)});
test('signed endpoint rejects bad signatures, accepts one sync and rejects replay',()=>{const g=gasContext();let calls=0;const cache=new Map(),key='x'.repeat(32);g.PropertiesService={getScriptProperties:()=>({getProperty:()=>key})};g.Utilities={computeHmacSha256Signature:(s,k)=>[...crypto.createHmac('sha256',k).update(s).digest()]};g.ContentService={MimeType:{JSON:'json'},createTextOutput:s=>({setMimeType:()=>JSON.parse(s)})};g.LockService={getScriptLock:()=>({tryLock:()=>true,releaseLock(){}})};g.CacheService={getScriptCache:()=>({get:k=>cache.get(k),put:(k,v)=>cache.set(k,v)})};g.syncAllDolphinSheetsCore_=()=>{calls++;return {ok:true,count:2}};const payload=JSON.stringify({id:crypto.randomUUID(),timestamp:Date.now(),action:'sync'});const signature=crypto.createHmac('sha256',key).update(payload).digest('hex');const send=sig=>g.doPost({postData:{contents:JSON.stringify({payload,signature:sig})}});assert.equal(send('bad').ok,false);assert.equal(calls,0);assert.equal(send(signature).ok,true);assert.equal(calls,1);assert.equal(send(signature).ok,false);assert.equal(calls,1)});
test('Apps Script assignment rejects occupied and stale tables and writes only target cell',()=>{const g=gasContext();g.DOLPHIN_TARGET_ID='test';g.isDolphinSheet=()=>true;let writes=0;const rows=[['1','DP1','','',2,'',''],['2','DP2','','',2,'','A1-A3']];const cell={getFormula:()=>'',setValue:v=>{writes++;rows[0][6]=v},getValue:()=>rows[0][6]};g.SpreadsheetApp={openById:()=>({getSheetByName:()=>({getDataRange:()=>({getValues:()=>rows}),getRange:(r,c)=>{assert.equal(r,1);assert.equal(c,7);return cell}})}),flush(){}};const data={sheetName:'DOLPHIN 14.11',code:'DP1',stt:'1',expectedTable:'',table:'A1'};assert.throws(()=>g.dolphinAssign_(data),/đã có booking/);assert.equal(writes,0);assert.equal(g.dolphinAssign_({...data,table:'E22'}).table,'E22');assert.equal(writes,1);assert.throws(()=>g.dolphinAssign_({...data,table:'E23'}),/đã thay đổi/);assert.equal(writes,1)});
test('complete supplied Apps Script and bridge compile together',()=>{const source=fs.readFileSync(__dirname+'/../apps-script/DolphinFB.gs','utf8');new vm.Script(source+'\n'+gas);assert.doesNotMatch(source,/deleteSheet\(oldLogSheet\)/)});
test('Apps Script and app share the exact range meaning and compact storage policy',()=>{
 const g=gasContext(),input=require('../dolphin-guest-table-input');
 for(const raw of ['A11-A16','a11–16','A11,A12,A13,A14,A15,A16','A11,A12,A14,A16','A1,A2,B1,B2','L998-L999']){
  assert.equal(g.dolphinExpandTables_(raw),input.normalize(raw));
  assert.equal(g.dolphinCompactTables_(raw),input.compact(raw));
 }
 for(const raw of ['A11-B16','A16-A11','A1-A3,A3','A0','A1-A61'])assert.throws(()=>g.dolphinCompactTables_(raw));
 assert.equal(g.preserveDolphinTable_('DP1',new Map([['DP1','A11,A12,A13,A14,A15,A16']])),'A11-A16');
});
test('writes a compact range but detects occupied interior A15 before any write',()=>{
 const g=gasContext();g.DOLPHIN_TARGET_ID='target';g.isDolphinSheet=()=>true;
 const rows=[['17','DP4634118','','',36,'',''],['18','OTHER','','',2,'','A15']];let writes=0;
 const cell={getFormula:()=>'',setValue:v=>{writes++;rows[0][6]=v;},getValue:()=>rows[0][6]};
 g.SpreadsheetApp={openById:id=>{assert.equal(id,'target');return {getSheetByName:()=>({getDataRange:()=>({getValues:()=>rows}),getRange:(row,col)=>{assert.equal(row,1);assert.equal(col,7);return cell;}})};},flush(){}};
 const data={sheetName:'DOLPHIN 14.11',code:'DP4634118',stt:'17',expectedTable:'',table:'A11-A16'};
 assert.throws(()=>g.dolphinAssign_(data),/đã có booking/);assert.equal(writes,0);
 rows[1][6]='B15';
 assert.equal(g.dolphinAssign_(data).table,'A11-A16');assert.equal(rows[0][6],'A11-A16');assert.equal(writes,1);
 assert.throws(()=>g.dolphinAssign_(data),/đã thay đổi/);assert.equal(writes,1);
 rows[0][6]='';assert.equal(g.dolphinAssign_({...data,table:'A11,A12,A13,A14,A15,A16'}).table,'A11-A16');
});
