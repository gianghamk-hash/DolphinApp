'use strict';
const {getDatabase}=require('firebase-admin/database');
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
 return {employeeId:p.employeeId,name:p.name,avatar:p.avatar||'🐬',
  level:progress.level,rank:progress.rank,xp, nextLevelAt:progress.nextLevelAt,
  unlocked:progress.unlocked,showcase:Array.isArray(p.showcase)?p.showcase:[],nameFlame:!!p.nameFlame,personalTheme:p.personalTheme||'dark'};
}
function leaderboard(registry){
 return Object.values(registry||{}).filter(p=>p?.active&&staffPattern.test(p.employeeId)&&p.name)
 .map(expose).sort((a,b)=>b.xp-a.xp||a.employeeId.localeCompare(b.employeeId)).slice(0,25);
}
async function rebuild(){
 const db=getDatabase(),registry=(await db.ref('staffRegistry').once('value')).val()||{};
 const board=leaderboard(registry),top=board[0]||null;
 const ties=top?board.filter(x=>x.xp===top.xp).map(x=>x.employeeId):[];
 const current={champion:top?{...top,title:'Dolphin Emperor',tiedWith:ties}:null,
  leaderboard:board.map(x=>({employeeId:x.employeeId,name:x.name,avatar:x.avatar,level:x.level,rank:x.rank,xp:x.xp})),updatedAt:Date.now()};
 await db.ref('staffPrestige/public').set(current);
 if(top)await db.ref('staffPrestige/legends/'+top.employeeId).transaction(v=>v||{name:top.name,avatar:top.avatar,level:top.level,firstAt:Date.now()});
 return current;
}
exports.staffGetPrestige=onCall(opts,async req=>{
 uid(req);
 const pub=(await getDatabase().ref('staffPrestige/public').once('value')).val();
 return pub||{champion:null,leaderboard:[],updatedAt:0};
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
  const level=engine.progress(Math.max(0,Number(v.xp)||0)).level;
  if((themeLevels[theme]||1)>level||(flame&&level<3))return;
  return {...v,personalTheme:theme,nameFlame:flame,updatedAt:Date.now()};
 });
 if(!result.committed)throw new HttpsError('permission-denied','Chưa mở khóa chủ đề hoặc hiệu ứng');
 return {...expose(result.snapshot.val()),personalTheme:result.snapshot.val().personalTheme||'dark'};
});

/* Admin-only reconciliation: sources must be verified externally, never trust client order payloads. */
exports.staffGrantVerifiedXP=onCall(opts,async req=>{
 if(!isAdmin(req))throw new HttpsError('permission-denied','Chỉ quản lý được cấp điểm');
 const employeeId=String(req.data?.employeeId||'').toUpperCase();
 const eventId=String(req.data?.eventId||'');
 const source=String(req.data?.source||'');
 const amount=Number(req.data?.amount);
 if(!staffPattern.test(employeeId)||!/^[a-zA-Z0-9_.:-]{8,120}$/.test(eventId)||
  !['revenue','work','correction'].includes(source)||!Number.isFinite(amount)||
  Math.abs(amount)>1000000||Math.round(amount*100)!==amount*100)
  throw new HttpsError('invalid-argument','Sự kiện XP không hợp lệ');
 if(source!=='correction'&&amount<0)throw new HttpsError('invalid-argument','XP âm cần sự kiện điều chỉnh');
 const db=getDatabase(),ref=db.ref('staffXpLedger/'+employeeId+'/'+eventId);
 const record={employeeId,eventId,source,amount,approvedBy:uid(req),at:Date.now()};
 const written=await ref.transaction(v=>v?undefined:record);
 if(!written.committed)return {duplicate:true,employeeId,eventId};
 const profileRef=db.ref('staffRegistry/'+employeeId);
 let progress;
 try{
  const tx=await profileRef.transaction(v=>{
   if(!v?.active)return;
   return {...v,xp:Math.max(0,Number(((Number(v.xp)||0)+amount).toFixed(2))),updatedAt:Date.now()};
  });
  if(!tx.committed)throw Error('Hồ sơ không còn hoạt động');
  progress=expose(tx.snapshot.val());
  await rebuild();
 }catch(e){await ref.remove();throw new HttpsError('internal','Không thể cấp XP: '+e.message);}
 return {duplicate:false,...progress};
});
exports.staffRebuildPrestige=onCall(opts,async req=>{
 if(!isAdmin(req))throw new HttpsError('permission-denied','Chỉ quản lý');
 return rebuild();
});
module.exports._leaderboard=leaderboard;
