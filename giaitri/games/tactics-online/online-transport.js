/* Casual TFT transport v2. Atomic room commands, no browser-host relay.
 * This preserves the existing browser trust model; verified rankings still
 * require the separate server-authoritative API. Never award ranked points here.
 */
(function(root){'use strict';
const PROTOCOL='tactics-atomic-v2',MAX_QUEUE=24,MAX_RECEIPTS=24;
function compact(state){
 const out=JSON.parse(JSON.stringify(state));
 out.reports=(out.reports||[]).map(({pair,winner,loser,damage})=>({pair,winner,loser,damage}));
 return out;
}
function createTransport(E,db,options={}){
 const clock=options.clock||Date.now,random=options.random||Math.random;
 const interval=options.setInterval||setInterval,cancel=options.clearInterval||clearInterval;
 const deviceId=options.deviceId||root.DolphinMP.getDeviceId();
 const session=clock().toString(36)+'-'+random().toString(36).slice(2);
 const transaction=fn=>db.runTransaction(fn,{maxAttempts:10});
 let roomId='',emit=null,unsubs=[],heartbeat=null,generation=0,sequence=0;
 let pending=0,tail=Promise.resolve(),latest=null,predictions=[],offset=0,lastServerAt=0,lastError='',visible=!root.document?.hidden,beating=false;
 const now=()=>clock()+offset;
 const online=options.isOnline||(()=>!root.navigator||root.navigator.onLine!==false);
 const roomRef=id=>db.collection('mp_rooms').doc(id||roomId);
 const notify=(type,payload)=>{if(emit)emit(type,payload);};
 function network(){notify('network',{pending,lastServerAt,error:lastError,online:online()});}
 function failure(err){lastError=String(err.message||err);network();notify('error',{type:'online',err});}
 function publishView(){
  if(!latest)return;
  const view=E.clone(latest);
  for(const prediction of predictions){
   if(view.commandReceipts?.[deviceId]?.includes(prediction.id)||view.round!==prediction.round||view.roundPhase!==prediction.phase)continue;
   // Only placement and shop-lock are predicted. Ownership, RNG, purchases and
   // gold always come from the committed transaction, avoiding phantom units.
   try{E.action(view,deviceId,prediction.action,now());}catch(error){}
  }
  notify('state',view);
 }
 function accept(state){
  if(!state||latest&&(state.revision||0)<(latest.revision||0))return;
  if(latest&&(state.revision||0)===(latest.revision||0))return;
  latest=state;publishView();
 }
 function stop(){
  generation++;unsubs.forEach(fn=>fn());unsubs=[];
  if(heartbeat!==null)cancel(heartbeat);heartbeat=null;emit=null;latest=null;roomId='';
  pending=0;tail=Promise.resolve();predictions=[];lastServerAt=0;lastError='';beating=false;
 }
 function ensure(meta,id=deviceId){
  if(!meta||meta.protocol!==PROTOCOL)throw Error('Phòng dùng phiên bản cũ. Hãy cập nhật game và tạo phòng mới.');
  if(!Object.values(meta.seats||{}).includes(id))throw Error('Bạn không còn trong phòng');
  if(meta.status==='closed')throw Error('Phòng đã đóng');
 }
 async function beat(id,gen){
  if(gen!==generation||!online()||!visible||beating)return;
  beating=true;
  const ref=roomRef(id).collection('players').doc(deviceId),sent=clock();
  try{
   const stamp=options.serverTimestamp?options.serverTimestamp():root.firebase.firestore.FieldValue.serverTimestamp();
   await ref.update({lastSeen:stamp,online:true});
   const snap=await ref.get({source:'server'});
   if(gen!==generation)return;
   const received=clock(),server=snap.data()?.lastSeen;
   if(server&&typeof server.toMillis==='function'&&received-sent<5000)offset=server.toMillis()-(sent+received)/2;
   lastServerAt=received;lastError='';network();
  }catch(err){if(gen===generation)failure(err);}
  finally{if(gen===generation)beating=false;}
 }
 async function createRoom({name}={}){
  for(let attempt=0;attempt<10;attempt++){
   const chars='ABCDEFGHJKMNPQRSTUVWXYZ23456789';
   const code=Array.from({length:6},()=>chars[Math.floor(random()*chars.length)]).join('');
   const ref=roomRef(code),time=now();
   const created=await transaction(async tx=>{
    if((await tx.get(ref)).exists)return false;
    tx.set(ref,{game:'dolphin-tactics',protocol:PROTOCOL,hostId:deviceId,status:'waiting',maxPlayers:4,seats:{p1:deviceId},createdAt:time,updatedAt:time});
    tx.set(ref.collection('players').doc(deviceId),{name:String(name||'Người chơi').slice(0,32),side:'p1',joinedAt:time,lastSeen:time,online:true});
    return true;
   });
   if(created)return {roomId:code,playerId:deviceId,isHost:true,side:'p1'};
  }
  throw Error('Không tạo được phòng, hãy thử lại');
 }
 async function joinRoom(code,{name}={}){
  code=String(code||'').trim().toUpperCase();if(!/^[A-Z2-9]{6}$/.test(code))throw Error('Mã phòng phải gồm 6 ký tự');
  const ref=roomRef(code);
  return transaction(async tx=>{
   const snap=await tx.get(ref);if(!snap.exists)throw Error('Phòng không tồn tại');
   const meta=snap.data();if(meta.protocol!==PROTOCOL)throw Error('Phòng dùng phiên bản cũ. Hãy cập nhật game và tạo phòng mới.');
   const seats={...meta.seats};let side=Object.keys(seats).find(k=>seats[k]===deviceId);
   if(meta.status==='closed')throw Error('Phòng đã đóng');
   if(!side){if(meta.status!=='waiting')throw Error('Trận đã bắt đầu');for(let n=1;n<=4;n++)if(!seats['p'+n]){side='p'+n;break;}if(!side)throw Error('Phòng đã đủ 4 người');seats[side]=deviceId;}
   tx.update(ref,{seats,updatedAt:now()});
   tx.set(ref.collection('players').doc(deviceId),{name:String(name||'Người chơi').slice(0,32),side,joinedAt:now(),lastSeen:now(),online:true},{merge:true});
   return {roomId:code,playerId:deviceId,isHost:meta.hostId===deviceId,side};
  });
 }
 function subscribe(input){
  stop();roomId=input.roomId;emit=input.emit;const gen=generation,id=roomId,ref=roomRef(id);
  const guard=fn=>value=>{if(gen===generation)fn(value);};
  const error=guard(failure);
  unsubs.push(ref.onSnapshot({includeMetadataChanges:true},guard(snap=>{
   if(!snap.exists){failure(Error('Phòng không tồn tại'));return;}
   if(!snap.metadata?.fromCache&&!snap.metadata?.hasPendingWrites){lastServerAt=clock();lastError='';network();}
   const meta=snap.data();notify('room',{id,...meta,isHost:meta.hostId===deviceId});
  }),error));
  unsubs.push(ref.collection('players').onSnapshot(guard(snap=>{
   notify('players',{players:snap.docs.map(d=>({id:d.id,...d.data()})),me:deviceId});
  }),error));
  unsubs.push(ref.collection('data').doc('state').onSnapshot({includeMetadataChanges:true},guard(snap=>{
   if(snap.metadata?.hasPendingWrites)return;
   if(!snap.metadata?.fromCache){lastServerAt=clock();lastError='';network();}
   if(snap.exists)accept(snap.data());
  }),error));
  void beat(id,gen);heartbeat=interval(()=>{void beat(id,gen);},15000);
  return stop;
 }
 function enqueue(operation,priority=false){
  if(!roomId||!online())return Promise.reject(Error('Mất kết nối — thao tác chưa được gửi'));
  if(pending>=MAX_QUEUE)return Promise.reject(Error('Đang đồng bộ nhiều thao tác, vui lòng đợi một chút'));
  const id=roomId,gen=generation,deadline=now()+10000;
  pending++;network();
  const result=(priority?Promise.resolve():tail).then(async()=>{
   if(gen!==generation)throw Error('Đã rời phòng');
   if(now()>deadline)throw Error('Thao tác hết hạn, hãy kiểm tra trạng thái và thử lại');
   try{const value=await operation(id,gen,deadline);if(gen===generation){lastServerAt=clock();lastError='';}return value;}
   catch(err){if(gen===generation){lastError=String(err.message||err);}throw err;}
  });
  if(!priority)tail=result.catch(()=>{});
  return result.finally(()=>{if(gen===generation){pending--;network();}});
 }
 async function change(id,gen,mutate){
  const ref=roomRef(id),data=ref.collection('data').doc('state');
  const result=await transaction(async tx=>{
   const [metaSnap,stateSnap]=await Promise.all([tx.get(ref),tx.get(data)]);
   if(gen!==generation)throw Error('Đã rời phòng');
   const meta=metaSnap.data();ensure(meta);
   const state=stateSnap.exists?stateSnap.data():null;
   const next=await mutate(state,meta,tx,ref);
   if(gen!==generation)throw Error('Đã rời phòng');
   if(!next)return state;
   const clean=compact(next);clean.revision=(state?.revision||0)+1;clean.updatedAt=now();
   tx.set(data,clean);
   if(meta.status!==clean.status)tx.update(ref,{status:clean.status,updatedAt:now()});
   return clean;
  });
  if(gen===generation)accept(result);
  return result;
 }
 function action(action){
  if(!roomId||!online())return Promise.reject(Error('Mất kết nối — thao tác chưa được gửi'));
  if(pending>=MAX_QUEUE)return Promise.reject(Error('Đang đồng bộ nhiều thao tác, vui lòng đợi một chút'));
  const command=JSON.parse(JSON.stringify(action)),expected=latest&&{round:latest.round,phase:latest.roundPhase};
  const commandId=session+':'+(++sequence),gen=generation;
  if(command.type==='BUY')command.expectedHero=latest?.players[deviceId]?.shop[command.index];
  const result=enqueue((id,gen,deadline)=>change(id,gen,state=>{
   if(!state)throw Error('Trận chưa bắt đầu');
   if(state.commandReceipts?.[deviceId]?.includes(commandId))return null;
   if(now()>deadline||!expected||state.round!==expected.round||state.roundPhase!==expected.phase)throw Error('Giai đoạn đã thay đổi — thao tác chưa được áp dụng');
   if(command.type==='BUY'&&state.players[deviceId]?.shop[command.index]!==command.expectedHero)throw Error('Shop đã thay đổi, hãy chọn lại tướng');
   E.action(state,deviceId,command,now());
   state.commandReceipts ||= {};state.commandReceipts[deviceId]=[...(state.commandReceipts[deviceId]||[]),commandId].slice(-MAX_RECEIPTS);
   return state;
  }));
  if(expected&&['MOVE','TOGGLE_SHOP_LOCK'].includes(command.type)){
   predictions.push({id:commandId,action:command,...expected});publishView();
  }
  return result.finally(()=>{if(gen===generation){predictions=predictions.filter(p=>p.id!==commandId);publishView();}});
 }
 function startRoom(){return enqueue((id,gen)=>change(id,gen,async(state,meta,tx,ref)=>{
  if(meta.hostId!==deviceId)throw Error('Chỉ chủ phòng được bắt đầu');
  if(meta.status!=='waiting'||state)return null;
  const seats=Object.entries(meta.seats).sort(([a],[b])=>a.localeCompare(b));
  if(seats.length!==4)throw Error('Cần đủ 4 người');
  const players=await Promise.all(seats.map(([,uid])=>tx.get(ref.collection('players').doc(uid))));
  if(players.some(p=>{
   const value=p.data(),seen=value?.lastSeen,stamp=seen&&typeof seen.toMillis==='function'?seen.toMillis():Number(seen)||0;
   return !p.exists||value.online===false||now()-stamp>45000;
  }))throw Error('Cần cả 4 người đang trực tuyến');
  const time=now(),room=E.roomNew(deviceId,players[0].data().name,time,Math.floor(random()*2147483647)||1);
  room.playerOrder=seats.map(([,uid])=>uid);room.players={};
  for(let i=0;i<players.length;i++){const uid=room.playerOrder[i];room.players[uid]=E.freshPlayer(uid,players[i].data().name,room);}
  room.mode='casual';room.protocol=PROTOCOL;room.rankingEligible=false;room.status='in_game';room.phaseStartedAt=time;room.phaseEndsAt=time+E.PHASES.PREPARATION;
  return room;
 }));}
 function advance(){
  const phase=latest&&[latest.round,latest.roundPhase,latest.phaseEndsAt].join(':');
  return enqueue((id,gen)=>change(id,gen,async state=>{
   if(!state||state.status!=='in_game'||[state.round,state.roundPhase,state.phaseEndsAt].join(':')!==phase)return null;
   const allReady=state.roundPhase==='PREPARATION'&&state.playerOrder.filter(uid=>!state.players[uid].eliminated).every(uid=>state.players[uid].ready);
   if(now()<state.phaseEndsAt&&!allReady)return null;
   return options.advance?options.advance(state,now()):E.advance(state,now(),{recordEvents:false});
  }),true);
 }
 async function leaveRoom(id){
  id=id||roomId;if(!id)return;
  const ref=roomRef(id);
  await transaction(async tx=>{
   const snap=await tx.get(ref);if(!snap.exists)return;
   const meta=snap.data(),seats={...meta.seats},side=Object.keys(seats).find(k=>seats[k]===deviceId);
   if(!side)return;
   if(meta.status==='waiting'){
    delete seats[side];const remaining=Object.entries(seats).sort(([a],[b])=>a.localeCompare(b));
    tx.update(ref,{seats,hostId:remaining[0]?.[1]||'',status:remaining.length?'waiting':'closed',updatedAt:now()});
    tx.delete(ref.collection('players').doc(deviceId));
   }else tx.update(ref.collection('players').doc(deviceId),{online:false});
  });
 }
 function resume(){visible=!root.document?.hidden;if(visible&&roomId)void beat(roomId,generation);}
 function mount(){root.addEventListener?.('online',resume);root.document?.addEventListener('visibilitychange',resume);}
 function unmount(){root.removeEventListener?.('online',resume);root.document?.removeEventListener('visibilitychange',resume);stop();}
 return {createRoom,joinRoom,subscribe,leaveRoom,action,startRoom,advance,now,mount,unmount,
  getStatus:()=>({pending,lastServerAt,error:lastError,online:online()}),getState:()=>latest};
}
root.DolphinTacticsOnline={createTransport,compact,PROTOCOL,MAX_QUEUE,MAX_RECEIPTS};
if(typeof module!=='undefined'&&module.exports)module.exports=root.DolphinTacticsOnline;
})(typeof window!=='undefined'?window:globalThis);
