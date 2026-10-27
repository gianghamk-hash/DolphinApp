const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const ranking=fs.readFileSync('ranking/index.html','utf8'),theme=fs.readFileSync('theme-system.js','utf8');
test('ranking remains clean',()=>{assert.doesNotMatch(ranking,/Cách tính điểm mỗi đơn|Cách tính:/);assert.doesNotMatch(ranking,/id="rank-hall"/);assert.match(ranking,/id="revenue-list"/);assert.match(ranking,/id="points-list"/);});
test('ranking inherits the three shared display modes without changing work scores',()=>{assert.match(ranking,/theme-system\.js/);assert.match(theme,/body\[data-theme\] :is\(\.glass-card,\.glass/);assert.match(ranking,/lounge\?0\.25:1/);assert.match(ranking,/lounge\?0\.1:0\.5/);});
