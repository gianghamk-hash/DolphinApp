'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
function setup(rows){let writes=0;class HttpsError extends Error{constructor(code,msg){super(msg);this.code=code}}
const client={request:async o=>{if(o.method==='PUT'){writes++;const row=Number(decodeURIComponent(o.url).match(/G(\d+)$/)[1])-1;rows[row][6]=o.data.values[0][0];return {data:{}}}const match=decodeURIComponent(o.url).match(/G(\d+)$/);return {data:{values:match?[[rows[Number(match[1])-1][6]]]:rows}}}};
const sandbox={exports:{},require:n=>n.includes('https')?{onCall:(_,h)=>h,HttpsError}:n.includes('database')?{getDatabase:()=>({ref:p=>({get:async()=>({val:()=>p.startsWith('staffIdentity')?{employeeId:'DOL-1',verified:true}:{active:true,approved:true}})})})}:n==='google-auth-library'?{GoogleAuth:class{async getClient(){return client}}}:require(n)};
vm.runInNewContext(fs.readFileSync(__dirname+'/guest-table-sheet.js','utf8'),sandbox);
return {run:data=>sandbox.exports.guestAssignTable({auth:{uid:'test'},data}),anonymous:()=>sandbox.exports.guestAssignTable({}),writes:()=>writes};}
const payload={sheetName:'DOLPHIN 14.11',code:'DP1',stt:'1',expectedTable:'',table:'A1'};
test('writes and verifies only booking table cell',async()=>{const rows=[['1','DP1','Agency','Guest',2,'VN','']];const s=setup(rows);assert.equal((await s.run(payload)).table,'A1');assert.equal(s.writes(),1);assert.equal(rows[0][3],'Guest')});
test('rejects unauthenticated request',async()=>{const s=setup([]);await assert.rejects(s.anonymous(),{code:'unauthenticated'});assert.equal(s.writes(),0)});
test('rejects stale value and occupied table range',async()=>{let s=setup([['1','DP1','','',2,'','B1']]);await assert.rejects(s.run(payload),{code:'aborted'});assert.equal(s.writes(),0);s=setup([['1','DP1','','',2,'',''],['2','DP2','','',2,'','A1-A3']]);await assert.rejects(s.run(payload),{code:'already-exists'});assert.equal(s.writes(),0)});
test('rejects duplicate booking identity and malformed table',async()=>{const s=setup([['1','DP1'],['1','DP1']]);await assert.rejects(s.run(payload),{code:'failed-precondition'});await assert.rejects(s.run({...payload,table:'=SUM(A1)'}),{code:'invalid-argument'});assert.equal(s.writes(),0)});
