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
  const registeredKey = 'dolphinPushRegistered';
  let clientPromise, registration, lastToken='', busy=false, currentUid='', access=null;
  // UI is mounted only inside user-opened settings: NEVER as a floating control.
  let staffRoot=null,managerRoot=null,managerMessage=null,managerControls=null;
  let button, message, enrollPanel, inviteInput, inviteButton, issueButton, issuedCode, copyButton, issueCountInput, healthButton, revokeInput, revokeButton;
  let statusLabel='🔔 Bật thông báo',statusDetail='';
  const controlStyle='background:#123634;color:#FBD77A;border:1px solid #507c70;border-radius:9px;padding:10px;font:600 13px system-ui,sans-serif;cursor:pointer';
  const fieldStyle='width:100%;box-sizing:border-box;background:#fff;color:#123634;border:1px solid #507c70;border-radius:7px;padding:9px;font:13px system-ui,sans-serif';
  function el(tag,text,style){
    const node=document.createElement(tag);
    if(text!==null&&text!==undefined)node.textContent=text;
    if(style)node.style.cssText=style;
    return node;
  }

  const optedIn = () => {try{return localStorage.getItem(optInKey)==='1';}catch(e){return false;}};
  const registeredBefore = () => {try{return optedIn()&&localStorage.getItem(registeredKey)==='1';}catch(e){return false;}};
  function setStatus(label,detail){
    statusLabel=label;statusDetail=detail||'';
    if(button)button.textContent=label;
    if(message){message.textContent=statusDetail;message.hidden=!statusDetail;}
  }
  function setManagerStatus(text){
    if(managerMessage)managerMessage.textContent=text||'';
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
    if(enrollPanel){enrollPanel.hidden=Boolean(access?.authorized);enrollPanel.style.display=access?.authorized?'none':'flex';}
    if(issueButton)issueButton.hidden=access?.role!=='manager';
    if(issueCountInput)issueCountInput.hidden=access?.role!=='manager';
    const manager=access?.role==='manager';
    if(issueButton)issueButton.hidden=!manager;
    if(issueCountInput)issueCountInput.hidden=!manager;
    if(healthButton)healthButton.hidden=!manager;
    if(managerControls)managerControls.hidden=!manager;
    if(managerRoot)setManagerStatus(manager?
      'Đã xác thực quyền Manager bằng Firebase. Công cụ bên dưới chỉ dùng cho Manager.':
      'Chưa có quyền Manager được xác thực trong Firebase. Không thể cấp/thu hồi mã Push.');
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
    if(busy||access?.role!=='manager')return;
    busy=true;if(issueButton)issueButton.disabled=true;
    try{
      const count=Math.max(1,Math.min(20,Number(issueCountInput?.value)||1));
      const response=await callable('pushIssueDeviceCodes',{count});
      const codes=response?.codes||[];
      if(issuedCode)issuedCode.textContent=codes.join('\n');
      if(copyButton)copyButton.hidden=!codes.length;
      setManagerStatus(codes.length+' mã một lần, hiệu lực 24 giờ. Gửi riêng một mã cho từng thiết bị nhân viên.');
    }catch(e){setManagerStatus('Không thể cấp mã Push: '+String(e?.message||e).slice(0,180));}
    finally{busy=false;if(issueButton)issueButton.disabled=false;}
  }
  async function checkDeliveryHealth(){
    if(!access || access.role!=='manager')return;
    try{
      const health=await callable('pushGetDeliveryHealth',{});
      const recent=health.recent||[];
      const failed=recent.filter(x=>x.status==='failed').length;
      const retry=recent.filter(x=>x.status==='retry'||x.status==='processing').length;
      const latest=recent[0];
      setManagerStatus('📡 Push · '+(health.enabled?'Đang hoạt động':'Chưa bật')+
        ' · Thiết bị đã kích hoạt: '+health.activeDevices+
        ' · Trong '+recent.length+' sự kiện gần nhất: '+failed+' lỗi, '+retry+' đang thử lại.'+
        (latest?' · Gần nhất: '+latest.outlet+' ('+latest.status+', FCM nhận '+latest.acceptedByFcm+')':''));
    }catch(e){setManagerStatus('Không thể kiểm tra Push: '+String(e?.message||e).slice(0,180));}
  }
  async function revokeAccess(){
    if(busy||access?.role!=='manager')return;
    const uid=String(revokeInput?.value||'').trim();
    if(!/^[A-Za-z0-9_-]{8,128}$/.test(uid)){
      setManagerStatus('UID thiết bị không hợp lệ. Yêu cầu nhân viên sao chép UID trong Cài đặt thông báo.');
      return;
    }
    if(!root.confirm || !root.confirm('Thu hồi Push của UID '+uid+'? Thiết bị này sẽ cần mã mới để đăng ký lại.'))return;
    busy=true;if(revokeButton)revokeButton.disabled=true;
    try{
      const data=await callable('pushRevokeDeviceAccess',{uid});
      if(revokeInput)revokeInput.value='';
      setManagerStatus('Đã thu hồi quyền Push của UID '+uid+'; vô hiệu hóa '+(data?.devicesDisabled||0)+' token.');
    }catch(e){setManagerStatus('Thu hồi thất bại: '+String(e?.message||e).slice(0,200));}
    finally{busy=false;if(revokeButton)revokeButton.disabled=false;}
  }
  async function registerToken(token,platform){
    if(!token||token.length<20)throw new Error('FCM token chưa sẵn sàng.');
    const data=await callable('pushRegisterDevice',{token,platform,consent:true});
    lastToken=token;
    try{localStorage.setItem(optInKey,'1');localStorage.setItem(registeredKey,'1');}catch(e){}
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
    const detail=String(error?.message||error||'').slice(0,220);
    if(!lastToken&&registeredBefore()&&(native||('Notification' in root&&Notification.permission==='granted'))){
      setStatus('🔔 Push đang chờ khôi phục',detail);
    }else{
      setStatus('🔕 Chưa bật được thông báo',detail);
    }
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
    }else{
      lastToken='';
      try{localStorage.removeItem(registeredKey);}catch(e){}
      setStatus('🔔 Bật thông báo','Cho phép thông báo trên thiết bị để nhận order mới.');
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
      try{localStorage.removeItem(optInKey);localStorage.removeItem(registeredKey);}catch(e){}
      setStatus('🔕 Đã tắt Push','Đã hủy thiết bị khỏi danh sách nhận Push.');
    }catch(e){showError(e);}
    finally{busy=false;}
  }
  function unmountSettings(){
    if(staffRoot)staffRoot.replaceChildren();
    staffRoot=null;button=null;message=null;enrollPanel=null;inviteInput=null;inviteButton=null;
    // Unmounting UI NEVER unregisters an active FCM token.
  }
  function mountSettings(container){
    if(!container||typeof container.replaceChildren!=='function')return;
    unmountSettings();
    staffRoot=container;
    const intro=el('p','🔔 Cài đặt thông báo cho thiết bị này (không yêu cầu Staff ID).',
      'font:600 13px/1.5 system-ui,sans-serif;color:#bee9de;margin:0 0 12px');
    button=el('button',statusLabel,controlStyle+';width:100%');
    button.type='button';
    button.addEventListener('click',()=>lastToken?disable():enable());
    message=el('p',statusDetail,'font:500 12px/1.5 system-ui,sans-serif;color:#c5e7dc;margin:9px 0;overflow-wrap:anywhere');
    message.hidden=!statusDetail;
    enrollPanel=el('div',null,'background:#123634;color:#fff;padding:10px;border:1px solid #507c70;border-radius:10px;display:none;gap:8px;flex-wrap:wrap;max-width:100%;box-sizing:border-box;margin:8px 0');
    enrollPanel.hidden=true;
    inviteInput=el('input',null,fieldStyle);
    inviteInput.placeholder='Mã Push 32 ký tự (không phải Staff ID)';
    inviteInput.setAttribute('aria-label','Mã kích hoạt Push do Manager cấp');
    inviteInput.autocapitalize='characters';inviteInput.autocomplete='off';
    inviteButton=el('button','Xác nhận mã Push',controlStyle);
    inviteButton.type='button';
    inviteButton.addEventListener('click',claimCode);
    enrollPanel.append(inviteInput,inviteButton);
    const uid=el('p',null,'font:500 11px/1.5 system-ui,sans-serif;color:#bee9de;overflow-wrap:anywhere');
    const revealUid=()=>{uid.textContent=currentUid?'UID thiết bị (để Manager thu hồi quyền khi cần): '+currentUid:'';};
    revealUid();
    const help=el('p','iPhone: Safari → Chia sẻ → Thêm vào Màn hình chính, sau đó mở Dolphin từ biểu tượng. Cần iOS 16.4+.',
      'font:500 12px/1.5 system-ui,sans-serif;color:#bee9de;margin:10px 0 0');
    container.append(intro,button,message,enrollPanel,uid,help);
    accessUI();
    if(ios&&!standalone()&&!native)setupGuide();
    else loadAccess().then(revealUid).catch(showError);
  }
  function unmountManager(){
    if(managerRoot)managerRoot.replaceChildren();
    managerRoot=null;managerMessage=null;managerControls=null;
    issueButton=null;healthButton=null;issuedCode=null;issueCountInput=null;copyButton=null;revokeInput=null;revokeButton=null;
  }
  function mountManager(container){
    if(!container||typeof container.replaceChildren!=='function')return;
    unmountManager();
    managerRoot=container;
    const intro=el('p','🔐 Quản trị Firebase Push. Quyền Manager được xác thực tại Cloud Functions.',
      'font:600 12px/1.5 system-ui,sans-serif;color:#bee9de;margin:0 0 10px');
    managerMessage=el('p','Đang xác minh quyền Manager...',
      'font:500 12px/1.5 system-ui,sans-serif;color:#fbd77a;margin:8px 0;overflow-wrap:anywhere');
    managerControls=el('div');
    managerControls.hidden=true;
    managerControls.style.cssText='gap:10px;flex-direction:column';
    const issueTitle=el('p','Cấp mã Push một lần (1–20 mã; mỗi mã cho một thiết bị):','font:600 12px system-ui,sans-serif;color:#bee9de;margin:10px 0 5px');
    issueCountInput=el('input',null,fieldStyle+';max-width:85px');
    issueCountInput.type='number';issueCountInput.min='1';issueCountInput.max='20';issueCountInput.value='1';
    issueCountInput.setAttribute('aria-label','Số mã Push cần cấp');
    issueButton=el('button','🔑 Cấp mã kích hoạt',controlStyle);
    issueButton.type='button';issueButton.addEventListener('click',issueCode);
    issuedCode=el('code',null,'display:block;color:#fbd77a;white-space:pre-wrap;overflow-wrap:anywhere;font:12px ui-monospace,monospace');
    copyButton=el('button','Sao chép mã Push',controlStyle);
    copyButton.type='button';copyButton.hidden=true;
    copyButton.addEventListener('click',async()=>{
      try{await navigator.clipboard.writeText(issuedCode.textContent);
        setManagerStatus('Đã sao chép mã. Mỗi mã chỉ dùng một lần trên một thiết bị.');
      }catch(e){setManagerStatus('Không sao chép được: '+String(e?.message||e));}
    });
    const revokeTitle=el('p','Thu hồi Push của thiết bị nhân viên theo Firebase Auth UID:','font:600 12px system-ui,sans-serif;color:#bee9de;margin:12px 0 5px');
    revokeInput=el('input',null,fieldStyle);revokeInput.placeholder='UID thiết bị do nhân viên cung cấp';
    revokeInput.setAttribute('aria-label','UID thiết bị cần thu hồi Push');
    revokeButton=el('button','🚫 Thu hồi quyền Push',controlStyle);
    revokeButton.type='button';revokeButton.addEventListener('click',revokeAccess);
    healthButton=el('button','📡 Kiểm tra tình trạng Push',controlStyle);
    healthButton.type='button';healthButton.addEventListener('click',checkDeliveryHealth);
    managerControls.append(issueTitle,issueCountInput,issueButton,issuedCode,copyButton,
      revokeTitle,revokeInput,revokeButton,healthButton);
    container.append(intro,managerMessage,managerControls);
    accessUI();
    // Recheck every time the Manager deliberately opens this settings tab.
    loadAccess().catch(e=>{setManagerStatus('Không thể xác minh Manager: '+String(e?.message||e).slice(0,180));
      if(managerControls)managerControls.hidden=true;});
  }
  root.DolphinPush={enable,disable,resume,receiveNativeToken,
    mountSettings,unmountSettings,mountManager,unmountManager,
    get active(){return !!lastToken;},get uid(){return currentUid;},
    get isIOS(){return ios;},get isInstalled(){return standalone();}};
  // Retry an opted-in setup after connectivity returns or the app reopens.
  if(root.addEventListener)root.addEventListener('online',()=>resume().catch(showError));
  document.addEventListener('visibilitychange',()=>{
    if(document.visibilityState==='visible')resume().catch(showError);
  });
  async function start(){
    // Push registration/resume remains active when the settings UI is closed.
    // Never append floating buttons, fixed overlays or invisible click blockers.
    if(ios&&!standalone()&&!native)return;
    try{await loadAccess();if(optedIn())await resume();}
    catch(e){showError(e);}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})(window);
