/* Dolphin Tactics authoritative Firebase Functions multiplayer adapter.
 * Only server owns room state, combat and placement. Other games keep legacy Firestore.
 */
(function(root){'use strict';
function createAdapter(config){
 const appName='tactics-authority',fb=root.firebase;
 if(!fb?.auth||!fb?.functions)throw Error('Firebase Auth/Functions SDK required');
 const app=fb.apps.find(x=>x.name===appName)||fb.initializeApp(config,appName);
 const auth=app.auth(),functions=app.functions('asia-southeast1');
 const call=(name,data)=>functions.httpsCallable(name)(data).then(x=>x.data);
 let roomId='',uid='',last='',onStop=null,polling=false,timer=null;
 async function identity(){
  if(!auth.currentUser)await auth.signInAnonymously();
  uid=auth.currentUser.uid;
  return uid;
 }
 async function fetchState(){
  if(!roomId||polling)return;
  polling=true;
  try{
   const {state}=await call('tacticsGetRoom',{roomId});
   const snapshot=JSON.stringify(state);
   if(snapshot!==last){
    last=snapshot;
    const order=state.playerOrder||[];
    onStop?.emit('room',{id:roomId,hostId:state.hostId,isHost:state.hostId===uid,status:state.status});
    onStop?.emit('players',{players:order.map((id,i)=>({id,name:state.players[id]?.displayName||'Người chơi',side:'p'+(i+1)}))});
    onStop?.emit('state',state);
   }
  }catch(err){onStop?.emit('error',{type:'server',err});}
  finally{polling=false;}
 }
 return {
  async createRoom(){await identity();const result=await call('tacticsCreateRoom',{});roomId=result.roomId;last='';return {...result,playerId:uid,isHost:true};},
  async joinRoom(code){await identity();const result=await call('tacticsJoinRoom',{roomId:code});roomId=result.roomId;last='';return {...result,playerId:uid,isHost:false};},
  subscribe({roomId:id,emit}){roomId=id;onStop={emit};void fetchState();timer=setInterval(fetchState,2200);return ()=>{clearInterval(timer);timer=null;onStop=null;last='';roomId='';};},
  async leaveRoom(){if(roomId)await call('tacticsLeaveRoom',{roomId});},
  async startRoom(){const res=await call('tacticsStartRoom',{roomId});await fetchState();return res;},
  async action(action){const res=await call('tacticsAction',{roomId,action});await fetchState();return res;},
  async advance(){const res=await call('tacticsAdvanceRoom',{roomId});await fetchState();return res;},
  async submitVerifiedResult(){return call('tacticsSubmitVerifiedResult',{roomId});},
  getUid:()=>uid,refresh:fetchState
 };
}
root.DolphinCreateTacticsAuthorityAdapter=createAdapter;
})(typeof window!=='undefined'?window:globalThis);
