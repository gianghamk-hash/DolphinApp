/* Round opponent announcement. State updates must never restart its lifetime. */
(function(root){'use strict';
const COMBAT_ANNOUNCEMENT_MS=4000;
function opponentText(state,uid){
 const pair=state.pairs?.find(pair=>pair.a===uid||pair.b===uid);
 if(!pair)return '';
 const prefix='⚔ VÒNG '+state.round+' — ';
 if(pair.pve)return prefix+'ĐẤU QUÁI PvE';
 const enemyId=pair.a===uid?pair.b:pair.a;
 const enemy=state.players?.[enemyId];
 return prefix+(pair.ghost?'BÓNG MA CỦA: ':'ĐỐI THỦ: ')+(enemy?.displayName||'Người chơi');
}
function create(element,options={}){
 const clock=options.clock||Date.now,schedule=options.setTimeout||setTimeout,cancel=options.clearTimeout||clearTimeout;
 let key='',timer=null,hiddenCombat=false;
 function hide(){element.className='hidden';}
 function clear(){if(timer!==null)cancel(timer);timer=null;key='';hiddenCombat=false;hide();}
 function update(state,uid){
  const nextKey=[state.seed,state.round,state.roundPhase,state.phaseStartedAt,uid].join(':');
  if(nextKey!==key){hiddenCombat=false;key=nextKey;}
  if(timer!==null)cancel(timer);timer=null;
  if(state.status!=='in_game'){hide();return;}
  if(state.roundPhase==='PREPARATION'){
   element.className='';element.textContent='🛒 CHUẨN BỊ — VÒNG '+state.round;return;
  }
  if(state.roundPhase!=='COMBAT'){hide();return;}
  const text=opponentText(state,uid),remaining=COMBAT_ANNOUNCEMENT_MS-Math.max(0,clock()-state.phaseStartedAt);
  if(!text||hiddenCombat||remaining<=0){hiddenCombat=true;hide();return;}
  element.className='combat';element.textContent=text;element.title=text;
  const phaseKey=key;
  timer=schedule(()=>{if(key!==phaseKey)return;hiddenCombat=true;timer=null;hide();},remaining);
 }
 return {update,clear};
}
root.DolphinTacticsPhaseBanner={create,opponentText,COMBAT_ANNOUNCEMENT_MS};
if(typeof module!=='undefined'&&module.exports)module.exports=root.DolphinTacticsPhaseBanner;
})(typeof window!=='undefined'?window:globalThis);
