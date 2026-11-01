'use strict';
const {getDatabase}=require('firebase-admin/database');
const {getFirestore}=require('firebase-admin/firestore');
const {onCall,HttpsError}=require('firebase-functions/v2/https');
const engine=require('./staff-xp-engine.cjs');
const opts={region:'asia-southeast1',maxInstances:5,timeoutSeconds:30};
const staffPattern=/^DOL-(?:[0-9]{4,6}|[A-F0-9]{10})$/;
function uid(req){if(!req.auth?.uid)throw new HttpsError('unauthenticated','Hãy đăng nhập');return req.auth.uid;}
function admins(){return new Set(String(process.env.STAFF_ADMIN_UIDS||'').split(',').map(x=>x.trim()).filter(Boolean));}
function isAdmin(req){return admins().has(uid(req));}
async function currentStaff(req){
 const id=(await getDatabase().ref('staffIdentity/'+uid(req)).once('value')).val()?.employeeId;
 if(!id||!staffPattern.test(id))throw new HttpsError('permission-denied','Cần liên kết Staff ID');
 const p=(await getDatabase().ref('staffRegistry/'+id).once('value')).val();
 if(!p?.active)throw new HttpsError('permission-denied','Nhân viên không còn hoạt động');
 return {id,profile:p};
}
function expose(p){
 const xp=Math.max(0,Number(p?.xp)||0),progress=engine.progress(xp);
 const level=Math.min(60,Math.max(progress.level,Number(p?.levelPeak)||1));
 return {employeeId:p.employeeId,name:p.name,avatar:p.avatar||'🐬',
  level,rank:engine.rankForLevel(level),xp,nextLevelAt:level>=60?null:engine.xpForLevel(level+1),
  unlocked:engine.PERKS.filter(x=>level>=x.level).map(x=>x.id),showcase:Array.isArray(p.showcase)?p.showcase:[],nameFlame:!!p.nameFlame,personalTheme:p.personalTheme||'dark'};
}
function leaderboard(registry){
 return Object.values(registry||{}).filter(p=>p?.active&&staffPattern.test(p.employeeId)&&p.name)
 .map(expose).sort((a,b)=>b.level-a.level||b.xp-a.xp||a.employeeId.localeCompare(b.employeeId)).slice(0,25);
}
async function rebuild(){
 const db=getDatabase(),registry=(await db.ref('staffRegistry').once('value')).val()||{};
 const board=leaderboard(registry),top=board[0]||null;
 const ties=top?board.filter(x=>x.xp===top.xp).map(x=>x.employeeId):[];
 const previous=(await db.ref('staffPrestige/public/champion').once('value')).val();
 const newChampion=top?{...top,title:'Dolphin Emperor',tiedWith:ties}:null;
 const changed=!!top&&previous?.employeeId!==top.employeeId;
 const announcement=changed?{id:'champion-'+top.employeeId+'-'+Date.now(),type:'champion',name:top.name,level:top.level,text:'👑 '+top.name+' đã trở thành Dolphin Emperor!',at:Date.now()}:null;
 const milestone=(await db.ref('staffPrestige/events/last').once('value')).val();
 const current={champion:newChampion,
  announcement:announcement||milestone||((await db.ref('staffPrestige/public/announcement').once('value')).val()||null),
  leaderboard:board.map(x=>({employeeId:x.employeeId,name:x.name,avatar:x.avatar,level:x.level,rank:x.rank,xp:x.xp})),updatedAt:Date.now()};
 await db.ref('staffPrestige/public').set(current);
 if(top)await db.ref('staffPrestige/legends/'+top.employeeId).transaction(v=>v||{name:top.name,avatar:top.avatar,level:top.level,firstAt:Date.now()});
 // Small Firestore signal for instant profile refresh, not an XP authority.
 try{await getFirestore().doc('staff_xp_updates/public').set({updatedAt:current.updatedAt});}
 catch(e){console.warn('[StaffPrestige] realtime signal unavailable:',e.message);}
 return current;
}
exports.staffGetPrestige=onCall(opts,async req=>{
 uid(req);
 const [snap,legends]=await Promise.all([
  getDatabase().ref('staffPrestige/public').once('value'),
  getDatabase().ref('staffPrestige/legends').orderByChild('firstAt').limitToLast(25).once('value')
 ]);
 const pub=snap.val()||{champion:null,leaderboard:[],updatedAt:0};
 return {...pub,legends:Object.values(legends.val()||{}).sort((a,b)=>b.firstAt-a.firstAt)};
});
exports.staffGetMyProgress=onCall(opts,async req=>{
 const {id,profile}=await currentStaff(req);
 return expose(profile);
});
exports.staffSetShowcase=onCall(opts,async req=>{
 const {id}=await currentStaff(req);
 const ids=req.data?.showcase;
 if(!Array.isArray(ids)||ids.length>5||ids.some(x=>typeof x!=='string'||x.length>64)||new Set(ids).size!==ids.length)
  throw new HttpsError('invalid-argument','Tối đa 5 huy hiệu');
 const ref=getDatabase().ref('staffRegistry/'+id);
 const result=await ref.transaction(p=>!p?.active?undefined:{...p,showcase:ids,updatedAt:Date.now()});
 if(!result.committed)throw new HttpsError('failed-precondition','Hồ sơ không hợp lệ');
 return expose(result.snapshot.val());
});
const themeLevels=Object.freeze({default:8,spring:10,summer:10,autumn:10,winter:10,tet:20,valentine:20,womenday:20,reunification:20,children:20,nationalday:20,midautumn:20,halloween:30,christmas:30,newyear:30});
exports.staffSetPersonalStyle=onCall(opts,async req=>{
 const {id}=await currentStaff(req);
 const theme=String(req.data?.theme||'dark');
 const flame=req.data?.nameFlame===true;
 if(!['dark','light','gray',...Object.keys(themeLevels)].includes(theme))
  throw new HttpsError('invalid-argument','Chủ đề không hợp lệ');
 const ref=getDatabase().ref('staffRegistry/'+id);
 const result=await ref.transaction(v=>{
  if(!v?.active)return;
  const level=Math.max(engine.progress(Math.max(0,Number(v.xp)||0)).level,Number(v.levelPeak)||1);
  if((themeLevels[theme]||1)>level||(flame&&level<3))return;
  return {...v,personalTheme:theme,nameFlame:flame,updatedAt:Date.now()};
 });
 if(!result.committed)throw new HttpsError('permission-denied','Chưa mở khóa chủ đề hoặc hiệu ứng');
 return {...expose(result.snapshot.val()),personalTheme:result.snapshot.val().personalTheme||'dark'};
});

/* Admin-only reconciliation: sources must be verified externally, never trust client order payloads. */
async function awardVerifiedXP(req,data,options={}){
 // Trusted Firestore triggers may award XP without Manager approval; the browser cannot use this path.
 if(!options.trusted&&!isAdmin(req))throw new HttpsError('permission-denied','Chỉ quản lý được cấp điểm');
 const employeeId=String(data?.employeeId||'').toUpperCase();
 const eventId=String(data?.eventId||'');
 const source=String(data?.source||'');
 const amount=Number(data?.amount);
 if(!staffPattern.test(employeeId)||!/^[a-zA-Z0-9_.:-]{8,120}$/.test(eventId)||
  !['revenue','work','correction'].includes(source)||!Number.isFinite(amount)||
  Math.abs(amount)>1000000||Math.round(amount*100)!==amount*100)
  throw new HttpsError('invalid-argument','Sự kiện XP không hợp lệ');
 if(source!=='correction'&&amount<0)throw new HttpsError('invalid-argument','XP âm cần sự kiện điều chỉnh');
 const db=getDatabase(),ref=db.ref('staffXpLedger/'+employeeId+'/'+eventId);
 const record={employeeId,eventId,source,amount,approvedBy:options.trusted?'automatic-firestore-trigger':uid(req),at:Date.now()};
 const written=await ref.transaction(v=>v?undefined:record);
 if(!written.committed)return {duplicate:true,employeeId,eventId};
 const profileRef=db.ref('staffRegistry/'+employeeId);
 let progress,credited=false;
 try{
  // RTDB transaction updater can receive an initial null even when this
  // profile exists in the server. Aborting on that transient cold-cache null
  // incorrectly reports an active profile as inactive and drops the XP award.
  const prefetched=(await profileRef.once('value')).val();
  if(!prefetched?.active)throw Error('Hồ sơ không còn hoạt động');
  let firstUpdate=true;
  const tx=await profileRef.transaction(v=>{
   const initial=firstUpdate;
   firstUpdate=false;
   // Only the first speculative callback may use the just-read server state.
   // If a subsequent server update sees null (real deletion), abort safely.
   const current=v===null&&initial?prefetched:v;
   if(!current?.active)return;
   const xp=Math.max(0,Number(((Number(current.xp)||0)+amount).toFixed(2)));
   return {...current,xp,levelPeak:Math.max(Number(current.levelPeak)||1,engine.levelForXP(xp)),updatedAt:Date.now()};
  },undefined,false);
  if(!tx.committed){
   const latest=(await profileRef.once('value')).val();
   throw Error(latest?.active?'Không thể ghi XP do giao dịch dữ liệu bị gián đoạn':'Hồ sơ không còn hoạt động');
  }
  credited=true;progress=expose(tx.snapshot.val());
  if(amount>0){
   const prev=engine.levelForXP(Math.max(0,Number((progress.xp-amount).toFixed(2))));
   if(Math.floor(progress.level/10)>Math.floor(prev/10)&&progress.level>=10){
    const milestone=Math.floor(progress.level/10)*10;
    await db.ref('staffPrestige/events/last').set({id:'milestone-'+employeeId+'-'+milestone,
      type:'level',name:progress.name,level:milestone,text:'🌟 '+progress.name+' đã đạt Level '+milestone+'!',at:Date.now()});
   }
  }
 }catch(e){if(!credited)await ref.remove();throw new HttpsError('internal','Không thể cấp XP: '+e.message);}
 // Do not undo an already committed XP award if the public board refresh fails.
 if(!options.skipRebuild)try{await rebuild();}catch(e){console.error('[StaffPrestige] leaderboard refresh failed',e);}
 return {duplicate:false,...progress};
}
exports.staffGrantVerifiedXP=onCall(opts,req=>awardVerifiedXP(req,req.data));
exports.staffRebuildPrestige=onCall(opts,async req=>{
 if(!isAdmin(req))throw new HttpsError('permission-denied','Chỉ quản lý');
 return rebuild();
});
module.exports._leaderboard=leaderboard;
module.exports._awardVerifiedXP=awardVerifiedXP;
module.exports._rebuildPrestige=rebuild;

// Internal only: functions/index.js deliberately skips underscore-prefixed exports.
module.exports._awardTrustedLiveXP=(data,options={})=>awardVerifiedXP(null,data,{trusted:true,...options});
