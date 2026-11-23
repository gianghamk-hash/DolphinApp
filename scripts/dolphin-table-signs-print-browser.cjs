'use strict';
const {chromium}=require('playwright');
const assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs'),os=require('node:os'),{execFileSync}=require('node:child_process');
const signs=require('../dolphin-table-signs.js');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'dolphin-a4-'));
 try{
 const page=await browser.newPage();
 const art='data:image/png;base64,'+fs.readFileSync(path.join(__dirname,'..',signs.ART)).toString('base64');
 const rows=[{code:'DP1 + DP2',name:'WILLEE JI YANG',tbl:'E22'},
 {code:'DP2',name:'WILLEE JI YANG',tbl:'E22'},
 ...[23,24,25].map(n=>({code:'DP'+n,name:'Guest '+n,tbl:'E'+n})),{code:'DP-A',name:'Guest A',tbl:'A1'}];
 await page.setContent(signs.documentHtml(signs.collect(rows),{assetUrl:art}));
 await page.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.images].map(i=>i.decode()));});
 assert.equal(await page.locator('.sign').count(),5);
 await page.emulateMedia({media:'print'});
 assert.equal(await page.locator('.sheet').evaluateAll(s=>s.every(p=>[...p.querySelectorAll('.sign')].every(x=>x.offsetTop+x.offsetHeight<=p.clientHeight))),true);
 const pdf=path.join(dir,'print.pdf');await page.pdf({path:pdf,preferCSSPageSize:true,printBackground:true});
 execFileSync(process.platform==='win32'?'py':'python3',['-c',`from pypdf import PdfReader
import sys
r=PdfReader(sys.argv[1]); assert len(r.pages)==3, len(r.pages)
for p in r.pages:
 assert abs(float(p.mediabox.width)-595.28)<1
 assert abs(float(p.mediabox.height)-841.89)<1
texts=[p.extract_text() for p in r.pages]
assert 'A1' in texts[0]
assert 'E22' in texts[1] and 'E23' in texts[1]
assert 'E24' in texts[2] and 'E25' in texts[2]
assert sum(t.count('WILLEE') for t in texts)==1
`,pdf]);
 const previousSize=await page.locator('.sign').first().boundingBox();
 const bungalow=signs.collectBungalows(['201','202','203','204'],{
  201:{customerName:'Lan & Mai',restaurantTable:'A5 / A6'},202:{customerName:'Minh',restaurantTable:8},
  203:{customerName:'An',restaurantTable:'J9'},204:{customerName:'Thiếu số bàn'}
 });
 await page.setContent(signs.documentHtml(bungalow,{assetUrl:art}));
 await page.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.images].map(i=>i.decode()));});
 const currentSize=await page.locator('.sign').first().boundingBox();
 assert.deepEqual(currentSize,previousSize,'same physical stock and placement as Guest List');
 assert.equal(await page.locator('.fields>div').count(),9);
 assert.equal(await page.locator('.sheet').count(),2);
 assert.equal(await page.locator('.sign').first().innerText(),'Bungalow 201\nTên khách: Lan & Mai\nSố bàn: A5 / A6');
 const bungalowPdf=path.join(dir,'bungalow.pdf');
 await page.pdf({path:bungalowPdf,preferCSSPageSize:true,printBackground:true});
 execFileSync(process.platform==='win32'?'py':'python3',['-c',`from pypdf import PdfReader
import sys
r=PdfReader(sys.argv[1]); assert len(r.pages)==2
for p in r.pages:
 assert abs(float(p.mediabox.width)-595.28)<1 and abs(float(p.mediabox.height)-841.89)<1
text=[p.extract_text() for p in r.pages]
assert 'Bungalow 201' in text[0] and 'Bungalow 202' in text[0] and 'Bungalow 203' in text[1]
assert all('Booking Code' not in t and 'Travel Agency' not in t and '204' not in t for t in text)
`,bungalowPdf]);
 // Exercise the actual Bungalow button, current assignment state and native handoff.
 const native=await browser.newPage({userAgent:'Android DolphinManager/1.0 DolphinPrint/1'});
 const source=fs.readFileSync(path.join(__dirname,'../dolphin-bungalow.html'),'utf8');
 const handler=source.match(/window\.openBungalowSigns=function\(\)\{[\s\S]*?\n\};/)[0];
 await native.route('https://dolphin.test/**',route=>{
  if(route.request().url().endsWith('.png'))return route.fulfill({contentType:'image/png',body:fs.readFileSync(path.join(__dirname,'..',signs.ART))});
  return route.fulfill({contentType:'text/html; charset=utf-8',body:source.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'').replace(/<link\b[^>]*>/gi,'')});
 });
 await native.goto('https://dolphin.test/dolphin-bungalow.html');
 await native.addScriptTag({path:path.join(__dirname,'../dolphin-table-signs.js')});
 await native.addScriptTag({content:"const ALL_BUNGALOW=['201','202'];const state={currentRole:'reception',tableAssignments:{201:{customerName:'Mẫu kiểm thử',restaurantTable:'A6'}}};"+handler});
 await native.evaluate(()=>{window.prompt=(key,data)=>{window.paper={key,data};return 'ok';};});
 await native.locator('#view-reception button').filter({hasText:'In biển Bungalow'}).evaluate(el=>el.click());
 await native.frameLocator('iframe').getByRole('button',{name:'In / Lưu PDF'}).click();
 const print=await native.evaluate(()=>window.paper);
 assert.equal(print.key,'dolphin:print-bungalow');assert.match(print.data,/Mẫu kiểm thử/);assert.match(print.data,/A6/);
 assert.match(print.data,/data:image\/png;base64,/);assert.doesNotMatch(print.data,/<script|<iframe|https?:\/\//i);
 await native.getByRole('button',{name:'← Đóng bản xem trước'}).click();assert.equal(await native.locator('iframe').count(),0);
 if(process.env.COMPANION_QA_OUTPUT){fs.mkdirSync(process.env.COMPANION_QA_OUTPUT,{recursive:true});fs.copyFileSync(bungalowPdf,path.join(process.env.COMPANION_QA_OUTPUT,'mau-bien-bungalow.pdf'));}
 console.log('PASS: Bungalow print preview, native snapshot, A4 pairs; Guest List: 3 A4 PDF pages, correct sign pairs, no trailing blank page, linked BKK printed once');
 }finally{await browser.close();fs.rmSync(dir,{recursive:true,force:true});}
})().catch(e=>{console.error(e);process.exit(1)});
