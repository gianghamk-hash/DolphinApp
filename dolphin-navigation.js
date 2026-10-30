/* Resolve navigation from this script's deployed location: domain root or Pages subdirectory. */
(function(root){
 'use strict';
 function backTarget(page,base){
  var url=new URL(page),home=new URL('./',base);
  return url.pathname.startsWith(home.pathname+'giaitri/games/')?new URL('giaitri/index.html',home).href:home.href;
 }
 if(typeof module!=='undefined')module.exports={backTarget:backTarget};
 if(!root.document)return;
 var base=new URL('./',document.currentScript.src).href;
 function back(){
  var gameView=document.getElementById('gameIframeView');
  if(gameView&&!gameView.classList.contains('hidden')&&typeof root.closeGame==='function'){root.closeGame();return;}
  try{
   if(root.parent!==root && root.parent.location.origin===location.origin){
    if(typeof root.parent.closeGame==='function'){root.parent.closeGame();return;}
    if(typeof root.parent.goHome==='function'){root.parent.goHome();return;}
   }
  }catch(e){}
  root.location.assign(backTarget(root.location.href,base));
 }
 root.DolphinNavigation={back:back,base:base};
 function init(){
  // The shell owns floating navigation when embedded; games retain their own guarded exit buttons.
  if(root.parent!==root||document.getElementById('landing')||location.pathname.startsWith(new URL('giaitri/games/',base).pathname))return;
  var button=document.createElement('button');button.id='dolphinBackAction';button.type='button';
  button.title='Quay lại trang chủ';button.setAttribute('aria-label',button.title);
  button.textContent='←';
  button.style.cssText='position:fixed;right:16px;bottom:calc(90px + env(safe-area-inset-bottom,0px));z-index:2147483002;width:52px;height:52px;display:flex;align-items:center;justify-content:center;border-radius:50%;border:2px solid #fbd77a;background:#123634f2;color:#fbd77a;font:900 28px system-ui;box-shadow:0 6px 20px #0008;cursor:pointer;touch-action:manipulation';
  button.onclick=function(){if(typeof root.goBack==='function')root.goBack();else back();};
  document.body.appendChild(button);
  var gameView=document.getElementById('gameIframeView');
  if(gameView){var sync=function(){button.title=gameView.classList.contains('hidden')?'Quay lại trang chủ':'Quay lại danh sách game';button.setAttribute('aria-label',button.title);};new MutationObserver(sync).observe(gameView,{attributes:true,attributeFilter:['class']});sync();}
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})(typeof window==='undefined'?globalThis:window);
