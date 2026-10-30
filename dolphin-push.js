/* Dolphin Push: opt-in Manager APK, installed PWA and desktop/mobile web.
   Uses the same auth identity for Firebase callable registration; never trusts the UA as authorization. */
(function(root){
  'use strict';
  if (!root.document || root.top !== root) return; // avoid duplicate listeners in outlet/dashboard iframes
  const cfg = root.DOLPHIN_PUSH_CONFIG || {};
  const native = !!(root.AndroidPush && typeof root.AndroidPush.requestToken === 'function');
  const base = new URL('./', document.currentScript && document.currentScript.src || location.href);
  let firebaseClient, registration, lastToken = '', busy = false;
  let button, message;
  const oldKey = 'dolphinPushDevice';
  const sdk = 'https://www.gstatic.com/firebasejs/10.12.2/';

  function setStatus(label, detail) {
    if (button) button.textContent = label;
    if (message) { message.textContent = detail || ''; message.hidden = !detail; }
  }
  function deviceId() {
    try {
      let id = localStorage.getItem(oldKey);
      if (!id) {
        id = root.crypto && crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + '-' + String(Math.random()).slice(2);
        localStorage.setItem(oldKey, id);
      }
      return id;
    } catch(e) { return 'ephemeral'; }
  }
  async function firebase() {
    if (firebaseClient) return firebaseClient;
    firebaseClient = (async function(){
      if (!cfg.apiKey || !cfg.projectId) throw new Error('Thiếu Firebase web config.');
      const [appSdk,authSdk,fnSdk] = await Promise.all([
        import(sdk + 'firebase-app.js'),
        import(sdk + 'firebase-auth.js'),
        import(sdk + 'firebase-functions.js')
      ]);
      const app = appSdk.getApps().find(a => a.name === 'dolphin-push') ||
        appSdk.initializeApp({apiKey:cfg.apiKey, authDomain:cfg.authDomain, projectId:cfg.projectId,
          messagingSenderId:cfg.messagingSenderId || undefined, appId:cfg.appId || undefined}, 'dolphin-push');
      const auth = authSdk.getAuth(app);
      if (!auth.currentUser) await authSdk.signInAnonymously(auth);
      return {app, uid:auth.currentUser.uid, functions:fnSdk.getFunctions(app,'asia-southeast1'), callable:fnSdk.httpsCallable};
    })().catch(e => {firebaseClient = null; throw e;});
    return firebaseClient;
  }
  async function registerToken(token, platform) {
    if (!token || token.length < 20) throw new Error('FCM token chưa sẵn sàng.');
    const fb = await firebase();
    await fb.callable(fb.functions,'pushRegisterDevice')({token, platform, deviceId:deviceId()});
    lastToken = token;
    try {localStorage.setItem('dolphinPushEnabled','1');}catch(e){}
    setStatus('🔔 Push đang bật', 'Manager · thiết bị đã đăng ký nhận thông báo.');
    return true;
  }
  async function webToken() {
    if (!cfg.messagingSenderId || !cfg.appId || !cfg.vapidKey)
      throw new Error('Thiếu messagingSenderId / appId / VAPID public key trong push-config.js.');
    if (!('serviceWorker' in navigator) || !('Notification' in root) || !('PushManager' in root))
      throw new Error('Trình duyệt này chưa hỗ trợ Web Push.');
    const fb = await firebase();
    const module = await import(sdk + 'firebase-messaging.js');
    if (!(await module.isSupported())) throw new Error('Web Push không được hỗ trợ trên thiết bị này.');
    registration = await navigator.serviceWorker.register(new URL('service-worker.js',base).pathname, {scope:base.pathname});
    await navigator.serviceWorker.ready;
    return module.getToken(module.getMessaging(fb.app),
      {vapidKey:cfg.vapidKey, serviceWorkerRegistration:registration});
  }
  function showError(error) {
    console.warn('[DolphinPush]',error);
    const code = String(error && error.code || '');
    const detail = String(error && error.message || error || '');
    const isAuth = code.indexOf('permission-denied') >= 0;
    setStatus(isAuth ? '🔒 Push chưa được cấp quyền' : '🔕 Push chưa hoạt động',
      isAuth ? 'Manager UID chưa được cấp quyền trên máy chủ: ' + (root.DolphinPush.uid || 'chưa xác định') :
        detail.slice(0,220));
  }
  async function enable() {
    if (busy) return;
    busy = true;
    try {
      setStatus('⏳ Đang bật Push', '');
      if (native) {root.AndroidPush.requestToken(); return;}
      if (!('Notification' in root)) throw new Error('Trình duyệt không hỗ trợ Notification.');
      const permission = Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission();
      if (permission !== 'granted') throw new Error('Chưa cấp quyền thông báo trong trình duyệt.');
      const token = await webToken();
      await registerToken(token, 'web');
    } catch(e) {showError(e);}
    finally {busy = false;}
  }
  async function resume() {
    if (native) {try {root.AndroidPush.readToken();}catch(e){showError(e);}return;}
    if ('Notification' in root && Notification.permission === 'granted' &&
        cfg.messagingSenderId && cfg.appId && cfg.vapidKey) {
      try {
        const token = await webToken();
        await registerToken(token, 'web');
      } catch(e) {showError(e);}
    }
  }
  async function receiveNativeToken(token) {
    busy = false;
    try {await registerToken(String(token || ''),'manager-android');}
    catch(e) {showError(e);}
  }
  async function disable() {
    if (!lastToken) {setStatus('🔕 Chưa có token để hủy','');return;}
    try {
      const fb = await firebase();
      await fb.callable(fb.functions,'pushUnregisterDevice')({token:lastToken});
      lastToken = '';
      try {localStorage.removeItem('dolphinPushEnabled');}catch(e){}
      setStatus('🔕 Đã tắt Push', 'Thiết bị đã được hủy đăng ký trên máy chủ.');
    } catch(e){showError(e);}
  }
  function makeControl() {
    if (document.getElementById('dolphin-push-control')) return;
    const container=document.createElement('div');
    container.id='dolphin-push-control';
    container.style.cssText='position:fixed;top:68px;right:12px;z-index:2147480000;display:flex;flex-direction:column;align-items:flex-end;gap:4px;max-width:min(320px,90vw);font:600 12px system-ui,sans-serif';
    button=document.createElement('button');
    button.type='button';button.textContent='🔔 Bật Push';
    button.style.cssText='background:#123634;color:#FBD77A;border:1px solid #FBD77A;border-radius:99px;padding:8px 12px;box-shadow:0 4px 18px #0008;font:inherit;cursor:pointer';
    button.addEventListener('click',enable);
    message=document.createElement('div');message.hidden=true;
    message.style.cssText='background:#123634;color:#fff;border:1px solid #507c70;border-radius:10px;padding:8px 10px;max-width:310px;overflow-wrap:anywhere;font:500 11px/1.45 system-ui,sans-serif';
    const close=document.createElement('button');close.type='button';close.textContent='×';
    close.setAttribute('aria-label','Ẩn thông báo cấu hình Push');
    close.style.cssText='float:right;color:#fff;background:none;border:0;font-size:16px;margin-left:5px;cursor:pointer';
    close.onclick=function(){message.hidden=true;};
    message.appendChild(close);
    container.appendChild(button);container.appendChild(message);
    document.body.appendChild(container);
    if (!native && (!cfg.vapidKey || !cfg.messagingSenderId || !cfg.appId))
      setStatus('🔔 Cấu hình Push', 'Cần bổ sung cấu hình FCM Web từ Firebase Console.');
  }
  root.DolphinPush={enable,disable,resume,receiveNativeToken,get uid(){
    return firebaseClient && typeof firebaseClient.then === 'function' ? 'Đang kết nối' : '';
  }};
  function start(){
    makeControl();
    // Do not prompt for permission without a user gesture.
    resume().catch(showError);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})(window);
