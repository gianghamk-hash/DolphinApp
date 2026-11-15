'use strict';
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),out=path.join(root,'reports','ascension-preview');
fs.mkdirSync(out,{recursive:true});
const tiers=[['mythic',60,'HUYỀN THOẠI'],['polar',70,'CỰC QUANG'],['galaxy',80,'THIÊN HÀ'],['sovereign',90,'ĐẾ VƯƠNG'],['eternal',100,'VĨNH CỬU']];
const comparison='<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="crew-cosmetics.css"><link rel="stylesheet" href="crew-ascension.css"><style>body{margin:0;background:#03050b;color:#eff6ff;font-family:Arial;padding:40px}h1{font-size:28px;letter-spacing:.1em}p{color:#9ab0c8}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:24px;margin-top:28px}.demo{min-height:420px;border:1px solid #26344c;border-radius:24px;background:radial-gradient(ellipse at center,#11172b,#050811 75%);display:flex;flex-direction:column;align-items:center;justify-content:center;overflow:hidden}.portrait{height:285px;display:grid;place-items:center;width:100%}.hero-avatar{width:100px;height:100px;font-size:60px;display:grid;place-items:center;border-radius:50%;background:#07101e}.name{font-size:25px;font-weight:800;line-height:1.5}.level{font-size:11px;letter-spacing:.25em;margin-top:16px;color:#bccbdb}.label{font-size:12px;letter-spacing:.18em;margin:18px 0}</style></head><body><h1>DOLPHIN · ASCENSION</h1><p>Level 60 → 100 · Bộ sưu tập hiệu ứng cấp cao</p><div class="grid">'+tiers.map(([id,lv,title])=>'<section class="demo" data-demo="'+id+'"><div class="portrait"><div class="hero-avatar" data-frame="'+id+'" data-avatar-motion="'+(lv===60?'ascension':id)+'">🐬</div></div><span class="name" data-name-fx="'+(lv===60?'celestial':id)+'">Giang Dolphin</span><span class="level">LEVEL '+lv+'</span><span class="label">'+title+'</span></section>').join('')+'</div><script src="dolphin-avatars.js"></script></body></html>';
let fixture=fs.readFileSync(path.join(root,'dolphin-profile.html'),'utf8').replace(/<script\b[^>]*>[\s\S]*?<\/script>/g,'');
fixture=fixture.replace('</body>','<script>document.getElementById("profile-name").textContent="Giang Dolphin";const a=document.getElementById("profile-avatar");a.textContent="🐬";a.dataset.frame="eternal";a.dataset.avatarMotion="eternal";document.getElementById("profile-name").dataset.nameFx="eternal";document.getElementById("crew-profile-banner").dataset.crewCard="eternal";document.getElementById("crew-profile-banner").dataset.banner="eternal";document.getElementById("staff-level-tag").textContent="LEVEL 100";</script><script src="dolphin-avatars.js"></script></body>');
const server=http.createServer((req,res)=>{
 const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
 if(pathname==='/comparison.html'||pathname==='/profile-test.html'){res.setHeader('Content-Type','text/html; charset=utf-8');res.end(pathname==='/comparison.html'?comparison:fixture);return;}
 const file=path.resolve(root,'.'+pathname);if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
 if(!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404).end();return;}
 const mime={'.js':'text/javascript','.css':'text/css','.html':'text/html','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml'};
 res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');fs.createReadStream(file).pipe(res);
});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const url='http://127.0.0.1:'+server.address().port;
 const executable=process.env.BROWSER_PATH||(process.platform==='win32'?'C:/Program Files/Google/Chrome/Application/chrome.exe':null);
 const browser=await chromium.launch({headless:true,...(executable?{executablePath:executable}:{})});
 try{
  const page=await browser.newPage({viewport:{width:1320,height:1100},deviceScaleFactor:1});
  await page.route('**/*',route=>route.request().url().startsWith(url)?route.continue():route.abort());
  await page.goto(url+'/comparison.html');await page.waitForFunction(()=>window.DolphinFrameFX);
  await page.waitForTimeout(1600);
  const specs=await page.evaluate(()=>{
   const ids=['polar','galaxy','sovereign','eternal'];
   return ids.map(id=>{const node=document.querySelector('[data-demo="'+id+'"] .hero-avatar');const before=node.querySelectorAll('.crew-asc-system span').length;window.DolphinFrameFX.decorate(node);window.DolphinFrameFX.decorate(node);return{id,before,after:node.querySelectorAll('.crew-asc-system span').length,rings:node.querySelectorAll('.crew-asc-frame .crew-asc-orbit').length,particles:node.querySelectorAll('.crew-asc-frame .crew-asc-particle').length,animation:getComputedStyle(node.querySelector('.crew-asc-orbit')).animationName};});
  });
  assert.deepEqual(specs.map(s=>s.rings),[3,4,5,6]);assert.deepEqual(specs.map(s=>s.particles),[16,24,36,48]);
  specs.forEach((s,i)=>{assert.equal(s.before,s.after);assert.equal(s.animation,'asc-spin');if(i)assert.ok(s.before>specs[i-1].before);});
  await page.screenshot({path:path.join(out,'levels-60-100.png'),fullPage:true});
  await page.evaluate(()=>{const n=document.querySelector('[data-demo="eternal"] .hero-avatar');n.dataset.frame='none';n.dataset.avatarMotion='none';window.DolphinFrameFX.decorate(n);});
  assert.equal(await page.locator('[data-demo="eternal"] .crew-asc-system').count(),0);
  await page.setViewportSize({width:390,height:844});await page.goto(url+'/profile-test.html');await page.waitForTimeout(800);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'mobile profile must not overflow horizontally');
  await page.screenshot({path:path.join(out,'profile-level100-mobile.png'),fullPage:true});
  await page.emulateMedia({reducedMotion:'reduce'});
  assert.equal(await page.locator('.crew-asc-orbit').first().evaluate(n=>getComputedStyle(n).animationName),'none');
  console.log(JSON.stringify({tiers:specs,mobileOverflow:false,reducedMotion:true},null,2));
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
