'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),{create,opponentText,COMBAT_ANNOUNCEMENT_MS}=require('./phase-banner');
function state(){return {seed:42,status:'in_game',round:4,roundPhase:'COMBAT',phaseStartedAt:1000,players:{a:{displayName:'Giang'},b:{displayName:'Lan & Nguyễn'}},pairs:[{a:'a',b:'b',pve:false,ghost:false}]};}
function harness(){
 let time=1000;const timers=new Map(),element={className:'',textContent:'',title:''};let sequence=0;
 const banner=create(element,{clock:()=>time,setTimeout:(fn,delay)=>{timers.set(++sequence,{fn,delay});return sequence;},clearTimeout:id=>timers.delete(id)});
 return {element,banner,timers,time:n=>{time=n;}};
}
test('opponent name, round and ghost/PvE identity are explicit for either side of a pair',()=>{
 const s=state();assert.equal(opponentText(s,'a'),'⚔ VÒNG 4 — ĐỐI THỦ: Lan & Nguyễn');
 assert.match(opponentText(s,'b'),/ĐỐI THỦ: Giang/);
 s.pairs[0].ghost=true;assert.match(opponentText(s,'a'),/BÓNG MA CỦA: Lan & Nguyễn/);
 s.pairs=[{a:'a',b:null,pve:true}];assert.match(opponentText(s,'a'),/ĐẤU QUÁI PvE/);assert.equal(opponentText(s,'b'),'');
});
test('combat announcement auto-hides after four seconds and shop updates never restart it',()=>{
 const h=harness(),s=state();h.banner.update(s,'a');assert.equal(h.element.className,'combat');
 assert.equal([...h.timers.values()][0].delay,COMBAT_ANNOUNCEMENT_MS);
 h.time(2500);h.banner.update(s,'a');assert.equal([...h.timers.values()][0].delay,2500);
 [...h.timers.values()][0].fn();assert.equal(h.element.className,'hidden');
 h.banner.update(s,'a');assert.equal(h.element.className,'hidden');
});
test('late reconnect does not flash an expired banner; next round announces the new opponent',()=>{
 const h=harness(),s=state();h.time(8000);h.banner.update(s,'a');assert.equal(h.element.className,'hidden');
 s.round=6;s.phaseStartedAt=8000;s.players.b.displayName='Minh';h.banner.update(s,'a');assert.match(h.element.textContent,/VÒNG 6.*Minh/);assert.equal(h.element.className,'combat');
});
test('phase change and room leave cancel pending banner callbacks',()=>{
 const h=harness(),s=state();h.banner.update(s,'a');const stale=[...h.timers.values()][0].fn;
 s.roundPhase='PREPARATION';s.phaseStartedAt=2000;h.banner.update(s,'a');stale();assert.equal(h.element.className,'');assert.match(h.element.textContent,/CHUẨN BỊ/);
 h.banner.clear();assert.equal(h.timers.size,0);assert.equal(h.element.className,'hidden');
 s.status='finished';h.banner.update(s,'a');assert.equal(h.element.className,'hidden');
});
