/* Dolphin Push for Manager APK, Safari iPhone Home Screen PWA and web browsers.
   Firebase authorization is verified by Cloud Functions, never by claimed client roles. */
(function(root){
  'use strict';
  if (!root.document || root.top !== root || /DolphinStaff/.test(navigator.userAgent)) return;
  const cfg = root.DOLPHIN_PUSH_CONFIG || {};
  const native = !!(root.AndroidPush && typeof root.AndroidPush.requestToken === 'function');
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const standalone = () => navigator.standalone === true ||
    !!(root.matchMedia && root.matchMedia('(display-mode: standalone)').matches);
  const base = new URL('./', document.currentScript && document.currentScript.src || location.href);
  const sdk = 'https://www.gstatic.com/firebasejs/10.12.2/';
  let firebaseClient, registration, lastToken = '', busy = false, currentUid = '';
  let button, message, control;
  const optInKey = 'dolphinPushEnabled';
  function optedIn(){try{return localStorage.getItem(optInKey)==='1';}catch(e){return false;}}
  function setStatus(label,detail){
    if(button)button.textContent=label;
    if(message){message.textContent=detail||'';message.hidden=!detail;}
  }
  function setupGuide(){
    setStatus('📲 Cài PWA để nhận Push',
      'Trên iPhone: mở dolphinfb.store trong Safari → Chia sẻ (ô vuông có mũi tên lên) → Thêm vào Màn hình chính → mở biểu tượng Dolphin mới → nhấn Bật thông báo. iOS 16.4 trở lên là bắt buộc. Tab Safari thông thường KHÔNG nhận được Push khi khóa màn hình.');
  }
  async function firebase(){
    if(firebaseClient)return firebaseClient;
    firebaseClient=(async()=>{
      if(!cfg.apiKey || !cfg.projectId)throw new Error('Thiếu cấu hình Firebase.');
      const [appSdk,authSdk,fnSdk]=await Promise.all([
        import(sdk+'firebase-app.js'),
        import(sdk+'firebase-auth.js'),
        import(sdk+'firebase-functions.js')
      ]);
      // Share the same Auth session as Staff ID; using another named Firebase app
      // would create an unrelated anonymous UID and reject verified iPhone staff.
      const app=appSdk.getApps().find(a=>a.name==='staff-identity-app') ||
        appSdk.initializeApp({
          apiKey:cfg.apiKey,authDomain:cfg.authDomain,projectId:cfg.projectId,
          messagingSenderId:cfg.messagingSenderId||undefined,appId:cfg.appId||undefined
        },'staff-identity-app');
      const auth=authSdk.getAuth(app);
      if(!auth.currentUser)await authSdk.signInAnonymously(auth);
      currentUid=auth.currentUser.uid;
      return {app,uid:currentUid,functions:fnSdk.getFunctions(app,'asia-southeast1'),callable:fnSdk.httpsCallable};
    })().catch(e=>{firebaseClient=null;throw e;});
    return firebaseClient;
  }
  async function registerToken(token,platform){
    if(!token||token.length<20)throw new Error('FCM token chưa sẵn sàng.');
    const fb=await firebase();
    const result=await fb.callable(fb.functions,'pushRegisterDevice')({token,platform});
    lastToken=token;
    try{localStorage.setItem(optInKey,'1');}catch(e){}
    const access=result.data||{};
    const scope=access.role==='manager'?'Manager · tất cả outlet':
      'Nhân viên · '+(access.outlets||[]).join(', ');
    setStatus('🔔 Push đang bật · nhấn để tắt',scope);
    return true;
  }
  async function webToken(){
    if(!cfg.messagingSenderId||!cfg.appId||!cfg.vapidKey)
      throw new Error('Chưa cấu hình messagingSenderId, appId hoặc VAPID public key trên máy chủ.');
    if(!('serviceWorker' in navigator)||!('Notification' in root)||!('PushManager' in root))
      throw new Error('PWA hoặc trình duyệt chưa hỗ trợ Web Push (iPhone cần iOS 16.4+ và cài Home Screen).');
    const fb=await firebase();
    const messaging=await import(sdk+'firebase-messaging.js');
    if(!(await messaging.isSupported()))throw new Error('Firebase Messaging không được trình duyệt này hỗ trợ.');
    registration=await navigator.serviceWorker.register(new URL('service-worker.js',base).pathname,{scope:base.pathname});
    await navigator.serviceWorker.ready;
    return messaging.getToken(messaging.getMessaging(fb.app),
      {vapidKey:cfg.vapidKey,serviceWorkerRegistration:registration});
  }
  function showError(error){
    console.warn('[DolphinPush]',error);
    const code=String(error?.code||'');
    const detail=String(error?.message||error||'');
    const denied=code.includes('permission-denied')||code.includes('failed-precondition');
    setStatus(denied?'🔒 Chưa thể bật Push':'🔕 Push chưa hoạt động',
      denied ? detail.slice(0,180)+' · UID: '+(currentUid||'chưa xác định')+'. Liên kết Staff ID và nhờ Manager phân công outlet nếu là nhân viên.' :
        detail.slice(0,230));
  }
  async function enable(){
    if(busy)return;
    if(ios&&!standalone()&&!native){setupGuide();return;}
    busy=true;
    try{
      setStatus('⏳ Đang bật Push','');
      if(native){root.AndroidPush.requestToken();return;}
      if(!('Notification' in root))throw new Error('iPhone cần iOS 16.4+ và PWA cài qua Safari.');
      // iOS requires permission be requested in the direct user-click handler,
      // before any asynchronous Firebase initialization, token or SW work.
      const permission=Notification.permission==='granted'?'granted':await Notification.requestPermission();
      if(permission!=='granted')throw new Error('Quyền thông báo bị từ chối. Kiểm tra Cài đặt → Thông báo → Dolphin.');
      const token=await webToken();
      await registerToken(token,'web');
    }catch(e){showError(e);}
    finally{busy=false;}
  }
  async function resume(){
    if(!optedIn())return;
    if(ios&&!standalone()&&!native){setupGuide();return;}
    if(native){try{root.AndroidPush.readToken();}catch(e){showError(e);}return;}
    if('Notification' in root && Notification.permission==='granted'){
      try{const token=await webToken();await registerToken(token,'web');}
      catch(e){showError(e);}
    }
  }
  async function receiveNativeToken(token){
    busy=false;
    try{await registerToken(String(token||''),'manager-android');}
    catch(e){showError(e);}
  }
  async function disable(){
    if(!lastToken){setStatus('🔕 Chưa có token để hủy','');return;}
    try{
      const fb=await firebase();
      await fb.callable(fb.functions,'pushUnregisterDevice')({token:lastToken});
      lastToken='';
      try{localStorage.removeItem(optInKey);}catch(e){}
      setStatus('🔕 Đã tắt Push','Thiết bị này không còn đăng ký trên máy chủ.');
    }catch(e){showError(e);}
  }
  function makeControl(){
    if(document.getElementById('dolphin-push-control'))return;
    control=document.createElement('div');
    control.id='dolphin-push-control';
    control.style.cssText='position:fixed;top:68px;right:12px;z-index:2147480000;display:flex;flex-direction:column;align-items:flex-end;gap:4px;max-width:min(330px,90vw);font:600 12px system-ui,sans-serif';
    button=document.createElement('button');
    button.type='button';
    button.textContent='🔔 Bật thông báo';
    button.style.cssText='background:#123634;color:#FBD77A;border:1px solid #FBD77A;border-radius:99px;padding:8px 12px;box-shadow:0 4px 18px #0008;font:inherit;cursor:pointer';
    button.addEventListener('click',()=>{if(lastToken)disable();else enable();});
    message=document.createElement('div');
    message.hidden=true;
    message.style.cssText='background:#123634;color:#fff;border:1px solid #507c70;border-radius:10px;padding:10px;max-width:315px;overflow-wrap:anywhere;font:500 12px/1.5 system-ui,sans-serif;box-shadow:0 4px 18px #0008';
    control.appendChild(button);control.appendChild(message);
    document.body.appendChild(control);
    if(ios&&!standalone()&&!native)setupGuide();
    else if(!native&&(!cfg.vapidKey||!cfg.messagingSenderId||!cfg.appId))
      setStatus('🔔 Cấu hình Push','Chưa cung cấp đủ cấu hình Firebase Web Push.');
    else if(ios&&standalone()&&!optedIn())
      setStatus('🔔 Bật thông báo iPhone','Nếu chưa xác minh Staff ID, vào mục Staff ID để liên kết thiết bị trước.');
  }
  root.DolphinPush={
    enable,disable,resume,receiveNativeToken,
    get active(){return !!lastToken;},
    get uid(){return currentUid;},
    get isIOS(){return ios;},
    get isInstalled(){return standalone();}
  };
  function start(){makeControl();if(optedIn())resume().catch(showError);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})(window);
