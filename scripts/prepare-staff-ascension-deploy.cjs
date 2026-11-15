'use strict';
const fs=require('node:fs'),path=require('node:path');
const modules={
 'staff-prestige':['staffAdjustOwnTestXP','staffGetMyProgress','staffGetPrestige','staffSetPersonalStyle','staffSetShowcase','staffSetOwnRankingVisibility'],
 'staff-profile':['staffUpdateMyProfile','staffRenameManager','staffGetAvatarDirectory'],
 'staff-daily-missions':['staffCheckInDaily','staffStartArcadeMission','staffFinishArcadeMission'],
 'staff-xp-actions':['staffRecordLiveAction','staffDeliverPendingXP']
};
const out=path.resolve('.firebase-staff-ascension/functions');
fs.mkdirSync(out,{recursive:true});
for(const file of fs.readdirSync('functions')){
 if(/\.(?:js|cjs|json)$/.test(file)&&!file.includes('.test.')&&file!=='index.js')fs.copyFileSync(path.join('functions',file),path.join(out,file));
}
const pkg=JSON.parse(fs.readFileSync('functions/package.json','utf8'));
pkg.main='index.js';delete pkg.scripts;
fs.writeFileSync(path.join(out,'package.json'),JSON.stringify(pkg,null,2));
let entry="'use strict';\nrequire('firebase-admin/app').initializeApp();\n";
for(const [mod,names] of Object.entries(modules))for(const name of names)entry+="exports."+name+"=require('./"+mod+"')."+name+";\n";
fs.writeFileSync(path.join(out,'index.js'),entry);
fs.writeFileSync('.firebase-staff-ascension/firebase.json',JSON.stringify({functions:{source:'functions',runtime:'nodejs22'}}));
fs.writeFileSync('.firebase-staff-ascension/targets.txt',Object.values(modules).flat().map(n=>'functions:'+n).join(','));
if(process.env.STAFF_ADMIN_UIDS){
 const ids=process.env.STAFF_ADMIN_UIDS;
 if(!/^[a-zA-Z0-9,_-]+$/.test(ids))throw Error('Invalid admin allowlist');
 fs.writeFileSync(path.join(out,'.env.dolphin-f6d67'),'STAFF_ADMIN_UIDS='+ids+'\nSTAFF_AUTO_XP_ENABLED=false\nSTAFF_SECURE_AUTO_XP_ENABLED=true\n',{mode:0o600});
}
console.log('Prepared '+Object.values(modules).flat().length+' staff endpoints; legacy XP remains disabled.');
