'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const sign=require('../dolphin-table-signs.js');
const guest=fs.readFileSync(path.join(__dirname,'..','dolphin-guests.html'),'utf8');
const sample=[
 {stt:'1',code:'DP4605789',name:'Đoàn Đình Giang',agent:'Klook',tbl:'E16',tb:['E16']},
 {stt:'2',code:'DP4605790',name:'PHƯƠNG ANH',agent:'KTOUR',tbl:'E17',tb:['E17']}
];
test('original Word art is committed and has valid PNG dimensions',()=>{
 const asset=fs.readFileSync(path.join(__dirname,'..',sign.ART));
 assert.equal(asset.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
 assert.equal(asset.readUInt32BE(16),600);
 assert.equal(asset.readUInt32BE(20),424);
});
test('original sample signs retain text fields, sequence and US Letter 2-per-page format',()=>{
 const data=sign.collect(sample),out=sign.documentHtml(data,{date:'2026-11-14',tour:'am'});
 assert.equal(data.total,2);
 assert.equal(sign.pagesOf(data).length,1);
 assert.match(out,/Booking Code: DP4605789/);
 assert.match(out,/Guest’s Name:<strong style="font-size:18pt">Đoàn Đình Giang/);
 assert.match(out,/Travel Agency :Klook/);
 assert.match(out,/Table Number :<strong>E16/);
 assert.match(out,/Booking Code: DP4605790/);
 assert.ok(out.indexOf('E16')<out.indexOf('E17'));
 assert.match(out,/@page\{size:letter;margin:0\}/);
 assert.match(out,/width:8.5in;height:11in/);
 assert.match(out,/width:6.5in;height:4.595833in/);
 assert.match(out,/top:5.28in/);
 assert.equal((out.match(/class="sign"/g)||[]).length,2);
});
test('range parser supports A,B,C,D,E,J,Q,L and Lounge aliases',()=>{
 assert.deepEqual(sign.parseTables('A1-A3, B8, C2, D11, E16, J1, Q4, Lounge 5'),
  ['A1','A2','A3','B8','C2','D11','E16','J1','Q4','L5']);
 assert.deepEqual(sign.parseTables('Lounge 1-3; L2; B20–B21'),['L1','L2','L3','B20','B21']);
 assert.deepEqual(sign.parseTables('J3-Q9, F1, R2, A101-A999'),[]);
});
test('each booking/table has a sign, no duplicate for same booking, sort by area + table number',()=>{
 const bookings=[
  {code:'DP1',name:'A',agent:'Klook',tb:['Q10','A2','A1','A1','L2']},
  {code:'DP2',name:'B',agent:'Ktour',tbl:'A10 / Q1 / Lounge 1'},
  {code:'DP1',name:'A',agent:'Klook',tb:['Q10']}
 ];
 const d=sign.collect(bookings);
 assert.deepEqual(d.areas.A.map(x=>x.room),['A1','A2','A10']);
 assert.deepEqual(d.areas.Q.map(x=>x.room),['Q1','Q10']);
 assert.deepEqual(d.areas.L.map(x=>x.room),['L1','L2']);
 assert.equal(d.total,7);
 assert.equal(d.duplicates.length,0);
});
test('eight areas never mix within one printed page, including odd page endings',()=>{
 const rows=[
  ...Array.from({length:3},(_,i)=>({code:'DP-A'+i,agent:'X',name:'A',tb:['A'+(i+1)]})),
  ...Array.from({length:2},(_,i)=>({code:'DP-B'+i,agent:'Y',name:'B',tb:['B'+(i+1)]})),
  {code:'DP-L',agent:'Z',name:'L',tbl:'LOUNGE 3'}
 ];
 const data=sign.collect(rows),pages=sign.pagesOf(data);
 assert.deepEqual(pages.map(p=>[p.area,p.records.length]),[['A',2],['A',1],['B',2],['L',1]]);
 assert.ok(pages.every(p=>p.records.every(r=>r.area===p.area)));
 const only=sign.documentHtml(data,{selectedAreas:['L']});
 assert.equal((only.match(/class="sheet"/g)||[]).length,1);
 assert.doesNotMatch(only,/Booking Code: DP-A/);
 assert.match(only,/Table Number :<strong>L3/);
});
test('detect table conflicts without hiding any booking and notify missing table numbers',()=>{
 const data=sign.collect([
  {code:'DP1',name:'One',tb:['E16']},
  {code:'DP2',name:'Two',tb:['E16']},
  {code:'DP3',name:'Three',tb:[],tbl:''}
 ]);
 assert.equal(data.total,2);
 assert.equal(data.duplicates.length,1);
 assert.equal(data.duplicates[0].room,'E16');
 assert.equal(data.missing,1);
 const html=sign.documentHtml(data);
 assert.match(html,/bàn xuất hiện ở nhiều booking/);
 assert.match(html,/booking chưa có số bàn hợp lệ/);
});
test('escape booking and agency HTML before injecting into printable page',()=>{
 const d=sign.collect([{code:'DP<script>',name:'A<img src=x onerror=alert(1)>',agent:'<svg onload=alert(1)>',tb:['J2']}]);
 const html=sign.documentHtml(d);
 assert.doesNotMatch(html,/<img src=x onerror/);
 assert.doesNotMatch(html,/<svg onload/);
 assert.doesNotMatch(html,/<script>(?:DP|alert)/);
 assert.match(html,/DP&lt;script&gt;/);
 assert.match(html,/A&lt;img/);
});
test('button runs on current tour and source bookings, with no database writes',()=>{
 assert.match(guest,/id="printSigns"/);
 assert.match(guest,/dolphin-table-signs\.js\?v=word-print-20261114/);
 assert.match(guest,/DolphinGuestTableSigns\.openPrint\(B,\{date:curDate,tour:tour\}\)/);
 assert.match(guest,/printSigns'\)\.disabled=status!=='ok'\|\|!B\.length/);
 const js=fs.readFileSync(path.join(__dirname,'..','dolphin-table-signs.js'),'utf8');
 assert.doesNotMatch(js,/setDoc\(|runTransaction\(|updateDoc\(|DolphinStaffId\.performLiveAction/);
});

test('preview and print filter the same selected zones and omit the trailing blank sheet',()=>{
 const data=sign.collect([
  {code:'DP-A',name:'A',tb:['A1']},
  {code:'DP-E',name:'E',tb:['E1']},
  {code:'DP-L',name:'L',tb:['L1']}
 ]);
 const html=sign.documentHtml(data);
 assert.match(html,/\.sheet\.is-hidden\{display:none!important\}/);
 assert.match(html,/\.sheet\.is-last-visible\{page-break-after:auto;break-after:auto\}/);
 assert.match(html,/last\.classList\.add\("is-last-visible"\)/);
 assert.match(html,/document\.getElementById\("print"\)\.disabled=!n/);
 assert.match(html,/await Promise\.all\(imgs\.map/,'Browser should wait for artwork to decode');
 assert.equal((html.match(/class="sheet" data-area=/g)||[]).length,3);
 assert.deepEqual(sign.pagesOf(data,['E']).map(p=>p.area),['E']);
});
