/* Booking sign print/export from RESA sheet. Matches BIỂN ĐẶT BÀN AUTO.docx.
 * Read-only. Do not mutate Firebase, Staff IDs, XP or the booking list. */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.DolphinGuestTableSigns=api;
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const AREAS=Object.freeze(['A','B','C','D','E','J','Q','L']);
 const ART='assets/dolphin-table-sign-word.png';
 function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
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
 function collect(bookings){
  const areas=Object.fromEntries(AREAS.map(a=>[a,[]])),seen=new Set(),occupied=new Map(),duplicates=[];
  let missing=0,excluded=0;
  for(const b of (Array.isArray(bookings)?bookings:[])){
   const code=String(b.code||'').trim(),name=String(b.name||'').trim(),agent=String(b.agent||'').trim();
   const parsed=Array.isArray(b.tb)&&b.tb.length?b.tb:parseTables(b.tbl);
   const rooms=[...new Set(parsed.flatMap(parseTables))];
   if(!rooms.length){missing++;continue;}
   for(const room of rooms){
    const area=room.match(/^[A-Z]+/)?.[0];
    if(!AREAS.includes(area)){excluded++;continue;}
    const key=(code||String(b.stt||''))+'|'+room;
    if(seen.has(key))continue;
    seen.add(key);
    const previous=occupied.get(room);
    if(previous&&previous!==code)duplicates.push({room,first:previous,second:code});
    else occupied.set(room,code);
    areas[area].push({area,room,code,name,agent});
   }
  }
  for(const a of AREAS)areas[a].sort((x,y)=>+x.room.slice(a.length)-+y.room.slice(a.length)
     ||x.code.localeCompare(y.code,'vi',{numeric:true}));
  return {areas,duplicates,missing,excluded,total:AREAS.reduce((n,a)=>n+areas[a].length,0)};
 }
 function pagesOf(result,selected=AREAS){
  const pages=[],wanted=new Set(selected);
  for(const area of AREAS){
   if(!wanted.has(area))continue;
   const list=result.areas[area]||[];
   for(let i=0;i<list.length;i+=2)pages.push({area,records:list.slice(i,i+2)});
  }
  return pages;
 }
 function sign(record,art){
  const nameSize=record.name.length>56?12:record.name.length>42?14:record.name.length>31?16:18;
  return '<div class="sign"><img class="art" src="'+esc(art)+'" alt="">'+
   '<div class="fields">'+
    '<div>Booking Code: '+esc(record.code)+'</div>'+
    '<div>Guest’s Name:<strong style="font-size:'+nameSize+'pt">'+esc(record.name)+'</strong></div>'+
    '<div>Travel Agency :'+esc(record.agent)+'</div>'+
    '<div>Table Number :<strong>'+esc(record.room)+'</strong></div>'+
   '</div></div>';
 }
 function documentHtml(result,config={}){
  const selected=(config.selectedAreas||AREAS).filter(a=>AREAS.includes(a)),pages=pagesOf(result,selected);
  const asset=config.assetUrl||ART;
  const controls=AREAS.map(a=>{
   const count=result.areas[a].length;
   return '<label class="area"><input type="checkbox" data-area="'+a+'"'+(selected.includes(a)?' checked':'')+
    (count?'':' disabled')+'><b>'+a+'</b><span>'+count+'</span></label>';
  }).join('');
  const sheets=pages.map(page=>'<section class="sheet" data-area="'+page.area+'">'+
   page.records.map(b=>sign(b,asset)).join('')+'</section>').join('');
  const style=String.raw;
  const css=[
   '*{box-sizing:border-box}',
   'body{margin:0;background:#dce6e8;color:#125263;font-family:Arial,sans-serif}',
   '.toolbar{position:sticky;top:0;z-index:20;background:white;border-bottom:1px solid #adc4cc;padding:12px 16px;box-shadow:0 2px 8px #0001}',
   'h1{font-size:17px;margin:0;color:#086078}',
   '.intro{font-size:12px;color:#537079;margin-top:4px}',
   '.controls{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:11px}',
   '.area{display:inline-flex;align-items:center;gap:6px;background:#eef6f7;border:1px solid #bdd3db;border-radius:7px;padding:7px;cursor:pointer;font-size:13px}',
   '.area:has(input:disabled){opacity:.4;cursor:not-allowed}',
   '.area span{color:#607d8b;font-size:11px}',
   'button{cursor:pointer;border:0;border-radius:8px;background:#076078;color:white;font:700 12px Arial;padding:10px 13px}',
   'button.alt{background:#eff5f7;color:#086078;border:1px solid #aac7cf}',
   'button:disabled{opacity:.4;cursor:not-allowed}',
   '.summary{font:bold 12px Arial;margin-left:auto}',
   '.warning{font-size:12px;color:#994b1d;margin-top:8px}',
   '#pages{padding:18px 0 28px}',
   '.sheet{position:relative;width:8.5in;height:11in;margin:0 auto 22px;background:white;overflow:hidden;box-shadow:0 3px 16px #0003}',
   '.sign{position:absolute;left:.5in;top:.95in;width:6.5in;height:4.595833in;overflow:hidden}',
   '.sign:nth-of-type(2){top:5.55in}',
   '.art{width:100%;height:100%;display:block;position:absolute;inset:0;object-fit:contain}',
   '.fields{position:absolute;top:2.04in;left:.25in;right:.08in;font:italic 18pt "Times New Roman",Times,serif;line-height:.39in;color:#000}',
   '.fields>div{height:.39in;white-space:nowrap;letter-spacing:-.01em}',
   '.fields strong{font-weight:700}',
   '.empty{text-align:center;color:#677b83;padding:45px}',
   '@page{size:letter;margin:0}',
   '@media(max-width:880px){#pages{overflow-x:auto}.sheet{margin-left:12px;margin-right:12px}}',
   '@media print{html,body{margin:0!important;padding:0!important;background:white!important}',
   '.toolbar,.empty{display:none!important}#pages{padding:0!important}',
   '.sheet{width:8.5in;height:11in;box-shadow:none!important;margin:0!important;page-break-after:always;break-after:page;page-break-inside:avoid}',
   '.sheet.is-hidden{display:none!important}.sheet:last-child{page-break-after:auto;break-after:auto}',
   '.art{-webkit-print-color-adjust:exact;print-color-adjust:exact}}'
  ].join('\n');
  const script=[
   '(function(){',
   'const boxes=[...document.querySelectorAll("input[data-area]")];',
   'const selected=new Set(boxes.filter(x=>x.checked).map(x=>x.dataset.area));',
   'function refresh(){let count=0,n=0;',
   'document.querySelectorAll(".sheet").forEach(sheet=>{const visible=selected.has(sheet.dataset.area);sheet.classList.toggle("is-hidden",!visible);',
   'if(visible){n++;count+=sheet.querySelectorAll(".sign").length;}});',
   'document.getElementById("count").textContent=count+" biển · "+n+" trang";',
   'document.getElementById("print").disabled=!n;',
   'document.getElementById("empty").style.display=n?"none":"block";}',
   'boxes.forEach(box=>box.addEventListener("change",()=>{box.checked?selected.add(box.dataset.area):selected.delete(box.dataset.area);refresh();}));',
   'document.getElementById("all").onclick=()=>{boxes.forEach(b=>{if(!b.disabled){b.checked=true;selected.add(b.dataset.area);}});refresh();};',
   'document.getElementById("none").onclick=()=>{boxes.forEach(b=>{b.checked=false;selected.delete(b.dataset.area);});refresh();};',
   'document.getElementById("print").onclick=()=>window.print();refresh();',
   '})();'
  ].join('\n');
  return '<!doctype html><html lang="vi"><head><meta charset="utf-8">'+
   '<meta name="viewport" content="width=device-width,initial-scale=1">'+
   '<title>Biển đặt bàn Dolphin · '+esc(config.date||'')+'</title><style>'+css+'</style></head><body>'+
   '<header class="toolbar"><h1>🖨️ Tự tạo biển đặt bàn Dolphin</h1>'+
   '<div class="intro">'+esc(config.date||'')+' · '+(config.tour==='dn'?'Tour tối':'Tour sáng')+
   ' · Letter 8,5 × 11 inch · 2 biển trên một trang · Các khu không trộn trang</div>'+
   '<div class="controls">'+controls+
   '<button id="all" class="alt">Chọn tất cả</button><button id="none" class="alt">Bỏ chọn</button>'+
   '<span id="count" class="summary"></span><button id="print">In / Lưu PDF</button></div>'+
   (result.missing?'<div class="warning">⚠ '+result.missing+' booking chưa có số bàn hợp lệ.</div>':'')+
   (result.duplicates.length?'<div class="warning">⚠ '+result.duplicates.length+
     ' bàn xuất hiện ở nhiều booking; vui lòng đối chiếu RESA trước khi in.</div>':'')+
   '</header><main id="pages">'+sheets+'</main><div id="empty" class="empty" style="display:none">Không có biển trong các khu đang chọn.</div>'+
   '<script>'+script+'<\/script></body></html>';
 }
 function openPrint(bookings,config={}){
  const data=collect(bookings);
  if(!data.total)return {ok:false,reason:'Không có bàn thuộc A, B, C, D, E, J, Q, L để tạo biển.'};
  if(typeof window==='undefined')return {ok:false,reason:'Chỉ hỗ trợ trên trình duyệt.'};
  const viewer=window.open('','_blank');
  if(!viewer)return {ok:false,reason:'Trình duyệt đang chặn cửa sổ in; hãy cho phép pop-up.'};
  const assetUrl=new URL(ART,window.location.href).href;
  viewer.document.open();viewer.document.write(documentHtml(data,{...config,assetUrl}));viewer.document.close();
  return {ok:true,total:data.total,missing:data.missing,duplicates:data.duplicates.length};
 }
 return Object.freeze({AREAS,ART,parseTables,collect,pagesOf,documentHtml,openPrint});
});
