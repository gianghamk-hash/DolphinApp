'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const source=fs.readFileSync(require('node:path').join(__dirname,'../dolphin-soundscape.js'),'utf8');
function load(url,{blocked=false,tracks=[]}={}){
 const requests=[],ctx={URL,AbortController,console:{log(){},warn(){}},setTimeout,clearTimeout,setInterval(){},clearInterval(){},document:{currentScript:{src:url},readyState:'loading',addEventListener(){},body:{getAttribute(){return null}}},localStorage:{getItem(){if(blocked)throw Error('blocked');return null},setItem(){if(blocked)throw Error('blocked')}},fetch:async url=>{requests.push(url);return {ok:true,json:async()=>({tracks})}},addEventListener(){}};
 ctx.window=ctx;vm.runInNewContext(source,ctx);return {sound:ctx.DolphinSound,requests};
}
for(const [script,expected] of [['https://dolphinfb.store/dolphin-soundscape.js?v=2.5','https://dolphinfb.store/sounds/manifest.json'],['https://example.github.io/DolphinApp/dolphin-soundscape.js','https://example.github.io/DolphinApp/sounds/manifest.json']]){
 test('music manifest resolves from script location: '+script,async()=>{const x=load(script,{tracks:[{key:'default',file:'soundscape-default.mp3'}]});await x.sound.refreshTracks(true);assert.ok(x.requests[0].startsWith(expected));assert.equal(x.sound.getTracks().length,1)});
}
test('invalid manifest and unavailable storage preserve 15-track library',async()=>{const x=load('https://dolphinfb.store/dolphin-soundscape.js',{blocked:true,tracks:[null,{key:'bad',file:'../../bad.mp3'}]});await x.sound.refreshTracks(true);assert.equal(x.sound.getTracks().length,15);assert.equal(x.sound.getVolume(),.3);assert.equal(x.sound.getMode(),'auto')});
