/* A modal radial picker shared by mouse, touch and keyboard. */
(function(root){
 'use strict';
 function create(landing,config){
  const sheet=document.createElement('dialog');sheet.className='dcl-wheel';
  sheet.setAttribute('aria-label','Vòng chọn linh thú');
  const ring=document.createElement('div');ring.className='dcl-wheel-ring';
  const hub=document.createElement('button');hub.type='button';hub.className='dcl-wheel-hub';
  const portrait=new Image();portrait.alt='';
  const title=document.createElement('strong'),hint=document.createElement('small');
  hub.append(portrait,title,hint);
  const close=document.createElement('button');close.type='button';close.className='dcl-wheel-close';close.textContent='×';close.setAttribute('aria-label','Đóng vòng chọn');
  const form=document.createElement('form');form.className='dcl-wheel-name';form.hidden=true;
  const label=document.createElement('label');label.textContent='Bạn gọi mình là gì?';
  const input=document.createElement('input');input.maxLength=22;input.autocomplete='off';label.append(input);
  const save=document.createElement('button');save.textContent='Lưu tên';
  form.append(label,save);
  sheet.append(ring,hub,form,close);landing.append(sheet);
  let page='main',selection=0,turn=0,items=[],drag=null,swallowed=0;
  function shut(){
   if(sheet.open)sheet.close();
  }
  function layout(pet){
   const size=sheet.offsetWidth,r=size/2;
   const x=Math.max(r+6,Math.min(innerWidth-r-6,pet.x+pet.width/2));
   const y=Math.max(r+6,Math.min(innerHeight-r-6,pet.y+pet.height/2));
   sheet.style.left=x+'px';sheet.style.top=y+'px';
  }
  function orient(){
   ring.style.setProperty('--turn',turn+'deg');
   Array.from(ring.children).forEach((button,i)=>{
    button.setAttribute('data-current',String(i===selection));button.tabIndex=i===selection?0:-1;
   });
  }
  function spin(step,focus){
   if(!items.length)return;
   selection=(selection+step+items.length)%items.length;
   turn-=step*360/items.length;orient();
   if(focus)ring.children[selection].focus({preventScroll:true});
  }
  function render(view){
   page=view;items=config.items(view);selection=0;turn=0;ring.replaceChildren();
   const home=view==='main',profile=config.profile();
   title.textContent=home?profile.name:view==='pose'?'Tạo dáng':'Tâm trạng';
   hint.textContent=home?'Đặt tên':'Quay lại';
   hub.setAttribute('aria-label',home?'Đặt tên cho linh thú':'Quay lại vòng chính');
   portrait.src='./assets/dolphin-level-'+profile.level+'.png';
   ring.style.setProperty('--slice',(360/items.length)+'deg');
   items.forEach((item,i)=>{
    const button=document.createElement('button');button.type='button';button.className='dcl-wheel-item';
    button.dataset.key=item.key;
    button.style.setProperty('--angle',360*i/items.length+'deg');
    button.setAttribute('aria-label',item.label);button.title=item.label;
    button.setAttribute('aria-disabled',String(!!item.locked));
    if(item.selected)button.setAttribute('aria-pressed','true');
    const image=new Image();image.alt='';image.src=item.icon==='chest'?'./assets/dolphin-treasure-chest.svg':'./assets/dolphin-wheel/'+item.icon+'.png';
    const caption=document.createElement('span');caption.textContent=item.short;
    button.append(image,caption);ring.append(button);
    button.addEventListener('click',()=>{
     if(performance.now()<swallowed||!sheet.open||item.locked)return;
     if(item.key==='pose'||item.key==='mood'){render(item.key);ring.children[0].focus();return;}
     shut();config.act(item.key);
    });
   });
   orient();form.hidden=true;ring.hidden=false;hub.hidden=false;
  }
  function open(){
   if(!config.available()||sheet.open||document.querySelector('dialog[open]'))return false;
   const at=config.flight.getBoundingClientRect();render('main');sheet.showModal();layout(at);
   ring.children[0].focus({preventScroll:true});return true;
  }
  let backdropDown=false;sheet.addEventListener('pointerdown',e=>{backdropDown=e.target===sheet;});
  close.addEventListener('click',shut);
  sheet.addEventListener('click',e=>{if(e.target===sheet){
   const r=sheet.getBoundingClientRect();
   if(backdropDown&&Math.hypot(e.clientX-r.x-r.width/2,e.clientY-r.y-r.height/2)>r.width/2)shut();
  }});
  hub.addEventListener('click',()=>{
   if(page!=='main'){render('main');ring.children[0].focus();return;}
   form.hidden=false;hub.hidden=true;ring.hidden=true;input.value=config.profile().nickname||'';input.focus();input.select();
  });
  form.addEventListener('submit',e=>{e.preventDefault();config.rename(input.value.trim());render('main');hub.focus();});
  sheet.addEventListener('keydown',e=>{
   if(!form.hidden)return;
   if(['ArrowRight','ArrowDown','ArrowLeft','ArrowUp'].includes(e.key)){
    e.preventDefault();spin(['ArrowRight','ArrowDown'].includes(e.key)?1:-1,true);
   }else if(e.key==='Backspace'&&page!=='main'){e.preventDefault();render('main');hub.focus();}
  });
  let lastWheel=-Infinity;
  ring.addEventListener('wheel',e=>{e.preventDefault();if(performance.now()-lastWheel>180&&e.deltaY){lastWheel=performance.now();spin(Math.sign(e.deltaY),true);}},{passive:false});
  function angle(e){const r=ring.getBoundingClientRect();return Math.atan2(e.clientY-r.y-r.height/2,e.clientX-r.x-r.width/2);}
  ring.addEventListener('pointerdown',e=>{if(e.isPrimary&&e.button===0)drag={id:e.pointerId,start:angle(e),step:0};});
  ring.addEventListener('pointermove',e=>{
   if(drag?.id!==e.pointerId)return;
   const delta=angle(e)-drag.start,step=Math.round(Math.atan2(Math.sin(delta),Math.cos(delta))*items.length/(2*Math.PI));
   if(step!==drag.step){
    spin(drag.step-step,false);drag.step=step;swallowed=performance.now()+450;
    ring.setPointerCapture(e.pointerId);
   }
  });
  ring.addEventListener('pointerup',()=>{drag=null;});ring.addEventListener('pointercancel',()=>{drag=null;});
  root.addEventListener('resize',shut);
  sheet.addEventListener('close',()=>{drag=null;if(config.available()&&!document.querySelector('dialog[open]')&&!document.querySelector('.dcl-stage[data-play]'))config.flight.focus({preventScroll:true});});
  return {sheet,open,close:shut,refresh(){if(sheet.open&&page==='main'&&form.hidden){
   const chest=items.find(i=>i.key==='chest'),button=ring.querySelector('[data-key="chest"]');
   if(chest&&button){chest.locked=!config.chest();button.setAttribute('aria-disabled',String(chest.locked));}
  }}};
 }
 root.DolphinWheel={create};
})(window);
