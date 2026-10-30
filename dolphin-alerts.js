/* Shared order/call detection. Cache snapshots never establish the server baseline. */
(function(root){
  'use strict';
  var authPromises=new WeakMap();
  function signIn(auth,authenticate){if(!authPromises.has(auth)){var promise=authenticate(auth).catch(function(error){authPromises.delete(auth);throw error;});authPromises.set(auth,promise);}return authPromises.get(auth);}
  function createFeed(now){
    var started=now===undefined?Date.now():now, ready=false, seen=new Map();
    return function(snapshot){
      if(snapshot.metadata && snapshot.metadata.fromCache)return [];
      var fresh=[];
      snapshot.forEach(function(doc){
        if(doc.metadata && doc.metadata.hasPendingWrites)return;
        var data=doc.data(), previous=seen.get(doc.id);
        var stamp=data.timestamp && typeof data.timestamp.toMillis==='function'?data.timestamp.toMillis():Number(data.timestamp)||0;
        var token=data.status+':'+stamp;
        if(data.status==='pending' && previous!==token && (previous!==undefined || ready || stamp>=started))fresh.push(Object.assign({id:doc.id},data));
        seen.set(doc.id,token);
      });
      ready=true;
      return fresh;
    };
  }
  var base=root.document?new URL('./',document.currentScript.src).href:'';
  var ctx=null, banner=null, timer=null,lastConnectionError=0;
  function unlock(){
    try{
      if(root.parent!==root && typeof root.parent.dolphinUnlockOrderAudio==='function')root.parent.dolphinUnlockOrderAudio();
      if(!ctx)ctx=new(root.AudioContext||root.webkitAudioContext)();
      if(ctx.state==='suspended')ctx.resume().catch(function(){});
    }catch(e){}
  }
  function parentHandlesOrders(){try{return root.parent!==root && !!root.parent.dolphinOrderNotificationsReady;}catch(e){return false;}}
  function announce(message){
    if(!root.document)return;
    if(!banner){banner=document.createElement('div');banner.setAttribute('role','alert');banner.style.cssText='position:fixed;top:16px;left:50%;transform:translateX(-50%);z-index:2147483647;background:#073d3a;color:#fff;padding:18px 24px;border:2px solid #fbd77a;border-radius:14px;max-width:90vw;box-shadow:0 8px 30px #0008;cursor:pointer';banner.onclick=function(){banner.hidden=true;};document.body.appendChild(banner);}
    banner.textContent='🔔 '+message;banner.hidden=false;clearTimeout(timer);timer=setTimeout(function(){banner.hidden=true;},12000);
    unlock();
    if(!parentHandlesOrders() && ctx && ctx.state==='running'){
      var time=ctx.currentTime;
      [0,.35,.7].forEach(function(offset){var o=ctx.createOscillator(),g=ctx.createGain();o.frequency.value=988;g.gain.setValueAtTime(.0001,time+offset);g.gain.exponentialRampToValueAtTime(.3,time+offset+.01);g.gain.exponentialRampToValueAtTime(.0001,time+offset+.3);o.connect(g);g.connect(ctx.destination);o.start(time+offset);o.stop(time+offset+.31);});
    }
    if(!parentHandlesOrders() && navigator.vibrate)navigator.vibrate([200,100,200]);
  }
  function connectionError(error){
    console.error('[Realtime notification]',error);
    if(Date.now()-lastConnectionError<60000)return;
    lastConnectionError=Date.now();announce('Mất kết nối dữ liệu. Đơn và yêu cầu phục vụ có thể chưa cập nhật. Vui lòng tải lại sau khi kiểm tra mạng.');
  }
  function wrapSnapshot(listen){
    return function(){var args=Array.prototype.slice.call(arguments),callbacks=args.filter(function(a){return typeof a==='function';});
      if(callbacks.length===1)args.push(connectionError);
      return listen.apply(null,args);
    };
  }
  async function systemNotify(title,body,tag){
    // Background delivery is handled by FCM once this device is registered.
    if(root.DolphinPush && root.DolphinPush.active)return false;
    if(!('Notification' in root)||Notification.permission!=='granted')return false;
    var options={body:body,tag:tag,icon:base+'pwa-icons/icon-192.png.png',badge:base+'pwa-icons/icon-96.png.png'};
    try{
      var reg=navigator.serviceWorker && await navigator.serviceWorker.getRegistration(base);
      if(reg && reg.active){await reg.showNotification(title,options);return true;}
      var n=new Notification(title,options);n.onclick=function(){root.focus();n.close();};return true;
    }catch(e){console.warn('[System notification]',e);return false;}
  }
  root.DolphinAlerts={signIn:signIn,parentHandlesOrders:parentHandlesOrders,connectionError:connectionError,wrapSnapshot:wrapSnapshot,systemNotify:systemNotify,createFeed:createFeed,unlock:unlock,announce:announce};
  if(root.document)['pointerdown','touchend','keydown'].forEach(function(event){document.addEventListener(event,unlock,{passive:true,capture:true});});
  if(typeof module!=='undefined')module.exports=root.DolphinAlerts;
})(typeof window==='undefined'?globalThis:window);
