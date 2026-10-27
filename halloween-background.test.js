const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const base=__dirname;
const css=fs.readFileSync(path.join(base,'halloween-background.css'),'utf8');
const html=fs.readFileSync(path.join(base,'index.html'),'utf8');
test('both optimized Halloween images ship in repo',()=>{
 for(const name of ['portrait.webp','landscape.webp']){
  const file=path.join(base,'assets/themes/halloween',name);
  assert.ok(fs.existsSync(file),'missing '+name);
  const buffer=fs.readFileSync(file);
  assert.equal(buffer.toString('ascii',0,4),'RIFF');
  assert.equal(buffer.toString('ascii',8,12),'WEBP');
 }
});
test('Halloween only, portrait first, landscape media query',()=>{
 assert.match(css,/body\[data-theme="halloween"\]::before/);
 assert.match(css,/portrait\.webp/);
 assert.match(css,/@media\s*\(orientation:landscape\)/);
 assert.match(css,/landscape\.webp/);
 assert.match(css,/#themeBigIcon/);
 assert.match(html,/halloween-background\.css/);
});
