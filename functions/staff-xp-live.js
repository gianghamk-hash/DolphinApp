'use strict';
// Server-originated Firestore triggers: XP is never granted by browser-supplied amount.
// ENABLE ONLY after protecting source Firestore writes. See docs/STAFF_XP_GUIDE_VI.md.
const {onDocumentWritten}=require('firebase-functions/v2/firestore');
const {getDatabase}=require('firebase-admin/database');
const engine=require('./staff-xp-live-engine.cjs');
const reconcile=require('./staff-xp-reconcile');
const prestige=require('./staff-prestige');
const opts={region:'asia-southeast1',maxInstances:5,memory:'256MiB',retry:true};
function handler(kind,source){
 return onDocumentWritten({...opts,document:kind+'/{recordId}'},async event=>{
  if(process.env.STAFF_AUTO_XP_ENABLED!=='true')return;
  const after=event.data?.after,previous=event.data?.before;
  if(!after?.exists)return;
  const before=previous?.exists?previous.data():null;
  const next=after.data();
  const entries=source==='revenue'
   ?engine.revenueTransition(kind,before,next)
   :engine.workTransition(kind,before,next);
  if(!entries.length)return;
  const registry=(await getDatabase().ref('staffRegistry').once('value')).val()||{};
  const directory=reconcile._nameDirectory(registry); // unique, manager-issued Staff IDs only
  const created=after.createTime?.toMillis?.()||event.id;
  for(const entry of entries){
   const employeeId=reconcile._staffId(directory,entry.name);
   if(!employeeId)continue; // unknown, duplicate name or unverified self-registration
   const id=engine.eventId(kind,event.params.recordId,created,employeeId,source);
   await prestige._awardTrustedLiveXP({employeeId,eventId:id,source:entry.source,amount:entry.amount});
  }
 });
}
exports.staffAutoXpLoungeTable=handler('lounge_tables','revenue');
exports.staffAutoXpBungalowTable=handler('bun_tables','revenue');
exports.staffAutoXpShowTable=handler('show_tables','revenue');
exports.staffAutoXpLoungeOrder=handler('lounge_orders','work');
exports.staffAutoXpBungalowOrder=handler('bun_orders','work');
exports.staffAutoXpRestaurantOrder=handler('res_orders','work');
