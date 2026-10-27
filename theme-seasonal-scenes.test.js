const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const source=fs.readFileSync('theme-system.js','utf8');
test('every non-Halloween scene uses CSS-only visual elements',()=>{
 assert.match(source,/function renderExtraIllustration\(key,holder\)/);
 assert.match(source,/tbi-css-scene scene-/);
 assert.match(source,/tbi-css-orb/);
 assert.match(source,/tbi-css-spark/);
 assert.doesNotMatch(source,/html\+='<span class="tbi-extra-character"/);
});
test('seasonal variety, Halloween untouched and reduced motion',()=>{
 for(const name of ['autumn','winter','spring','summer','valentine','midautumn','children','nationalday','newyear'])assert.ok(source.includes('scene-'+name));
 assert.match(source,/if\(key==='halloween'\)/);
 assert.match(source,/startHalloweenAnimation\(scene\)/);
 assert.match(source,/prefers-reduced-motion:reduce/);
});
