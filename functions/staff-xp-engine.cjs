'use strict';
/* Pure XP/rank rules. Only authoritative server-side reconciliations may award XP. */
const XP_PER_1000_VND=1;
const XP_PER_POINT_TENTH=1;
const MIN_LEVEL=1;
const LEVEL_COEFFICIENT=5000;
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
  "level": 15,
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
  "level": 25,
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
  "level": 40,
  "id": "avatar-speed",
  "name": "Avatar Thần tốc"
 },
 {
  "level": 40,
  "id": "avatar-mythic",
  "name": "Avatar Mythic"
 }
]);
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
module.exports={XP_PER_1000_VND,XP_PER_POINT_TENTH,PERKS,revenueXP,workXP,totalXP,xpForLevel,levelForXP,rankForLevel,progress};