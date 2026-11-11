/* Dolphin Guest — detect pre-ordered F&B from booking notes.
 * Read-only parser: no order/revenue/guest-list mutations.
 * Exact original notes remain available for kitchen and service handover.
 */
(function(root,factory){
 'use strict';
 var api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.DolphinGuestSpecialRules=api;
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 var MENU=[
  {key:'pakora',label:'Pakora',icon:'🥘',pattern:/\bpakor(?:a|e)?\b|\bpakoda\b/i},
  {key:'coconut-welcome',label:'Coconut Welcome',icon:'🥥',
   pattern:/\b(?:(?:coconut|dua|nuoc dua)\s*(?:welcome|chao mung|don khach)|(?:welcome|chao mung|don khach)\s*(?:coconut|dua|nuoc dua))\b/i},
  {key:'indian-tea',label:'Trà Ấn',icon:'🫖',
   pattern:/\b(?:tra\s+(?:an(?:\s+do)?|india(?:n)?|masala|chai)|(?:indian|india|masala)\s+(?:tea|chai)|chai\s+tea)\b/i}
 ];
 function normalize(value){
  return String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'')
   .replace(/đ/gi,'d').toLowerCase().replace(/\s+/g,' ').trim();
 }
 function segments(note){
  return String(note||'').replace(/\r\n?/g,'\n')
   .replace(/\s+[-–—]\s+(?=(?:đặt|mua|coconut|trà|tea|pakora|welcome|order)(?:\s|\b))/gi,'\n')
   .split(/\n+|\s*;\s*(?=(?:đặt|mua|coconut|trà|tea|pakora|welcome|order)(?:\s|\b))/i)
   .map(function(line){return line.replace(/^[\s*•\-–—]+/,'').trim();})
   .filter(Boolean);
 }
 function cancelled(plain,keyword){
  var before=plain.slice(Math.max(0,keyword-42),keyword);
  var after=plain.slice(keyword).slice(0,65);
  return /(?:khong\s+(?:dat|mua|lay|dung|can)|huy|cancel(?:led)?|bo\s+(?:mon|set))\s*(?:\d+\s*)?(?:(?:set|suat|phan|mon)\s*)?$/.test(before)||
   /\b(?:huy\s+(?:dat|don|mon)?|cancel(?:led)?|khong\s+(?:dat|lay|dung))\b/.test(after);
 }
 function qty(plain,key){
  var dish=key==='pakora'?'pakor(?:a|e)?|pakoda':
   key==='coconut-welcome'?'coconut|dua|nuoc dua':
   key==='indian-tea'?'tra an(?: do)?|indian tea|masala chai|chai tea':'';
  var re=new RegExp('\\b(\\d{1,3})\\s*(?:set|suat|phan|ly|coc)?\\s*(?:'+dish+')\\b','i');
  var match=plain.match(re);
  if(!match){
   re=new RegExp('\\b(?:'+dish+')\\s*(\\d{1,3})\\s*(?:set|suat|phan|ly|coc)\\b','i');
   match=plain.match(re);
  }
  return match&&+match[1]>0?+match[1]:null;
 }
 function meta(plain){
  var guest=plain.match(/\b(?:cho|for)\s*(\d{1,3})\s*(?:khach|nguoi|pax|guests?)\b/);
  var price=plain.match(/\b(\d+(?:[.,]\d+)?)\s*(k|nghin|tr|trieu|000)\b/);
  var unpaid=/\b(?:chua\s+thanh\s+toan|unpaid|not\s+paid)\b/.test(plain);
  var paid=!unpaid&&/\b(?:da\s+thanh\s+toan|thanh\s+toan\s+roi|paid|prepaid)\b/.test(plain);
  return {guests:guest?+guest[1]:null,price:price?price[0]:null,payment:unpaid?'unpaid':paid?'paid':null};
 }
 function detect(notes){
  var result=[],seen=new Set();
  segments(notes).forEach(function(note){
   var plain=normalize(note),details=meta(plain),known=false;
   MENU.forEach(function(menu){
    var matched=plain.match(menu.pattern);
    if(!matched||cancelled(plain,matched.index))return;
    known=true;
    var key=menu.key+'|'+plain;
    if(seen.has(key))return;
    seen.add(key);
    result.push({type:menu.key,label:menu.label,icon:menu.icon,note:note,
     quantity:qty(plain,menu.key),guests:details.guests,price:details.price,
     payment:details.payment});
   });
   // Conservative fallback for explicit add-on dishes not yet in the catalog.
   // Never treat seats, bungalow services, dietary "Veg 1" or show tickets as a food order.
   if(!known&&/\b(?:mua\s+them|dat\s+them|order\s+them|bo\s+sung\s+mon|dat\s+mon)\b/.test(plain)&&
      /\b\d{1,3}\s*(?:set|suat|phan|mon)\b/.test(plain)&&
      !/\b(?:bungalow|bgl|lounge|show|ve|vps|bar\s*view|veg|non\s*veg|chay|halal|jain)\b/.test(plain)){
    var generic='custom-order|'+plain;
    if(!seen.has(generic)){
     seen.add(generic);
     var match=plain.match(/\b(\d{1,3})\s*(?:set|suat|phan|mon)\b/);
     result.push({type:'custom-order',label:'Món đặt thêm',icon:'🍽️',note:note,
      quantity:match?+match[1]:null,guests:details.guests,price:details.price,
      payment:details.payment});
    }
   }
  });
  return result;
 }
 return Object.freeze({detect:detect,normalize:normalize,segments:segments});
});
