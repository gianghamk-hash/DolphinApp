/* Arcade Crew daily reward bridge. Gameplay works offline without rewards;
 * earning XP requires a verified Staff ID and server-validated session replay.
 */
(function(root){
 'use strict';
 const direction={up:'U',down:'D',left:'L',right:'R'};
 let callable=null;
 function status(msg,error,retryRun){
  const node=document.getElementById('dailyQuestStatus');
  if(!node)return;
  node.textContent=msg;node.style.color=error?'#fca5a5':'#fbd77a';
  if(retryRun){
   const button=document.createElement('button');button.type='button';
   button.textContent=' Thử xác nhận XP lại';
   button.style.cssText='margin-left:7px;padding:4px 8px;border-radius:8px;border:1px solid #fbd77a;color:#fbd77a;background:transparent;cursor:pointer';
   button.onclick=()=>void claim(retryRun,retryRun.claimPayload?.score);
   node.appendChild(button);
  }
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
   await bounded(root.DolphinStaffId.ready(),10000);
   const staff=root.DolphinStaffId?.get?.();
   if(!staff?.verified){status('Chơi tự do · Xác minh Staff ID để nhận XP.');return null;}
   // Cloud Functions cold starts may exceed four seconds. Do not silently
   // downgrade a verified employee to free play while the server is waking up.
   const challenge=await bounded(api('staffStartArcadeMission',{game}),20000);
   if(!challenge?.challengeId||!Number.isSafeInteger(challenge.seed))throw Error('Máy chủ chưa cấp ván có thưởng.');
   status(game==='snake'?'🎯 Đạt 200 điểm để nhận 1.500 XP!':'🎯 Đạt 1.000 điểm để nhận 3.000 XP!');
   return {game,challengeId:challenge.challengeId,rng:root.DolphinArcadeProof.random(challenge.seed),
    moves:'',submitted:false,eligible:true,verifying:false,claimed:false,claimPayload:null};
  }catch(error){
   status('Chơi tự do · Chưa tạo được ván thưởng XP: '+String(error?.message||error).slice(0,100),true);
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
 function retryable(error){
  return !/invalid-argument|permission-denied|failed-precondition|already-exists|unauthenticated/.test(String(error?.code||''));
 }
 async function claim(run,score){
  if(!run||!run.eligible||run.claimed||run.verifying)return;
  // Freeze the achieved score and move history at the threshold. Continuing
  // gameplay must never mutate a replay being retried over a slow connection.
  if(!run.claimPayload){
   if(!Number.isSafeInteger(score))return;
   run.claimPayload=Object.freeze({game:run.game,challengeId:run.challengeId,moves:run.moves,score});
  }
  run.submitted=true;
  run.verifying=true;
  status('Đã đạt mục tiêu! Đang xác minh diễn biến ván chơi…');
  try{
   for(let attempt=0;attempt<2;attempt++){
    try{
     const result=await bounded(api('staffFinishArcadeMission',run.claimPayload),20000);
     const taskId=run.game==='snake'?'snake_100':'game2048_1000';
     const completed=!!result?.missions?.tasks?.some(t=>t.id===taskId&&t.done);
     if(!result?.awarded&&!completed)throw Error('Máy chủ chưa ghi nhận nhiệm vụ.');
     run.claimed=true;
     status(result.awarded?'🎉 Hoàn thành nhiệm vụ! +'+result.addedXP+' XP':
      '✅ Nhiệm vụ game đã hoàn thành hôm nay. Không cộng XP hai lần.');
     try{root.dispatchEvent(new CustomEvent('dolphin-arcade-mission-earned',{detail:result}));}catch(_){}
     try{if(root.parent&&root.parent!==root)root.parent.dispatchEvent(new CustomEvent('dolphin-arcade-mission-earned',{detail:result}));}catch(_){}
     return;
    }catch(error){
     if(attempt===0&&retryable(error)){
      status('Kết nối chậm · đang gửi lại đúng kết quả đã xác minh…');
      await new Promise(resolve=>setTimeout(resolve,1000));
      continue;
     }
     status('Không thể xác nhận XP: '+String(error?.message||error).slice(0,110),true,
      retryable(error)?run:null);
     console.warn('[Crew Arcade] Claim rejected:',error?.code||error?.message||error);
     return;
    }
   }
  }finally{run.verifying=false;}
 }
 root.DolphinCrewArcade={start,move,invalidate,claim};
})(window);
