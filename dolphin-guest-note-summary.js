/* AI is optional: original notes remain readable before deployment and offline. */
(function(root){
 'use strict';
 const records=new Map();let next=0,busy=false,retryAt=0;
 function record(note){if(!records.has(note))records.set(note,{id:String(++next),text:'',done:false});return records.get(note);}
 function preview(note){const item=record(note),text=(item.text||note).replace(/\s+/g,' ').trim();return text.length>240?text.slice(0,240)+'…':text;}
 function update(){document.querySelectorAll('[data-guest-summary]').forEach(node=>{
  for(const [note,item] of records)if(item.id===node.dataset.guestSummary){node.textContent=preview(note);break;}
 });}
 async function ensure(bookings){
  if(busy||Date.now()<retryAt||!root.DolphinStaffId?.summarizeGuestNotes)return;
  const notes=[...new Set(bookings.map(b=>b.noteRaw||'').filter(n=>n.trim()&&n.length<=2000))];
  const pending=notes.filter(n=>!record(n).done);if(!pending.length){update();return;}
  busy=true;
  try{
   for(let start=0;start<pending.length;start+=20){
    const batch=pending.slice(start,start+20),result=await root.DolphinStaffId.summarizeGuestNotes(batch);
    if(!Array.isArray(result?.summaries))throw Error('Invalid summary');
    for(const item of result.summaries){
     if(!Number.isInteger(item.id)||item.id<0||item.id>=batch.length||typeof item.text!=='string')continue;
     const rec=record(batch[item.id]);rec.text=item.text;rec.done=true;
    }
    update();
   }
  }catch(_){retryAt=Date.now()+60000;}
  finally{busy=false;}
 }
 root.DolphinGuestNoteSummary={key:note=>record(note).id,preview,ensure};
})(window);
