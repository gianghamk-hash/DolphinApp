'use strict';
/* Pure XP/rank rules. Only authoritative server-side reconciliations may award XP. */
const XP_PER_1000_VND=1;
const XP_PER_POINT_TENTH=1;
const MIN_LEVEL=1;
const LEVEL_COEFFICIENT=3500; // 70% of previous XP threshold
const MAX_LEVEL=60;
const PERKS=Object.freeze([
 {
  "level": 1,
  "id": "base-avatars",
  "name": "Avatar cơ bản"
 },
 {
  "level": 3,
  "id": "name-onflame",
  "name": "Tên phát sáng"
 },
 {"level":3,"id":"avatar-explorer","name":"Avatar Khám phá"},
 {
  "level": 5,
  "id": "avatar-ocean",
  "name": "Avatar Ocean"
 },
 {
  "level": 8,
  "id": "theme-default",
  "name": "Theme default"
 },
 {
  "level": 10,
  "id": "theme-spring",
  "name": "Theme spring"
 },
 {
  "level": 10,
  "id": "theme-summer",
  "name": "Theme summer"
 },
 {
  "level": 10,
  "id": "theme-autumn",
  "name": "Theme autumn"
 },
 {
  "level": 10,
  "id": "theme-winter",
  "name": "Theme winter"
 },
 {
  "level": 10,
  "id": "avatar-adventure",
  "name": "Avatar Phiêu lưu"
 },
 {
  "level": 15,
  "id": "avatar-legends",
  "name": "Avatar Legends"
 },
 {
  "level": 20,
  "id": "theme-tet",
  "name": "Theme tet"
 },
 {
  "level": 20,
  "id": "theme-valentine",
  "name": "Theme valentine"
 },
 {
  "level": 20,
  "id": "theme-womenday",
  "name": "Theme womenday"
 },
 {
  "level": 20,
  "id": "theme-reunification",
  "name": "Theme reunification"
 },
 {
  "level": 20,
  "id": "theme-children",
  "name": "Theme children"
 },
 {
  "level": 20,
  "id": "theme-nationalday",
  "name": "Theme nationalday"
 },
 {
  "level": 20,
  "id": "theme-midautumn",
  "name": "Theme midautumn"
 },
 {
  "level": 20,
  "id": "avatar-festival",
  "name": "Avatar Lễ hội"
 },
 {
  "level": 25,
  "id": "onflame-advanced",
  "name": "Tên phát sáng cao cấp"
 },
 {
  "level": 30,
  "id": "theme-halloween",
  "name": "Theme halloween"
 },
 {
  "level": 30,
  "id": "theme-christmas",
  "name": "Theme christmas"
 },
 {
  "level": 30,
  "id": "theme-newyear",
  "name": "Theme newyear"
 },
 {
  "level": 30,
  "id": "avatar-speed",
  "name": "Avatar Thần tốc"
 },
 {
  "level": 40,
  "id": "avatar-mythic",
  "name": "Avatar Mythic"
 }
]);

/* One authoritative catalog for automatic Crew Club rewards. Just for fun. */
const COSMETIC_REWARDS=Object.freeze([{"id":"aura_spark","level":3,"type":"aura","label":"💫 Hào quang Avatar I","icon":"💫"},{"id":"trail_wave","level":3,"type":"trail","label":"☄️ Vệt sao I","icon":"☄️"},{"id":"card_soft","level":3,"type":"cardFx","label":"✨ Viền thẻ I","icon":"✨"},{"id":"aura_dual","level":25,"type":"aura","label":"💫 Hào quang Avatar II","icon":"💫"},{"id":"trail_comet","level":25,"type":"trail","label":"☄️ Vệt sao II","icon":"☄️"},{"id":"card_energy","level":25,"type":"cardFx","label":"✨ Viền thẻ II","icon":"✨"},{"id":"aura_celestial","level":60,"type":"aura","label":"💫 Hào quang Avatar III","icon":"💫"},{"id":"trail_nova","level":60,"type":"trail","label":"☄️ Vệt sao III","icon":"☄️"},{"id":"card_mythic","level":60,"type":"cardFx","label":"✨ Viền thẻ III","icon":"✨"},{"id":"name_flame","level":3,"type":"effect","label":"🔥 Tên phát sáng","icon":"🔥"},{"id":"frame_bronze","level":5,"type":"frame","label":"Khung avatar Bronze","icon":"🥉"},{"id":"theme_dolphin","level":8,"type":"theme","label":"Chủ đề Dolphin","icon":"🐬"},{"id":"theme_seasons","level":10,"type":"theme","label":"Bộ chủ đề 4 mùa","icon":"🌸"},{"id":"title_rookie","level":12,"type":"title","label":"Danh hiệu Rookie Star","icon":"⭐"},{"id":"banner_wave","level":15,"type":"banner","label":"Banner Sóng Biển","icon":"🌊"},{"id":"theme_festival","level":20,"type":"theme","label":"Bộ chủ đề lễ hội","icon":"🎊"},{"id":"frame_silver","level":22,"type":"frame","label":"Khung avatar Silver","icon":"🥈"},{"id":"title_wave","level":25,"type":"title","label":"Danh hiệu Wave Rider","icon":"🏄"},{"id":"theme_special","level":30,"type":"theme","label":"Bộ chủ đề đặc biệt","icon":"✨"},{"id":"banner_gold","level":35,"type":"banner","label":"Banner Ánh Kim","icon":"🌟"},{"id":"frame_gold","level":40,"type":"frame","label":"Khung avatar Gold","icon":"🥇"},{"id":"name_gradient","level":45,"type":"effect","label":"Tên gradient","icon":"🌈"},{"id":"title_legend","level":50,"type":"title","label":"Danh hiệu Dolphin Legend","icon":"👑"},{"id":"frame_mythic","level":60,"type":"frame","label":"Khung avatar Mythic","icon":"💎"},{"id":"banner_mythic","level":60,"type":"banner","label":"Banner Mythic","icon":"⚡"},{"id":"motion_pulse","level":3,"type":"avatarMotion","label":"💗 Nhịp sáng Avatar","icon":"💗"},{"id":"motion_float","level":10,"type":"avatarMotion","label":"🪶 Avatar lơ lửng","icon":"🪶"},{"id":"motion_wave","level":20,"type":"avatarMotion","label":"🌊 Sóng ánh sáng","icon":"🌊"},{"id":"motion_orbit","level":30,"type":"avatarMotion","label":"🪐 Quỹ đạo năng lượng","icon":"🪐"},{"id":"motion_prism","level":45,"type":"avatarMotion","label":"🌈 Prism Flicker","icon":"🌈"},{"id":"motion_ascension","level":60,"type":"avatarMotion","label":"👑 Mythic Ascension","icon":"👑"}].sort((a,b)=>a.level-b.level));
const COSMETIC_CHOICES=Object.freeze({
 avatarMotion:Object.freeze({none:1,pulse:3,float:10,wave:20,orbit:30,prism:45,ascension:60}),
 frame:Object.freeze({none:1,bronze:5,silver:22,gold:40,mythic:60}),
 title:Object.freeze({none:1,rookie:12,wave:25,legend:50}),
 banner:Object.freeze({default:1,wave:15,gold:35,mythic:60}),
 nameFx:Object.freeze({none:1,ember:3,inferno:25,prism:45,celestial:60}),
 aura:Object.freeze({none:1,spark:3,dual:25,celestial:60}),
 trail:Object.freeze({none:1,wave:3,comet:25,nova:60}),
 cardFx:Object.freeze({none:1,soft:3,energy:25,mythic:60})
});
function asNonnegativeInteger(x,label){
 if(typeof x!=='number'||!Number.isFinite(x)||x<0||!Number.isSafeInteger(x))throw Error(label+' phải là số nguyên không âm');
 return x;
}
function asWorkPoints(x){
 if(typeof x!=='number'||!Number.isFinite(x)||x<0||Math.abs(x*100-Math.round(x*100))>1e-7)throw Error('Điểm công việc phải có tối đa 2 chữ số thập phân');
 return x;
}
function revenueXP(vnd){return Math.floor(asNonnegativeInteger(vnd,'Doanh thu')/1000)*XP_PER_1000_VND;}
function workXP(points){return Number((asWorkPoints(points)*10*XP_PER_POINT_TENTH).toFixed(2));}
function totalXP(revenueVnd,workPoints){return Number((revenueXP(revenueVnd)+workXP(workPoints)).toFixed(2));}
function xpForLevel(level){
 if(!Number.isInteger(level)||level<1||level>MAX_LEVEL)throw Error('Cấp độ không hợp lệ');
 return LEVEL_COEFFICIENT*(level-1)*(level-1);
}
function levelForXP(xp){
 if(typeof xp!=='number'||!Number.isFinite(xp)||xp<0)throw Error('XP không hợp lệ');
 return Math.min(MAX_LEVEL,Math.floor(Math.sqrt(xp/LEVEL_COEFFICIENT))+1);
}
function rankForLevel(level){
 if(level>=41)return 'Legend';
 if(level>=31)return 'Diamond';
 if(level>=21)return 'Platinum';
 if(level>=11)return 'Gold';
 if(level>=6)return 'Silver';
 return 'Bronze';
}
function progress(xp){
 const level=levelForXP(xp);
 const floor=xpForLevel(level),ceil=level===MAX_LEVEL?null:xpForLevel(level+1);
 return {xp,level,rank:rankForLevel(level),xpIntoLevel:xp-floor,xpNeeded:ceil===null?0:ceil-floor,
  nextLevelAt:ceil,unlocked:PERKS.filter(p=>level>=p.level).map(p=>p.id)};
}
module.exports={XP_PER_1000_VND,XP_PER_POINT_TENTH,PERKS,COSMETIC_REWARDS,COSMETIC_CHOICES,revenueXP,workXP,totalXP,xpForLevel,levelForXP,rankForLevel,progress};