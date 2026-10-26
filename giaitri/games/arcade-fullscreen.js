/* Shared fullscreen controller for Dolphin arcade games (excluding TFT).
   Native Fullscreen API first, iframe-parent pseudo fullscreen second. */
(function(){
 'use strict';
 if(window.DolphinArcadeFullscreen)return;
 var pseudo=false,wake=null,button=null;
 var css=document.createElement('style');
 css.textContent=[
  '#dolphinArcadeFullscreen{position:fixed;z-index:2147483001;right:10px;top:calc(48px + env(safe-area-inset-top,0px));border:1px solid rgba(136,227,224,.70);background:rgba(8,45,57,.93);color:#f7e0a3;border-radius:11px;padding:9px 12px;font:800 12px system-ui,sans-serif;line-height:1.2;box-shadow:0 4px 15px #0007;cursor:pointer;min-height:38px;touch-action:manipulation}',
  '#dolphinArcadeFullscreen:focus-visible{outline:2px solid #ffe099;outline-offset:2px}',
  'html.arcade-pseudo-fullscreen,body.arcade-pseudo-fullscreen{width:100%!important;height:100dvh!important;margin:0!important;overscroll-behavior:contain}',
  'body.arcade-pseudo-fullscreen{position:fixed!important;inset:0!important;z-index:2147483000!important;overflow:auto!important;background:#081b1c!important}',
  'body:fullscreen{width:100vw;min-height:100dvh}',
  '@media(max-width:420px){#dolphinArcadeFullscreen{padding:7px 9px;font-size:11px}}'
 ].join('\n');
 document.head.appendChild(css);
 function active(){return !!document.fullscreenElement||pseudo;}
 function refresh(){
  if(!button)return;
  var full=active();
  button.textContent=full?'↙ Thu nhỏ':'⛶ Toàn màn hình';
  button.setAttribute('aria-pressed',String(full));
  button.title=full?'Thoát toàn màn hình':'Bật toàn màn hình';
  window.dispatchEvent(new Event('resize'));
 }
 function notifyParent(enabled){
  if(window.parent!==window)try{window.parent.postMessage({type:'dolphin-arcade-fullscreen',enabled:!!enabled},location.origin);}catch(e){}
 }
 async function release(){
  if(wake){try{await wake.release();}catch(e){}wake=null;}
  try{if(screen.orientation&&screen.orientation.unlock)screen.orientation.unlock();}catch(e){}
 }
 async function toggle(){
  if(document.fullscreenElement){
   try{await document.exitFullscreen();}catch(e){}
   await release();refresh();return;
  }
  if(pseudo){
   pseudo=false;document.documentElement.classList.remove('arcade-pseudo-fullscreen');
   document.body.classList.remove('arcade-pseudo-fullscreen');
   notifyParent(false);await release();refresh();return;
  }
  try{
   if(!document.body.requestFullscreen)throw new Error('Fullscreen unavailable');
   await document.body.requestFullscreen();
   try{if(screen.orientation&&screen.orientation.lock)await screen.orientation.lock('landscape');}catch(e){}
   try{if(navigator.wakeLock&&navigator.wakeLock.request)wake=await navigator.wakeLock.request('screen');}catch(e){}
  }catch(e){
   pseudo=true;document.documentElement.classList.add('arcade-pseudo-fullscreen');
   document.body.classList.add('arcade-pseudo-fullscreen');
   notifyParent(true);
  }
  refresh();
 }
 function init(){
  if(button||!document.body)return;
  button=document.createElement('button');button.id='dolphinArcadeFullscreen';button.type='button';
  button.setAttribute('aria-label','Bật hoặc tắt chế độ toàn màn hình');
  button.addEventListener('click',toggle);
  document.body.appendChild(button);refresh();
 }
 document.addEventListener('fullscreenchange',function(){if(!document.fullscreenElement)release();refresh();});
 window.addEventListener('pagehide',function(){if(pseudo)notifyParent(false);release();});
 window.DolphinArcadeFullscreen={toggle:toggle,active:active};
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
