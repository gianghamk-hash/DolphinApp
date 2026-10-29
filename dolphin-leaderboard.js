/* Dolphin Leaderboard · Module BXH dùng chung cho mọi game */
(function(){
  'use strict';
  var firebaseConfig = {
    apiKey: "AIzaSyAtBNp9WBnyIkCiVjXfUpjH2d7-9dbg-JQ",
    authDomain: "dolphin-f6d67.firebaseapp.com",
    projectId: "dolphin-f6d67"
  };
  var COL = 'game_scores';
  var modules = null, db = null, auth = null, ready = false, initPromise = null;
  var cache = { lb: {}, ts: {} };

  function getStaffName(){
    try {
      if (typeof window.getSyncedStaffName === 'function'){
        var n = window.getSyncedStaffName();
        if (n && n.trim()) return n.trim();
      }
      return localStorage.getItem('dolphinStaffName') || '';
    } catch(e){ return ''; }
  }

  function init(){
    if (initPromise) return initPromise;
    initPromise = (async function(){
      try {
        var mods = await Promise.all([
          import("https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js"),
          import("https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js"),
          import("https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js")
        ]);
        modules = { app: mods[0], auth: mods[1], db: mods[2] };
        var app = mods[0].initializeApp(firebaseConfig, 'dolphin-lb');
        auth = mods[1].getAuth(app);
        db = mods[2].getFirestore(app);
        await mods[1].signInAnonymously(auth);
        ready = true;
        return true;
      } catch(e){
        console.warn('[LB] init failed:', e);
        return false;
      }
    })();
    return initPromise;
  }

  function docId(game, player){
    var safe = String(player).toLowerCase().replace(/[^a-z0-9]/g, '_').substring(0, 40);
    return game + '__' + safe;
  }

  async function submit(game, score, meta){
    if (!game || typeof score !== 'number' || !isFinite(score)) return false;
    var ok = await init();
    if (!ok || !ready) return false;
    var player = getStaffName();
    if (!player) return false;

    var id = docId(game, player);
    var ref = modules.db.doc(db, COL, id);
    var safeScore = Math.max(0, Math.round(score));

    try {
      await modules.db.runTransaction(db, async function(tx){
        var snap = await tx.get(ref);
        var now = Date.now();
        var winFlag = (meta && typeof meta.win === 'boolean') ? meta.win : null;
        if (!snap.exists()){
          tx.set(ref, {
            game: game, player: player,
            bestScore: safeScore, totalScore: safeScore, totalGames: 1,
            wins: winFlag === true ? 1 : 0,
            losses: winFlag === false ? 1 : 0,
            lastPlayed: now, lastMeta: meta || null
          });
        } else {
          var cur = snap.data();
          tx.update(ref, {
            bestScore: Math.max(cur.bestScore || 0, safeScore),
            totalScore: (cur.totalScore || 0) + safeScore,
            totalGames: (cur.totalGames || 0) + 1,
            wins: (cur.wins || 0) + (winFlag === true ? 1 : 0),
            losses: (cur.losses || 0) + (winFlag === false ? 1 : 0),
            lastPlayed: now, lastMeta: meta || null
          });
        }
      });
      delete cache.lb[game];
      return true;
    } catch(e){
      console.warn('[LB] submit failed:', e);
      return false;
    }
  }

  // TFT results are provisional client-reported scores until staff identity
  // and match results can be verified by a trusted server endpoint.
  async function submitTacticsMatch(matchId, placement, meta){
    var name=getStaffName();
    if(!name || !matchId || !Number.isInteger(placement) || placement<1 || placement>4) return false;
    if(!(await init()) || !auth.currentUser) return false;
    var score=[0,25,18,12,6][placement];
    var userId=auth.currentUser.uid;
    var ref=modules.db.doc(db,COL,'dolphin-tactics__'+userId);
    try{
      await modules.db.runTransaction(db,async function(tx){
        var snap=await tx.get(ref),cur=snap.exists()?snap.data():{};
        var seen=Array.isArray(cur.recentMatches)?cur.recentMatches:[];
        if(seen.includes(matchId))return;
        tx.set(ref,{
          game:'dolphin-tactics',player:name,uid:userId,
          bestScore:Math.max(cur.bestScore||0,score),
          totalScore:(cur.totalScore||0)+score,
          totalGames:(cur.totalGames||0)+1,
          wins:(cur.wins||0)+(placement===1?1:0),
          losses:(cur.losses||0)+(placement!==1?1:0),
          totalPlacement:(cur.totalPlacement||0)+placement,
          bestPlacement:Math.min(cur.bestPlacement||4,placement),
          recentMatches:[...seen.slice(-99),matchId],
          lastPlayed:Date.now(),lastMeta:{placement,mode:'online',provisional:true}
        },{merge:true});
      });
      invalidate('dolphin-tactics');return true;
    }catch(error){console.warn('[TFT leaderboard] result submission failed:',error);return false;}
  }
    async function getLeaderboard(game, limit){
    limit = limit || 30;
    if (!game) return [];
    if (cache.lb[game] && (Date.now() - (cache.ts[game] || 0) < 30000)){
      return cache.lb[game].slice(0, limit);
    }
    var ok = await init();
    if (!ok || !ready) return [];
    try {
      var q = modules.db.query(
        modules.db.collection(db, COL),
        modules.db.where('game', '==', game)
      );
      var snap = await modules.db.getDocs(q);
      var arr = [];
      snap.forEach(function(d){ arr.push(d.data()); });
      arr.sort(function(a, b){
        var s = (game === 'dolphin-tactics' ? (b.totalScore || 0) - (a.totalScore || 0) : (b.bestScore || 0) - (a.bestScore || 0));
        if (s !== 0) return s;
        var w = (b.wins || 0) - (a.wins || 0);
        if (w !== 0) return w;
        return (a.lastPlayed || 0) - (b.lastPlayed || 0);
      });
      cache.lb[game] = arr;
      cache.ts[game] = Date.now();
      return arr.slice(0, limit);
    } catch(e){
      console.warn('[LB] fetch failed:', e);
      return [];
    }
  }

  function invalidate(game){
    if (game) delete cache.lb[game];
    else { cache.lb = {}; cache.ts = {}; }
  }

  window.DolphinLeaderboard = {
    init: init, submit: submit, submitTacticsMatch: submitTacticsMatch, getLeaderboard: getLeaderboard,
    getStaffName: getStaffName, invalidate: invalidate,
    ready: function(){ return ready; }
  };

  init();
})();
