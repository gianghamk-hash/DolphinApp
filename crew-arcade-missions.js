/* Arcade Crew daily reward bridge. Gameplay works offline without rewards;
 * earning XP requires a verified Staff ID and server-validated session replay.
 */
(function(root){
 'use strict';
 const direction={up:'U',down:'D',left:'L',right:'R'};
 let callable=null;
 function status(msg,error){
  const node=document.getElementById('dailyQuestStatus');
  if(node){node.textContent=msg;node.style.color=error?'#fca5a5':'#fbd77a';}
 }
 async function api(name,payload){
  if(!callable){
   if(!root.DolphinStaffId?.ready)throw Error('Cần kết nối Staff ID');
   await root.DolphinStaffId.ready();
   const [fb,auth,func]=await Promise.all([
    import('https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js'),
    import('https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js'),
    import('https://www.gstatic.com/firebasejs/10.12.2/firebase-functions.js')
   ]);
   const app=fb.getApp('staff-identity-app'),current=auth.getAuth(app);
   if(current.authStateReady)await current.authStateReady();
   if(!current.currentUser)throw Error('Chưa kết nối Staff ID');
   const functions=func.getFunctions(app,'asia-southeast1');
   callable=(key,data)=>func.httpsCallable(functions,key)(data).then(x=>x.data);
  }
  return callable(name,payload);
 }
 function bounded(promise,ms){
  let timer;
  return Promise.race([promise,new Promise((_,reject)=>{
   timer=setTimeout(()=>reject(Error('Không có kết nối máy chủ')),ms);
  })]).finally(()=>clearTimeout(timer));
 }
 async function start(game){
  status('Nhiệm vụ game: đang xác minh Staff ID…');
  try{
   if(!root.DolphinStaffId?.ready)throw Error('Không có Staff ID');
   await bounded(root.DolphinStaffId.ready(),2500);
   const staff=root.DolphinStaffId?.get?.();
   if(!staff?.verified){status('Chơi tự do · Xác minh Staff ID để nhận XP.');return null;}
   const challenge=await bounded(api('staffStartArcadeMission',{game}),4000);
   status('🎯 Đạt mốc điểm để nhận XP hôm nay!');
   return {game,challengeId:challenge.challengeId,rng:root.DolphinArcadeProof.random(challenge.seed),
    moves:'',submitted:false,eligible:true};
  }catch(error){
   status('Chơi tự do · Nhiệm vụ XP cần kết nối máy chủ.',true);
   console.warn('[Crew Arcade] Challenge unavailable:',error?.message||error);
   return null;
  }
 }
 function move(run,dir){
  if(!run||!run.eligible||run.submitted)return;
  const key=direction[dir]||dir;
  if(!/^[UDLR]$/.test(key))return;
  if(run.moves.length>=5000){invalidate(run);return;}
  run.moves+=key;
 }
 function invalidate(run){
  if(run){run.eligible=false;run.submitted=true;}
  status('Ván chơi có hoàn tác/không hợp lệ · Bắt đầu ván mới để nhận XP.',true);
 }
 async function claim(run,score){
  if(!run||!run.eligible||run.submitted)return;
  run.submitted=true;
  status('Đã đạt mục tiêu! Đang xác minh diễn biến ván chơi…');
  try{
   const result=await api('staffFinishArcadeMission',{
    game:run.game,challengeId:run.challengeId,moves:run.moves,score
   });
   status(result.awarded?'🎉 Hoàn thành nhiệm vụ! +'+result.addedXP+' XP':
    '✅ Đã hoàn thành nhiệm vụ game hôm nay. Không cộng XP lần hai.');
   try{root.parent?.dispatchEvent?.(new CustomEvent('dolphin-arcade-mission-earned',{detail:result}));}catch(_){}
  }catch(error){
   status('Không thể xác nhận XP: '+String(error?.message||error).slice(0,85),true);
   console.warn('[Crew Arcade] Claim rejected:',error?.code||error?.message||error);
  }
 }
 root.DolphinCrewArcade={start,move,invalidate,claim};
})(window);
