'use strict';
/* XP wagering mathematics only. PRIVATE SERVER MODULE, not a callable.
 * Not sufficient to deploy real stakes: authoritative match verification
 * and an atomic/recoverable escrow coordinator are still mandatory.
 */
const engine=require('../staff-xp-engine.cjs');
const GAME_SEATS=Object.freeze({battleship:2,caro:2,xiangqi:2,tactics:4});
const GAME_IDS=Object.freeze(Object.keys(GAME_SEATS));
const STAFF_ID=/^DOL-(?:[0-9]{4,6}|[A-F0-9]{10})$/;
const MATCH_ID=/^[A-Za-z0-9:_-]{8,120}$/;
function check(condition,message){
 if(!condition)throw new Error(message);
}
function credits(value,label='XP'){
 check(typeof value==='number'&&Number.isFinite(value)&&value>=0&&Number.isSafeInteger(Math.floor(value)),label+' không hợp lệ');
 return value;
}
function available(profile){
 const xp=credits(profile?.xp,'XP hồ sơ');
 const reserved=credits(profile?.xpReserved??0,'XP đang khóa');
 check(reserved<=xp,'XP đang khóa vượt số dư');
 return Math.max(0,Math.floor(xp-reserved));
}
function prepare(game,participants){
 check(GAME_IDS.includes(game),'Game không hỗ trợ cược XP');
 check(Array.isArray(participants)&&participants.length===GAME_SEATS[game],'Số người cược không hợp lệ');
 const used=new Set(),list=participants.map(p=>{
  check(STAFF_ID.test(p?.employeeId),'Staff ID không hợp lệ');
  check(!used.has(p.employeeId),'Trùng người chơi');
  used.add(p.employeeId);
  check(p.verified===true&&p.active===true&&p.approved===true,'Chỉ tài khoản đã duyệt được tham gia');
  const stake=p.stake;
  check(Number.isSafeInteger(stake)&&stake>=1,'Tiền cược phải là số XP nguyên dương');
  const max=available(p);
  check(stake<=max,'XP cược vượt XP khả dụng');
  return Object.freeze({employeeId:p.employeeId,stake});
 });
 return Object.freeze({game,participants:Object.freeze(list),pot:list.reduce((a,p)=>a+p.stake,0)});
}
function settlement(contract,outcome){
 check(contract&&GAME_IDS.includes(contract.game),'Hợp đồng không hợp lệ');
 // The caller must build outcome from a validated server-owned match.
 // Merely receiving a "winner" from a browser is NOT verification.
 check(outcome&&['win','draw','cancel'].includes(outcome.type),'Chưa có kết quả hợp lệ');
 const entries=contract.participants;
 check(Array.isArray(entries)&&entries.length===GAME_SEATS[contract.game],'Người chơi không hợp lệ');
 const deltas=Object.fromEntries(entries.map(p=>[p.employeeId,0]));
 if(outcome.type==='win'){
  check(STAFF_ID.test(outcome.winnerId)&&Object.hasOwn(deltas,outcome.winnerId),'Người thắng không thuộc trận');
  for(const p of entries){
   if(p.employeeId!==outcome.winnerId)deltas[p.employeeId]=-p.stake;
   else deltas[p.employeeId]=contract.pot-p.stake;
  }
 }
 const total=Object.values(deltas).reduce((a,n)=>a+n,0);
 check(total===0,'Quyết toán không bảo toàn XP');
 return Object.freeze({game:contract.game,pot:contract.pot,deltas:Object.freeze(deltas),
  type:outcome.type,winnerId:outcome.type==='win'?outcome.winnerId:null});
}
function applyOnce(profile,{matchId,delta,at}){
 check(profile&&STAFF_ID.test(profile.employeeId),'Hồ sơ không hợp lệ');
 check(typeof matchId==='string'&&MATCH_ID.test(matchId),'Mã trận không hợp lệ');
 check(Number.isSafeInteger(delta),'Điểm quyết toán phải là số nguyên');
 if(profile.wagerReceipts?.[matchId]){
  check(profile.wagerReceipts[matchId].delta===delta,'Trùng mã trận với điểm khác');
  return {profile,applied:false,duplicate:true};
 }
 const previous=credits(profile.xp,'XP hồ sơ');
 const nextXp=Number((previous+delta).toFixed(2));
 check(nextXp>=0&&Number.isSafeInteger(Math.floor(nextXp))&&Number.isFinite(nextXp),'XP sau quyết toán không hợp lệ');
 const oldLevel=engine.levelForXP(previous),newLevel=engine.levelForXP(nextXp);
 const next={
  ...profile,xp:nextXp,
  levelPeak:Math.max(Number(profile.levelPeak)||1,oldLevel,newLevel),
  wagerReceipts:{...(profile.wagerReceipts||{}),[matchId]:{delta,at:at||Date.now()}},
 };
 // Preserve previously unlocked cosmetics, titles and other preferences.
 // New automatic unlocks may be added on a verified increase as usual.
 const result=delta>0?engine.equipOnLevelUp(profile,next):next;
 return {profile:result,applied:true,duplicate:false,before:previous,after:nextXp,
  oldLevel,newLevel,levelChanged:oldLevel!==newLevel};
}
module.exports={GAME_SEATS,GAME_IDS,available,prepare,settlement,applyOnce};
