'use strict';
const {createRequire}=require('node:module');
const firebaseRequire=createRequire(require('node:path').resolve(__dirname,'../functions/package.json'));
const {initializeApp,applicationDefault}=firebaseRequire('firebase-admin/app');
const {getDatabase}=firebaseRequire('firebase-admin/database');
const {getFirestore}=firebaseRequire('firebase-admin/firestore');
const projectId='dolphin-f6d67';
const variants=['https://dolphin-f6d67-default-rtdb.asia-southeast1.firebasedatabase.app','https://dolphin-f6d67-default-rtdb.firebaseio.com'];
const norm=s=>String(s||'').normalize('NFC').trim().replace(/\s+/g,' ').toLocaleLowerCase('vi-VN');
const app=initializeApp({credential:applicationDefault(),projectId});
async function main(){
 let registry,board,location='';
 for(const url of variants){
  try{
   const db=getDatabase(app,url);
   registry=(await db.ref('staffRegistry').once('value')).val()||{};
   board=(await db.ref('staffPrestige/public').once('value')).val()||{};
   location=url.includes('asia-southeast1')?'regional':'default';
   break;
  }catch(e){console.log('RTDB candidate',url.includes('asia-southeast1')?'regional':'default','unavailable:',(e.code||'')+' '+e.message);}
 }
 if(!registry)throw Error('No accessible Realtime Database; diagnostic did not modify data');
 const p=registry['DOL-0001'];
 const names=p?[p.name,...(Array.isArray(p.nameAliases)?p.nameAliases:[])].map(norm).filter(Boolean):[];
 const db=getFirestore(app);
 for(const id of ['LOUNGE 20','LOUNGE20','20']){
  const x=await db.collection('lounge_tables').doc(id).get();
  if(!x.exists){console.log('Lounge candidate:',JSON.stringify({id,exists:false}));continue;}
  const d=x.data()||{};
  const who=Object.values(registry).filter(v=>v?.active&&[v.name,...(v.nameAliases||[])].some(s=>norm(s)===norm(d.openedByStaff)));
  console.log('Lounge candidate:',JSON.stringify({id,exists:true,pax:Number(d.pax)||0,paymentEligible:!['FOC','TA_UNPAID','KTOUR'].includes(String(d.paymentMethod||'').toUpperCase()),
   ownerPresent:!!norm(d.openedByStaff),ownerMatchesDOL0001:names.includes(norm(d.openedByStaff)),ownerUnique:who.length===1,matchedStaffCount:who.length,
   updatedAtType:typeof d.updatedAt}));
 }
 const led=(await getDatabase(app,variants[location==='regional'?0:1]).ref('staffXpLedger/DOL-0001').once('value')).val()||{};
 console.log('Profile/board:',JSON.stringify({databaseLocation:location,profileExists:!!p,profileActive:!!p?.active,profileHasName:!!norm(p?.name),xp:Number(p?.xp)||0,levelPeak:p?.levelPeak||1,
   ledgerEvents:Object.keys(led).length,publicBoardUpdated:!!board.updatedAt,publicLeaderboardCount:(board.leaderboard||[]).length,
   onBoard:(board.leaderboard||[]).some(v=>v.employeeId==='DOL-0001')}));
}
main().catch(e=>{console.error('Diagnostic failed (read-only):',e.code||e.message);process.exitCode=1;});
