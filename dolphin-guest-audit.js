(function(root){
'use strict';
function check(rows){
 const issues=[],codes=new Map(),tables=new Map(),parents=new Map();
 const tokens=b=>String(b.code||'').toUpperCase().split(/\s*\+\s*/).filter(Boolean);
 const find=x=>{if(!parents.has(x))parents.set(x,x);if(parents.get(x)!==x)parents.set(x,find(parents.get(x)));return parents.get(x);};
 for(const b of rows){const c=tokens(b);for(const x of c)parents.set(find(x),find(c[0]));}
 const add=(severity,title,bookings)=>issues.push({severity,title,bookings});
 for(const b of rows){
  if(!String(b.tbl||'').trim())add('action','Chưa xếp bàn',[b]);
  if(!/^\d+$/.test(String(b.paxRaw??b.pax).trim())||Number(b.paxRaw??b.pax)<=0)add('action','Số khách trống hoặc không hợp lệ',[b]);
  if(!String(b.code||'').trim())add('action','Thiếu mã BKK',[b]);
  for(const c of new Set(tokens(b))){if(!codes.has(c))codes.set(c,[]);codes.get(c).push(b);}
  for(const t of new Set(b.tb||[])){if(!tables.has(t))tables.set(t,[]);tables.get(t).push(b);}
  const c=b._aiClassification;
  if(b.dietNoteRaw&&!c)add('review','Ghi chú chưa được AI kiểm tra',[b]);
  if(c){
   if(c.needsReview)add('review','Yêu cầu chưa chốt hoặc mâu thuẫn — đối chiếu ghi chú',[b]);
   for(const x of c.items||[])if(x.state==='confirmed'&&(x.category==='lobster'||x.category==='bungalow'||x.category==='lounge'||x.category==='premium-lounge'||x.setMenu)&&!x.quantity)add('review','Chưa rõ số lượng: '+({lobster:'tôm hùm',bungalow:'bungalow',lounge:'vé lounge','premium-lounge':'vé Premium Lounge'}[x.category]||x.category),[b]);
  }
 }
 for(const [c,bs]of codes)if(bs.length>1)add('review','BKK '+c+' xuất hiện '+bs.length+' dòng',bs);
 for(const [t,bs]of tables){
  const groups=new Set(bs.map(b=>tokens(b).length?find(tokens(b)[0]):b));
  if(groups.size>1)add('action','Bàn '+t+' trùng giữa các booking',bs);
 }
 return issues;
}
let dialog;
function open(rows,label,onOpen){
 if(!dialog){dialog=document.createElement('dialog');dialog.style.cssText='width:min(720px,92vw);max-height:85vh;overflow:auto;background:#102826;color:#fff;border:1px solid #e9c56b;border-radius:16px;padding:20px';document.body.appendChild(dialog);}
 dialog.replaceChildren();
 const heading=document.createElement('h3');heading.textContent='Kiểm tra danh sách · '+label;dialog.appendChild(heading);
 const close=document.createElement('button');close.textContent='Đóng';close.onclick=()=>dialog.close();dialog.appendChild(close);
 const issues=check(rows),status=document.createElement('p');status.textContent=rows.length+' booking · '+issues.filter(i=>i.severity==='action').length+' việc cần xử lý · '+issues.filter(i=>i.severity==='review').length+' việc cần kiểm tra';dialog.appendChild(status);
 if(!issues.length){const p=document.createElement('p');p.textContent='Chưa phát hiện vấn đề qua các kiểm tra hiện có.';dialog.appendChild(p);}
 for(const severity of ['action','review'])for(const issue of issues.filter(i=>i.severity===severity)){
  const section=document.createElement('section');section.style.cssText='border-top:1px solid #ffffff30;padding:12px 0';
  const title=document.createElement('strong');title.textContent=(severity==='action'?'⚠ Cần xử lý: ':'ⓘ Cần kiểm tra: ')+issue.title;section.appendChild(title);
  for(const b of issue.bookings){
   const details=document.createElement('details'),summary=document.createElement('summary');summary.textContent=(b.code||'Thiếu BKK')+' · '+b.name+' · STT '+b.stt+' · '+(b.tbl||'Chưa có bàn');details.appendChild(summary);
   const source=document.createElement('p');source.style.whiteSpace='pre-wrap';source.textContent='Số khách: '+(b.paxRaw??b.pax)+'\n'+(b.dietNoteRaw||'Không có ghi chú cột H');details.appendChild(source);
   const go=document.createElement('button');go.textContent='Mở booking';go.onclick=()=>{dialog.close();onOpen(b);};details.appendChild(go);section.appendChild(details);
  }dialog.appendChild(section);
 }
 if(!dialog.open)dialog.showModal();
}
const api={check,open,isOpen:()=>!!dialog?.open};
if(typeof module==='object'&&module.exports)module.exports=api;else root.DolphinGuestAudit=api;
})(typeof window==='object'?window:globalThis);
