/* Dolphin background push — same alerts for ALL opted-in devices.
   Neither Staff ID nor Staff online status is consulted for Push authorization.
   The user explicitly allows public opt-in through the notification button. */
(function(root){
  'use strict';
  if (!root.document || root.top !== root) return;
  const cfg = root.DOLPHIN_PUSH_CONFIG || {};
  const native = !!(root.AndroidPush && typeof root.AndroidPush.requestToken === 'function');
  // Preserve the existing in-page Dolphin alerts until real Web Push settings
  // are deployed. Never show a broken Push enrollment control on Safari/Web.
  if (!native && (!cfg.messagingSenderId || !cfg.appId || !cfg.vapidKey)) {
    console.info('[DolphinPush] Web Push not configured; legacy notifications remain active.');
    return;
  }
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const standalone = () => navigator.standalone === true ||
    !!(root.matchMedia && root.matchMedia('(display-mode: standalone)').matches);
  const base = new URL('./',document.currentScript?.src || location.href);
  const sdk = 'https://www.gstatic.com/firebasejs/10.12.2/';
  const optInKey = 'dolphinPushEnabled';
  let clientPromise, registration, lastToken='', busy=false, currentUid='', access=null;
  let button, message, healthButton;
  const optedIn = () => {try{return localStorage.getItem(optInKey)==='1';}catch(e){return false;}};
  function setStatus(label,detail){
    if(button)button.textContent=label;
    if(message){message.textContent=detail||'';message.hidden=!detail;}
  }
  function setupGuide(){
    setStatus('📲 Cài Dolphin PWA trên iPhone',
      'Mở dolphinfb.store bằng Safari → Chia sẻ → Thêm vào Màn hình chính → mở Dolphin từ biểu tượng mới. iOS 16.4+ mới hỗ trợ nhận Push khi khóa màn hình.');
  }
  async function firebase(){
    if(clientPromise)return clientPromise;
    clientPromise=(async()=>{
      if(!cfg.apiKey || !cfg.projectId)throw new Error('Thiếu Firebase Web config.');
      const [appSdk,authSdk,fnSdk]=await Promise.all([
        import(sdk+'firebase-app.js'),
        import(sdk+'firebase-auth.js'),
        import(sdk+'firebase-functions.js')
      ]);
      // Share Firebase Auth with the existing app identity without checking
      // Staff ID or employee verification. Linked and unlinked staff are equal.
      // Manager UIDs already in STAFF_ADMIN_UIDS remain valid.
      const baseConfig={apiKey:cfg.apiKey,authDomain:cfg.authDomain,projectId:cfg.projectId};
      const authApp=appSdk.getApps().find(a=>a.name==='staff-identity-app') ||
        appSdk.initializeApp(baseConfig,'staff-identity-app');
      // Messaging needs its own complete public Firebase configuration.
      const messagingApp=appSdk.getApps().find(a=>a.name==='dolphin-push') ||
        appSdk.initializeApp({
          ...baseConfig,messagingSenderId:cfg.messagingSenderId||undefined,
          appId:cfg.appId||undefined
        },'dolphin-push');
      const auth=authSdk.getAuth(authApp);
      // Wait until Firebase restores an existing anonymous session. Without
      // this, an iPhone reload can create a different UID and lose Push access.
      if(typeof auth.authStateReady==='function')await auth.authStateReady();
      if(!auth.currentUser)await authSdk.signInAnonymously(auth);
      currentUid=auth.currentUser.uid;
      return {messagingApp,functions:fnSdk.getFunctions(authApp,'asia-southeast1'),callable:fnSdk.httpsCallable};
    })().catch(e=>{clientPromise=null;throw e;});
    return clientPromise;
  }
  async function callable(name,data){
    const fb=await firebase();
    const response=await fb.callable(fb.functions,name)(data||{});
    return response.data;
  }
  function accessUI(){
    if(healthButton)healthButton.hidden=access?.role!=='manager';
  }
  async function loadAccess(){
    const data=await callable('pushGetMyAccess',{});
    access=data||null;
    if(data?.uid)currentUid=data.uid;
    accessUI();
    return access;
  }
  async function checkDeliveryHealth(){
    if(!access || access.role!=='manager')return;
    try{
      const health=await callable('pushGetDeliveryHealth',{});
      const recent=health.recent||[];
      const failed=recent.filter(x=>x.status==='failed').length;
      const retry=recent.filter(x=>x.status==='retry'||x.status==='processing').length;
      const latest=recent[0];
      setStatus('📡 Push · '+(health.enabled?'Đang hoạt động':'Chưa bật'),
        'Thiết bị đã kích hoạt: '+health.activeDevices+
        ' · Trong '+recent.length+' sự kiện gần nhất: '+failed+' lỗi, '+retry+' đang thử lại.'+
        (latest?' · Gần nhất: '+latest.outlet+' ('+latest.status+', FCM nhận '+latest.acceptedByFcm+')':''));
    }catch(e){showError(e);}
  }
  async function registerToken(token,platform){
    if(!token||token.length<20)throw new Error('FCM token chưa sẵn sàng.');
    const data=await callable('pushRegisterDevice',{token,platform,consent:true});
    lastToken=token;
    try{localStorage.setItem(optInKey,'1');}catch(e){}
    setStatus('🔔 Push đang bật · nhấn để tắt',
      (data?.role==='manager'?'Manager':'Nhân viên')+' · nhận tất cả outlet: Bungalow, Lounge, Restaurant, Show.');
  }
  async function webToken(){
    if(!cfg.messagingSenderId || !cfg.appId || !cfg.vapidKey)
      throw new Error('Thiếu messagingSenderId, appId hoặc VAPID public key trong push-config.js.');
    if(!('serviceWorker' in navigator)||!('Notification' in root)||!('PushManager' in root))
      throw new Error('Trình duyệt chưa hỗ trợ Web Push. iPhone cần iOS 16.4+ và PWA trên Màn hình chính.');
    const fb=await firebase();
    const msg=await import(sdk+'firebase-messaging.js');
    if(!(await msg.isSupported()))throw new Error('Firebase Web Messaging không hỗ trợ môi trường này.');
    registration=await navigator.serviceWorker.register(new URL('service-worker.js',base).pathname,{scope:base.pathname});
    await navigator.serviceWorker.ready;
    return msg.getToken(msg.getMessaging(fb.messagingApp),
      {vapidKey:cfg.vapidKey,serviceWorkerRegistration:registration});
  }
  function showError(error){
    console.warn('[DolphinPush]',error);
    const detail=String(error?.message||error||'');
    setStatus('🔕 Chưa bật được thông báo',detail.slice(0,220));
  }
  // IMPORTANT: iOS Notification.requestPermission MUST happen synchronously in the
  // original tap handler. Do not await Firebase/Auth or network first.
  async function enable(){
    if(busy)return;
    if(ios&&!standalone()&&!native){setupGuide();return;}
    busy=true;
    try{
      if(native){root.AndroidPush.requestToken();return;}
      if(!('Notification' in root))throw new Error('iPhone cần iOS 16.4+ và cài Dolphin trên Màn hình chính.');
      const permission=Notification.permission==='granted'?'granted':await Notification.requestPermission();
      if(permission!=='granted')throw new Error('Chưa cấp quyền thông báo. Vào Cài đặt iPhone → Thông báo → Dolphin.');
      try{localStorage.setItem(optInKey,'1');}catch(e){}
      const token=await webToken();
      await registerToken(token,'web');
    }catch(e){showError(e);}
    finally{busy=false;}
  }
  async function resume(){
    if(!optedIn())return;
    if(ios&&!standalone()&&!native){setupGuide();return;}
    if(native){root.AndroidPush.readToken();return;}
    if('Notification' in root && Notification.permission==='granted'){
      try{const token=await webToken();await registerToken(token,'web');}
      catch(e){showError(e);}
    }
  }
  async function receiveNativeToken(token){
    busy=false;
    if(token && String(token).length>=20){try{localStorage.setItem(optInKey,'1');}catch(e){}}
    try{await registerToken(String(token||''),/DolphinStaff/.test(navigator.userAgent)?'staff-android':'manager-android');}
    catch(e){showError(e);}
  }
  async function disable(){
    if(busy)return;
    busy=true;
    try{
      if(lastToken)await callable('pushUnregisterDevice',{token:lastToken});
      lastToken='';
      try{localStorage.removeItem(optInKey);}catch(e){}
      setStatus('🔕 Đã tắt Push','Đã hủy thiết bị khỏi danh sách nhận Push.');
    }catch(e){showError(e);}
    finally{busy=false;}
  }
  function makeControl(){
    if(document.getElementById('dolphin-push-control'))return;
    const panel=document.createElement('div');panel.id='dolphin-push-control';
    panel.style.cssText='position:fixed;top:68px;right:12px;z-index:2147480000;display:flex;flex-direction:column;align-items:flex-end;gap:5px;max-width:min(340px,94vw);font:600 12px system-ui,sans-serif';
    button=document.createElement('button');button.type='button';button.textContent='🔔 Bật thông báo';
    button.style.cssText='background:#123634;color:#FBD77A;border:1px solid #FBD77A;border-radius:99px;padding:8px 12px;box-shadow:0 4px 18px #0008;font:inherit;cursor:pointer';
    button.addEventListener('click',()=>lastToken?disable():enable());
    message=document.createElement('div');message.hidden=true;
    message.style.cssText='background:#123634;color:#fff;border:1px solid #507c70;border-radius:10px;padding:10px;max-width:330px;overflow-wrap:anywhere;font:500 12px/1.5 system-ui,sans-serif;box-shadow:0 4px 18px #0008';
    healthButton=document.createElement('button');healthButton.type='button';healthButton.hidden=true;
    healthButton.textContent='📡 Manager: Kiểm tra Push';
    healthButton.style.cssText='background:#123634;color:white;border:1px solid #507c70;border-radius:9px;padding:7px 10px;font:inherit';
    healthButton.addEventListener('click',checkDeliveryHealth);
    panel.append(button,message,healthButton);
    document.body.appendChild(panel);
  }
  root.DolphinPush={enable,disable,resume,receiveNativeToken,
    get active(){return !!lastToken;},get uid(){return currentUid;},
    get isIOS(){return ios;},get isInstalled(){return standalone();}};
  // Retry an opted-in setup after connectivity returns or the app reopens.
  if(root.addEventListener)root.addEventListener('online',()=>resume().catch(showError));
  document.addEventListener('visibilitychange',()=>{
    if(document.visibilityState==='visible')resume().catch(showError);
  });
  async function start(){
    makeControl();
    if(ios&&!standalone()&&!native){setupGuide();return;}
    try{await loadAccess();if(optedIn())await resume();}
    catch(e){showError(e);}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})(window);
