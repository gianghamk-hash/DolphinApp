'use strict';
const {onCall,HttpsError}=require('firebase-functions/v2/https');
const {getDatabase}=require('firebase-admin/database');
const {GoogleAuth}=require('google-auth-library');
const SHEET='1aZ34XVKqWwxMlOPSu6X0vApLT5DFxjDpza9fDRaXM2Q';
const auth=new GoogleAuth({scopes:['https://www.googleapis.com/auth/spreadsheets']});
// Serialize application writes; external Sheet editors are checked again before writing.
exports.guestAssignTable=onCall({region:'asia-southeast1',maxInstances:1,concurrency:1,timeoutSeconds:60},async req=>{
 if(!req.auth)throw new HttpsError('unauthenticated','Cần đăng nhập Staff ID.');
 const identity=(await getDatabase().ref('staffIdentity/'+req.auth.uid).get()).val();
 const profile=identity?.employeeId?(await getDatabase().ref('staffRegistry/'+identity.employeeId).get()).val():null;
 if(!profile?.active||!(identity.verified===true||profile.approved===true)||(profile.registrationSource==='self'&&profile.approved!==true))throw new HttpsError('permission-denied','Cần Staff ID đã được quản lý duyệt.');
 const {sheetName,code,stt,expectedTable,table}=req.data||{};
 if(typeof sheetName!=='string'||!/^DOLPHIN\b/i.test(sheetName)||sheetName.length>100||typeof code!=='string'||!code.trim()||typeof stt!=='string'||typeof expectedTable!=='string'||typeof table!=='string')throw new HttpsError('invalid-argument','Thông tin booking không hợp lệ.');
 const normalized=table.trim().toUpperCase().replace(/\s+/g,'');
 if(!/^[ABCDEJQL][1-9]\d{0,2}(,[ABCDEJQL][1-9]\d{0,2})*$/.test(normalized))throw new HttpsError('invalid-argument','Nhập bàn như A1 hoặc A1,A2 (khu A,B,C,D,E,J,Q,L).');
 const wanted=normalized.split(',');
 if(new Set(wanted).size!==wanted.length)throw new HttpsError('invalid-argument','Số bàn bị lặp.');
 const client=await auth.getClient();
 const base='https://sheets.googleapis.com/v4/spreadsheets/'+SHEET;
 const quoted="'"+sheetName.replace(/'/g,"''")+"'";
 const read=async range=>(await client.request({url:base+'/values/'+encodeURIComponent(range),params:{valueRenderOption:'FORMULA'}})).data.values||[];
 try{
 const rows=await read(quoted+'!A:G');
 const matches=rows.map((r,i)=>({r,i})).filter(({r})=>String(r[1]||'').trim()===code.trim()&&String(r[0]||'').trim()===stt.trim());
 if(matches.length!==1)throw new HttpsError('failed-precondition','BKK không còn duy nhất trong tab này. Hãy tải lại danh sách.');
 const {r,i}=matches[0];
 if(String(r[6]||'').trim()!==expectedTable.trim())throw new HttpsError('aborted','Số bàn đã thay đổi trên Sheet. Hãy tải lại trước khi lưu.');
 if(String(r[6]||'').startsWith('='))throw new HttpsError('failed-precondition','Ô số bàn có công thức; không thể ghi đè.');
 // Reject recognizable occupied tables, including ranges in existing assignments.
 const parser=require('./guest-table-parser.cjs');
 for(let n=0;n<rows.length;n++)if(n!==i&&/^\d+$/.test(String(rows[n][0]||'').trim())&&parser.parseTables(rows[n][6]).some(t=>wanted.includes(t)))throw new HttpsError('already-exists','Bàn đã được xếp cho booking khác trên Sheet.');
 const range=quoted+'!G'+(i+1);
 await client.request({url:base+'/values/'+encodeURIComponent(range),method:'PUT',params:{valueInputOption:'RAW'},data:{range,majorDimension:'ROWS',values:[[normalized]]}});
 const verified=await read(range);
 if(verified[0]?.[0]!==normalized)throw new HttpsError('aborted','Chưa xác nhận được số bàn sau khi lưu. Hãy tải lại Sheet.');
 return {ok:true,table:normalized};
 }catch(e){if(e instanceof HttpsError)throw e;throw new HttpsError('unavailable','Chưa ghi được Google Sheet. Kiểm tra quyền chỉnh sửa của tài khoản dịch vụ và kết nối.');}
});
