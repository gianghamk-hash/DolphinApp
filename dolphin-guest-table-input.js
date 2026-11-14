/* Strict user-input parser. Expand ranges before the existing signed assignment
 * callable so deployed Apps Script versions receive their supported list form. */
(function(root,factory){
 'use strict';
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 else root.DolphinGuestTableInput=api;
})(typeof window==='object'?window:globalThis,function(){
 'use strict';
 function normalize(raw){
  if(typeof raw!=='string'||raw.length>1000)throw Error('Số bàn không hợp lệ.');
  const text=raw.trim().toUpperCase().replace(/[–—−]/g,'-');
  if(!text)throw Error('Hãy nhập số bàn, ví dụ A11-A16.');
  const result=[],seen=new Set();
  for(const part of text.split(',')){
   const m=/^\s*([ABCDEJQL])\s*([1-9]\d{0,2})\s*(?:-\s*([ABCDEJQL])?\s*([1-9]\d{0,2})\s*)?$/.exec(part);
   if(!m)throw Error('Nhập bàn như A11, A11-A16 hoặc A11,A12.');
   const zone=m[1],start=Number(m[2]),end=m[4]?Number(m[4]):start;
   if(m[3]&&m[3]!==zone)throw Error('Dải bàn phải cùng khu, ví dụ A11-A16.');
   if(end<start)throw Error('Nhập dải bàn theo thứ tự tăng, ví dụ A11-A16.');
   if(end-start+1>60)throw Error('Mỗi lần chỉ được nhập tối đa 60 bàn.');
   for(let n=start;n<=end;n++){
    const table=zone+n;
    if(seen.has(table))throw Error('Bàn '+table+' bị lặp. Hãy kiểm tra lại.');
    seen.add(table);result.push(table);
    if(result.length>60)throw Error('Mỗi lần chỉ được nhập tối đa 60 bàn.');
   }
  }
  return result.join(',');
 }
 function compact(raw){
  const tables=normalize(raw).split(',').sort((a,b)=>{
   const zones='ABCDEJQL';
   return zones.indexOf(a[0])-zones.indexOf(b[0])||Number(a.slice(1))-Number(b.slice(1));
  });
  const groups=[];
  for(let i=0;i<tables.length;){
   const start=tables[i];let end=start;i++;
   while(i<tables.length&&tables[i][0]===end[0]&&Number(tables[i].slice(1))===Number(end.slice(1))+1)end=tables[i++];
   groups.push(start===end?start:start+'-'+end);
  }
  return groups.join(',');
 }
 // Display legacy/free-text cells without silently discarding unknown content.
 function display(raw){try{return compact(raw);}catch(_){return String(raw||'');}}
 function conflicts(raw,bookings,current){
  const wanted=new Set(normalize(raw).split(','));
  const found=[];
  (bookings||[]).forEach(function(booking){
   if(booking===current)return;
   const overlap=(booking.tb||[]).filter(table=>wanted.has(table));
   if(overlap.length)found.push({code:booking.code||'',name:booking.name||'',tables:Array.from(new Set(overlap))});
  });
  return found;
 }
 return Object.freeze({normalize,compact,display,conflicts});
});
