const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const ranking=fs.readFileSync('ranking/index.html','utf8'),theme=fs.readFileSync('theme-system.js','utf8');
test('scoring descriptions and visible Hall of Fame removed',()=>{assert.doesNotMatch(ranking,/Cách tính điểm mỗi đơn|Cách tính:/);assert.doesNotMatch(ranking,/id="rank-hall"/);assert.match(ranking,/id="revenue-list"/);assert.match(ranking,/id="points-list"/);});
test('Ranking loads shared ThemeSystem without modifying score formula',()=>{assert.match(ranking,/theme-system\.js/);assert.match(ranking,/class="dolphin-ranking-page"/);assert.match(theme,/body\.dolphin-ranking-page \.glass/);assert.match(ranking,/lounge\?0\.25:1/);assert.match(ranking,/lounge\?0\.1:0\.5/);});
