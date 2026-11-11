'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');

test('Profile retains one Character Card, uses chibi tiles and removes Ocean Journey',()=>{
 const html=read('dolphin-profile.html');
 for(const id of ['crew-profile-banner','staff-progress-card','staff-reward-highlights',
  'staff-daily-card','devices-dialog','rewards-dialog','profile-edit-dialog',
  'style-dialog','crew-admin-sandbox','crew-manager-approvals','crew-daily-dialog']){
   assert.equal((html.match(new RegExp('id="'+id+'"','g'))||[]).length,1,'Missing/duplicated '+id);
 }
 assert.equal((html.match(/data-crew-tile=/g)||[]).length,8);
 assert.match(html,/data-open-dialog="devices-dialog"/);
 assert.match(html,/href=".\/ranking\/index\.html#level"/);
 assert.match(html,/data-open-dialog="rewards-dialog"/);
 assert.match(html,/data-open-dialog="style-dialog"/);
 assert.doesNotMatch(html,/crew-ocean-journey|crew-journey-dialog|crew-journey-regions|quick-actions|crew-card-footer-action/);
 assert.match(html,/crew-profile-clean\.css\?v=clean-v2/);
 assert.match(html,/crew-2d-icons\.css\?v=bright-v2/);
 assert.match(html,/crew-chibi-dashboard\.css\?v=chibi-cards-v3/);
});
test('Approved colorful sprite atlases load as compact WebP with transparency',()=>{
 const css=read('crew-2d-icons.css');
 const sw=read('service-worker.js');
 for(const file of ['assets/crew-profile-icons-v2.webp','assets/crew-cosmetic-icons-v2.webp']){
  const data=fs.readFileSync(path.join(root,file));
  assert.equal(data.toString('ascii',0,4),'RIFF');
  assert.equal(data.toString('ascii',8,12),'WEBP');
  assert.equal(data.toString('ascii',12,16),'VP8X');
  const width=1+data.readUIntLE(24,3),height=1+data.readUIntLE(27,3);
  assert.equal(width,384);assert.equal(height,192);
  assert(data.length>8000&&data.length<45000);
  assert(css.includes(file.split('/').pop()));
  assert(sw.includes(file));
 }
 assert.doesNotMatch(sw,/crew-ocean-journey|crew-profile-icons\.webp|crew-journey-icons\.webp/);
 assert.match(css,/data-icon="profile"/);
 assert.match(css,/data-icon="frame"/);
});
test('Manager and staff XP logic are not rewritten by a profile-only UI update',()=>{
 const html=read('dolphin-profile.html');
 const update=read('staff-prestige-profile.js');
 assert.match(html,/id="staff-xp-fill"/);
 assert.match(html,/id="staff-next-level"/);
 assert.match(html,/id="crew-levelup-replay"/);
 assert.match(update,/staff-xp-summary/);
 assert.match(html,/id="crew-manager-ranking-toggle"/);
});
