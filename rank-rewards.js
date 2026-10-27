/* Dolphin Rank Rewards — real-time, display-only, browser-local cache.
 * Staff identity is still name-based. No privileged Firestore entitlements are granted.
 */
(function(root){
 'use strict';
 const KEY='dolphinRankRewardsV2',HISTORY='dolphinRankHallOfFameV2';
 const TIERS={
 revenue:[{max:1,title:'KING OF SALES',emoji:'👑',tier:'king'},{max:3,title:'DIAMOND SALES',emoji:'💎',tier:'diamond'},{max:6,title:'MASTER SALES',emoji:'🔮',tier:'master'},{max:10,title:'SALES ELITE',emoji:'🐬',tier:'elite'}],
 work:[{max:1,title:'WORK CHAMPION',emoji:'👑',tier:'king'},{max:3,title:'WORK ELITE',emoji:'⚔️',tier:'diamond'},{max:6,title:'WORK MASTER',emoji:'🛡️',tier:'master'},{max:10,title:'WORK TOP 10',emoji:'⭐',tier:'elite'}]};
 function clean(s){return String(s||'').trim().normalize('NFC');}
 function read(k){try{return JSON.parse(localStorage.getItem(k)||'null');}catch(e){return null;}}
 function all(){return read(KEY)||{};}
 function current(category='revenue'){const v=all()[category];return v&&Array.isArray(v.entries)?v:{entries:[],week:'',updatedAt:0};}
 function history(category='revenue'){const v=read(HISTORY)||{};return Array.isArray(v[category])?v[category]:[];}
 function tier(rank,category='revenue'){return (TIERS[category]||TIERS.revenue).find(x=>rank>0&&rank<=x.max)||null;}
 function get(name,category='revenue'){const e=current(category).entries.find(x=>clean(x.name)===clean(name));return e?{...e,...tier(e.rank,category)}:null;}
 function escapeHTML(s){return String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
 function badge(name,category='revenue'){const r=get(name,category);return r?'<span class="drr-tag drr-'+r.tier+'" title="Top '+r.rank+' · '+escapeHTML(r.title)+'">'+r.emoji+' '+escapeHTML(r.title)+'</span>':'';}
 function publishCategory(category,rows,week){
  if(!TIERS[category]||!Array.isArray(rows))return;
  const entries=rows.filter(x=>clean(x.name)&&Number.isFinite(category==='work'?x.points:x.rev)&&(category==='work'?x.points:x.rev)>0)
   .slice(0,10).map((x,i)=>({rank:i+1,name:clean(x.name),value:category==='work'?x.points:x.rev}));
  const prev=current(category),now={week:String(week||''),entries,updatedAt:Date.now()};
  if(prev.week===now.week&&JSON.stringify(prev.entries)===JSON.stringify(entries))return;
  const data=all();data[category]=now;
  try{localStorage.setItem(KEY,JSON.stringify(data));}catch(e){}
  const winner=entries[0];
  if(winner){
   const h=read(HISTORY)||{},old=history(category),id=now.week+'|'+winner.name;
   if(!old.some(x=>x.id===id)){old.unshift({id,name:winner.name,week:now.week,firstSeen:now.updatedAt});h[category]=old.slice(0,52);try{localStorage.setItem(HISTORY,JSON.stringify(h));}catch(e){}}
  }
  try{root.dispatchEvent(new CustomEvent('dolphinRankRewardsUpdated',{detail:{category,...now}}));}catch(e){}
 }
 function publish(rows,week){publishCategory('revenue',rows,week);}
 function formatPeriod(value){const n=Number(value);if(!Number.isFinite(n)||n<1000000000000)return String(value||'');const d=new Date(n),f=new Intl.DateTimeFormat('vi-VN',{timeZone:'Asia/Ho_Chi_Minh',day:'2-digit',month:'2-digit',year:'numeric'});return f.format(d)+' → '+f.format(new Date(n+7*86400000-1000));}
 function installStyle(){if(document.getElementById('dolphin-rank-style'))return;const style=document.createElement('style');style.id='dolphin-rank-style';style.textContent=`
 .drr-tag{display:inline-flex;vertical-align:middle;align-items:center;gap:4px;padding:3px 7px;margin:3px 3px 0 0;border-radius:99px;font-size:9px;font-weight:900;letter-spacing:.02em;white-space:nowrap;border:1px solid}
 .drr-king{color:#ffe18b;border-color:#ffcf59;background:linear-gradient(120deg,#6d3e09,#271d11);box-shadow:0 0 13px #f6be4350}
 .drr-diamond{color:#ecf4ff;border-color:#a9cef5;background:#2c435a}
 .drr-master{color:#edd7ff;border-color:#a36ae7;background:#382450}
 .drr-elite{color:#a5fff2;border-color:#42bbae;background:#164947}
 .drr-frame{display:inline-flex;align-items:center;justify-content:center;border:3px solid #42bbae;border-radius:50%;box-shadow:0 0 11px #42bbae66;flex-shrink:0}
 .drr-frame.drr-king{border-color:#fbd77a;box-shadow:0 0 20px #fbd77a9a}
 .drr-frame.drr-diamond{border-color:#d6e9ff;box-shadow:0 0 13px #bedfff7a}
 .drr-frame.drr-master{border-color:#b58bea;box-shadow:0 0 12px #a469d67a}
 .drr-hall{margin-top:16px;padding:12px;border:1px solid #a28a4d77;background:#0a2928;border-radius:13px;color:#dbeee8}
 .drr-hall h3{font-size:13px;font-weight:900;color:#ffe18b;margin:0 0 8px}
 .drr-hall-item{font-size:11px;padding:6px 0;border-bottom:1px solid #ffffff13}
 @media(prefers-reduced-motion:reduce){.drr-tag,.drr-frame{animation:none!important}}
 `;document.head.appendChild(style);}
 root.DolphinRankRewards={current,history,get,tier,publish,publishCategory,badge,escapeHTML,formatPeriod,installStyle};
 installStyle();
})(typeof window!=='undefined'?window:globalThis);
