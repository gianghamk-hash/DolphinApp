'use strict';
// Pure, testable mapping of live Firestore transitions to XP candidates.
// NOTE: source Firestore collections must be protected from forged staff writes before enabling automatic XP.
const crypto=require('node:crypto');
const xp=require('./staff-xp-engine.cjs');
const SHOW_PRICES=Object.freeze({combo1:1390000,combo2:790000,combo3:2000000,singer1:2290000,singer2:2290000,singer3:3290000});
const EXCLUDED=new Set(['FOC','TA_UNPAID','KTOUR']);
function clean(v){return String(v||'').normalize('NFC').trim().replace(/\s+/g,' ');}
function names(v){return [...new Map(clean(v).split('&').filter(Boolean).map(n=>[n.toLocaleLowerCase('vi-VN'),n])).values()];}
function tableValue(kind,t){
 if(!t)return 0;
 const method=clean(t.paymentMethod||t.payment).toUpperCase();
 if(kind==='show_tables'){
  if(method==='FOC'||!clean(t.seller))return 0;
  return SHOW_PRICES[t.service?.combo]||0;
 }
 if(EXCLUDED.has(method)||!clean(t.openedByStaff))return 0;
 if(kind==='lounge_tables')return Math.max(0,Math.min(999,Math.floor(Number(t.pax)||0)))*250000;
 if(kind==='bun_tables')return 2000000;
 return 0;
}
function revenueTransition(kind,before,after){
 if(!after||tableValue(kind,before)>0)return [];
 const money=tableValue(kind,after);
 if(!money)return [];
 const name=clean(kind==='show_tables'?after.seller:after.openedByStaff);
 return name?[{name,source:'revenue',amount:xp.revenueXP(money)}]:[];
}
function workTransition(kind,before,after){
 if(!after||after.status!=='completed'||before?.status==='completed')return [];
 if(!['lounge_orders','bun_orders','res_orders'].includes(kind))return [];
 const prepare=new Map(names(after.preparedBy).map(n=>[n.toLocaleLowerCase('vi-VN'),n]));
 const complete=new Map(names(after.completedBy).map(n=>[n.toLocaleLowerCase('vi-VN'),n]));
 const people=new Map([...prepare,...complete]);
 const lounge=kind==='lounge_orders';
 return [...people].map(([key,name])=>({
  name,source:'work',amount:xp.workXP(complete.has(key)?(lounge?0.25:1):(lounge?0.1:0.5))
 })).filter(e=>e.amount>0);
}
function eventId(kind,documentId,createdAt,employeeId,source){
 const hash=crypto.createHash('sha256').update([kind,documentId,createdAt,employeeId,source].join('|')).digest('hex');
 return 'live:'+hash.slice(0,40);
}
module.exports={clean,names,tableValue,revenueTransition,workTransition,eventId};
