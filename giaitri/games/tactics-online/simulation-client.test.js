'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const E=require('../../../functions/tactics/engine'),{create}=require('./simulation-client');
function room(){const s=E.roomNew('a','A',0,123);s.players.b=E.freshPlayer('b','B',s);s.playerOrder.push('b');s.status='in_game';s.phaseEndsAt=30000;return s;}
test('worker startup failure falls back to identical deterministic simulation',async()=>{
 const client=create(E,E.C,{workerFactory:()=>{throw Error('workers unsupported');}});
 const s=room(),pair={a:'a',b:null,pve:true};
 assert.deepEqual(await client.simulate(pair,1,s.players,7),E.simulate(pair,{round:1},s.players,7));
 const before=E.clone(s);assert.deepEqual(await client.advance(s,30000),E.advance(E.clone(s),30000,{recordEvents:false}));assert.deepEqual(s,before);client.close();
});
test('simulation worker imports the engine and sends matching init, replay and compact advance replies',()=>{
 const replies=[],context={self:{postMessage:message=>replies.push(message)},importScripts:url=>{assert.equal(url,'../../../functions/tactics/engine.js');context.self.DolphinTacticsCreateEngine=()=>E;}};
 vm.runInNewContext(fs.readFileSync(path.join(__dirname,'simulation-worker.js'),'utf8'),context);
 const send=(id,type,payload)=>context.self.onmessage({data:{id,type,payload}});
 send(1,'init',E.C);assert.equal(replies[0].result,true);
 const s=room();send(2,'simulate',{pair:{a:'a',b:null,pve:true},round:1,players:s.players,seed:7});assert.ok(replies[1].result.events.length);
 send(3,'advance',{state:s,now:30000});assert.equal(replies[2].result.roundPhase,'COMBAT');assert.equal(replies[2].id,3);
 send(4,'advance',{state:s,now:60000});assert.ok(replies[3].result.reports.every(r=>r.events.length===0));
 send(5,'advance',{state:s,now:60001});assert.match(replies[4].error,/Chưa hết/);
});
