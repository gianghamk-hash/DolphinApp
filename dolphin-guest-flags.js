(function(root){
 'use strict';
 const data=root.DolphinCountryData,cache=new Map();let busy=false,retryAt=0,latest=[];
 const norm=s=>String(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/gi,'d').toLowerCase().trim().replace(/\s+/g,' ');
 const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 function alias(label){const key=norm(label);return Object.hasOwn(data.aliases,key)?data.aliases[key]:null;}
 function resolve(raw){
  if(cache.has(norm(raw)))return cache.get(norm(raw));
  const direct=alias(raw);if(direct)return {codes:[direct],unknown:false};
  const parts=String(raw).split(/\s*(?:[+,;/&\n]|\s+và\s+|\s+and\s+)\s*/i).filter(Boolean),codes=[];let unknown=!parts.length;
  for(const part of parts){const code=alias(part);if(code){if(!codes.includes(code))codes.push(code);}else unknown=true;}
  return {codes,unknown};
 }
 function icons(raw){const r=resolve(raw);return r.codes.map(code=>'<img class="guest-flag" src="./assets/flags/'+code+'.svg" width="18" height="14" alt="'+esc('Cờ '+data.names[code])+'" title="'+esc(data.names[code])+'" loading="lazy">').join('')+(r.unknown?'<span class="guest-flag-unknown" title="Chưa xác định chắc chắn quốc tịch" aria-label="Quốc tịch chưa xác định">?</span>':'');}
 function html(raw){return '<span class="guest-flags" data-guest-nationality="'+esc(raw)+'">'+icons(raw)+'</span> '+esc(raw);}
 function update(){document.querySelectorAll('[data-guest-nationality]').forEach(n=>n.innerHTML=icons(n.dataset.guestNationality));}
 async function ensure(bookings){
  latest=bookings;update();if(busy||Date.now()<retryAt||!root.DolphinStaffId?.resolveGuestNationalities)return;
  const pending=[...new Set(bookings.map(b=>b.nat||'').concat(Array.from(document.querySelectorAll('[data-guest-nationality]'),node=>node.dataset.guestNationality)).filter(n=>n.trim()&&n.length<=120&&resolve(n).unknown&&!cache.has(norm(n))))];
  if(!pending.length)return;busy=true;
  try{for(let start=0;start<pending.length;start+=20){
   const names=pending.slice(start,start+20),result=await root.DolphinStaffId.resolveGuestNationalities(names);
   if(!Array.isArray(result?.nationalities)||result.nationalities.length!==names.length)throw Error('Invalid country response');
   const seen=new Set();
   for(const item of result.nationalities){
    if(!Number.isInteger(item.id)||item.id<0||item.id>=names.length||seen.has(item.id)||!Array.isArray(item.codes)||item.codes.some(c=>!Object.hasOwn(data.names,c))||typeof item.uncertain!=='boolean')throw Error('Invalid country');
    seen.add(item.id);
   }
   for(const item of result.nationalities){const local=resolve(names[item.id]);cache.set(norm(names[item.id]),{codes:[...new Set([...local.codes,...(item.uncertain?[]:item.codes)])],unknown:item.uncertain||!item.codes.length});}
   update();
  }}catch(_){retryAt=Date.now()+60000;}finally{busy=false;if(latest!==bookings)ensure(latest);}
 }
 root.DolphinGuestFlags={resolve,html,ensure};
})(window);
