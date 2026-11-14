'use strict';
const {onCall,HttpsError}=require('firebase-functions/v2/https');
const {defineSecret,defineString}=require('firebase-functions/params');
const {getDatabase}=require('firebase-admin/database');
const crypto=require('node:crypto');
const secret=defineSecret('DOLPHIN_BRIDGE_SECRET');
const url=defineString('DOLPHIN_BRIDGE_URL',{default:''});
const options={region:'asia-southeast1',timeoutSeconds:540,secrets:[secret],maxInstances:2};
async function handle(req){
 if(!req.auth)throw new HttpsError('unauthenticated','Cần đăng nhập Staff ID.');
 const identity=(await getDatabase().ref('staffIdentity/'+req.auth.uid).get()).val();
 const profile=identity?.employeeId?(await getDatabase().ref('staffRegistry/'+identity.employeeId).get()).val():null;
 if(!profile?.active||!(identity.verified===true||profile.approved===true)||(profile.registrationSource==='self'&&profile.approved!==true))throw new HttpsError('permission-denied','Cần Staff ID đã được duyệt.');
 const {action,data}=req.data||{};
 if(!['sync','assign'].includes(action))throw new HttpsError('invalid-argument','Chức năng không hợp lệ.');
 const endpoint=url.value();
 if(!/^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec$/.test(endpoint))throw new HttpsError('failed-precondition','Chưa cấu hình kết nối Dolphin F&B.');
 const payload=JSON.stringify({id:crypto.randomUUID(),timestamp:Date.now(),action,data:data||{}});
 const signature=crypto.createHmac('sha256',secret.value()).update(payload).digest('hex');
 try{
 const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({payload,signature}),signal:AbortSignal.timeout(510000)});
 if(!response.ok)throw Error('HTTP');
 const result=await response.json();
 if(result.ok!==true)throw new HttpsError('failed-precondition',String(result.message||'Đồng bộ chưa hoàn tất.').slice(0,500));
 return result;
 }catch(e){if(e instanceof HttpsError)throw e;throw new HttpsError('unavailable','Chưa xác nhận được kết quả. Không tự gửi lại; hãy kiểm tra Sheet và trạng thái chạy Apps Script.');}
}
exports.guestSheetBridge=onCall(options,handle);
exports.guestAssignTable=onCall(options,req=>handle({...req,data:{action:'assign',data:req.data}}));
