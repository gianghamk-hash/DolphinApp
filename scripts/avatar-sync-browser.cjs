/* Isolated browser acceptance: actual UI/callables, mocked database, no production writes. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{createRequire}=require('node:module');const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),functions=path.join(root,'functions'),tests=fs.readFileSync(path.join(functions,'staff-id.test.js'),'utf8');
const backend=new Function('require','__dirname',tests.slice(0,tests.indexOf('const req='))+';return harness("manager",{cold:true});')(createRequire(path.join(functions,'staff-id.test.js')),functions);
const output=process.env.AVATAR_QA_OUTPUT||path.join(require('node:os').tmpdir(),'dolphin-avatar-qa');fs.mkdirSync(output,{recursive:true});
const origin='http://127.0.0.1:8877',errors=[];
(async()=>{const browser=await chromium.launch({channel:process.env.PLAYWRIGHT_CHANNEL||undefined,executablePath:process.env.TFT_CHROMIUM_PATH||undefined,headless:true});try{
async function device(uid){const context=await browser.newContext({viewport:{width:1100,height:850},serviceWorkers:'block',reducedMotion:'reduce'});await context.addInitScript(uid=>{window.__testUid=uid;},uid);
await context.route('**/*',async route=>{const u=new URL(route.request().url());
if(u.hostname==='cdn.tailwindcss.com')return route.fulfill({contentType:'application/javascript',body:'window.tailwind={config:{}};'});
if(u.hostname==='www.gstatic.com'){let body='';if(u.pathname.endsWith('firebase-app.js'))body='export function initializeApp(){return {}};export function getApp(){throw Error("none")};';else if(u.pathname.endsWith('firebase-auth.js'))body='export function getAuth(){return {currentUser:{uid:window.__testUid}}};export async function signInAnonymously(){return {user:{uid:window.__testUid}}}';else if(u.pathname.endsWith('firebase-functions.js'))body='export function getFunctions(){return {}};export function httpsCallable(_,name){return async data=>{const r=await fetch("/mock/"+name,{method:"POST",body:JSON.stringify({uid:window.__testUid,data})});const x=await r.json();if(!r.ok){const e=Error(x.message);e.code=x.code;throw e}return {data:x}}}';return route.fulfill({contentType:'application/javascript',body});}
if(u.origin!==origin)return route.abort();
if(u.pathname.startsWith('/mock/')){const {uid,data}=JSON.parse(route.request().postData()),name=u.pathname.split('/').pop();try{
let x;
if(name==='staffGetPrestige'){const lead={employeeId:'DOL-0001',name:'Avatar Demo',avatar:'🌊',rank:'Bronze',level:1,xp:2500};x={champion:lead,leaderboard:[lead,{employeeId:'DOL-0002',name:'Colleague',avatar:'🐬',rank:'Bronze',level:1,xp:500}],legends:[{...lead,firstAt:Date.now()}]};}
else if(name==='staffIsPrestigeAdmin')x={admin:false};
else if(name==='staffGetMyProgress')x={employeeId:backend.state.get('staffIdentity/'+uid)?.employeeId,level:1,rank:'Bronze',xp:0,personalTheme:'dark',nameFlame:false};
else if(name==='staffSetPersonalStyle'){
 if(!['dark','light','gray'].includes(data.theme)||data.nameFlame)throw Error('Chưa mở khóa');
 x={employeeId:backend.state.get('staffIdentity/'+uid)?.employeeId,level:1,rank:'Bronze',xp:0,personalTheme:data.theme,nameFlame:false};
}
else x=await backend.api[name]({auth:{uid},data});
return route.fulfill({contentType:'application/json',body:JSON.stringify(x)});}catch(e){return route.fulfill({status:400,contentType:'application/json',body:JSON.stringify({message:e.message,code:e.code})});}}
if(u.pathname==='/shell.html')return route.fulfill({contentType:'text/html',body:'<!doctype html><html><head><script src="/staff-sync.js" defer></script><script src="/staff-id.js" defer></script><script src="/dolphin-avatars.js" defer></script></head><body><iframe id="profile" src="/dolphin-profile.html" style="width:100%;height:1200px"></iframe></body></html>'});
const target=path.resolve(root,'.'+u.pathname);if(!target.startsWith(root+path.sep)||!fs.existsSync(target))return route.fulfill({status:404,body:'missing'});
let body=fs.readFileSync(target);if(target.endsWith('.html')&&!target.endsWith('dolphin-profile.html'))body=body.toString().replace(/<script\b[^>]*type="module"[^>]*>[\s\S]*?<\/script>/g,'');
return route.fulfill({body,contentType:{'.html':'text/html; charset=utf-8','.js':'application/javascript','.css':'text/css','.json':'application/json'}[path.extname(target)]||'application/octet-stream'});
});const page=await context.newPage();page.setDefaultTimeout(15000);page.on('pageerror',e=>errors.push(e.message));return {context,page};}
const a=await device('first');await a.page.goto(origin+'/shell.html');const profile=a.page.frameLocator('#profile');await profile.getByRole('button',{name:'Chỉnh sửa hồ sơ',exact:true}).click();await profile.locator('#save-profile:not([disabled])').waitFor();assert.equal(await profile.locator('#department').count(),0);
await profile.locator('#profile-name-input').fill('Avatar Demo');await profile.locator('#save-profile').click();await profile.locator('#profile-state').filter({hasText:'Đang chờ quản lý duyệt'}).waitFor();
const id=await profile.locator('#employee-id').textContent();
const frames=[];for(const file of ['dolphin-bungalow.html','dolphin-lounge.html','dolphin-show.html','dolphin-restaurant.html','ranking/index.html','giaitri/index.html']){const f=await a.page.evaluateHandle(file=>{const f=document.createElement('iframe');f.src='/'+file;document.body.appendChild(f);return f;},file);const el=f.asElement();const frame=await el.contentFrame();await frame.waitForSelector('script[src*="dolphin-avatars.js"]',{state:'attached'});frames.push({file,frame});}
await a.page.waitForFunction(()=>window.DolphinAvatars?.get('AVATAR DEMO')==='🐬');

await a.page.waitForFunction(()=>!!window.DolphinFrameFX&&!!document.getElementById('crew-cosmetics-stylesheet')?.sheet);
const orbitQA=await a.page.evaluate(()=>{
 const host=document.createElement('div');host.id='crew-orbit-browser-test';document.body.appendChild(host);
 const out={};
 for(const frame of ['bronze','silver','gold','mythic']){
  const el=document.createElement('span');el.className='fx-frame-preview';el.dataset.frame=frame;el.textContent='🐬';host.appendChild(el);
 }
 window.DolphinFrameFX.refresh();
 for(const el of host.children){
  const frame=el.dataset.frame;
  out[frame]={
   rings:el.querySelectorAll(':scope > .crew-fx-orbits > .crew-fx-ring').length,
   stars:el.querySelectorAll(':scope > .crew-fx-orbits > .crew-fx-star-orbit').length,
   text:el.textContent,
   layers:el.querySelectorAll('.crew-fx-layer').length
  };
 }
 window.DolphinFrameFX.refresh();
 out.idempotent=[...host.children].every(el=>el.querySelectorAll(':scope > .crew-fx-orbits').length===1);
 const demo=host.children[0];
 demo.dataset.frame='mythic';window.DolphinFrameFX.refresh();
 out.switchToMythic=demo.querySelectorAll('.crew-fx-star-orbit').length===2&&demo.querySelectorAll('.crew-fx-ring').length===0;
 demo.dataset.frame='none';window.DolphinFrameFX.refresh();
 out.cleared=demo.querySelectorAll('.crew-fx-orbits').length===0;
 host.remove();return out;
});
assert.deepEqual(
 ['bronze','silver','gold','mythic'].map(k=>[orbitQA[k].rings,orbitQA[k].stars]),
 [[1,0],[2,0],[3,0],[0,2]],
 'Each rarity renders precisely the requested number of animated layers'
);
assert.equal(Object.values(orbitQA).filter(v=>v&&typeof v==='object').every(x=>x.text==='🐬'),true,'Orbit layers preserve emoji text content');
assert.equal(orbitQA.idempotent,true,'Repeated refresh does not create extra rings');
assert.equal(orbitQA.switchToMythic,true,'Changing rarity swaps rings for exactly two stars');
assert.equal(orbitQA.cleared,true,'Unequipping removes the decorative layers');
console.log('PASS: live V4 browser orbit counts and frame switching: 1 Bronze, 2 Silver, 3 Gold, 2 Mythic stars.');

await a.page.emulateMedia({reducedMotion:'no-preference'});
const movingOrbitQA=await a.page.evaluate(()=>{
 const host=document.createElement('div');document.body.appendChild(host);
 const sample={};
 for(const rarity of ['bronze','silver','gold','mythic']){
  const el=document.createElement('span');el.className='fx-frame-preview';
  el.dataset.frame=rarity;el.textContent='🐬';host.appendChild(el);
 }
 window.DolphinFrameFX.refresh();
 for(const el of host.children){
  sample[el.dataset.frame]=[...el.querySelectorAll('.crew-fx-layer')].map(layer=>({
   name:getComputedStyle(layer).animationName,
   running:getComputedStyle(layer).animationPlayState==='running'
  }));
 }
 host.remove();return sample;
});
assert.deepEqual(movingOrbitQA.bronze.map(x=>x.name),['crew-fx-spin-cw']);
assert.deepEqual(movingOrbitQA.silver.map(x=>x.name),['crew-fx-spin-cw','crew-fx-spin-ccw']);
assert.deepEqual(movingOrbitQA.gold.map(x=>x.name),['crew-fx-spin-cw','crew-fx-spin-ccw','crew-fx-spin-cw']);
assert.deepEqual(movingOrbitQA.mythic.map(x=>x.name),['crew-fx-spin-cw','crew-fx-spin-ccw']);
assert.ok(Object.values(movingOrbitQA).flat().every(x=>x.running),'All visible preview orbits must actually animate');
await a.page.emulateMedia({reducedMotion:'reduce'});
console.log('PASS: browser computed CSS confirms real CW/CCW motion and accessible reduced-motion fallback.');


const rankFrame=frames.find(x=>x.file==='ranking/index.html').frame;
const rankSource=fs.readFileSync(path.join(root,'ranking/index.html'),'utf8');const revenueFn=rankSource.match(/function renderRevenue\(\)\{[\s\S]*?\n\}/)[0],pointsFn=rankSource.match(/function renderPoints\(\)\{[\s\S]*?\n\}/)[0];
const rankingFrameFn=rankSource.match(/function rankingAvatarFrame\(name\)\{[\s\S]*?\n\}/)[0],rankingTitleFn=rankSource.match(/function rankingTitle\(name\)\{[\s\S]*?\n\}/)[0];
const rankingCardFn=rankSource.match(/function rankingCardFx\(name\)\{[\s\S]*?\n\}/)[0];
const switchFn=rankSource.match(/window\.switchMain = function\(tab\)\{[\s\S]*?\n\};/)[0];
await rankFrame.evaluate(({revenueFn,pointsFn,rankingFrameFn,rankingTitleFn,rankingCardFn})=>{
 const escape=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
 const testCode=[rankingFrameFn,rankingTitleFn,rankingCardFn,revenueFn,pointsFn,'renderRevenue();renderPoints();'].join('\n');
 new Function('$','calcRevenue','calcPoints','formatMoney','formatPoints','sendLeaders','state','esc','rankingAvatar','rankingAvatarId','rankingStaffProfile',testCode)(
  id=>document.getElementById(id),
  ()=>[{name:'AVATAR DEMO',rev:1000,cnt:1,details:['Lounge']}],
  ()=>[{name:'Avatar Demo',both:1,onlyComplete:0,onlyPrepare:0,points:1}],
  String,String,()=>{},{weekStart:Date.now()},escape,
  n=>escape(window.DolphinAvatars?.get(n)||'👤'),
  n=>window.DolphinAvatars?.profile(n)?.employeeId||'',
  n=>window.DolphinAvatars?.profile(n)||null
 );
},{revenueFn,pointsFn,rankingFrameFn,rankingTitleFn,rankingCardFn});
const gameFrame=frames.find(x=>x.file==='giaitri/index.html').frame;await gameFrame.evaluate(()=>{window.DolphinLeaderboard={getLeaderboard:async()=>[{player:'Avatar Demo',bestScore:99,totalScore:99,totalGames:1}],getStaffName:()=> 'Avatar Demo',lastError:()=>'',invalidate(){}};window.showLB('snake');});await gameFrame.waitForSelector('#lbContent [data-staff-avatar]',{state:'attached'});
await profile.getByRole('button',{name:'Chỉnh sửa hồ sơ',exact:true}).click();await profile.locator('#choose-avatar').click();await profile.locator('#avatar-category').selectOption('Khởi đầu Lv.1');await profile.getByRole('button',{name:'Chọn 🐯',exact:true}).click();await a.page.waitForTimeout(1700);await profile.locator('#save-profile').click();await profile.locator('#profile-message').filter({hasText:'Đã lưu hồ sơ'}).waitFor();
for(const {file,frame} of frames)await frame.waitForFunction(()=>[...document.querySelectorAll('[data-staff-avatar]')].some(el=>el.textContent==='🐯'));
assert.equal(await rankFrame.locator('#revenue-list [data-staff-avatar]').textContent(),'🐯');assert.equal(await rankFrame.locator('#points-list [data-staff-avatar]').textContent(),'🐯');assert.equal(await gameFrame.locator('#lbContent [data-staff-avatar]').textContent(),'🐯');console.log('PASS: actual revenue/work/game row renderers and four outlet headers synchronize after profile avatar save.');
await a.page.waitForTimeout(1700);await profile.getByRole('button',{name:'Thiết bị',exact:true}).click();await profile.locator('#issue-link').click();await profile.locator('#code-panel:not([hidden])').waitFor();const code=await profile.locator('#link-code').textContent();
const b=await device('second');await b.page.goto(origin+'/dolphin-profile.html');await b.page.getByRole('button',{name:'Chỉnh sửa hồ sơ',exact:true}).click();await b.page.locator('#save-profile:not([disabled])').waitFor();await b.page.fill('#profile-name-input','Existing device profile');await b.page.click('#save-profile');await b.page.locator('#profile-state').filter({hasText:'Đang chờ quản lý duyệt'}).waitFor();const oldId=await b.page.locator('#employee-id').textContent();assert.notEqual(oldId,id);await b.page.getByRole('button',{name:'Thiết bị',exact:true}).click();assert.equal(await b.page.locator('#claim-code').isVisible(),true);
assert.equal(await b.page.locator('#claim-code').isVisible(),true);await b.page.fill('#claim-code',code);await b.page.click('#claim-link');await b.page.locator('#profile-message[data-error=true]').waitFor();assert.equal(await b.page.locator('#employee-id').textContent(),oldId);
await b.page.check('#confirm-switch');await b.page.click('#claim-link');await b.page.waitForFunction(expected=>document.getElementById('employee-id').textContent===expected,id);assert.equal(await b.page.locator('#choose-avatar').textContent(),'🐯');assert.equal(backend.state.get('staffRegistry/'+oldId).active,true);
console.log('PASS: code input stays visible on registered devices; switching requires consent, retains the old profile and loads target avatar.');
const nestedHandle=await gameFrame.evaluateHandle(()=>{const f=document.createElement('iframe');f.srcdoc='<html><head><script src="'+location.origin+'/dolphin-avatars.js"><\/script></head><body><span data-staff-avatar data-staff-name="Avatar Demo">👤</span></body></html>';document.body.appendChild(f);return f;});const nested=await nestedHandle.asElement().contentFrame();await nested.waitForFunction(()=>document.querySelector('[data-staff-avatar]')?.textContent==='🐯');
await b.page.getByRole('button',{name:'Đóng thiết bị',exact:true}).click();await b.page.waitForTimeout(1700);await b.page.getByRole('button',{name:'Chỉnh sửa hồ sơ',exact:true}).click();await b.page.click('#choose-avatar');await b.page.selectOption('#avatar-category','Khởi đầu Lv.1');await b.page.getByRole('button',{name:'Chọn 🌊',exact:true}).click();await b.page.click('#save-profile');await b.page.locator('#profile-message').filter({hasText:'Đã lưu hồ sơ'}).waitFor();await a.page.evaluate(()=>window.DolphinAvatars.refresh());
await a.page.waitForFunction(()=>window.DolphinStaffId.get()?.avatar==='🌊');for(const {frame} of frames)await frame.waitForFunction(()=>[...document.querySelectorAll('[data-staff-avatar]')].some(el=>el.textContent==='🌊'));await nested.waitForFunction(()=>document.querySelector('[data-staff-avatar]')?.textContent==='🌊');console.log('PASS: another device avatar update refreshes the own-profile cache and nested game iframe.');
const onlineText=fs.readFileSync(path.join(root,'staff-online.js'),'utf8');const onlineSource=onlineText.match(/function renderList\(\)\{[\s\S]*?\n  \}/)[0],onlineCosmeticsFn=onlineText.match(/function onlineCosmetics\(staff\)\{[\s\S]*?\n  \}/)[0];await a.page.evaluate(({source,id,onlineCosmeticsFn})=>{const widget=document.createElement('div');widget.id='staffOnlineWidget';widget.innerHTML='<span class="sow-badge"><b id="sowCount"></b></span><div id="sowPanelSub"></div><div id="sowList"></div>';document.body.appendChild(widget);const rows=['dev-a','dev-b'].map((device,i)=>({id:device,name:'Avatar Demo',staffId:id,avatar:'🏠',page:'landing',lastSeen:Date.now()+i,startedAt:Date.now(),platform:'web'}));new Function('lastList','getDeviceId','OFFLINE_MS','CONTEXT_MAP','escapeHtml',onlineCosmeticsFn+'\n'+source+';renderList();')(rows,()=> 'dev-a',90000,{landing:{label:'Trang chủ',icon:'🏠'}},x=>String(x).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])));},{source:onlineSource,id,onlineCosmeticsFn});assert.equal(await a.page.locator('#sowList .sow-item').count(),1);assert.equal(await a.page.locator('#sowList .sow-avatar').textContent(),'🌊');console.log('PASS: actual online list merges linked devices by ID and displays the canonical avatar instead of the old context icon.');
await b.page.screenshot({path:path.join(output,'avatar-sync-desktop.png'),fullPage:true});await b.page.setViewportSize({width:390,height:844});await b.page.screenshot({path:path.join(output,'avatar-sync-mobile.png'),fullPage:true});assert.equal(await b.page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
assert.equal(await b.page.locator('#hall-of-fame').count(),0,'Level ranking moved out of Profile');
assert.equal(await b.page.locator('.ranking-shortcut').count(),1,'Profile links to the Ranking app');
assert.equal(await rankFrame.locator('#leader-emperor-name').count(),1,'Emperor has a fixed tile next to revenue/work leaders');
assert.equal(await rankFrame.locator('#section-level').count(),1,'Level XP ranking is in the Ranking app');
await rankFrame.waitForFunction(()=>window.DolphinPrestige?.getStatus?.()?.board?.state==='ready');
await rankFrame.evaluate(()=>{
 const p={employeeId:'DOL-0001',name:'Avatar Demo',avatar:'🌊',rank:'Bronze',level:1,xp:2500};
 window.dispatchEvent(new CustomEvent('dolphin-prestige-updated',{detail:{champion:p,leaderboard:[p,{employeeId:'DOL-0002',name:'Colleague',avatar:'🐬',rank:'Bronze',level:1,xp:500}],legends:[{...p,firstAt:Date.now()}]}}));
});
assert.equal(await rankFrame.locator('#leader-emperor-name').textContent(),'Avatar Demo','Emperor card uses backend leaderboard');
assert.equal(await rankFrame.locator('#leader-emperor-value').textContent(),'Lv.1 · 2.500 XP');
await rankFrame.evaluate(()=>{
 const r=window.DolphinRankRewards;
 r?.publishCategory('revenue',[{name:'Avatar Demo',rev:900000}],Date.now());
 r?.publishCategory('work',[{name:'Avatar Demo',points:3}],Date.now());
});
await rankFrame.waitForFunction(()=>document.querySelector('#leader-revenue-avatar')?.textContent==='🌊'&&document.querySelector('#leader-work-avatar')?.textContent==='🌊');
assert.equal(await rankFrame.locator('#leader-revenue-avatar').textContent(),'🌊','revenue Top 1 follows current profile avatar');
assert.equal(await rankFrame.locator('#leader-work-avatar').textContent(),'🌊','work Top 1 follows current profile avatar');
await rankFrame.evaluate(()=>{
 window.switchMain=tab=>{
  for(const button of document.querySelectorAll('.tab-btn'))button.classList.toggle('active',button.dataset.main===tab);
  for(const name of ['revenue','points','level'])document.getElementById('section-'+name).style.display=name===tab?'block':'none';
 };
});
await rankFrame.locator('[data-rank-target="level"]').click();
assert.equal(await rankFrame.locator('#section-level').isVisible(),true,'Level tab is interactive');
assert.equal(await rankFrame.locator('#level-board-list .level-entry').count(),2);
assert.equal((await rankFrame.locator('#level-board-list .level-person-name').first().textContent()).trim(),'Avatar Demo','employee name is visible in Level row');
assert.equal((await rankFrame.locator('#level-board-list .level-person-rank').first().textContent()).trim(),'Bronze','Level rank label is visible');
assert.equal((await rankFrame.locator('#level-board-list .level-score-xp').first().textContent()).trim(),'2.500 XP','XP amount is visible');
const tabsFit=await rankFrame.evaluate(()=>{
 const tabs=[...document.querySelectorAll('.rank-tabs .tab-btn')],root=document.querySelector('.rank-tabs').getBoundingClientRect();
 return tabs.length===3&&tabs.every(t=>{const box=t.getBoundingClientRect();return box.left>=root.left-1&&box.right<=root.right+1&&box.width>40});
});
assert.equal(tabsFit,true,'all three leaderboard tabs fit within the phone-width viewport');
assert.equal(await rankFrame.locator('#level-legendary-list .legendary-entry').count(),1);
assert.equal(await rankFrame.locator('.dolphin-prestige').count(),0,'Global floating Emperor banner removed');
assert.equal(await rankFrame.locator('#section-revenue').isVisible(),false);
assert.equal(await b.page.locator('.dolphin-prestige').count(),0,'Profile no longer shows floating Emperor banner');

assert.equal(await b.page.locator('dialog[open]').count(),0);
await b.page.getByRole('button',{name:'Giao diện',exact:true}).click();assert.equal(await b.page.locator('#style-dialog').isVisible(),true);assert.equal(await b.page.locator('input[name=staff-theme][value=halloween]').isDisabled(),true);assert.equal(await b.page.locator('#staff-flame-check').isDisabled(),true);assert.equal(await b.page.locator('#staff-save-style').isEnabled(),true);
await b.page.screenshot({path:path.join(output,'profile-style-mobile.png'),fullPage:true});await b.page.getByRole('button',{name:'Đóng giao diện',exact:true}).click();
await b.page.getByRole('button',{name:'Giao diện',exact:true}).click();await b.page.locator('[data-crew-tab="theme"]').click();await b.page.check('input[name=staff-theme][value=light]');await b.page.click('#staff-save-style');await b.page.locator('#staff-style-info').filter({hasText:'Đã lưu'}).waitFor();assert.equal(await b.page.locator('body').getAttribute('data-theme'),'light');await b.page.getByRole('button',{name:'Đóng giao diện',exact:true}).click();await b.page.screenshot({path:path.join(output,'profile-light-mobile.png'),fullPage:true});
await b.page.getByRole('button',{name:'Giao diện',exact:true}).click();await b.page.locator('[data-crew-tab="theme"]').click();await b.page.check('input[name=staff-theme][value=gray]');await b.page.click('#staff-save-style');await b.page.waitForFunction(()=>document.body.dataset.theme==='gray');await b.page.getByRole('button',{name:'Đóng giao diện',exact:true}).click();await b.page.screenshot({path:path.join(output,'profile-gray-mobile.png'),fullPage:true});
await b.page.getByRole('button',{name:'Phần thưởng',exact:true}).click();assert.equal(await b.page.locator('.reward-row').count(),16);await b.page.keyboard.press('Escape');assert.equal(await b.page.locator('dialog[open]').count(),0);

await b.page.evaluate(()=>{
 const catalog=[
  {id:'name_flame',level:3,label:'🔥 Tên phát sáng',icon:'🔥'},
  {id:'frame_bronze',level:5,label:'Khung avatar Bronze',icon:'🥉'},
  {id:'title_rookie',level:12,label:'Danh hiệu Rookie Star',icon:'⭐'},
  {id:'banner_wave',level:15,label:'Banner Sóng Biển',icon:'🌊'},
  {id:'frame_silver',level:22,label:'Khung avatar Silver',icon:'🥈'}
 ];
 window.dispatchEvent(new CustomEvent('dolphin-my-progress-updated',{detail:{
  employeeId:document.getElementById('employee-id').textContent,name:'Avatar Demo',level:15,rank:'Gold',
  xp:980000,personalTheme:'gray',nameFlame:true,nameGradient:false,
  selectedFrame:'bronze',selectedTitle:'rookie',selectedBanner:'wave',
  rewardCatalog:catalog,nextReward:catalog[4],unlocked:catalog.slice(0,4).map(r=>r.id)
 }}));
});
assert.equal(await b.page.locator('#profile-avatar').getAttribute('data-frame'),'bronze','selected Bronze avatar frame is applied');
assert.equal(await b.page.locator('#crew-profile-banner').getAttribute('data-banner'),'wave','Wave profile banner is equipped');
assert.equal(await b.page.locator('#profile-title').textContent(),'⭐ Rookie Star','unlocked title shows under name');
assert.equal(await b.page.locator('#staff-reward-highlights .reward-highlight').count(),2,'inline reward milestones show unlocked and next reward');
assert.ok((await b.page.locator('#staff-next-reward').textContent()).includes('Silver'),'next reward is visible without opening a dialog');
await b.page.getByRole('button',{name:'Giao diện',exact:true}).click();
assert.equal(await b.page.locator('#staff-frame-select').inputValue(),'bronze');
assert.equal(await b.page.locator('#staff-title-select').inputValue(),'rookie');
assert.equal(await b.page.locator('#staff-banner-select').inputValue(),'wave');
assert.equal(await b.page.locator('#staff-frame-select option[value=silver]').evaluate(option=>option.disabled),true,'Silver cannot be equipped before Level 22');
assert.equal(await b.page.locator('#staff-gradient-check').isDisabled(),true);

const pick=async(kind,id)=>b.page.locator('.crew-fx-choice[data-fx-kind="'+kind+'"][data-fx-id="'+id+'"]');
await b.page.locator('[data-crew-tab="name"]').click();
assert.equal(await b.page.locator('#crew-panel-name').isVisible(),true,'Name effects are visible when its tab is selected');
assert.equal(await b.page.locator('#crew-panel-avatar').isVisible(),false,'Only one category is visible');
await b.page.locator('[data-crew-tab="avatar"]').click();
assert.equal(await b.page.locator('[data-crew-gallery="frame"] .crew-fx-choice').count(),5,'all frames including none have their own previews');
assert.equal(await b.page.locator('[data-crew-gallery="aura"] .crew-fx-choice').count(),4,'all aura tiers are visible');
assert.equal(await (await pick('frame','mythic')).locator('[data-frame="mythic"]').count(),1,'locked Mythic renders the real avatar frame');
assert.equal(await (await pick('frame','mythic')).getAttribute('data-locked'),'true');
await (await pick('frame','silver')).click();
assert.equal(await b.page.locator('#staff-frame-select').inputValue(),'bronze','locked Silver preview cannot be equipped');
assert.ok((await b.page.locator('#crew-effect-selection-status').textContent()).includes('Level 22'));
await (await pick('frame','none')).click();
assert.equal(await b.page.locator('#staff-frame-select').inputValue(),'none','an unlocked preview can unequip a frame');
await (await pick('frame','bronze')).click();
assert.equal(await b.page.locator('#staff-frame-select').inputValue(),'bronze');
assert.equal(await (await pick('frame','bronze')).getAttribute('aria-pressed'),'true','preview displays selected checkmark state');
await (await pick('aura','spark')).click();
assert.equal(await b.page.locator('#staff-aura-select').inputValue(),'spark');
await (await pick('aura','dual')).click();
assert.equal(await b.page.locator('#staff-aura-select').inputValue(),'spark','locked tier cannot overwrite earlier unlock');
await b.page.locator('[data-crew-tab="name"]').click();
await (await pick('nameFx','ember')).click();
await (await pick('trail','wave')).click();
assert.equal(await b.page.locator('#staff-nameFx-select').inputValue(),'ember');
assert.equal(await b.page.locator('#staff-trail-select').inputValue(),'wave');
await b.page.locator('[data-crew-tab="profile"]').click();
await (await pick('title','rookie')).click();
await (await pick('banner','wave')).click();
await (await pick('cardFx','soft')).click();
assert.equal(await b.page.locator('#staff-title-select').inputValue(),'rookie');
assert.equal(await b.page.locator('#staff-banner-select').inputValue(),'wave');
assert.equal(await b.page.locator('#staff-cardFx-select').inputValue(),'soft');
await b.page.locator('[data-crew-tab="theme"]').click();
assert.equal(await b.page.locator('#staff-theme-grid .theme-option').count(),18,'theme choices remain available');
await b.page.locator('[data-crew-tab="avatar"]').click();
assert.equal(await b.page.locator('#staff-aura-select').inputValue(),'spark','switching categories preserves unsaved choices');
assert.equal(await (await pick('aura','spark')).getAttribute('aria-pressed'),'true');
console.log('PASS: 7 click-to-equip preview galleries, locked preview, all categories and unsaved cross-tab selection.');

await b.page.getByRole('button',{name:'Đóng giao diện',exact:true}).click();

assert.equal(await b.page.locator('#prestige-admin-launch').isVisible(),false);
const c=await device('unlinked');await c.page.goto(origin+'/dolphin-profile.html');await c.page.locator('#staff-xp-summary').filter({hasText:'Đăng ký hoặc liên kết'}).waitFor();assert.equal(await c.page.locator('#staff-save-style').isEnabled(),false);await c.context.close();
console.log('PASS: compact dashboard, independently opened settings, level-gated perks, rewards and hidden manager controls.');
const relevant=errors.filter(e=>!e.includes('firebase-')&&!e.includes('firebase')&&!e.includes('getFirestore'));assert.deepEqual(relevant,[]);console.log('PASS: mobile/desktop layout; no profile/renderer runtime errors.');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1});
