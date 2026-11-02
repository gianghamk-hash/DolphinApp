'use strict';
const {getDatabase}=require('firebase-admin/database');
const {getFirestore}=require('firebase-admin/firestore');
const {onCall,HttpsError}=require('firebase-functions/v2/https');
const engine=require('./staff-xp-engine.cjs');
const dailyCore=require('./staff-daily-core.cjs');
const opts={region:'asia-southeast1',maxInstances:5,timeoutSeconds:30};
const staffPattern=/^DOL-(?:[0-9]{4,6}|[A-F0-9]{10})$/;
const TEST_ADMIN_ID='DOL-0001'; // Dolphin Crew Club game sandbox; excluded from XP competitions.
function uid(req){if(!req.auth?.uid)throw new HttpsError('unauthenticated','Hãy đăng nhập');return req.auth.uid;}
function admins(){return new Set(String(process.env.STAFF_ADMIN_UIDS||'').split(',').map(x=>x.trim()).filter(Boolean));}
function isAdmin(req){return admins().has(uid(req));}
async function currentStaff(req){
 const identity=(await getDatabase().ref('staffIdentity/'+uid(req)).once('value')).val();
 const id=identity?.employeeId;
 if(!id||!staffPattern.test(id))throw new HttpsError('permission-denied','Cần liên kết Staff ID');
 const p=(await getDatabase().ref('staffRegistry/'+id).once('value')).val();
 if(!p?.active)throw new HttpsError('permission-denied','Nhân viên không còn hoạt động');
 return {id,profile:p,testAdmin:id===TEST_ADMIN_ID&&identity?.verified===true&&p.registrationSource!=='self'};
}
function cosmeticChoice(type,selected,level){
 const choices=engine.COSMETIC_CHOICES[type],fallback=type==='banner'?'default':'none';
 return typeof selected==='string'&&Object.hasOwn(choices,selected)&&level>=choices[selected]?selected:fallback;
}
function expose(p){
 const xp=Math.max(0,Number(p?.xp)||0),progress=engine.progress(xp);
 const level=Math.min(60,Math.max(progress.level,Number(p?.levelPeak)||1));
 return {employeeId:p.employeeId,name:p.name,avatar:p.avatar||'🐬',
  level,rank:engine.rankForLevel(level),xp,nextLevelAt:level>=60?null:engine.xpForLevel(level+1),
  unlocked:[...engine.PERKS.filter(x=>level>=x.level).map(x=>x.id),...engine.COSMETIC_REWARDS.filter(x=>level>=x.level).map(x=>x.id)],
  rewardCatalog:engine.COSMETIC_REWARDS,nextReward:engine.COSMETIC_REWARDS.find(x=>x.level>level)||null,
  selectedFrame:cosmeticChoice('frame',p.selectedFrame,level),
  selectedAvatarMotion:cosmeticChoice('avatarMotion',p.selectedAvatarMotion,level),
  selectedTitle:cosmeticChoice('title',p.selectedTitle,level),
  selectedBanner:cosmeticChoice('banner',p.selectedBanner,level),
  selectedNameFx:cosmeticChoice('nameFx',p.selectedNameFx||((p.nameGradient&&level>=45)?'prism':p.nameFlame&&level>=3?'ember':'none'),level),
  selectedAura:cosmeticChoice('aura',p.selectedAura,level),
  selectedTrail:cosmeticChoice('trail',p.selectedTrail,level),
  selectedCardFx:cosmeticChoice('cardFx',p.selectedCardFx,level),
  rankingVisible:p.employeeId===TEST_ADMIN_ID?p.rankingVisible===true:true,
  nameGradient:!!p.nameGradient&&level>=45,
  showcase:Array.isArray(p.showcase)?p.showcase:[],nameFlame:!!p.nameFlame,personalTheme:p.personalTheme||'dark'};
}
function leaderboard(registry){
 return Object.values(registry||{}).filter(p=>p?.active&&(p.employeeId!==TEST_ADMIN_ID||p.rankingVisible===true)&&staffPattern.test(p.employeeId)&&p.name)
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
  leaderboard:board.map(x=>({employeeId:x.employeeId,name:x.name,avatar:x.avatar,level:x.level,rank:x.rank,xp:x.xp,selectedFrame:x.selectedFrame,selectedAvatarMotion:x.selectedAvatarMotion,selectedTitle:x.selectedTitle,selectedBanner:x.selectedBanner,selectedNameFx:x.selectedNameFx,selectedAura:x.selectedAura,selectedTrail:x.selectedTrail,selectedCardFx:x.selectedCardFx,personalTheme:x.personalTheme,nameFlame:x.nameFlame,nameGradient:x.nameGradient})),updatedAt:Date.now()};
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
 // Also filter old public snapshots until the next board rebuild occurs.
 const admin=(await getDatabase().ref('staffRegistry/DOL-0001').once('value')).val();
 const showAdmin=admin?.active&&admin.rankingVisible===true;
 const employees=(Array.isArray(pub.leaderboard)?pub.leaderboard:[]).filter(p=>p.employeeId!==TEST_ADMIN_ID||showAdmin);
 const champion=pub.champion?.employeeId===TEST_ADMIN_ID&&!showAdmin
  ?(employees[0]?{...employees[0],title:'Dolphin Emperor'}:null):pub.champion||null;
 return {...pub,showAdminRanking:!!showAdmin,champion,leaderboard:employees,
  legends:Object.entries(legends.val()||{}).filter(([id])=>id!==TEST_ADMIN_ID||showAdmin)
   .map(([,p])=>p).sort((a,b)=>b.firstAt-a.firstAt)};
});
exports.staffGetMyProgress=onCall(opts,async req=>{
 const {profile,testAdmin}=await currentStaff(req);
 return {...expose(profile),dailyMissions:dailyCore.view(profile),testAdmin};
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
 const selected={frame:req.data?.selectedFrame,avatarMotion:req.data?.selectedAvatarMotion,title:req.data?.selectedTitle,banner:req.data?.selectedBanner,gradient:req.data?.nameGradient,
  nameFx:req.data?.selectedNameFx,aura:req.data?.selectedAura,trail:req.data?.selectedTrail,cardFx:req.data?.selectedCardFx};
 for(const type of ['frame','avatarMotion','title','banner','nameFx','aura','trail','cardFx']){
  if(selected[type]!==undefined&&!Object.hasOwn(engine.COSMETIC_CHOICES[type],selected[type]))
   throw new HttpsError('invalid-argument','Phần thưởng không hợp lệ: '+type);
 }
 if(selected.gradient!==undefined&&typeof selected.gradient!=='boolean')
  throw new HttpsError('invalid-argument','Hiệu ứng tên không hợp lệ');
 if(!['dark','light','gray',...Object.keys(themeLevels)].includes(theme))
  throw new HttpsError('invalid-argument','Chủ đề không hợp lệ');
 const ref=getDatabase().ref('staffRegistry/'+id);
 const profile=(await ref.once('value')).val();
 if(!profile?.active)throw new HttpsError('failed-precondition','Hồ sơ không còn hoạt động');
 // Firebase RTDB may invoke its first speculative transaction with null.
 let firstUpdate=true;
 const result=await ref.transaction(v=>{
  const initial=firstUpdate;firstUpdate=false;
  const current=v===null&&initial?profile:v;
  if(!current?.active)return;
  const level=Math.max(engine.progress(Math.max(0,Number(current.xp)||0)).level,Number(current.levelPeak)||1);
  if((themeLevels[theme]||1)>level||(flame&&level<3)||
    (selected.gradient===true&&level<45)||
    ['frame','avatarMotion','title','banner','nameFx','aura','trail','cardFx'].some(type=>selected[type]!==undefined&&engine.COSMETIC_CHOICES[type][selected[type]]>level))return;
  return {...current,personalTheme:theme,nameFlame:flame,
    selectedFrame:selected.frame===undefined?cosmeticChoice('frame',current.selectedFrame,level):selected.frame,
    selectedAvatarMotion:selected.avatarMotion===undefined?cosmeticChoice('avatarMotion',current.selectedAvatarMotion,level):selected.avatarMotion,
    selectedTitle:selected.title===undefined?cosmeticChoice('title',current.selectedTitle,level):selected.title,
    selectedBanner:selected.banner===undefined?cosmeticChoice('banner',current.selectedBanner,level):selected.banner,
    selectedNameFx:selected.nameFx===undefined?cosmeticChoice('nameFx',current.selectedNameFx,level):selected.nameFx,
    selectedAura:selected.aura===undefined?cosmeticChoice('aura',current.selectedAura,level):selected.aura,
    selectedTrail:selected.trail===undefined?cosmeticChoice('trail',current.selectedTrail,level):selected.trail,
    selectedCardFx:selected.cardFx===undefined?cosmeticChoice('cardFx',current.selectedCardFx,level):selected.cardFx,
    nameGradient:selected.gradient===undefined?!!current.nameGradient&&level>=45:selected.gradient,updatedAt:Date.now()};
 },undefined,false);
 if(!result.committed){
  const latest=(await ref.once('value')).val();
  if(!latest?.active)throw new HttpsError('failed-precondition','Hồ sơ không còn hoạt động');
  const level=Math.max(engine.progress(Math.max(0,Number(latest.xp)||0)).level,Number(latest.levelPeak)||1);
  if((themeLevels[theme]||1)>level||(flame&&level<3)||(selected.gradient===true&&level<45)||
    ['frame','avatarMotion','title','banner','nameFx','aura','trail','cardFx'].some(type=>selected[type]!==undefined&&engine.COSMETIC_CHOICES[type][selected[type]]>level))
   throw new HttpsError('permission-denied','Phần thưởng chưa mở khóa ở Level '+level);
  throw new HttpsError('aborted','Giao dịch lưu giao diện bị gián đoạn. Hãy thử lại.');
 }
 // Cosmetic choices appear in the public Level board without a separate manual refresh.
 try{await rebuild();}catch(e){console.warn('[Crew Club] cosmetic board refresh unavailable:',e?.message||e);}
 return {...expose(result.snapshot.val()),personalTheme:result.snapshot.val().personalTheme||'dark'};
});


/* Dolphin Crew Club is for fun only. DOL-0001 is a verified sandbox admin,
 * never a participant in the public XP league. No effect on orders or payroll.
 * This endpoint deliberately adjusts only the caller's own Staff ID.
 */
exports.staffAdjustOwnTestXP=onCall(opts,async req=>{
 const {id,profile,testAdmin}=await currentStaff(req);
 if(!testAdmin)throw new HttpsError('permission-denied','Chỉ Admin DOL-0001 được thử XP của chính mình.');
 const action=String(req.data?.action||'');
 const amount=req.data?.amount;
 if(!['add','reset'].includes(action)||
    (action==='add'&&(!Number.isSafeInteger(amount)||amount<1||amount>1000000))||
    (action==='reset'&&amount!==undefined))
  throw new HttpsError('invalid-argument','Chọn cộng 1–1.000.000 XP hoặc đặt lại XP.');
 const ref=getDatabase().ref('staffRegistry/'+id),now=Date.now();
 let firstUpdate=true;
 const result=await ref.transaction(value=>{
  const initial=firstUpdate;firstUpdate=false;
  const current=value===null&&initial?profile:value;
  if(!current?.active||current.employeeId!==TEST_ADMIN_ID||current.registrationSource==='self')return;
  const before=Math.max(0,Number(current.xp)||0);
  const xp=action==='reset'?0:before+amount;
  if(!Number.isSafeInteger(xp)||xp>engine.xpForLevel(60))return;
  const peak=action==='reset'?1:Math.max(Number(current.levelPeak)||1,engine.levelForXP(xp));
  return {...current,xp,levelPeak:peak,
    ...(action==='reset'?{nameFlame:false,nameGradient:false,selectedFrame:'none',selectedAvatarMotion:'none',selectedTitle:'none',selectedBanner:'default',selectedNameFx:'none',selectedAura:'none',selectedTrail:'none',selectedCardFx:'none',personalTheme:'dark',showcase:[]}:{}),
    testXPUpdatedAt:now,updatedAt:now};
 },undefined,false);
 if(!result.committed){
  const latest=(await ref.once('value')).val();
  if(!latest?.active)throw new HttpsError('failed-precondition','Hồ sơ Admin không còn hoạt động.');
  throw new HttpsError('failed-precondition','Không ghi được XP thử nghiệm hoặc đã đạt XP tối đa.');
 }
 // The real-work ledger remains untouched. Resetting XP resets level/rewards,
 // but the same historical activity cannot be credited twice.
 try{await rebuild();}catch(e){console.warn('[Crew Club] board refresh unavailable',e.message);}
 return {...expose(result.snapshot.val()),testAdmin:true,mode:'sandbox'};
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


/* DOL-0001 is the sole authorized owner of its public leaderboard visibility.
   Defaults to hidden; never grant this permission using a client-supplied ID. */
exports.staffSetOwnRankingVisibility=onCall(opts,async req=>{
 const {id,testAdmin}=await currentStaff(req);
 if(id!==TEST_ADMIN_ID||!testAdmin)throw new HttpsError('permission-denied','Chỉ DOL-0001 đã xác minh được đổi chế độ xếp hạng.');
 if(typeof req.data?.visible!=='boolean')throw new HttpsError('invalid-argument','Trạng thái hiển thị không hợp lệ.');
 const ref=getDatabase().ref('staffRegistry/'+id),visible=req.data.visible;
 const result=await ref.transaction(p=>{
  if(p===null)return null;
  if(!p.active||p.employeeId!==TEST_ADMIN_ID)return;
  return {...p,rankingVisible:visible,updatedAt:Date.now()};
 },undefined,false);
 if(!result.committed||!result.snapshot.val()?.active)throw new HttpsError('failed-precondition','Không thể cập nhật hồ sơ quản lý.');
 await rebuild();
 return {visible,employeeId:id};
});
