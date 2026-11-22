/* Dolphin Companion · Landing. Presentation only: XP, identity and check-in are server owned. */
(function(root){
 'use strict';
 const TZ='Asia/Ho_Chi_Minh';
 const greetingSlots=[
  {start:5,end:11,key:'morning',mood:'playful',text:'Chào buổi sáng! Một ngày mới đầy năng lượng nhé!'},
  {start:11,end:14,key:'noon',mood:'cheerful',text:'Chào buổi trưa! Chúc bạn phục vụ thật suôn sẻ!'},
  {start:14,end:18,key:'afternoon',mood:'playful',text:'Buổi chiều vui vẻ nhé! Mình luôn đồng hành cùng bạn!'},
  {start:18,end:22,key:'evening',mood:'calm',text:'Chào buổi tối! Cùng hoàn thành công việc thật tốt nào!'},
  {start:0,end:24,key:'night',mood:'sleepy',text:'Muộn rồi đó! Nhớ dành thời gian nghỉ ngơi nhé!'}
 ];
 const clamp=(n,min,max)=>Math.min(max,Math.max(min,n));
 const distance=(a,b)=>Math.hypot(b.x-a.x,b.y-a.y);
 function hourVN(date){
  const h=Number(new Intl.DateTimeFormat('en-GB',{timeZone:TZ,hour:'2-digit',hourCycle:'h23'}).format(date));
  return Number.isFinite(h)?h%24:0;
 }
 function dayVN(date){
  const parts=new Intl.DateTimeFormat('en-US',{timeZone:TZ,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(date);
  const obj=Object.fromEntries(parts.filter(x=>x.type!=='literal').map(x=>[x.type,x.value]));
  return obj.year+'-'+obj.month+'-'+obj.day;
 }
 function slot(hour){return greetingSlots.find(s=>hour>=s.start&&hour<s.end)||greetingSlots[4];}
 function pendingCheckin(profile,date){
  const daily=profile&&profile.dailyMissions;
  if(!daily||!Array.isArray(daily.tasks)||daily.date&&daily.date!==dayVN(date))return false;
  const task=daily.tasks.find(t=>t.id==='checkin');
  return !!task&&task.done===false;
 }
 function cubic(p,t){
  const u=1-t;
  return {x:u*u*u*p[0].x+3*u*u*t*p[1].x+3*u*t*t*p[2].x+t*t*t*p[3].x,
    y:u*u*u*p[0].y+3*u*u*t*p[1].y+3*u*t*t*p[2].y+t*t*t*p[3].y};
 }
 const logic=Object.freeze({hourVN,dayVN,slot,pendingCheckin,cubic});
 if(typeof module==='object'&&module.exports)module.exports=logic;
 root.DolphinLandingCompanionLogic=logic;
 const doc=root.document;
 if(!doc)return;
 const state={stage:null,flight:null,sprite:null,bubble:null,bubbleText:null,bubbleAction:null,
  profile:null,form:null,path:null,position:null,exit:null,frame:0,turn:0,
  lastWelcome:0,lastHint:'',pendingHint:'',lastSlot:'',touchCount:0,lastSecret:0,
  obstacles:null,obstaclesAt:0,
  reactionTimer:0,talkTimer:0,hintTimer:0,press:null,enabled:false};
 const $=id=>doc.getElementById(id);
 function identity(){
  const id=root.DolphinStaffId?.get?.();
  return id&&id.verified===true&&!id.requiresNameChange?id:null;
 }
 function canShow(){
  const landing=$('landing');
  return !!(state.stage&&state.form&&identity()&&
   doc.documentElement.classList.contains('dolphin-access-allowed')&&
   !doc.hidden&&!doc.body.classList.contains('app-mode')&&
   landing&&landing.style.display!=='none'&&!landing.classList.contains('fade-out')&&
   !urgentVisible());
 }
 function urgentVisible(){
  for(const name of ['reminderAlarm','orderNotif']){
   const el=$(name);
   if(!el)continue;
   const css=root.getComputedStyle(el);
   if(css.display!=='none'&&css.visibility!=='hidden'&&Number(css.opacity||1)>0.1)return true;
  }
  return false;
 }
 function size(){
  return {w:Math.max(1,root.innerWidth),h:Math.max(1,root.innerHeight),pet:state.flight?.offsetWidth||72};
 }
 function protect(){
  const now=Date.now();
  if(state.obstacles&&now-state.obstaclesAt<600)return state.obstacles;
  const els=doc.querySelectorAll('#landing .logo-img,#landing .welcome-lbl,#landing .area-card,#halongClock,#announcementBar,#notifPermBtn,#dolphinMusicBtn');
  state.obstacles=[...els].map(el=>el.getBoundingClientRect()).filter(r=>r.width>0&&r.height>0);
  state.obstaclesAt=now;
  return state.obstacles;
 }
 function covers(x,y,rects,margin){
  return rects.some(r=>x+margin>r.left&&x-margin<r.right&&y+margin>r.top&&y-margin<r.bottom);
 }
 function allowedNode(x,y,rects,radius){
  const b=size();
  return x>=radius&&x<=b.w-radius&&y>=radius&&y<=b.h-radius&&!covers(x,y,rects,radius+6);
 }
 function waypointList(){
  const b=size(),margin=b.pet/2+12;
  const nodes=[[.14,.14],[.5,.12],[.84,.14],[.91,.32],[.9,.63],[.8,.82],[.51,.9],[.18,.82],[.09,.6],[.09,.35],[.35,.4],[.65,.43],[.52,.67]];
  return nodes.map(([x,y])=>({x:clamp(b.w*x,margin,b.w-margin),y:clamp(b.h*y,margin,b.h-margin)}));
 }
 function pathTo(start,target,exitVector,now){
  const b=size(),dx=target.x-start.x,dy=target.y-start.y,dist=Math.max(1,Math.hypot(dx,dy));
  const ux=dx/dist,uy=dy/dist,head=exitVector||{x:ux,y:uy};
  const length=Math.min(130,dist*.30),endLen=Math.min(130,dist*.32),m=b.pet/2+5;
  const bound=p=>({x:clamp(p.x,m,b.w-m),y:clamp(p.y,m,b.h-m)});
  const c1=bound({x:start.x+head.x*length,y:start.y+head.y*length});
  const c2=bound({x:target.x-ux*endLen,y:target.y-uy*endLen});
  return {points:[start,c1,c2,target],duration:clamp(dist*20,3900,12500),startAt:now};
 }
 function startPath(now){
  const b=size(),rects=protect(),margin=b.pet/2+7,all=waypointList();
  if(!state.position){
   state.position=all.find(p=>allowedNode(p.x,p.y,rects,margin))||null;
   if(!state.position)return false;
  }
  const steps=Array.from({length:15},(_,i)=>(i+1)/16);
  const candidates=all.map((p,i)=>{
   const d=distance(state.position,p);
   if(d<Math.min(b.w,b.h)*.22)return {p,score:-Infinity,i,clear:false};
   const path=pathTo(state.position,p,state.exit,now);
   const blocked=steps.some(t=>{const q=cubic(path.points,t);return covers(q.x,q.y,rects,margin);});
   const clear=!blocked&&allowedNode(p.x,p.y,rects,margin);
   return {p,i,clear,score:d*.7+((i+state.turn)%all.length)*2};
  }).sort((a,c)=>c.score-a.score);
  const chosen=candidates.find(c=>Number.isFinite(c.score)&&c.clear);
  if(!chosen)return false;
  state.turn=(state.turn+1)%all.length;
  state.path=pathTo(state.position,chosen.p,state.exit,now);
  return true;
 }
 function move(x,y,heading){
  const b=size(),pet=b.pet,px=clamp(x,pet/2,b.w-pet/2),py=clamp(y,pet/2,b.h-pet/2);
  state.flight.style.transform='translate3d('+(px-pet/2)+'px,'+(py-pet/2)+'px,0)';
  root.DolphinLivingBridge?.move?.(px,py);
  state.flight.style.setProperty('--dcl-face',heading>=0?'-1':'1');
  const nearButton=covers(px,py,protect(),pet/2+5);
  state.flight.style.pointerEvents=nearButton?'none':'auto';
  const bubbleWidth=Math.min(235,b.w-16),bx=clamp(px+pet*.25,8,b.w-bubbleWidth-8);
  const by=clamp(py-pet/2-94,8,b.h-100);
  state.bubble.style.left=bx+'px';state.bubble.style.top=by+'px';
 }
 function tick(now){
  state.frame=0;
  if(!canShow()||root.matchMedia?.('(prefers-reduced-motion: reduce)').matches){syncVisibility();return;}
  if(!state.path&&!startPath(now)){state.frame=root.requestAnimationFrame(tick);return;}
  const p=state.path,t=clamp((now-p.startAt)/p.duration,0,1);
  const a=cubic(p.points,t),b=cubic(p.points,Math.min(t+.012,1));
  const dx=b.x-a.x||p.points[3].x-p.points[2].x;
  move(a.x,a.y+Math.sin(now/850)*2,dx);
  state.position={x:a.x,y:a.y};
  if(t>=1){
   const c=p.points[2],end=p.points[3],d=distance(c,end)||1;
   state.exit={x:(end.x-c.x)/d,y:(end.y-c.y)/d};
   state.path=null;
  }
  state.frame=root.requestAnimationFrame(tick);
 }
 function stop(){
  if(state.frame)root.cancelAnimationFrame(state.frame);
  state.frame=0;state.path=null;
 }
 function syncVisibility(){
  if(!state.stage)return;
  const active=canShow();
  state.stage.hidden=!active;
  if(!active){stop();return;}
  if(root.matchMedia?.('(prefers-reduced-motion: reduce)').matches){
   stop();
   if(!state.position)state.position=waypointList().find(p=>allowedNode(p.x,p.y,protect(),size().pet/2+7))||waypointList()[2];
   move(state.position.x,state.position.y,1);
  }else if(!state.frame)state.frame=root.requestAnimationFrame(tick);
  const now=Date.now();
  if(now-state.lastWelcome>10*60*1000){
   state.lastWelcome=now;
   root.setTimeout(()=>{if(canShow()&&Date.now()-state.lastWelcome<3000){
    const name=identity()?.name;
    talk((typeof name==='string'&&name.trim()?name.trim():'Bạn')+' ơi! '+slot(hourVN(new Date())).text,'hello',4600);
   }},650);
   scheduleCheckin();
  }
 }
 function talk(message,emotion,duration,action){
  if(!canShow())return;
  root.clearTimeout(state.talkTimer);
  state.bubbleText.textContent=message;
  state.bubbleAction.hidden=action!=='checkin';
  state.bubble.hidden=false;
  if(emotion)react(emotion,duration||1900);
  state.talkTimer=root.setTimeout(()=>{state.bubble.hidden=true;state.bubbleAction.hidden=true;},duration||4600);
 }
 function react(kind,ms){
  root.clearTimeout(state.reactionTimer);
  state.flight.dataset.reaction=kind;
  state.reactionTimer=root.setTimeout(()=>{delete state.flight.dataset.reaction;},ms||1600);
 }
 function scheduleCheckin(){
  if(!state.form||!pendingCheckin(state.profile,new Date()))return;
  const key=state.form.employeeId+'|'+dayVN(new Date());
  if(key===state.lastHint||key===state.pendingHint)return;
  state.pendingHint=key;
  root.clearTimeout(state.hintTimer);
  state.hintTimer=root.setTimeout(()=>{
   state.pendingHint='';
   if(state.form&&state.form.employeeId===key.split('|')[0]&&pendingCheckin(state.profile,new Date())&&canShow()){
    state.lastHint=key;
    talk('Bạn chưa điểm danh hôm nay! Mở Hồ sơ để nhận thưởng nhé!','cheerful',6500,'checkin');
   }
  },8900);
 }
 function secretMessage(index){
  if(index===9)return 'Bí mật Eternal Dolphin: Chúng mình sẽ luôn cùng tỏa sáng giữa các vì sao!';
  if(index===8)return 'Bí mật Royal Dolphin: Một vị vua biển cả cũng cần người bạn đồng hành!';
  return 'Bí mật Cosmic Dolphin: Mỗi ngôi sao đều là một chuyến phiêu lưu!';
 }
 function touchPet(){
  if(!canShow())return;
  state.touchCount++;
  if(state.form.index>=7&&state.touchCount%5===0&&Date.now()-state.lastSecret>60000){
   state.lastSecret=Date.now();talk(secretMessage(state.form.index),'secret',5800);return;
  }
  const lines=['Hehe, nhột quá! 🐬','Mình thích được bạn vuốt ve!','Cùng khám phá một ngày thật vui nhé!','Mình đang bay cùng bạn đây!'];
  talk(lines[(state.touchCount-1)%lines.length],'pet',2700);
 }
 function applyProgress(progress){
  const who=identity();
  const next=who&&root.DolphinCompanion?.model?.(progress,who.employeeId)||null;
  const prev=state.form;
  state.profile=next?progress:null;
  state.form=next;
  if(!next){
   state.lastWelcome=0;state.touchCount=0;state.lastHint='';state.pendingHint='';state.bubble.hidden=true;
   root.clearTimeout(state.hintTimer);root.clearTimeout(state.reactionTimer);root.clearTimeout(state.talkTimer);
   syncVisibility();return;
  }
  state.flight.setAttribute('aria-label',next.name+' · Level '+next.currentLevel+' · Chạm để vuốt ve linh thú');
  state.stage.dataset.form=String(next.index);
  const current=slot(hourVN(new Date()));
  state.flight.dataset.mood=current.mood;state.lastSlot=current.key;
  const same=prev&&prev.employeeId===next.employeeId;
  if(!same){
   state.lastWelcome=0;state.lastHint='';state.pendingHint='';state.touchCount=0;state.lastSecret=0;
   state.position=null;state.path=null;
   state.bubble.hidden=true;root.clearTimeout(state.talkTimer);
  }else if(next.currentLevel<prev.currentLevel||next.xp<prev.xp){
   root.clearTimeout(state.reactionTimer);delete state.flight.dataset.reaction;
   state.bubble.hidden=true;root.clearTimeout(state.talkTimer);
  }else if(next.currentLevel>prev.currentLevel){
   const evolved=next.index>prev.index;
   state.lastWelcome=Date.now();
   root.setTimeout(()=>{if(state.form===next)
    talk((evolved?'Tiến hóa thành '+next.name+'! ':'')+'Chúc mừng bạn đạt Level '+next.currentLevel+'!','level',5100);},250);
  }
  syncVisibility();
  if(same)scheduleCheckin();
 }
 function setMood(){
  const current=slot(hourVN(new Date()));
  if(current.key!==state.lastSlot){
   state.lastSlot=current.key;state.flight.dataset.mood=current.mood;
  }
  if(state.form&&canShow())scheduleCheckin();
  syncVisibility();
 }
 function init(){
  const landing=$('landing');
  if(!landing||state.stage||!root.DolphinCompanion)return;
  state.stage=doc.createElement('div');state.stage.id='dolphinLandingCompanion';state.stage.className='dcl-stage';
  state.stage.hidden=true;state.stage.setAttribute('aria-label','Linh thú Dolphin đồng hành');
  state.flight=doc.createElement('button');state.flight.type='button';state.flight.className='dcl-flight';
  state.flight.style.transform='translate3d(-200px,-200px,0)';
  const art=doc.createElement('span');art.className='dcl-art';
  state.sprite=doc.createElement('span');state.sprite.className='dcl-sprite';state.sprite.setAttribute('aria-hidden','true');
  art.append(state.sprite);state.flight.append(art);
  state.bubble=doc.createElement('div');state.bubble.className='dcl-bubble';state.bubble.hidden=true;
  state.bubble.setAttribute('role','status');state.bubble.setAttribute('aria-live','polite');
  state.bubbleText=doc.createElement('span');state.bubbleText.className='dcl-bubble-text';
  state.bubbleAction=doc.createElement('button');state.bubbleAction.type='button';state.bubbleAction.hidden=true;
  state.bubbleAction.className='dcl-action';state.bubbleAction.textContent='Điểm danh';
  state.bubbleAction.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();
   if(canShow())root.openApp?.('profile');
  });
  state.bubble.append(state.bubbleText,state.bubbleAction);
  state.stage.append(state.flight,state.bubble);landing.append(state.stage);
  state.flight.addEventListener('pointerdown',e=>{
   if(e.button!==undefined&&e.button!==0)return;
   state.press={x:e.clientX,y:e.clientY};
   try{state.flight.setPointerCapture(e.pointerId);}catch(_){}
  });
  state.flight.addEventListener('pointerup',e=>{
   if(!state.press)return;
   const movement=Math.hypot(e.clientX-state.press.x,e.clientY-state.press.y);
   state.press=null;if(movement<180)touchPet();
  });
  state.flight.addEventListener('pointercancel',()=>{state.press=null;});
  state.flight.addEventListener('click',e=>{if(e.detail===0)touchPet();});
  root.addEventListener('dolphin-my-progress-updated',event=>applyProgress(event.detail));
  root.addEventListener('dolphin-staff-id-changed',()=>applyProgress(root.DolphinPrestige?.getMine?.()));
  doc.addEventListener('visibilitychange',syncVisibility);
  root.addEventListener('focus',syncVisibility);
  root.addEventListener('resize',()=>{state.position=null;state.path=null;state.obstaclesAt=0;syncVisibility();});
  const reduced=root.matchMedia?.('(prefers-reduced-motion: reduce)');
  reduced?.addEventListener?.('change',syncVisibility);
  const observe=(el,attributes)=>{if(el)new MutationObserver(syncVisibility).observe(el,{attributes:true,attributeFilter:attributes});};
  observe(doc.documentElement,['class']);observe(doc.body,['class']);observe(landing,['class','style']);
  observe($('orderNotif'),['class','style']);observe($('reminderAlarm'),['class','style']);
  root.setInterval(setMood,30000);
  applyProgress(root.DolphinPrestige?.getMine?.());
 }
 if(doc.readyState==='loading')doc.addEventListener('DOMContentLoaded',init);else init();
})(typeof window==='undefined'?globalThis:window);
