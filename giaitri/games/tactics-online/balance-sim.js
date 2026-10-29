/* Deterministic offline balance smoke simulation; no Firestore or gameplay mutations. */
'use strict';
const E=require('../../../functions/tactics/engine'),AI=require('./extreme-ai.js')(E);
function run(seed=20261029,maxRounds=16){
 const r=E.roomNew('AI_1','AI 1',100,seed);
 for(const uid of ['AI_2','AI_3','HUMAN_BOT']){r.players[uid]=E.freshPlayer(uid,uid,r);r.playerOrder.push(uid);}
 r.status='in_game';r.round=1;r.phaseEndsAt=30100;
 const stats={rounds:0,winner:null,styles:{},events:0};
 for(const id of r.playerOrder)stats.styles[id]={wins:0,losses:0};
 for(let i=0;i<maxRounds&&r.status==='in_game';i++){
  for(const uid of r.playerOrder){const p=r.players[uid];if(!p.eliminated)AI.takeTurn(r,uid,r.phaseStartedAt+100);}
  E.advance(r,r.phaseEndsAt);E.advance(r,r.phaseEndsAt);
  for(const report of r.reports){stats.events+=report.events.length;if(report.winner&&stats.styles[report.winner])stats.styles[report.winner].wins++;if(report.loser&&stats.styles[report.loser])stats.styles[report.loser].losses++;}
  stats.rounds++;
  if(r.status==='in_game')E.advance(r,r.phaseEndsAt);
  for(const uid of r.playerOrder){const p=r.players[uid];if(!p)continue;
   if(Object.keys(p.board).length>p.level)throw Error('Board exceeds level: '+uid);
   if(new Set(Object.values(p.board)).size!==Object.keys(p.board).length)throw Error('Duplicate board ownership: '+uid);
   if(Object.keys(p.bench).length>8)throw Error('Bench overflow: '+uid);
   if(!Number.isFinite(p.gold)||p.gold<0)throw Error('Invalid gold: '+uid);
  }
 }
 stats.winner=r.winnerId;return stats;
}
function batch(count=24){const totals={games:count,rounds:0,events:0,wins:{},results:[]};for(let i=0;i<count;i++){const report=run(20261029+i*13);totals.rounds+=report.rounds;totals.events+=report.events;if(report.winner)totals.wins[report.winner]=(totals.wins[report.winner]||0)+1;totals.results.push(report);}return totals;}
if(require.main===module){const count=Math.max(1,Math.min(200,Number(process.argv[2])||24));console.log(JSON.stringify(batch(count),null,2));}
module.exports={run,batch};
