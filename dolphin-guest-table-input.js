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
 return Object.freeze({normalize});
});
