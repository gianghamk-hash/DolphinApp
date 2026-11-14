'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const input=require('../dolphin-guest-table-input');
test('expands the reported A11-A16 booking, short ranges and mobile dash characters',()=>{
 const expected='A11,A12,A13,A14,A15,A16';
 for(const text of ['A11-A16',' a11 - a16 ','A11-16','A11–A16','A11—16'])assert.equal(input.normalize(text),expected);
 assert.equal(input.normalize('A1,A3-A4, E22'),'A1,A3,A4,E22');
 for(const zone of 'ABCDEJQL')assert.equal(input.normalize(zone+'1'),zone+'1');
});
test('rejects ambiguous, malformed, overlapping and excessive ranges without partial acceptance',()=>{
 for(const text of ['',null,'A0','A01','A1000','F1','A11-B16','A16-A11','A1 garbage','A1/2','A1,','A1,,A2','A1-A3,A3','A1-A61','A1-A60,B1'])assert.throws(()=>input.normalize(text),String(text));
 assert.equal(input.normalize('A1-A60').split(',').length,60);
});
function ui(raw,fail=false){
 const html=fs.readFileSync(require.resolve('../dolphin-guests.html'),'utf8');
 const code=html.slice(html.indexOf('function renderUnassigned(){'),html.indexOf('function updateMiniStats(){'));
 let sent=[],loads=0,toasts=[];
 const button={disabled:false},msg={textContent:''};
 const form={dataset:{unassigned:'0'},elements:{table:{value:raw}},querySelector:q=>q==='button'?button:msg};
 const box={innerHTML:'',querySelectorAll:()=>[form]};
 const nodes={unassignedBookings:box,assignTables:{}};
 const b={code:'DP4634118',name:'HDV Mr Hiếu',agent:'TH Ha Long Travel',pax:36,stt:'12',tbl:'',tb:[]};
 const context={B:[b],syncingSheets:false,status:'ok',foundName:'DOLPHIN 14.11',$:id=>nodes[id],esc:s=>s,
 window:{DolphinGuestTableInput:input,DolphinStaffId:{assignGuestTable:async p=>{sent.push(p);if(fail)throw Error('Bàn đã có booking khác.');return {ok:true,table:p.table};}}},
 toast:s=>toasts.push(s),load:async()=>loads++};
 vm.runInNewContext(code,context);context.renderUnassigned();
 return {submit:()=>form.onsubmit({preventDefault(){}}),sent,msg,button,toasts,loads:()=>loads};
}
test('real booking form sends expanded tables with exact BKK/STT/tab and only reloads on success',async()=>{
 const h=ui('A11-A16');await h.submit();
 assert.equal(h.sent.length,1);assert.equal(h.sent[0].table,'A11,A12,A13,A14,A15,A16');
 assert.equal(h.sent[0].code,'DP4634118');assert.equal(h.sent[0].stt,'12');assert.equal(h.sent[0].sheetName,'DOLPHIN 14.11');assert.equal(h.sent[0].expectedTable,'');
 assert.equal(h.loads(),1);assert.equal(h.toasts.length,1);
});
test('form validation and remote conflicts keep the form available without claiming a save',async()=>{
 const invalid=ui('A11-B16');await invalid.submit();assert.equal(invalid.sent.length,0);assert.equal(invalid.loads(),0);assert.equal(invalid.button.disabled,false);assert.match(invalid.msg.textContent,/cùng khu/);
 const conflict=ui('A11-A16',true);await conflict.submit();assert.equal(conflict.loads(),0);assert.equal(conflict.toasts.length,0);assert.equal(conflict.button.disabled,false);assert.match(conflict.msg.textContent,/booking khác/);
});
test('compact display groups consecutive tables only and includes every table in the range',()=>{
 assert.equal(input.compact('A11,A12,A13,A14,A15,A16'),'A11-A16');
 assert.equal(input.compact('A16,A12,A11,A15,A14,A13'),'A11-A16');
 assert.equal(input.compact('A11,A12,A13,A14,A16'),'A11-A14,A16');
 assert.equal(input.compact('A1,A2,A4,B1,B2'),'A1-A2,A4,B1-B2');
 assert.equal(input.compact('E22'),'E22');
 assert.equal(input.display('Bàn riêng khách VIP'),'Bàn riêng khách VIP');
 for(const value of ['A11-A16','A1,A3-A5,E22','L998-L999'])
  assert.equal(input.normalize(input.compact(value)),input.normalize(value));
});
