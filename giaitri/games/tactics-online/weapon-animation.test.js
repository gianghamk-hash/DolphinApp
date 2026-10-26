const test = require('node:test');
const assert = require('node:assert/strict');
require('./skeletal-system.js');
class Track { constructor(name,times,values){this.name=name;this.times=times;this.values=values;} }
class Clip { constructor(name,duration,tracks){this.name=name;this.duration=duration;this.tracks=tracks;} }
const T={NumberKeyframeTrack:Track,AnimationClip:Clip};
test('all weapon families get cached animation clips without mutating generic clips',()=>{
 const defs={};
 for(const [i,weapon] of ['sword','bow','staff','hammer','dagger','claws','shield','fists'].entries())defs['H'+i]={weapon};
 const skin=globalThis.DolphinCreateSkinner(T,defs);
 const clips=skin.clipsFor('sword');
 for(const weapon of Object.values(defs).map(d=>d.weapon)){
  const set=skin.clipsFor(weapon);
  assert.equal(set,skin.clipsFor(weapon),'clips should be cached');
  assert.deepEqual(Object.keys(set),['Idle','Run','Attack','Cast','Hit','Death','Heal','Shield']);
  assert.ok(set.Attack.tracks.length);
  for(const clip of Object.values(set)){
   assert.equal(clip.duration,1);
   for(const track of clip.tracks)assert.equal(track.times.length,track.values.length);
  }
 }
 assert.notDeepEqual(skin.clipsFor('bow').Attack.tracks.map(t=>t.name),clips.Attack.tracks.map(t=>t.name));
 assert.notDeepEqual(skin.clipsFor('hammer').Attack.tracks.map(t=>t.values),skin.clipsFor('dagger').Attack.tracks.map(t=>t.values));
});