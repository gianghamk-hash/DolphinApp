/* Dolphin Rank Rewards — real-time, display-only, browser-local cache.
 * Staff identity is still name-based. No privileged Firestore entitlements are granted.
 */
(function(root){
 'use strict';
 const KEY='dolphinRankRewardsV1',HISTORY='dolphinRankHallOfFameV1';
 const TIERS=[{max:1,title:'KING OF SALES',emoji:'👑',tier:'king'},{max:3,title:'DIAMOND ELITE',emoji:'💎',tier:'diamond'},{max:6,title:'MASTER',emoji:'🔮',tier:'master'},{max:10,title:'DOLPHIN ELITE',emoji:'🐬',tier:'elite'}];
 function clean(s){return String(s||'').trim().normalize('NFC');}
 function tier(rank){return TIERS.find(t=>rank>0&&rank<=t.max)||null;}
 function read(key){try{return JSON.parse(localStorage.getItem(key)||'null');}catch(e){return null;}}
 function current(){const x=read(KEY);return x&&Array.isArray(x.entries)?x:{entries:[],updatedAt:0,week:''};}
 function history(){const x=read(HISTORY);return Array.isArray(x)?x:[];}
 function get(name){const k=clean(name);const e=current().entries.find(e=>clean(e.name)===k);return e?{...e,...tier(e.rank)}:null;}
 function escapeHTML(s){return String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
 function badge(name){const r=get(name);if(!r)return '';return '<span class="drr-tag drr-'+r.tier+'" title="Top '+r.rank+' · '+escapeHTML(r.title)+'">'+r.emoji+' '+escapeHTML(r.title)+'</span>';}
 function publish(rows,week){
  if(!Array.isArray(rows))return;
  const entries=rows.slice(0,10).filter(r=>clean(r.name)&&Number.isFinite(r.rev)&&r.rev>0).map((r,i)=>({rank:i+1,name:clean(r.name),revenue:r.rev}));
  // Identical display ranking means no extra storage writes or redraws.
  const prev=current(), next={week:String(week||''),entries,updatedAt:Date.now()};
  if(JSON.stringify(prev.entries)===JSON.stringify(entries)&&prev.week===next.week)return;
  try{localStorage.setItem(KEY,JSON.stringify(next));}catch(e){}
  const winner=entries[0];
  if(winner){
   const hall=history(),id=next.week+'|'+winner.name;
   if(!hall.some(x=>x.id===id)){
    hall.unshift({id,week:next.week,name:winner.name,firstSeen:next.updatedAt});
    try{localStorage.setItem(HISTORY,JSON.stringify(hall.slice(0,52)));}catch(e){}
   }
  }
  try{root.dispatchEvent(new CustomEvent('dolphinRankRewardsUpdated',{detail:next}));}catch(e){}
 }
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
 root.DolphinRankRewards={current,history,get,tier,publish,badge,escapeHTML,installStyle};
 installStyle();
})(typeof window!=='undefined'?window:globalThis);
