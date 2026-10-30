/* End-of-match presentation and retryable casual result synchronization. */
(function(root){'use strict';
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function create(options){
 const {modal,title,subtitle,table,status,retryButton}=options;
 let context=null,key='',closed=false,inFlight=null,previousFocus=null,done=false;
 function open(){
  if(!context)return;
  const parent=options.parent?.();if(parent&&modal.parentElement!==parent)parent.appendChild(modal);
  previousFocus=root.document?.activeElement;modal.classList.remove('hidden');options.closeButton?.focus({preventScroll:true});
 }
 function close(){closed=true;modal.classList.add('hidden');previousFocus?.focus?.({preventScroll:true});}
 function message(text,error=false){status.textContent=text;status.dataset.error=error?'true':'false';retryButton.classList.toggle('hidden',!error);}
 async function sync(){
  if(!context||context.offline||done)return;
  if(inFlight)return inFlight;
  const current=key,{roomId,uid,room}=context;
  message('↻ Đang đồng bộ kết quả lên bảng xếp hạng…');
  const task=Promise.resolve().then(()=>options.sync(roomId,uid,room.seed));inFlight=task;
  try{
   await task;if(key!==current)return;done=true;
   message('✓ Đã đồng bộ bảng xếp hạng online');options.onSynced?.(roomId,room.seed);
  }catch(error){if(key===current)message('Chưa đồng bộ: '+String(error.message||error)+'. Sẽ tự thử lại khi có mạng.',true);}
  finally{if(inFlight===task)inFlight=null;}
 }
 function update(room,input){
  if(room?.status!=='finished')return;
  const next=[input.offline?'offline':input.roomId,room.seed].join(':');
  if(next===key)return;
  key=next;closed=false;done=false;context={...input,room};
  let rows;
  try{rows=options.rowsFor(room);}catch(error){rows=room.playerOrder.map(uid=>({uid,player:room.players[uid]?.displayName||'Người chơi',hp:room.players[uid]?.hp||0,placement:null,score:null}));message(String(error.message||error),true);}
  const me=rows.find(row=>row.uid===input.uid);
  title.textContent=room.winnerId===input.uid?'🏆 CHIẾN THẮNG!':'🏁 TRẬN ĐẤU KẾT THÚC';
  subtitle.textContent=(me?.placement?'Bạn đạt hạng '+me.placement+'/4':'Kết quả trận đấu')+' · Vòng '+room.round+(input.offline?' · Offline':' · Online 4 người');
  table.innerHTML=rows.map(row=>'<tr class="'+(row.uid===input.uid?'isMe':'')+'"><td>'+(row.placement===1?'🥇':row.placement===2?'🥈':row.placement===3?'🥉':row.placement?'#'+row.placement:'—')+'</td><td>'+esc(row.player)+(row.uid===input.uid?' <strong>(BẠN)</strong>':'')+'</td><td>'+row.hp+'</td><td>'+(input.offline||row.score===null?'—':'+'+row.score)+'</td></tr>').join('');
  open();
  if(input.offline){message('Trận Offline — không cộng vào bảng xếp hạng online');return;}
  if(rows.some(row=>!row.placement))return;
  void sync();
 }
 function reset(){key='';context=null;closed=false;done=false;inFlight=null;modal.classList.add('hidden');}
 retryButton.addEventListener('click',()=>{void sync();});options.closeButton?.addEventListener('click',close);
 modal.addEventListener('keydown',event=>{
  if(event.key==='Escape'){event.preventDefault();close();return;}
  if(event.key!=='Tab')return;
  const buttons=Array.from(modal.querySelectorAll('button:not(.hidden):not(:disabled)'));
  const first=buttons[0],last=buttons.at(-1);
  if(event.shiftKey&&root.document.activeElement===first){event.preventDefault();last?.focus();}
  else if(!event.shiftKey&&root.document.activeElement===last){event.preventDefault();first?.focus();}
 });
 return {update,open,close,reset,retry:sync};
}
root.DolphinTacticsMatchResults={create};
if(typeof module!=='undefined'&&module.exports)module.exports=root.DolphinTacticsMatchResults;
})(typeof window!=='undefined'?window:globalThis);
