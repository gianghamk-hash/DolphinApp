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
   let roomId='',uid='',last='',lastSnapshot='',onStop=null,polling=false,timer=null;
 async function identity(){
  if(!auth.currentUser){try{await auth.signInAnonymously();}catch(err){if(err?.code==='auth/operation-not-allowed')throw Error('Firebase Authentication chưa bật Anonymous sign-in; cần bật tại Authentication → Sign-in method.');throw err;}}
  uid=auth.currentUser.uid;
  return uid;
 }
 let isFetching = false;
 async function fetchState() {
    if (isFetching || !roomId) return;
    isFetching = true;
    try {
      const { state } = await call('tacticsGetRoom', { roomId });
      if (state) {
        const snapshot = JSON.stringify(state);
        if (snapshot !== lastSnapshot) {
          lastSnapshot = snapshot;
          if (onStop && onStop.emit) onStop.emit(state);
        }
      }
    } catch (err) {
      console.warn('[authority-adapter] fetchState error:', err);
    } finally {
      isFetching = false;
    }
 }
 return {
  async createRoom(options={}){await identity();const result=await call('tacticsCreateRoom',{name:options.name});roomId=result.roomId;last='';return {...result,playerId:uid,isHost:true};},
  async joinRoom(code,options={}){await identity();const result=await call('tacticsJoinRoom',{roomId:code,name:options.name});roomId=result.roomId;last='';return {...result,playerId:uid,isHost:false};},
  subscribe({roomId:id,emit}){roomId=id;onStop={emit};void fetchState();timer=setInterval(()=>{if(!document.hidden&&navigator.onLine)void fetchState();},1200);return ()=>{clearInterval(timer);timer=null;onStop=null;last='';roomId='';};},
  async leaveRoom(id){const leaving=id||roomId;if(leaving)await call('tacticsLeaveRoom',{roomId:leaving});},
  async startRoom(){const res=await call('tacticsStartRoom',{roomId});await fetchState();return res;},
   async dispatch(action) {
      const res = await call('tacticsAction', { roomId, ...action });
      if (res && res.state) {
        lastSnapshot = JSON.stringify(res.state);
          if (onStop && onStop.emit) onStop.emit(res.state);
      }
      return res;
    },
    async action(action) { return this.dispatch(action); },
  async advance(){const res=await call('tacticsAdvanceRoom',{roomId});await fetchState();return res;},
  async submitVerifiedResult(){return call('tacticsSubmitVerifiedResult',{roomId});},
  getUid:()=>uid,refresh:fetchState
 };
}
root.DolphinCreateTacticsAuthorityAdapter=createAdapter;
})(typeof window!=='undefined'?window:globalThis);
