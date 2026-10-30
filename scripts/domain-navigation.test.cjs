'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),{backTarget}=require('../dolphin-navigation');
function htmlFiles(dir=root){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.name==='.git'||e.name==='node_modules'?[]:e.isDirectory()?htmlFiles(path.join(dir,e.name)):e.name.endsWith('.html')?[path.join(dir,e.name)]:[]);}
for(const prefix of ['', '/DolphinApp']){
 test('all HTML entrypoints resolve local assets under '+(prefix||'custom-domain root'),()=>{
  let count=0;
  for(const file of htmlFiles()){
   const relative=path.relative(root,file).split(path.sep).join('/'),url='https://example.test'+prefix+'/'+relative;
   const html=fs.readFileSync(file,'utf8').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,m=>m.slice(0,m.indexOf('>')+1));
   for(const m of html.matchAll(/\b(?:src|href)\s*=\s*["']([^"']+)["']/gi)){
    if(/^(?:https?:|data:|javascript:|#|about:|mailto:|tel:)/i.test(m[1])||/[{}<>]/.test(m[1]))continue;
    const resolved=new URL(m[1],url);assert.ok(resolved.pathname.startsWith(prefix+'/'),file+' escapes site prefix: '+m[1]);
    const target=path.join(root,decodeURIComponent(resolved.pathname.slice(prefix.length+1)));
    assert.ok(fs.existsSync(target),relative+': missing local asset '+m[1]+' -> '+target);count++;
   }
  }
  assert.ok(count>100);console.log('Verified',count,'local references across',htmlFiles().length,'HTML entrypoints');
 });
 test('back destinations stay within site prefix '+prefix,()=>{
  const base='https://example.test'+prefix+'/';
  assert.equal(backTarget(base+'ranking/index.html',base+'dolphin-navigation.js'),base);
  assert.equal(backTarget(base+'giaitri/games/snake.html',base+'dolphin-navigation.js'),base+'giaitri/index.html');
  assert.equal(backTarget(base+'giaitri/games/tactics-online/index.html',base+'dolphin-navigation.js'),base+'giaitri/index.html');
 });
}
test('PWA icons, scope and start URL resolve at either deployment prefix',()=>{
 const manifest=JSON.parse(fs.readFileSync(path.join(root,'manifest.json')));
 assert.equal(manifest.start_url,'./');assert.equal(manifest.scope,'./');
 for(const icon of manifest.icons)assert.ok(fs.existsSync(path.resolve(root,icon.src)));
});
test('APK opens CNAME and trusts the exact custom host while retaining legacy Pages support',()=>{
 const host=fs.readFileSync(path.join(root,'CNAME'),'utf8').trim(),build=fs.readFileSync(path.join(root,'.github/workflows/build.yml'),'utf8');
 assert.ok(build.includes('webView.loadUrl("https://'+host+'/index.html")'));
 assert.ok(build.includes('"'+host+'".equals(u.getHost())'));
 assert.ok(build.includes('u.getPort() == -1 || u.getPort() == 443'));
});
