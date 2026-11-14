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
 execFileSync('python3',['-c',`from pypdf import PdfReader
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
 console.log('PASS: 3 A4 PDF pages, correct sign pairs, no trailing blank page, linked BKK printed once');
 }finally{await browser.close();fs.rmSync(dir,{recursive:true,force:true});}
})().catch(e=>{console.error(e);process.exit(1)});
