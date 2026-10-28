const test=require('node:test'),assert=require('node:assert/strict');
const catalog=require('./catalog.json'),defs=require('./hero-visual-defs.js');
const {buildIdentity,ORIGINS}=require('./hero-identity.js');
test('all 30 heroes receive their actual catalog origins and classes',()=>{
 const mapped=buildIdentity(defs,catalog);
 assert.equal(Object.keys(mapped).length,36);
 for(const hero of catalog.heroes){
  const d=mapped[hero.id];
  assert.equal(d.displayName,hero.name);
  assert.equal(d.origin,hero.origins[0]);
  assert.equal(d.role,hero.classes[0]);
  assert.ok(ORIGINS[d.origin]);
  assert.ok(Number.isInteger(d.motifColor));
  assert.ok(d.silhouetteVariant>=0&&d.silhouetteVariant<5);
 }
 assert.equal(mapped.H01.origin,'Mech');
 assert.equal(mapped.H03.role,'Ranger');
});
