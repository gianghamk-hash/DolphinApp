/* Staff-only note presentation. Originals never leave their order fields. */
(function(root){
 'use strict';
 const records=new Map();let next=0,busy=false,timer=null;
 const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 function body(r){
  const translated=r.state==='done'
   ?'<strong>Tiếng Việt · AI</strong><div style="white-space:pre-wrap">'+escape(r.text)+'</div>'+(r.needsReview?'<div>Cần xác nhận lại với khách: nội dung chưa rõ.</div>':'')
   :'<div role="status">'+(r.state==='error'?'Chưa dịch được — xem nguyên văn bên dưới.':r.state==='long'?'Yêu cầu dài hơn 2.000 ký tự — xem nguyên văn.':'Đang dịch sang tiếng Việt…')+'</div>';
  return translated+'<details open style="margin-top:6px"><summary>Nguyên văn khách gửi</summary><div style="white-space:pre-wrap;overflow-wrap:anywhere">'+escape(r.note)+'</div></details>'+
   (r.state==='error'?'<button type="button" data-request-retry="'+r.id+'" style="margin-top:6px;text-decoration:underline">Dịch lại</button>':'');
 }
 function update(){
  const byId=new Map([...records.values()].map(r=>[r.id,r]));
  document.querySelectorAll('[data-request-translation]').forEach(node=>{
   const r=byId.get(node.dataset.requestTranslation);if(r)node.innerHTML=body(r);
  });
 }
 function schedule(){if(!timer)timer=setTimeout(()=>{timer=null;void flush();},100);}
 async function flush(){
  if(busy)return;
  const batch=[...records.values()].filter(r=>r.state==='pending').slice(0,10);
  if(!batch.length)return;
  busy=true;batch.forEach(r=>r.state='loading');
  try{
   if(!root.DolphinStaffId?.translateGuestRequests)throw Error('Not ready');
   const result=await root.DolphinStaffId.translateGuestRequests(batch.map(r=>r.note));
   const items=result?.translations;
   if(!Array.isArray(items)||items.length!==batch.length||new Set(items.map(i=>i.id)).size!==batch.length||
    items.some(i=>!Number.isInteger(i.id)||i.id<0||i.id>=batch.length||typeof i.text!=='string'||!i.text.trim()||typeof i.needsReview!=='boolean'))throw Error('Invalid response');
   for(const i of items)Object.assign(batch[i.id],{state:'done',text:i.text,needsReview:i.needsReview});
  }catch(_){batch.forEach(r=>r.state='error');}
  finally{busy=false;update();if([...records.values()].some(r=>r.state==='pending'))schedule();}
 }
 function render(note){
  note=String(note||'');if(!note.trim())return '';
  let r=records.get(note);
  if(!r){
   if(records.size>=500){const oldest=[...records].find(([,v])=>!['pending','loading'].includes(v.state));if(oldest)records.delete(oldest[0]);}
   r={id:String(++next),note,state:note.length>2000?'long':'pending'};records.set(note,r);
  }
  if(r.state==='pending')schedule();
  return '<div data-request-translation="'+r.id+'" style="padding:10px;margin-bottom:12px;border:1px solid #b99b51;border-radius:10px;color:#ffebb0;font-size:12px;overflow-wrap:anywhere">'+body(r)+'</div>';
 }
 document.addEventListener('click',event=>{
  const button=event.target.closest?.('[data-request-retry]');if(!button)return;
  const r=[...records.values()].find(x=>x.id===button.dataset.requestRetry);
  if(r&&r.state==='error'){r.state='pending';update();schedule();}
 });
 root.DolphinRequestTranslation={render};
})(window);
