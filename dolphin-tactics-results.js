/* Shared casual TFT match receipts and statistics. Never writes verified ranks.
 * Read placements from the completed Firestore room, not caller-supplied scores.
 */
(function(root){'use strict';
const GAME='dolphin-tactics-online',COLLECTION='game_scores',QUEUE_KEY='dolphin_tft_pending_results';
const POINTS=Object.freeze([0,25,18,12,6]);
function rowsFor(room){
 if(room?.status!=='finished'||!Array.isArray(room.playerOrder)||room.playerOrder.length!==4||new Set(room.playerOrder).size!==4)throw Error('Trận đấu chưa có đủ kết quả của 4 người');
 const rows=room.playerOrder.map(uid=>{
  const p=room.players?.[uid],placement=room.finalPlacements?.[uid];
  if(!p||!Number.isInteger(placement)||placement<1||placement>4)throw Error('Thiếu thứ hạng cuối trận, chưa thể đồng bộ');
  return {uid,player:String(p.displayName||'Người chơi').slice(0,32),placement,score:POINTS[placement],hp:Number(p.hp)||0,level:Number(p.level)||1};
 }).sort((a,b)=>a.placement-b.placement);
 if(new Set(rows.map(r=>r.placement)).size!==4||room.winnerId&&rows[0].uid!==room.winnerId)throw Error('Thứ hạng cuối trận không hợp lệ');
 return rows;
}
const matchId=(id,seed)=>'tft_match__'+encodeURIComponent(id)+'__'+String(seed);
const rankId=uid=>'tft_online__'+encodeURIComponent(uid);
function createService(db,options={}){
 const clock=options.clock||Date.now;
 let storage=options.storage;try{storage ||= root.localStorage;}catch(error){}
 function queue(){try{return JSON.parse(storage?.getItem(QUEUE_KEY)||'[]').filter(x=>x.roomId&&x.uid&&Number.isSafeInteger(x.seed));}catch(error){return [];}}
 function save(items){try{storage?.setItem(QUEUE_KEY,JSON.stringify(items));}catch(error){}}
 function remember(roomId,uid,seed){const key=matchId(roomId,seed),items=queue();if(!items.some(x=>matchId(x.roomId,x.seed)===key))save([...items,{roomId,uid,seed}]);}
 function forget(roomId,seed){save(queue().filter(x=>matchId(x.roomId,x.seed)!==matchId(roomId,seed)));}
 async function recordFinishedRoom(roomId,uid,seed){
  if(!/^[A-Z2-9]{6}$/.test(roomId)||!uid||!Number.isSafeInteger(seed))throw Error('Thiếu mã trận để đồng bộ');
  remember(roomId,uid,seed);
  const roomRef=db.collection('mp_rooms').doc(roomId),receiptRef=db.collection(COLLECTION).doc(matchId(roomId,seed));
  const result=await db.runTransaction(async tx=>{
   const [metaSnap,stateSnap,receiptSnap]=await Promise.all([tx.get(roomRef),tx.get(roomRef.collection('data').doc('state')),tx.get(receiptRef)]);
   const meta=metaSnap.data(),room=stateSnap.data();
   if(meta?.game!=='dolphin-tactics'||meta.protocol!=='tactics-atomic-v2'||!Object.values(meta.seats||{}).includes(uid)||!room?.players?.[uid])throw Error('Không thuộc phòng online này');
   if(room.mode!=='casual'||room.protocol!=='tactics-atomic-v2'||room.seed!==seed)throw Error('Trận này không thuộc bảng thống kê online');
   const rows=rowsFor(room);
   if(receiptSnap.exists){const receipt=receiptSnap.data();if(receipt.roomId!==roomId||receipt.seed!==seed||receipt.recordType!=='tft-match')throw Error('Biên nhận trận không hợp lệ');return {alreadyCounted:true,rows:receipt.rows};}
   const refs=rows.map(row=>db.collection(COLLECTION).doc(rankId(row.uid)));
   const prior=await Promise.all(refs.map(ref=>tx.get(ref))),time=clock();
   rows.forEach((row,i)=>{
    const old=prior[i].data()||{};
    tx.set(refs[i],{game:GAME,recordType:'tft-online-rank',uid:row.uid,player:row.player,
     totalScore:(Number(old.totalScore)||0)+row.score,totalGames:(Number(old.totalGames)||0)+1,
     wins:(Number(old.wins)||0)+(row.placement===1?1:0),losses:(Number(old.losses)||0)+(row.placement===1?0:1),
     totalPlacement:(Number(old.totalPlacement)||0)+row.placement,lastPlayed:time,lastMatchId:matchId(roomId,seed)});
   });
   tx.set(receiptRef,{game:'dolphin-tactics-match',recordType:'tft-match',roomId,seed,rows,completedRound:room.round,completedAt:Number(room.updatedAt)||time,syncedAt:time});
   return {alreadyCounted:false,rows};
  },{maxAttempts:10});
  forget(roomId,seed);
  try{storage?.setItem('dolphin_tft_result_synced',JSON.stringify({matchId:matchId(roomId,seed),at:clock()}));}catch(error){}
  return result;
 }
 async function getLeaderboard(limit=30){
  const snap=await db.collection(COLLECTION).where('game','==',GAME).get();
  return snap.docs.map(d=>d.data()).filter(x=>x.recordType==='tft-online-rank'&&x.totalGames>0)
   .sort((a,b)=>b.totalScore-a.totalScore||b.wins-a.wins||a.totalPlacement/a.totalGames-b.totalPlacement/b.totalGames||a.lastPlayed-b.lastPlayed)
   .slice(0,Math.max(1,Math.min(100,Number(limit)||30)));
 }
 async function flush(){const results=[];for(const item of queue()){try{results.push(await recordFinishedRoom(item.roomId,item.uid,item.seed));}catch(error){results.push({error:String(error.message||error)});}}return results;}
 async function repairLastRoom(uid){
  if(!uid)return null;
  let saved;try{saved=JSON.parse(storage?.getItem('dolphin_tactics_last_room')||'null');}catch(error){return null;}
  if(!/^[A-Z2-9]{6}$/.test(saved?.code||''))return null;
  const snap=await db.collection('mp_rooms').doc(saved.code).collection('data').doc('state').get({source:'server'}),room=snap.data();
  if(room?.status!=='finished'||room.mode!=='casual'||!room.players?.[uid])return null;
  return recordFinishedRoom(saved.code,uid,room.seed);
 }
 return {recordFinishedRoom,getLeaderboard,flush,repairLastRoom,pending:queue};
}
root.DolphinTacticsResults={createService,rowsFor,POINTS,GAME,matchId,rankId};
if(typeof module!=='undefined'&&module.exports)module.exports=root.DolphinTacticsResults;
})(typeof window!=='undefined'?window:globalThis);
