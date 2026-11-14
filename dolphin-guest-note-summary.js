/* AI is optional: original notes remain readable before deployment and offline. */
(function(root){
 'use strict';
 const records=new Map();let next=0,busy=false,retryAt=0,latest=[],onChange=null;
 function record(note){if(!records.has(note))records.set(note,{id:String(++next),text:'',done:false,source:'original'});return records.get(note);}
 // Classification drives these views; no keyword fallback while AI is pending/offline.
 function prepare(b){
  b.showSlots=(b.showSlots||[]).filter(x=>x.type!=='BGL');
  b.bung=[];b.lob=[];b.diet=[];b.specialFood=[];b.loungeTicket=null;
  b.aiClassificationState=b.dietNoteRaw?'pending':'empty';
  return b;
 }
 function apply(b){
  const rec=record(b.dietNoteRaw||''),c=rec.classification;
  if(b._aiClassification===c&&c)return false;
  if(!c||!Array.isArray(c.items)){b.aiClassificationState=b.dietNoteRaw?'pending':'empty';return false;}
  prepare(b);b._aiClassification=c;b.aiClassificationState=c.needsReview?'review':'ready';
  const diets=['Veg','Non-veg','Jain','Halal','Chay Việt','Chay Âu','Indian Food','diet-note'];
  for(const x of c.items){
   if(x.state!=='confirmed')continue;
   if(diets.includes(x.category)){if(!b.diet.some(d=>d.t===x.category))b.diet.push({t:x.category,s:x.evidence});}
   else if(x.category==='lobster')b.lob.push(x.evidence);
   else if(x.category==='bungalow')b.bung.push({s:x.evidence,n:x.quantity||0,num:x.room||'',quantityKnown:x.quantity>0});
   else if(x.category==='lounge'||x.category==='premium-lounge'){
    // Multiple ticket lines may overlap: require staff quantity entry rather than adding guesses.
    if(b.loungeTicket){b.loungeTicket.quantity=null;b.loungeTicket.note+='\n'+x.evidence;}
    else b.loungeTicket={note:x.evidence,quantity:x.quantity||null,category:x.category==='premium-lounge'?'Premium Lounge':'Lounge trà bánh'};
   }else if(['coconut-welcome','indian-tea','pakora','custom-order'].includes(x.category))b.specialFood.push({type:x.category,note:x.evidence});
  }
  for(const x of b.bung)for(let i=0;i<Math.max(1,x.n);i++)b.showSlots.push({type:'BGL',num:i===0&&x.num?Number(x.num):null,note:x.s});
  return true;
 }
 function refresh(){let changed=false;for(const b of latest)if(apply(b))changed=true;if(changed&&onChange)onChange();update();}
 function preview(note){const item=record(note),text=(item.text||note).replace(/\s+/g,' ').trim();return text.length>240?text.slice(0,240)+'…':text;}
 function update(){document.querySelectorAll('[data-guest-summary]').forEach(node=>{
  for(const [note,item] of records)if(item.id===node.dataset.guestSummary){node.textContent=preview(note);break;}
 });}
 function status(text){const node=document.getElementById?.('guestNoteAiStatus');if(node)node.textContent=text;}
 async function ensure(bookings,changed){
  latest=bookings;onChange=changed||null;
  const allNotes=[...new Set(bookings.map(b=>b.dietNoteRaw||'').filter(n=>n.trim()))];
  const notes=allNotes.filter(n=>n.length<=2000);
  if(!allNotes.length){status('');return;}
  if(busy||Date.now()<retryAt)return;
  if(!root.DolphinStaffId?.summarizeGuestNotes){status('Chưa tạo được tóm tắt — đang hiển thị ghi chú gốc.');return;}
  const report=()=>status(allNotes.some(n=>!record(n).classification)?'Một số ghi chú chưa được AI phân loại; xem ghi chú gốc.':allNotes.some(n=>record(n).classification.needsReview)?'Có yêu cầu chưa rõ — cần nhân viên kiểm tra ghi chú.':allNotes.some(n=>record(n).source!=='ai')?'Đã phân loại; một số ghi chú giữ nguyên để đủ thông tin.':'');
  const pending=notes.filter(n=>!record(n).done);if(!pending.length){refresh();report();return;}
  busy=true;status('Đang đọc và phân loại yêu cầu khách…');
  try{
   for(let start=0;start<pending.length;start+=20){
    const batch=pending.slice(start,start+20),result=await root.DolphinStaffId.summarizeGuestNotes(batch);
    if(!Array.isArray(result?.summaries)||result.summaries.length!==batch.length||new Set(result.summaries.map(i=>i.id)).size!==batch.length)throw Error('Invalid summary');
    for(const item of result.summaries){
     if(!Number.isInteger(item.id)||item.id<0||item.id>=batch.length||typeof item.text!=='string')throw Error('Invalid summary');
     const rec=record(batch[item.id]);rec.text=item.text;rec.done=true;rec.source=item.source||'original';rec.classification=item.classification||null;if(!rec.classification){rec.done=false;retryAt=Date.now()+60000;}
    }
    refresh();
   }
   report();
  }catch(_){retryAt=Date.now()+60000;status('Chưa tạo được tóm tắt — đang hiển thị ghi chú gốc.');}
  finally{busy=false;if(latest!==bookings)ensure(latest,onChange);}
 }
 root.DolphinGuestNoteSummary={key:note=>record(note).id,preview,ensure,prepare,apply};
})(window);
