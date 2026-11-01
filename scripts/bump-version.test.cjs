const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'..');
test('patch releases update profile assets and metadata, preserve history and respect dry-run',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'dolphin-release-'));
 const pages=['index.html','dolphin-bungalow.html','dolphin-lounge.html','dolphin-restaurant.html','dolphin-show.html','dolphin-profile.html','ranking/index.html','caro/index.html'];
 const metadata=['version.json','sw-config.json','changelog.json','changelog-history.json'];
 try{
  fs.copyFileSync(path.join(root,'bump-version.js'),path.join(dir,'bump-version.js'));
  for(const name of metadata)fs.copyFileSync(path.join(root,name),path.join(dir,name));
  const old=JSON.parse(fs.readFileSync(path.join(dir,'sw-config.json'),'utf8')).version;
  const next=old.replace(/\d+$/,n=>String(Number(n)+1));
  for(const name of pages){fs.mkdirSync(path.dirname(path.join(dir,name)),{recursive:true});fs.writeFileSync(path.join(dir,name),'<link href="staff-profile.css?v=2"><script src="staff-profile.js?v=1.1"></script>');}
  fs.writeFileSync(path.join(dir,'service-worker.js'),'/* BUILD: old */\n');
  function run(...flags){const r=spawnSync(process.execPath,['bump-version.js','patch','Hồ sơ mới',...flags],{cwd:dir,encoding:'utf8'});assert.equal(r.status,0,r.stderr);}
  run();
  for(const name of metadata.slice(0,3))assert.equal(JSON.parse(fs.readFileSync(path.join(dir,name),'utf8')).version,next);
  for(const name of pages){const html=fs.readFileSync(path.join(dir,name),'utf8');assert.equal((html.match(new RegExp('\\?v='+next.replaceAll('.','\\.'),'g'))||[]).length,2,name);}
  assert.ok(JSON.parse(fs.readFileSync(path.join(dir,'changelog-history.json'),'utf8')).versions.some(x=>x.version===old));
  const files=[...metadata,...pages,'service-worker.js'];
  const before=files.map(name=>fs.readFileSync(path.join(dir,name),'utf8'));run('--dry-run');
  assert.deepEqual(files.map(name=>fs.readFileSync(path.join(dir,name),'utf8')),before);
  run();const again=next.replace(/\d+$/,n=>String(Number(n)+1));
  assert.ok(fs.readFileSync(path.join(dir,'dolphin-profile.html'),'utf8').includes('staff-profile.css?v='+again));
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
