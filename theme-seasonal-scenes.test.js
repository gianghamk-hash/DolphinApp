const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const source=fs.readFileSync('theme-system.js','utf8');
const manager=fs.readFileSync('manager/dashboard.html','utf8');
test('only dark, light and gray display modes are available',()=>{
 assert.match(source,/dark:\{name:'Dark Mode'/);
 assert.match(source,/light:\{name:'Light Mode'/);
 assert.match(source,/gray:\{name:'Gray Mode'/);
 assert.doesNotMatch(source,/function renderThemeScene|function renderExtraIllustration|startHalloweenAnimation/);
 assert.deepEqual([...manager.matchAll(/<option value="(.*?)">/g)].filter(x=>['dark','light','gray'].includes(x[1])).map(x=>x[1]),['dark','light','gray']);
});
test('legacy modes map to dark and no big illustrations are created',()=>{
 assert.match(source,/return Object\.prototype\.hasOwnProperty\.call\(THEMES,key\)\?key:'dark'/);
 assert.match(source,/#themeBigIcon/);
 assert.match(source,/master_config','theme'/);
});
