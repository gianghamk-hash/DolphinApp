/* AI is optional: original notes remain readable before deployment and offline. */
(function(root){
 'use strict';
 const records=new Map();let next=0,busy=false,retryAt=0;
 function record(note){if(!records.has(note))records.set(note,{id:String(++next),text:'',done:false,source:'original'});return records.get(note);}
 function preview(note){const item=record(note),text=(item.text||note).replace(/\s+/g,' ').trim();return text.length>240?text.slice(0,240)+'…':text;}
 function update(){document.querySelectorAll('[data-guest-summary]').forEach(node=>{
  for(const [note,item] of records)if(item.id===node.dataset.guestSummary){node.textContent=preview(note);break;}
 });}
 function status(text){const node=document.getElementById?.('guestNoteAiStatus');if(node)node.textContent=text;}
 async function ensure(bookings){
  const allNotes=[...new Set(bookings.map(b=>b.dietNoteRaw||'').filter(n=>n.trim()))];
  const notes=allNotes.filter(n=>n.length<=2000);
  if(!allNotes.length){status('');return;}
  if(busy||Date.now()<retryAt)return;
  if(!root.DolphinStaffId?.summarizeGuestNotes){status('Chưa tạo được tóm tắt — đang hiển thị ghi chú gốc.');return;}
  const report=()=>status(allNotes.some(n=>record(n).source!=='ai')?'Một số ghi chú chưa được rút gọn; bấm để xem đầy đủ.':'');
  const pending=notes.filter(n=>!record(n).done);if(!pending.length){update();report();return;}
  busy=true;status('Đang tóm tắt yêu cầu khách…');
  try{
   for(let start=0;start<pending.length;start+=20){
    const batch=pending.slice(start,start+20),result=await root.DolphinStaffId.summarizeGuestNotes(batch);
    if(!Array.isArray(result?.summaries)||result.summaries.length!==batch.length||new Set(result.summaries.map(i=>i.id)).size!==batch.length)throw Error('Invalid summary');
    for(const item of result.summaries){
     if(!Number.isInteger(item.id)||item.id<0||item.id>=batch.length||typeof item.text!=='string')throw Error('Invalid summary');
     const rec=record(batch[item.id]);rec.text=item.text;rec.done=true;rec.source=item.source||'original';
    }
    update();
   }
   report();
  }catch(_){retryAt=Date.now()+60000;status('Chưa tạo được tóm tắt — đang hiển thị ghi chú gốc.');}
  finally{busy=false;}
 }
 root.DolphinGuestNoteSummary={key:note=>record(note).id,preview,ensure};
})(window);
