'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const html=read('dolphin-profile.html'),js=read('staff-prestige-profile.js'),css=read('staff-profile.css');
test('profile shows six daily tasks, streak, XP progress and authenticated check-in button',()=>{
 for(const id of ['staff-daily-card','staff-daily-counter','staff-daily-streak','staff-daily-earned','staff-daily-track','staff-daily-list','staff-daily-message'])assert.ok(html.includes('id="'+id+'"'),id);
 assert.match(js,/function renderDailyMissions\(/);
 assert.match(js,/function checkInDaily\(/);
 assert.match(js,/call\('staffCheckInDaily',\{\}\)/);
 assert.match(js,/renderDailyMissions\(\);previewCosmetics\(/);
});
test('midnight triggers a server refresh, not local XP writes',()=>{
 assert.match(js,/timeZone:'Asia\/Ho_Chi_Minh'/);
 assert.match(js,/mine\.dailyMissions\.date!==vietnamToday\(\)/);
 assert.match(js,/window\.DolphinPrestige\?\.refresh\(\)/);
 assert.doesNotMatch(js,/localStorage\.setItem\('staffDaily/);
});
test('verified Lounge and Bungalow bookings are routed to authoritative backend',()=>{
 for(const file of ['dolphin-lounge.html','dolphin-bungalow.html']){
  const src=read(file);
  assert.match(src,/DolphinStaffId\.performLiveAction\(\{/);
  assert.match(src,/action:'booking'/);
  assert.match(src,/identity\?\.verified===true/);
  assert.match(src,/if\(!verified\)await setDoc/);
 }
});
test('verified Lounge, Bungalow and Restaurant order statuses are server-authoritative',()=>{
 for(const file of ['dolphin-lounge.html','dolphin-bungalow.html','dolphin-restaurant.html']){
  const src=read(file);
  assert.match(src,/DolphinStaffId\.performLiveAction\(\{kind:(?:'lounge_orders'|COL_ORDERS)/);
  assert.match(src,/missionXP/);
  assert.match(src,/identity\?\.verified===true/);
 }
});
test('daily quest cards are keyboard/phone accessible and have no overlay',()=>{
 assert.match(css,/\.daily-task-checkin/);
 assert.match(css,/@media\(max-width:420px\)/);
 assert.match(css,/\.daily-track/);
 assert.ok(!css.slice(css.indexOf('\/\* Crew Club daily quests')).includes('position:fixed'));
});

test('profile displays backfilled reward and the updated 2450 XP level coefficient',()=>{
 assert.match(js,/const XP_RATE=2450/);
 assert.match(js,/daily\?\.checkinTopUpXP>0/);
 assert.match(html,/2\.450 × \(L − 1\)² XP/);
});
