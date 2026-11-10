'use strict';
/* Pure XP/rank rules. Only authoritative server-side reconciliations may award XP. */
const XP_PER_1000_VND=1;
const XP_PER_POINT_TENTH=100; // 100x verified work XP: 0.1 point = 100 XP
const MIN_LEVEL=1;
const LEVEL_COEFFICIENT=2450; // 30% less than the immediately preceding 3,500 XP coefficient
const LEVEL_RULES_VERSION=4; // Only current XP determines Level and usable rewards.
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
const COSMETIC_REWARDS=Object.freeze([{"id":"aura_spark","level":3,"type":"aura","label":"💫 Hào quang Avatar I","icon":"💫"},{"id":"trail_wave","level":3,"type":"trail","label":"☄️ Vệt sao I","icon":"☄️"},{"id":"card_soft","level":3,"type":"cardFx","label":"✨ Viền thẻ I","icon":"✨"},{"id":"aura_dual","level":25,"type":"aura","label":"💫 Hào quang Avatar II","icon":"💫"},{"id":"trail_comet","level":25,"type":"trail","label":"☄️ Vệt sao II","icon":"☄️"},{"id":"card_energy","level":25,"type":"cardFx","label":"✨ Viền thẻ II","icon":"✨"},{"id":"aura_celestial","level":60,"type":"aura","label":"💫 Hào quang Avatar III","icon":"💫"},{"id":"trail_nova","level":60,"type":"trail","label":"☄️ Vệt sao III","icon":"☄️"},{"id":"card_mythic","level":60,"type":"cardFx","label":"✨ Viền thẻ III","icon":"✨"},{"id":"name_flame","level":3,"type":"effect","label":"🔥 Tên phát sáng","icon":"🔥"},{"id":"frame_bronze","level":5,"type":"frame","label":"Khung avatar Bronze","icon":"🥉"},{"id":"theme_dolphin","level":8,"type":"theme","label":"Chủ đề Dolphin","icon":"🐬"},{"id":"theme_seasons","level":10,"type":"theme","label":"Bộ chủ đề 4 mùa","icon":"🌸"},{"id":"title_rookie","level":12,"type":"title","label":"Danh hiệu Rookie Star","icon":"⭐"},{"id":"banner_wave","level":15,"type":"banner","label":"Banner Sóng Biển","icon":"🌊"},{"id":"theme_festival","level":20,"type":"theme","label":"Bộ chủ đề lễ hội","icon":"🎊"},{"id":"frame_silver","level":22,"type":"frame","label":"Khung avatar Silver","icon":"🥈"},{"id":"title_wave","level":25,"type":"title","label":"Danh hiệu Wave Rider","icon":"🏄"},{"id":"theme_special","level":30,"type":"theme","label":"Bộ chủ đề đặc biệt","icon":"✨"},{"id":"banner_gold","level":35,"type":"banner","label":"Banner Ánh Kim","icon":"🌟"},{"id":"frame_gold","level":40,"type":"frame","label":"Khung avatar Gold","icon":"🥇"},{"id":"name_gradient","level":45,"type":"effect","label":"Tên gradient","icon":"🌈"},{"id":"title_legend","level":50,"type":"title","label":"Danh hiệu Dolphin Legend","icon":"👑"},{"id":"frame_mythic","level":60,"type":"frame","label":"Khung avatar Mythic","icon":"💎"},{"id":"banner_mythic","level":60,"type":"banner","label":"Banner Mythic","icon":"⚡"},{"id":"motion_pulse","level":3,"type":"avatarMotion","label":"💗 Nhịp sáng Avatar","icon":"💗"},{"id":"motion_float","level":10,"type":"avatarMotion","label":"🪶 Avatar lơ lửng","icon":"🪶"},{"id":"motion_wave","level":20,"type":"avatarMotion","label":"🌊 Sóng ánh sáng","icon":"🌊"},{"id":"motion_orbit","level":30,"type":"avatarMotion","label":"🪐 Quỹ đạo năng lượng","icon":"🪐"},{"id":"motion_prism","level":45,"type":"avatarMotion","label":"🌈 Prism Flicker","icon":"🌈"},{"id":"motion_ascension","level":60,"type":"avatarMotion","label":"👑 Mythic Ascension","icon":"👑"},{"id":"motion_comet","level":6,"type":"avatarMotion","label":"☄️ Comet Dash","icon":"☄️"},{"id":"motion_tide","level":14,"type":"avatarMotion","label":"🌊 Tidal Surge","icon":"🌊"},{"id":"motion_vortex","level":24,"type":"avatarMotion","label":"🌀 Vortex Gate","icon":"🌀"},{"id":"motion_phoenix","level":36,"type":"avatarMotion","label":"🔥 Phoenix Rebirth","icon":"🔥"},{"id":"motion_supernova","level":52,"type":"avatarMotion","label":"🌠 Supernova Burst","icon":"🌠"},{"id":"frame_emerald","level":12,"type":"frame","label":"🟢 Emerald","icon":"🟢"},{"id":"frame_sapphire","level":28,"type":"frame","label":"🔷 Sapphire","icon":"🔷"},{"id":"frame_nebula","level":48,"type":"frame","label":"🌌 Nebula","icon":"🌌"},{"id":"title_navigator","level":7,"type":"title","label":"🧭 Ocean Navigator","icon":"🧭"},{"id":"title_guardian","level":20,"type":"title","label":"🛡️ Coral Guardian","icon":"🛡️"},{"id":"title_titan","level":36,"type":"title","label":"⚔️ Tidal Titan","icon":"⚔️"},{"id":"title_emperor","level":55,"type":"title","label":"👑 Abyss Emperor","icon":"👑"},{"id":"banner_abyss","level":4,"type":"banner","label":"🌊 Deep Sea","icon":"🌊"},{"id":"banner_aurora","level":12,"type":"banner","label":"🌌 Aurora","icon":"🌌"},{"id":"banner_neon","level":28,"type":"banner","label":"💡 Neon","icon":"💡"},{"id":"banner_cosmic","level":48,"type":"banner","label":"🪐 Cosmic","icon":"🪐"},{"id":"aura_ripple","level":6,"type":"aura","label":"💠 Ripple","icon":"💠"},{"id":"aura_nebula","level":36,"type":"aura","label":"🌌 Nebula","icon":"🌌"},{"id":"aura_stardust","level":52,"type":"aura","label":"✨ Stardust","icon":"✨"},{"id":"trail_stardust","level":12,"type":"trail","label":"✨ Stardust","icon":"✨"},{"id":"trail_meteor","level":36,"type":"trail","label":"☄️ Meteor","icon":"☄️"},{"id":"trail_starfall","level":55,"type":"trail","label":"🌠 Starfall","icon":"🌠"},{"id":"card_ocean","level":12,"type":"cardFx","label":"🌊 Ocean Edge","icon":"🌊"},{"id":"card_prism","level":36,"type":"cardFx","label":"🌈 Prism Edge","icon":"🌈"},{"id":"card_aurora","level":52,"type":"cardFx","label":"🌌 Aurora Edge","icon":"🌌"},{"id":"nameFx_tide","level":12,"type":"nameFx","label":"🌊 Tidal Glow","icon":"🌊"},{"id":"nameFx_nova","level":36,"type":"nameFx","label":"🌟 Nova","icon":"🌟"},{"id":"nameFx_royal","level":55,"type":"nameFx","label":"👑 Royal","icon":"👑"}].sort((a,b)=>a.level-b.level));
const COSMETIC_CHOICES=Object.freeze({
 avatarMotion:Object.freeze({"none":1,"pulse":3,"float":10,"wave":20,"orbit":30,"prism":45,"ascension":60,"comet":6,"tide":14,"vortex":24,"phoenix":36,"supernova":52}),
 frame:Object.freeze({"none":1,"bronze":5,"silver":22,"gold":40,"mythic":60,"emerald":12,"sapphire":28,"nebula":48}),
 title:Object.freeze({"none":1,"rookie":12,"wave":25,"legend":50,"navigator":7,"guardian":20,"titan":36,"emperor":55}),
 banner:Object.freeze({"default":1,"wave":15,"gold":35,"mythic":60,"abyss":4,"aurora":12,"neon":28,"cosmic":48}),
 nameFx:Object.freeze({"none":1,"ember":3,"inferno":25,"prism":45,"celestial":60,"tide":12,"nova":36,"royal":55}),
 aura:Object.freeze({"none":1,"spark":3,"dual":25,"celestial":60,"ripple":6,"nebula":36,"stardust":52}),
 trail:Object.freeze({"none":1,"wave":3,"comet":25,"nova":60,"stardust":12,"meteor":36,"starfall":55}),
 cardFx:Object.freeze({"none":1,"soft":3,"energy":25,"mythic":60,"ocean":12,"prism":36,"aurora":52})
});
// Validation and automatic presets share the authoritative unlock catalog.
const THEME_LEVELS=Object.freeze({default:8,spring:10,summer:10,autumn:10,winter:10,tet:20,valentine:20,womenday:20,reunification:20,children:20,nationalday:20,midautumn:20,halloween:30,christmas:30,newyear:30,abyss:4,aurora:12,coral:18,neon:28,cosmic:36,royal:48,obsidian:55});
// Neutral themes give each level a deterministic default; seasonal alternatives
// remain available in personal settings.
const AUTO_THEMES=Object.freeze({dark:1,abyss:4,default:8,aurora:12,coral:18,neon:28,cosmic:36,royal:48,obsidian:55});
function effectiveLevel(profile){
 return levelForXP(Math.max(0,Number(profile?.xp)||0));
}
function highestUnlocked(choices,level,fallback){
 let selected=fallback,threshold=choices[fallback]||1;
 for(const [id,required] of Object.entries(choices))if(required<=level&&required>threshold){selected=id;threshold=required;}
 return selected;
}
function automaticStyle(level){
 if(!Number.isInteger(level)||level<MIN_LEVEL||level>MAX_LEVEL)throw Error('Cấp độ không hợp lệ');
 const style={personalTheme:highestUnlocked(AUTO_THEMES,level,'dark')};
 for(const [type,choices] of Object.entries(COSMETIC_CHOICES)){
  style['selected'+type[0].toUpperCase()+type.slice(1)]=highestUnlocked(choices,level,type==='banner'?'default':'none');
 }
 style.nameFlame=style.selectedNameFx!=='none';
 style.nameGradient=['prism','celestial'].includes(style.selectedNameFx);
 return style;
}
const AVATAR_LEVELS=new Map();
for(const [group,avatars] of Object.entries(require('./staff-avatar-catalog.json'))){
 const required=Math.max(1,Number((group.match(/Lv\\.(\\d+)/)||[])[1])||1);
 for(const avatar of avatars)AVATAR_LEVELS.set(avatar,Math.min(required,AVATAR_LEVELS.get(avatar)||Infinity));
}
const STYLE_FIELDS=Object.freeze(Object.keys(COSMETIC_CHOICES).map(type=>({type,key:'selected'+type[0].toUpperCase()+type.slice(1)})));
function currentCosmetics(profile){
 const level=effectiveLevel(profile),out={};
 for(const {type,key} of STYLE_FIELDS){
  const options=COSMETIC_CHOICES[type],fallback=type==='banner'?'default':'none';
  const selected=profile?.[key];
  out[key]=typeof selected==='string'&&Object.hasOwn(options,selected)&&options[selected]<=level?selected:fallback;
 }
 const theme=profile?.personalTheme||'dark';
 const themeMinimum=THEME_LEVELS[theme]??({dark:1,light:1,gray:1})[theme];
 out.personalTheme=themeMinimum!==undefined&&themeMinimum<=level?theme:'dark';
 out.nameFlame=!!profile?.nameFlame&&level>=3;
 out.nameGradient=!!profile?.nameGradient&&level>=45;
 const chosenAvatar=profile?.avatar||'🐬';
 out.avatar=(AVATAR_LEVELS.get(chosenAvatar)||1)<=level?chosenAvatar:'🐬';
 return out;
}
function restrictLevelEffects(profile){
 const equipped=currentCosmetics(profile),next={...profile,...equipped};
 // A read-only projection can mask old effects; persisted records must also
 // lose their illegal selections after XP decreases. No deletion of XP ledger.
 return next;
}
function equipOnLevelUp(previous,current){
 if(!current?.active||(current.registrationSource==='self'&&current.approved!==true))return current;
 const level=effectiveLevel(current),before=effectiveLevel(previous);
 if(level<before){
  // Regression unlocks are locked again, not permanently granted by levelPeak.
  // Allow a future real Level increase to automatically equip the new tier.
  const restricted=restrictLevelEffects(current);
  return {...restricted,autoStyleLevel:Math.min(level,Number(current.autoStyleLevel)||level),
   profileVersion:(Number(current.profileVersion)||0)+1};
 }
 if(level>before){
  // Readjust on a true Level gain even if the user once had a higher Level.
  return {...current,...automaticStyle(level),autoStyleLevel:level,autoStyleVersion:1,
   profileVersion:(Number(current.profileVersion)||0)+1};
 }
 return current;
}
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
module.exports={XP_PER_1000_VND,XP_PER_POINT_TENTH,LEVEL_COEFFICIENT,LEVEL_RULES_VERSION,PERKS,COSMETIC_REWARDS,COSMETIC_CHOICES,THEME_LEVELS,AVATAR_LEVELS,effectiveLevel,currentCosmetics,restrictLevelEffects,automaticStyle,equipOnLevelUp,revenueXP,workXP,totalXP,xpForLevel,levelForXP,rankForLevel,progress};