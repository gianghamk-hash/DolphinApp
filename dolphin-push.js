/* Dolphin background push — same alerts for ALL enrolled team devices.
   Neither Staff ID nor Staff online status is consulted for Push authorization.
   A Manager-issued one-time device code keeps customers from subscribing. */
(function(root){
  'use strict';
  if (!root.document || root.top !== root || /DolphinStaff/.test(navigator.userAgent)) return;
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
  let button, message, enrollPanel, inviteInput, inviteButton, issueButton, issuedCode, copyButton, issueCountInput;
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
    if(enrollPanel){enrollPanel.hidden=Boolean(access?.authorized);enrollPanel.style.display=access?.authorized?'none':'flex';}
    if(issueButton)issueButton.hidden=access?.role!=='manager';
    if(issueCountInput)issueCountInput.hidden=access?.role!=='manager';
  }
  async function loadAccess(){
    const data=await callable('pushGetMyAccess',{});
    access=data||null;
    if(data?.uid)currentUid=data.uid;
    accessUI();
    if(access?.authorized){
      if(!lastToken)setStatus('🔔 Bật thông báo',
        'Thiết bị đã được cấp quyền Push. Nhận tất cả order và yêu cầu phục vụ, không phân biệt Staff ID.');
    }else{
      setStatus('🔑 Kích hoạt Push cho thiết bị',
        'Không cần Staff ID. Nhập mã Push sử dụng một lần do Manager cấp để ngăn khách đăng ký nhận thông tin nội bộ.');
    }
    return access;
  }
  async function claimCode(){
    if(busy)return;
    const code=String(inviteInput?.value||'').trim().toUpperCase().replace(/[\s-]/g,'');
    if(!/^[0-9A-F]{32}$/.test(code)){
      setStatus('🔑 Mã chưa hợp lệ','Nhập mã Push gồm 32 ký tự do Manager cấp; đây KHÔNG phải Staff ID.');
      return;
    }
    busy=true; if(inviteButton)inviteButton.disabled=true;
    try{
      await callable('pushClaimDeviceCode',{code});
      inviteInput.value='';
      await loadAccess();
      setStatus('🔔 Bật thông báo','Đã kích hoạt thiết bị. Nhấn Bật thông báo để cho phép iPhone/Safari nhận Push.');
    }catch(e){showError(e);}
    finally{busy=false;if(inviteButton)inviteButton.disabled=false;}
  }
  async function issueCode(){
    if(busy)return;
    busy=true;if(issueButton)issueButton.disabled=true;
    try{
      const count=Math.max(1,Math.min(20,Number(issueCountInput?.value)||1));
      const response=await callable('pushIssueDeviceCodes',{count});
      const codes=response?.codes||[];
      if(issuedCode)issuedCode.textContent=codes.join('\n');
      if(copyButton)copyButton.hidden=!codes.length;
      setStatus('🔔 Quản lý Push',codes.length+' mã một lần, hiệu lực 24 giờ. Gửi riêng một mã cho từng thiết bị nhân viên.');
    }catch(e){showError(e);}
    finally{busy=false;if(issueButton)issueButton.disabled=false;}
  }
  async function registerToken(token,platform){
    if(!token||token.length<20)throw new Error('FCM token chưa sẵn sàng.');
    const data=await callable('pushRegisterDevice',{token,platform});
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
    const code=String(error?.code||'');
    const detail=String(error?.message||error||'');
    const authErr=code.includes('permission-denied')||code.includes('failed-precondition');
    setStatus(authErr?'🔒 Chưa được cấp Push':'🔕 Push chưa hoạt động',
      detail.slice(0,220)+(authErr&&currentUid?' · UID thiết bị: '+currentUid:''));
  }
  // IMPORTANT: iOS Notification.requestPermission MUST happen synchronously in the
  // original tap handler. Do not await Firebase/Auth or network first.
  async function enable(){
    if(busy)return;
    if(ios&&!standalone()&&!native){setupGuide();return;}
    if(!access?.authorized){
      if(!access)loadAccess().catch(showError);
      if(enrollPanel){enrollPanel.hidden=false;enrollPanel.style.display='flex';}
      setStatus('🔑 Nhập mã Push trước','Manager có thể tạo mã Push độc lập Staff ID ngay trong ứng dụng Dolphin.');
      return;
    }
    busy=true;
    try{
      if(native){root.AndroidPush.requestToken();return;}
      if(!('Notification' in root))throw new Error('iPhone cần iOS 16.4+ và cài Dolphin trên Màn hình chính.');
      const permission=Notification.permission==='granted'?'granted':await Notification.requestPermission();
      if(permission!=='granted')throw new Error('Chưa cấp quyền thông báo. Vào Cài đặt iPhone → Thông báo → Dolphin.');
      const token=await webToken();
      await registerToken(token,'web');
    }catch(e){showError(e);}
    finally{busy=false;}
  }
  async function resume(){
    if(!optedIn())return;
    if(ios&&!standalone()&&!native){setupGuide();return;}
    if(!access?.authorized)return;
    if(native){root.AndroidPush.readToken();return;}
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
    enrollPanel=document.createElement('div');enrollPanel.hidden=true;
    enrollPanel.style.cssText='background:#123634;color:#fff;padding:10px;border:1px solid #507c70;border-radius:10px;display:none;gap:6px;flex-wrap:wrap;max-width:330px';
    inviteInput=document.createElement('input');
    inviteInput.placeholder='Mã Push 32 ký tự (không phải Staff ID)';
    inviteInput.setAttribute('aria-label','Mã kích hoạt Push do Manager cấp');
    inviteInput.autocapitalize='characters';inviteInput.autocomplete='off';
    inviteInput.style.cssText='width:100%;box-sizing:border-box;padding:8px;color:#123634;background:white;border:0;border-radius:6px;font-size:12px';
    inviteButton=document.createElement('button');inviteButton.type='button';inviteButton.textContent='Xác nhận mã Push';
    inviteButton.style.cssText='background:#FBD77A;color:#123634;border:0;border-radius:6px;padding:8px 10px;font-weight:bold';
    inviteButton.addEventListener('click',claimCode);
    enrollPanel.append(inviteInput,inviteButton);
    issueButton=document.createElement('button');issueButton.type='button';issueButton.hidden=true;
    issueButton.textContent='🔑 Manager: Cấp mã Push cho nhân viên';
    issueButton.style.cssText='background:#123634;color:white;border:1px solid #507c70;border-radius:9px;padding:7px 10px;font:inherit';
    issueButton.addEventListener('click',issueCode);
    issueCountInput=document.createElement('input');issueCountInput.type='number';issueCountInput.min='1';issueCountInput.max='20';issueCountInput.value='1';issueCountInput.hidden=true;
    issueCountInput.title='Số mã Push cấp cho nhân viên (1-20)';issueCountInput.setAttribute('aria-label','Số mã Push cần cấp');
    issueCountInput.style.cssText='width:72px;padding:5px;border-radius:6px;color:#123634';
    issuedCode=document.createElement('code');issuedCode.style.cssText='background:#123634;color:#FBD77A;overflow-wrap:anywhere;white-space:pre-wrap;max-width:320px;font-size:12px';
    copyButton=document.createElement('button');copyButton.type='button';copyButton.hidden=true;
    copyButton.textContent='Sao chép mã';copyButton.style.cssText='padding:5px 9px;border-radius:6px';
    copyButton.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(issuedCode.textContent);setStatus('Đã sao chép mã Push','Mỗi mã chỉ dùng một lần trên một thiết bị.');}catch(e){showError(e);}});
    panel.append(button,message,enrollPanel,issueCountInput,issueButton,issuedCode,copyButton);
    document.body.appendChild(panel);
  }
  root.DolphinPush={enable,disable,resume,receiveNativeToken,
    get active(){return !!lastToken;},get uid(){return currentUid;},
    get isIOS(){return ios;},get isInstalled(){return standalone();}};
  async function start(){
    makeControl();
    if(ios&&!standalone()&&!native){setupGuide();return;}
    try{await loadAccess();if(optedIn())await resume();}
    catch(e){showError(e);}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})(window);
