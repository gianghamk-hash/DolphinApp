/* Landing gestures and water-ball choreography. The landing owns the flight loop and hit testing. */
(function (root) {
 'use strict';
 const clamp = (n, low, high) => Math.max(low, Math.min(high, n));
 const mix = (a, b, t) => a + (b - a) * t;
 const ease = t => t * t * (3 - 2 * t);
 const tau = Math.PI * 2;

 // Normalized to a 100-unit stage. Each form leaves a different figure in light.
 const dolphin = [[9,53],[17,49],[23,40],[34,33],[48,31],[59,20],[58,32],[70,38],[79,48],[84,58],[92,53],[89,63],[95,69],[84,67],[77,61],[64,54],[51,52],[45,61],[42,52],[29,51],[18,55],[9,55],[9,53]];
 function signature(index, t) {
  const a = tau * t, c = Math.cos(a), s = Math.sin(a);
  if (index === 9) {
   const step = t * (dolphin.length - 1), i = Math.min(Math.floor(step), dolphin.length - 2);
   return [mix(dolphin[i][0], dolphin[i+1][0], step-i), mix(dolphin[i][1], dolphin[i+1][1], step-i)];
  }
  switch (index) {
   case 0: return [50+29*c, 50+29*s];
   case 1: return [10+80*t, 50+14*Math.sin(2*a)];
   case 2: { const r=22+11*Math.cos(5*a); return [50+r*c,50+r*s]; }
   case 3: return [50+31*Math.sign(c)*c*c,50+34*Math.sign(s)*s*s];
   case 4: { const r=18+14*Math.pow(Math.cos(3*a),8); return [50+r*c,50+r*s]; }
   case 5: { const r=25+7*Math.cos(12*a); return [50+r*c,50+r*s]; }
   case 6: return [50+39*s,50+19*Math.sin(2*a+.28)];
   case 7: return [50+(8+27*t)*Math.cos(2*a),50+(6+23*t)*Math.sin(2*a)];
   default: return [18+64*t,60-28*Math.pow(Math.abs(Math.cos(2*a)),3)-7*Math.sin(a/2)];
  }
 }
 function paint(canvas, index, t, palette) {
  const ctx=canvas.getContext('2d');
  if (!ctx) return;
  ctx.setTransform(canvas.width/100,0,0,canvas.height/100,0,0);
  ctx.clearRect(0,0,100,100);
  const [glow, light]=palette, end=clamp(t/.66,0,1);
  const fade=clamp((1-t)/.16,0,1);
  ctx.globalAlpha=fade;
  // A soft caustic behind the stroke makes the shape legible on dark and light landing themes.
  const halo=ctx.createRadialGradient(50,49,1,50,49,44);
  halo.addColorStop(0,glow+'38'); halo.addColorStop(.67,glow+'17'); halo.addColorStop(1,glow+'00');
  ctx.fillStyle=halo; ctx.fillRect(0,0,100,100);
  if (index>=5) {
   ctx.save(); ctx.translate(50,50); ctx.rotate(-.23);
   for (let i=0;i<2;i++) {
    ctx.beginPath();
    const angle=t*2.2+i*Math.PI;
    ctx.ellipse(0,0,40+i*3,17+i*2,0,angle,angle+2.5);
    ctx.lineWidth=i ? .6 : 1.25; ctx.strokeStyle=i?light:glow;
    ctx.globalAlpha=fade*.42; ctx.stroke();
   }
   ctx.restore();
  }
  const ink=ctx.createLinearGradient(12,28,85,72);
  ink.addColorStop(0,light); ink.addColorStop(.46,glow); ink.addColorStop(1,light);
  ctx.lineJoin='round'; ctx.lineCap='round'; ctx.strokeStyle=ink;
  ctx.shadowColor=glow; ctx.shadowBlur=4;
  ctx.lineWidth=index===6?3.5:1.65;
  ctx.beginPath();
  for (let i=0;i<=120*end;i++) {
   const [x,y]=signature(index,i/120);
   if (!i) ctx.moveTo(x,y); else ctx.lineTo(x,y);
  }
  ctx.stroke();
  const stars=index===9?dolphin.filter((_,i)=>i%2===0):
   Array.from({length:6+index},(_,i)=>signature(index,i/(6+index)));
  stars.forEach(([x,y],i)=>{
   if (i/stars.length>end) return;
   const r=1.25+.85*(1+Math.cos(i*2.1+t*8));
   ctx.fillStyle=light;
   ctx.beginPath(); ctx.moveTo(x,y-r); ctx.quadraticCurveTo(x,y,x+r*.75,y);
   ctx.quadraticCurveTo(x,y,x,y+r); ctx.quadraticCurveTo(x,y,x-r*.75,y);
   ctx.quadraticCurveTo(x,y,x,y-r); ctx.fill();
  });
  if (index===9 && end>.65) {
   ctx.fillStyle='#dcffff'; ctx.beginPath(); ctx.arc(27,44,1.05,0,tau); ctx.fill();
  }
  // Pearls loosen from the perimeter after the figure starts to resolve.
  if (t>.32) {
   const rise=(t-.32)/.68;
   for (let i=0;i<5+index;i++) {
    const a=i*2.39996;
    const r=29+rise*14+3*Math.sin(i*5);
    const px=50+Math.cos(a)*r, py=50+Math.sin(a)*r*.82;
    ctx.globalAlpha=fade*Math.sin(Math.PI*rise)*(.45+.4*Math.cos(a+rise));
    ctx.fillStyle=i%3===0?'#fff':light;
    ctx.beginPath(); ctx.arc(px,py,.55+i%3*.32,0,tau); ctx.fill();
   }
   ctx.globalAlpha=fade;
  }
  const [x,y]=signature(index,end);
  ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(x,y,1.7,0,tau); ctx.fill();
  ctx.globalAlpha=1;
 }

 function create({stage,flight,landing,snapshot,place,clearPath,canPlay,showPlayArea}) {
  const ball=document.createElement('button');
  ball.type='button'; ball.title='Chạm để chuyền bóng cho cá heo'; ball.className='dcl-water-ball'; ball.hidden=true;
  ball.innerHTML='<span class="dcl-water-core" aria-hidden="true"></span><span class="dcl-pass-marks" aria-hidden="true"><i></i><i></i><i></i></span>';
  const canvas=document.createElement('canvas');
  canvas.className='dcl-signature'; canvas.hidden=true; canvas.setAttribute('aria-hidden','true');
  const notice=document.createElement('span');
  notice.className='dcl-play-notice'; notice.setAttribute('role','status');
  stage.append(canvas,ball,notice);
  const motion=root.matchMedia('(prefers-reduced-motion: reduce)');
  let game=null, pointer=null, lastTick=0, nextOffer=performance.now()+16000, timer=0;
  let heldPet=false, returnFocus=null;

  function reset(delay=16000) {
   if (game || flight.dataset.behavior) clearPath();
   const restoreFocus=document.activeElement===ball;
   game=null; pointer=null; lastTick=0;
   clearTimeout(timer); ball.hidden=true; canvas.hidden=true;
   delete flight.dataset.behavior; delete stage.dataset.play;
   notice.textContent='';
   if (restoreFocus && canPlay()) (returnFocus?.isConnected?returnFocus:flight).focus({preventScroll:true});
   returnFocus=null;
   nextOffer=performance.now()+delay;
  }
  function laneFor(origin,b) {
   if (!origin || !b.safe(origin,b.pet)) return null;
   const aim = b.facing;
   for (const reach of [b.pet*.86+49,b.pet*.58+38]) {
    for (const angle of [0,-.38,.38,Math.PI,Math.PI-.38,Math.PI+.38,-.96,.96,2.18,-2.18]) {
     const dx=Math.cos(angle)*aim, dy=Math.sin(angle);
     const at=d=>({x:origin.x+dx*d,y:origin.y+dy*d});
     const end=at(reach);
     // The ball arcs up to six pixels above this line. Reserve that space as well.
     let clear=true;
     for (let d=0;d<=reach;d+=5) {
      if (!b.safe(at(d),d<=reach*.29?b.pet:60)) { clear=false; break; }
     }
     if (clear && b.safe(end,60)) return {origin,at,end,reach,dx,dy};
    }
   }
   return null;
  }
  function positionBall(p) {
   ball.style.left=p.x+'px'; ball.style.top=p.y+'px';
  }
  function phase(name,now) {
   game.phase=name; game.since=now; stage.dataset.play=name;
   ball.setAttribute('aria-disabled',String(name!=='ready'));
  }
  function ready(now) {
   phase('ready',now); positionBall(game.lane.end);
   ball.setAttribute('aria-label','Chuyền bóng nước · Lượt '+(game.hits+1)+' trên 3');
   if (game.manual || game.hits) {
    notice.textContent=ball.getAttribute('aria-label');
   }
   clearTimeout(timer); timer=setTimeout(()=>reset(70000),game.manual?30000:12000);
  }
  function invite(manual=false,trigger=null) {
   if (!canPlay()) return false;
   if (game) { if (manual && !ball.hidden) ball.focus({preventScroll:true}); return true; }
   let b=snapshot();
   let lane=laneFor(b.pos,b);
   if (!lane && manual) {
    for (const pos of b.nodes()) { lane=laneFor(pos,b); if (lane) break; }
   }
   if (!lane && manual && landing.scrollTop>0) {
    // The launcher can be below the cards on a phone. Return to open water.
    showPlayArea();
    b=snapshot();
    for (const pos of b.nodes()) { lane=laneFor(pos,b); if (lane) break; }
   }
   if (!lane) { nextOffer=performance.now()+3500; return false; }
   clearPath(); pointer=null; heldPet=false;
   const now=performance.now();
   returnFocus=trigger;
   game={lane,hits:0,manual,scrollTop:landing.scrollTop};
   flight.dataset.behavior='volley';
   place(lane.origin,lane.dx,lane.dy,now);
   ball.hidden=false; ball.dataset.hits='0';
   ball.setAttribute('aria-label','Chuyền bóng nước · Lượt 1 trên 3');
   positionBall(lane.at(b.pet*.31));
   if (motion.matches) ready(now); else phase('offer',now);
   if (manual) ball.focus({preventScroll:true});
   return true;
  }
  function finale(now,b) {
   phase('finale',now); flight.dataset.behavior='somersault';
   if (document.activeElement===ball) (returnFocus||flight).focus({preventScroll:true});
   ball.hidden=true;
   const {end}=game.lane;
   let diameter=clamp(b.pet*1.35,88,190);
   while (diameter>56 && !b.safe(end,diameter)) diameter-=4;
   canvas.style.cssText='left:'+end.x+'px;top:'+end.y+'px;width:'+diameter+'px;height:'+diameter+'px';
   canvas.width=canvas.height=Math.ceil(diameter*Math.min(2,root.devicePixelRatio||1));
   const css=getComputedStyle(stage);
   game.palette=['--dcl-glow','--dcl-accent'].map(key=>css.getPropertyValue(key).trim());
   canvas.hidden=false;
   notice.textContent='Ba đường chuyền! '+(root.DolphinLivingRules?.SKILLS[b.index]?.vi||'Cá heo biểu diễn')+'!';
   paint(canvas,b.index,motion.matches ? .78 : 0,game.palette);
   timer=setTimeout(()=>reset(70000),2300);
  }
  function bump() {
   if (!game || game.phase!=='ready' || !canPlay()) return;
   clearTimeout(timer); const now=performance.now();
   if (motion.matches) {
    ball.dataset.hits=String(++game.hits);
    if (game.hits===3) finale(now,snapshot()); else ready(now);
   } else phase('inbound',now);
  }
  function playFrame(now,b) {
   const {lane}=game, age=now-game.since;
   if (!b.safe(lane.end,60)) { reset(); return false; }
   let pet=lane.origin, orb=lane.end;
   const near=b.pet*.30, lunge=lane.reach*.27;
   switch (game.phase) {
    case 'offer': case 'outbound': {
     const offer=game.phase==='offer', u=clamp(age/630,0,1), e=ease(u);
     pet=lane.at(offer?0:lunge*(1-e));
     orb=lane.at(mix(near+(offer?0:lunge),lane.reach,e));
     orb.y-=6*Math.sin(Math.PI*u);
     if (u===1) ready(now);
     break;
    }
    case 'inbound': {
     const u=clamp(age/590,0,1), e=ease(u);
     pet=lane.at(lunge*e); orb=lane.at(mix(lane.reach,near+lunge,e));
     orb.y-=6*Math.sin(Math.PI*u);
     if (u===1) {
      ball.dataset.hits=String(++game.hits);
      if (game.hits===3) finale(now,b); else phase('outbound',now);
     }
     break;
    }
    case 'finale':
     pet=lane.at(lunge*(1-ease(clamp(age/580,0,1))));
     paint(canvas,b.index,clamp(age/2210,0,1),game.palette);
     break;
   }
   if (!b.safe(pet,b.pet) || !b.safe(orb,44)) { reset(); return false; }
   place(pet,lane.dx,lane.dy,now); positionBall(orb); return true;
  }
  function consider(e) {
   if (game || motion.matches || !e.isPrimary || !canPlay()) return;
   if (e.type==='pointermove' && e.pointerType!=='mouse' && !pointer) return;
   const target=e.target.closest?.('button,a,input,select,textarea,dialog,[role="button"],.dcl-living-panel');
   if (target && target!==flight) { pointer=null; return; }
   const p={x:e.clientX,y:e.clientY}, b=snapshot();
   if (!b.pos || Math.hypot(p.x-b.pos.x,p.y-b.pos.y)>b.pet*1.9) { pointer=null; return; }
   if (!pointer || pointer.id!==e.pointerId) pointer={id:e.pointerId,since:performance.now(),onPet:target===flight};
   pointer.point=p;
  }
  function release(e) {
   if (!e || pointer?.id===e.pointerId) pointer=null;
  }
  function tick(now,b) {
   if (game) return playFrame(now,b);
   const p=pointer?.point;
   if (p && b.pos && now-pointer.since>=420 && now-pointer.since<3500) {
    const dx=p.x-b.pos.x,dy=p.y-b.pos.y,d=Math.hypot(dx,dy);
    const shy=now-pointer.since>1750;
    const desired=b.pet*(shy ? .68 : .33);
    const dt=lastTick?clamp((now-lastTick)/1000,0,.05):0;
    const step=clamp(d-desired,-75*dt,110*dt);
    const to={x:b.pos.x+dx/(d||1)*step,y:b.pos.y+dy/(d||1)*step};
    if (d<b.pet*2 && b.safe(b.pos,b.pet)) {
     clearPath(); lastTick=now;
     if (pointer.onPet) heldPet=true;
     flight.dataset.behavior=shy?'shy':'curious';
     place(b.safe(to,b.pet)?to:b.pos,dx,dy,now);
     nextOffer=now+14000; return true;
    }
   }
   if (flight.dataset.behavior) { delete flight.dataset.behavior; lastTick=0; clearPath(); }
   if (now>=nextOffer && (!pointer || now-pointer.since>=3500) && !motion.matches && canPlay()) return invite();
   return false;
  }
  landing.addEventListener('pointerdown',e=>{heldPet=false; pointer=null; if (e.button===0) consider(e);},{passive:true});
  landing.addEventListener('pointermove',consider,{passive:true});
  landing.addEventListener('pointerleave',release);
  root.addEventListener('pointerup',release);
  root.addEventListener('pointercancel',release);
  root.addEventListener('blur',()=>reset());
  landing.addEventListener('keydown',e=>{if(e.key==='Escape' && game) reset(70000);});
  ball.addEventListener('click',bump);
  return {invite,reset,tick,scroll(){if(!game || game.scrollTop!==landing.scrollTop) reset();},consumedHold:()=>heldPet};
 }
 root.DolphinLandingPlay=Object.freeze({create});
})(window);
