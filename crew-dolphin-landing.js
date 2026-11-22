/* Dolphin Companion · Landing. Presentation only: XP, identity and check-in are server owned. */
(function(root){
 'use strict';
 const TZ='Asia/Ho_Chi_Minh';
 const effects=['bubbles','tide','coral','sapphire','crystal','sunlight','aurora','cosmos','royal','eternal'];
 const greetingSlots=[
  {start:5,end:11,key:'morning',mood:'playful',text:'Chào buổi sáng! Một ngày mới đầy năng lượng nhé!'},
  {start:11,end:14,key:'noon',mood:'cheerful',text:'Chào buổi trưa! Chúc bạn phục vụ thật suôn sẻ!'},
  {start:14,end:18,key:'afternoon',mood:'playful',text:'Buổi chiều vui vẻ nhé! Mình luôn đồng hành cùng bạn!'},
  {start:18,end:22,key:'evening',mood:'calm',text:'Chào buổi tối! Cùng hoàn thành công việc thật tốt nào!'},
  {start:0,end:24,key:'night',mood:'sleepy',text:'Muộn rồi đó! Nhớ dành thời gian nghỉ ngơi nhé!'}
 ];
 const clamp=(n,min,max)=>Math.min(max,Math.max(min,n));
 function faceForMovement(heading,previousFacing=1){
  let facing=previousFacing<0?-1:1;
  if(heading>.35)facing=1;
  else if(heading<-.35)facing=-1;
  return {facing,scaleX:-facing};
 }
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
 const logic=Object.freeze({hourVN,dayVN,slot,pendingCheckin,cubic,faceForMovement});
 if(typeof module==='object'&&module.exports)module.exports=logic;
 root.DolphinLandingCompanionLogic=logic;
 const doc=root.document;
 if(!doc)return;
 const modelURL=new URL('./crew-dolphin-landing-3d.js?v=rig-v2',doc.currentScript?.src||doc.baseURI);
 const state={stage:null,flight:null,sprite:null,bubble:null,bubbleText:null,bubbleAction:null,
  profile:null,form:null,path:null,position:null,exit:null,frame:0,turn:0,
  art:null,model:null,modelRequested:false,
  lastWelcome:0,lastHint:'',pendingHint:'',lastSlot:'',touchCount:0,lastSecret:0,facing:1,
  obstacles:null,obstaclesAt:0,nextRouteAt:0,
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
  return {w:Math.max(1,root.innerWidth),h:Math.max(1,root.innerHeight),pet:state.flight.offsetWidth};
 }
 function protect(){
  const now=Date.now();
  if(state.obstacles&&now-state.obstaclesAt<200)return state.obstacles;
  const els=doc.querySelectorAll('#landing .logo-img,#landing .welcome-lbl,#landing .area-card,#halongClock,#announcementBar,#notifPermBtn,#dolphinMusicBtn');
  state.obstacles=[...els].map(el=>{
   const rect=el.getBoundingClientRect();
   if(!rect.width||!rect.height)return null;
   // The logo PNG is square, but the logo only occupies its central band.
   if(!el.dataset.dolphinInk||!el.naturalWidth)return rect;
   const [left,top,right,bottom]=el.dataset.dolphinInk.split(' ').map(Number);
   return {left:rect.left+left*rect.width,top:rect.top+top*rect.height,
    right:rect.left+right*rect.width,bottom:rect.top+bottom*rect.height};
  }).filter(Boolean);
  state.obstaclesAt=now;
  return state.obstacles;
 }
 function covers(x,y,rects,margin){
  return rects.some(r=>x+margin>r.left&&x-margin<r.right&&y+margin>r.top&&y-margin<r.bottom);
 }
 function allowedNode({x,y},bounds,rects){
  const {w,h,pet}=bounds,radius=pet/2;
  return x>=radius&&x<=w-radius&&y>=radius&&y<=h-radius&&!covers(x,y,rects,radius+8);
 }
 function waypointList({w,h,pet},rects){
  const edge=pet/2+3;
  const nodes=[[.08,.20],[.92,.20],[.5,.14],[.12,.36],[.88,.36],
   [.10,.68],[.90,.68],[.16,.84],[.50,.90],[.84,.84]];
  const points=nodes.map(([x,y])=>({x:w*x,y:h*y}));
  const gap=edge+10;
  for(const rect of rects){
   for(const x of [edge,w/2,w-edge]){
    points.push({x,y:rect.top-gap},{x,y:rect.bottom+gap});
   }
   for(const x of [rect.left-gap,rect.right+gap]){
    points.push({x,y:(rect.top+rect.bottom)/2});
   }
  }
  return points.map(({x,y})=>({x:clamp(x,edge,w-edge),y:clamp(y,edge,h-edge)}))
   .filter(point=>allowedNode(point,{w,h,pet},rects));
 }
 function pathTo(start,target,exitVector,now,b){
  const dx=target.x-start.x,dy=target.y-start.y,dist=Math.max(1,Math.hypot(dx,dy));
  const ux=dx/dist,uy=dy/dist,head=exitVector||{x:ux,y:uy};
  const length=Math.min(130,dist*.30),endLen=Math.min(130,dist*.32),m=b.pet/2+5;
  const bound=p=>({x:clamp(p.x,m,b.w-m),y:clamp(p.y,m,b.h-m)});
  const c1=bound({x:start.x+head.x*length,y:start.y+head.y*length});
  const c2=bound({x:target.x-ux*endLen,y:target.y-uy*endLen});
  return {points:[start,c1,c2,target],duration:clamp(dist*20,3900,12500),startAt:now};
 }
 function park(bounds,rects){
  if(state.position&&allowedNode(state.position,bounds,rects))return state.position;
  state.position=waypointList(bounds,rects)[0]||null;
  state.exit=null;
  return state.position;
 }
 function startPath(now,b,rects){
  const start=park(b,rects);
  if(!start)return false;
  const all=waypointList(b,rects);
  const minimum=Math.max(24,b.pet*.5);
  const candidates=all.map((p,i)=>{
   const d=distance(start,p);
   return {p,d,score:d*.7+((i+state.turn)%all.length)*1.5};
  }).filter(item=>item.d>=minimum).sort((a,c)=>c.score-a.score);
  let chosen;
  for(const heading of state.exit?[state.exit,null]:[null]){
   for(const {p,d} of candidates){
    const route=pathTo(start,p,heading,now,b);
    const samples=Math.ceil(d/7)+8;
    const covered=Array.from({length:samples-1},(_,i)=>cubic(route.points,(i+1)/samples))
     .some(({x,y})=>covers(x,y,rects,b.pet/2+8));
    if(!covered){chosen=route;break;}
   }
   if(chosen)break;
  }
  if(!chosen)return false;
  state.turn=(state.turn+1)%all.length;
  state.path=chosen;
  return true;
 }
 function move(x,y,dx,dy=0,now){
  const b=size(),pet=b.pet,px=clamp(x,pet/2,b.w-pet/2),py=clamp(y,pet/2,b.h-pet/2);
  state.flight.style.transform='translate3d('+(px-pet/2)+'px,'+(py-pet/2)+'px,0)';
  state.flight.dataset.positioned='true';
  root.DolphinLivingBridge?.move?.(px,py);
  const orientation=faceForMovement(dx,state.facing);
  state.facing=orientation.facing;
  state.flight.style.setProperty('--dcl-face',String(orientation.scaleX));
  if(state.model&&now!==undefined){
   try{
    state.model.draw({now,size:Math.round(pet*.92),facing:state.facing,dx,dy,
     mood:state.flight.dataset.mood,reaction:state.flight.dataset.reaction});
   }catch(error){
    state.model.dispose();
    state.model=null;
   }
  }
  const bubbleWidth=Math.min(235,b.w-16),bx=clamp(px+pet*.25,8,b.w-bubbleWidth-8);
  const by=clamp(py-pet/2-94,8,b.h-100);
  state.bubble.style.left=bx+'px';state.bubble.style.top=by+'px';
 }
 function tick(now){
  state.frame=0;
  if(!canShow()||root.matchMedia?.('(prefers-reduced-motion: reduce)').matches){syncVisibility();return;}
  state.frame=root.requestAnimationFrame(tick);
  const bounds=size(),rects=protect();
  if(!state.path&&now>=state.nextRouteAt&&!startPath(now,bounds,rects))state.nextRouteAt=now+300;
  if(!state.path){
   if(state.position&&allowedNode(state.position,bounds,rects))move(state.position.x,state.position.y,0,0,now);
   else delete state.flight.dataset.positioned;
   return;
  }
  const p=state.path,t=clamp((now-p.startAt)/p.duration,0,1);
  const a=cubic(p.points,t);
  if(!allowedNode(a,bounds,rects)){
   state.path=null;state.position=null;state.nextRouteAt=0;
   delete state.flight.dataset.positioned;
   return;
  }
  const before=cubic(p.points,Math.max(t-.006,0)),after=cubic(p.points,Math.min(t+.006,1));
  move(a.x,a.y+Math.sin(now/850)*2,after.x-before.x,after.y-before.y,now);
  state.position={x:a.x,y:a.y};
  if(t>=1){
   const c=p.points[2],end=p.points[3],d=distance(c,end)||1;
   state.exit={x:(end.x-c.x)/d,y:(end.y-c.y)/d};
   state.path=null;
  }
 }
 function stop(){
  if(state.frame)root.cancelAnimationFrame(state.frame);
  state.frame=0;state.path=null;state.nextRouteAt=0;
  state.model?.pause();
 }
 function syncModel(){
  if(state.model){
   state.model.setForm(state.form.index);
   return;
  }
  if(state.modelRequested||!root.WebGL2RenderingContext)return;
  state.modelRequested=true;
  import(modelURL.href)
   .then(module=>module.createDolphinModel(state.art))
   .then(model=>{state.model=model;syncVisibility();})
   .catch(()=>{ /* Keep the 2D artwork when WebGL or its asset is unavailable. */ });
 }
 function syncVisibility(){
  if(!state.stage)return;
  const active=canShow();
  state.stage.hidden=!active;
  if(!active){stop();return;}
  if(root.matchMedia?.('(prefers-reduced-motion: reduce)').matches){
   stop();
   const position=park(size(),protect());
   if(position)move(position.x,position.y,1);
   else delete state.flight.dataset.positioned;
  }else{
   syncModel();
   if(!state.frame)state.frame=root.requestAnimationFrame(tick);
  }
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
   delete state.flight.dataset.reaction;
   root.clearTimeout(state.hintTimer);root.clearTimeout(state.reactionTimer);root.clearTimeout(state.talkTimer);
   syncVisibility();return;
  }
  state.flight.setAttribute('aria-label',next.name+' · Level '+next.currentLevel+' · Chạm để vuốt ve linh thú');
  state.stage.dataset.form=String(next.index);
  state.stage.dataset.effect=effects[next.index];
  const current=slot(hourVN(new Date()));
  state.flight.dataset.mood=current.mood;state.lastSlot=current.key;
  const same=prev&&prev.employeeId===next.employeeId;
  if(!same){
   state.lastWelcome=0;state.lastHint='';state.pendingHint='';state.touchCount=0;state.lastSecret=0;
   state.position=null;state.path=null;state.facing=1;
   delete state.flight.dataset.positioned;
   delete state.flight.dataset.reaction;
   state.bubble.hidden=true;root.clearTimeout(state.talkTimer);
  }else if(next.currentLevel<prev.currentLevel||next.xp<prev.xp){
   root.clearTimeout(state.reactionTimer);delete state.flight.dataset.reaction;
   state.bubble.hidden=true;root.clearTimeout(state.talkTimer);
  }else if(next.currentLevel>prev.currentLevel){
   const evolved=next.index>prev.index;
   state.lastWelcome=Date.now();
   root.setTimeout(()=>{if(state.form===next)
    talk((evolved?'Tiến hóa thành '+next.name+'! ':'')+'Chúc mừng bạn đạt Level '+next.currentLevel+'!','level',5100);},250);
  }else if(next.xp>prev.xp&&!state.flight.dataset.reaction){
   react('xp',1300);
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
 function makeEffects(){
  const effectsRoot=doc.createElement('span');
  effectsRoot.className='dcl-fx';
  effectsRoot.setAttribute('aria-hidden','true');
  for(const layer of ['halo','orbit','orbit','spark','spark','spark','spark','spark','spark','burst']){
   const node=doc.createElement('span');
   node.className='dcl-fx-'+layer;
   effectsRoot.append(node);
  }
  return effectsRoot;
 }
 function init(){
  const landing=$('landing');
  if(!landing||state.stage||!root.DolphinCompanion)return;
  state.stage=doc.createElement('div');state.stage.id='dolphinLandingCompanion';state.stage.className='dcl-stage';
  state.stage.hidden=true;state.stage.setAttribute('aria-label','Linh thú Dolphin đồng hành');
  state.flight=doc.createElement('button');state.flight.type='button';state.flight.className='dcl-flight';
  state.art=doc.createElement('span');state.art.className='dcl-art';
  state.sprite=doc.createElement('span');state.sprite.className='dcl-sprite';state.sprite.setAttribute('aria-hidden','true');
  state.art.append(state.sprite);state.flight.append(makeEffects(),state.art);
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
  root.addEventListener('resize',()=>{
   state.position=null;state.path=null;state.obstaclesAt=0;state.nextRouteAt=0;
   delete state.flight.dataset.positioned;
   syncVisibility();
  });
  const reduced=root.matchMedia?.('(prefers-reduced-motion: reduce)');
  reduced?.addEventListener?.('change',syncVisibility);
  landing.addEventListener('scroll',()=>{
   state.obstaclesAt=0;state.nextRouteAt=0;
   if(reduced?.matches)syncVisibility();
  },{passive:true});
  const observe=(el,attributes)=>{if(el)new MutationObserver(syncVisibility).observe(el,{attributes:true,attributeFilter:attributes});};
  observe(doc.documentElement,['class']);observe(doc.body,['class']);observe(landing,['class','style']);
  observe($('orderNotif'),['class','style']);observe($('reminderAlarm'),['class','style']);
  root.setInterval(setMood,30000);
  applyProgress(root.DolphinPrestige?.getMine?.());
 }
 if(doc.readyState==='loading')doc.addEventListener('DOMContentLoaded',init);else init();
})(typeof window==='undefined'?globalThis:window);
