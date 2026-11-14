// Install alongside DolphinFB.gs. Script property DOLPHIN_BRIDGE_SECRET must
// match Firebase Secret Manager DOLPHIN_BRIDGE_SECRET. Never put it in HTML.
function dolphinLock_(fn){
 const lock=LockService.getScriptLock();
 if(!lock.tryLock(1000))throw new Error('Đang đồng bộ hoặc lưu bàn. Vui lòng thử lại sau.');
 try{return fn();}finally{lock.releaseLock();}
}
function syncAllDolphinSheets(){return dolphinLock_(syncAllDolphinSheetsCore_);}
function syncTodaySheets(){return dolphinLock_(syncTodaySheetsCore_);}
function preserveDolphinTable_(bkk,existing){
 const codes=x=>String(x).split('+').map(s=>s.trim().toUpperCase()).filter(Boolean);
 const next=new Set(codes(bkk)),tables=[];
 existing.forEach((table,old)=>{
  const previous=codes(old);if(!previous.some(c=>next.has(c)))return;
  if(!previous.every(c=>next.has(c)))throw new Error('Nhóm BKK đã tách; cần đối chiếu bàn trước khi đồng bộ: '+old);
  if(table&&!tables.includes(table))tables.push(table);
 });
 return tables.join(',');
}
function doPost(e){
 function reply(v){return ContentService.createTextOutput(JSON.stringify(v)).setMimeType(ContentService.MimeType.JSON);}
 try{
 const body=JSON.parse(e.postData.contents),secret=PropertiesService.getScriptProperties().getProperty('DOLPHIN_BRIDGE_SECRET');
 if(!secret||secret.length<32||typeof body.payload!=='string'||typeof body.signature!=='string')throw new Error('Yêu cầu không hợp lệ.');
 const expected=Utilities.computeHmacSha256Signature(body.payload,secret).map(b=>('0'+((b+256)%256).toString(16)).slice(-2)).join('');
 if(expected!==body.signature)throw new Error('Xác thực yêu cầu thất bại.');
 const req=JSON.parse(body.payload);
 if(Math.abs(Date.now()-req.timestamp)>60000||!Number.isFinite(req.timestamp)||!/^[-\w]{16,80}$/.test(req.id||''))throw new Error('Yêu cầu hết hạn.');
 return reply(dolphinLock_(()=>{
  const cache=CacheService.getScriptCache(),key='request:'+req.id;
  if(cache.get(key))throw new Error('Yêu cầu đã được xử lý. Hãy tải lại trạng thái.');
  cache.put(key,'started',600);
  if(req.action==='sync')return syncAllDolphinSheetsCore_();
  if(req.action==='assign')return dolphinAssign_(req.data);
  throw new Error('Chức năng không hợp lệ.');
 }));
 }catch(error){return reply({ok:false,message:error.message||'Đồng bộ thất bại; hãy kiểm tra trạng thái Sheet.'});}
}
function dolphinAssign_(data){
 const {sheetName,code,stt,expectedTable,table}=data||{};
 if(typeof sheetName!=='string'||!isDolphinSheet(sheetName)||typeof code!=='string'||!code.trim()||typeof stt!=='string'||typeof expectedTable!=='string'||typeof table!=='string')throw new Error('Thông tin booking không hợp lệ.');
 const normalized=table.toUpperCase().replace(/\s+/g,'');
 if(!/^[ABCDEJQL][1-9]\d{0,2}(,[ABCDEJQL][1-9]\d{0,2})*$/.test(normalized))throw new Error('Nhập bàn như A1 hoặc A1,A2.');
 const sheet=SpreadsheetApp.openById(DOLPHIN_TARGET_ID).getSheetByName(sheetName);
 if(!sheet)throw new Error('Không tìm thấy tab ngày/tour.');
 const rows=sheet.getDataRange().getValues(),found=[];
 rows.forEach((r,i)=>{if(String(r[1]).trim()===code.trim()&&String(r[0]).trim()===stt.trim())found.push(i);});
 if(found.length!==1)throw new Error('Booking đã thay đổi. Hãy tải lại.');
 const row=found[0],cell=sheet.getRange(row+1,7);
 if(cell.getFormula()||String(rows[row][6]||'').trim()!==expectedTable.trim())throw new Error('Số bàn đã thay đổi hoặc có công thức. Hãy tải lại.');
 const wanted=normalized.split(',');
 if(new Set(wanted).size!==wanted.length)throw new Error('Bàn bị lặp.');
 rows.forEach((r,i)=>{if(i!==row&&/^\d+$/.test(String(r[0]))&&parseTables(r[6]).some(t=>wanted.includes(t)))throw new Error('Bàn đã có booking khác.');});
 cell.setValue(normalized);SpreadsheetApp.flush();
 if(cell.getValue()!==normalized)throw new Error('Chưa xác nhận được số bàn sau khi lưu.');
 return {ok:true,table:normalized};
}

 function parseTables(raw){
  const src=String(raw||'').replace(/LOUNGE\s*/gi,'L'),rooms=[];
  const re=/\b([ABCDEJQL])\s*(\d{1,3})(?:\s*[-–]\s*(?:([ABCDEJQL])\s*)?(\d{1,3}))?/gi;let m;
  while((m=re.exec(src))){
   const a=m[1].toUpperCase(),other=m[3]?.toUpperCase(),from=+m[2],to=m[4]?+m[4]:from;
   if(other&&other!==a||from<1||to<1||from>999||to>999||Math.abs(to-from)>60)continue;
   for(let n=Math.min(from,to);n<=Math.max(from,to);n++)rooms.push(a+n);
  }
  return [...new Set(rooms)];
 }

