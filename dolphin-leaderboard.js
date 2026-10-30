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
  var compat = false, lastErrors = {}, initError = '';

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
    var attempt = (async function(){
      try {
        initError = '';
        if (window.firebase && window.firebase.firestore){
          var fb = window.firebase;
          var existing = fb.apps.find(function(app){return app.name === '[DEFAULT]';});
          db = window.db && typeof window.db.collection === 'function' ? window.db : (existing || fb.initializeApp(firebaseConfig)).firestore();
          compat = true; ready = true; return true;
        }
        var mods = await Promise.all([
          import("https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js"),
          import("https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js"),
          import("https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js")
        ]);
        modules = { app: mods[0], auth: mods[1], db: mods[2] };
        var app = mods[0].getApps().find(function(app){return app.name === 'dolphin-lb';}) || mods[0].initializeApp(firebaseConfig, 'dolphin-lb');
        auth = mods[1].getAuth(app);
        db = mods[2].getFirestore(app);
        try { await mods[1].signInAnonymously(auth); } catch(error){ console.warn('[LB] Anonymous sign-in unavailable; trying permitted public reads', error.code); }
        ready = true;
        return true;
      } catch(e){
        console.warn('[LB] init failed:', e);
        initError = String(e.message || e); ready = false; initPromise = null;
        return false;
      }
    })();
    initPromise = attempt;
    attempt.then(function(ok){if(!ok && initPromise === attempt)initPromise = null;});
    return attempt;
  }

  function docId(game, player){
    var safe = String(player).toLowerCase().replace(/[^a-z0-9]/g, '_').substring(0, 40);
    return game + '__' + safe;
  }

  async function submit(game, score, meta){
    if (!game || game === 'dolphin-tactics' || typeof score !== 'number' || !isFinite(score)) return false;
    var ok = await init();
    if (!ok || !ready) return false;
    var player = getStaffName();
    if (!player) return false;

    var id = docId(game, player);
    var ref = compat ? db.collection(COL).doc(id) : modules.db.doc(db, COL, id);
    var safeScore = Math.max(0, Math.round(score));

    try {
      var update = async function(tx){
        var snap = await tx.get(ref);
        var now = Date.now();
        var winFlag = (meta && typeof meta.win === 'boolean') ? meta.win : null;
        if (!(compat ? snap.exists : snap.exists())){
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
      };
      if(compat) await db.runTransaction(update); else await modules.db.runTransaction(db, update);
      delete cache.lb[game];
      return true;
    } catch(e){
      console.warn('[LB] submit failed:', e);
      return false;
    }
  }

  // Security: never submit competitive TFT rankings from a browser.
  // Verified results are computed exclusively from server-authoritative RTDB rooms.
  async function submitTacticsMatch(){
    console.warn('[TFT] Client score submissions disabled; authoritative callable required.');
    return false;
  }
  async function fetchVerifiedTacticsLeaderboard(limit){
    if(!(await init()))return [];
    if(compat) return [];
    if(!auth.currentUser)return [];
    try{
      var funcs=await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-functions.js");
      var app=modules.app.getApp('dolphin-lb');
      var endpoint=funcs.httpsCallable(funcs.getFunctions(app,'asia-southeast1'),'tacticsLeaderboard');
      var response=await endpoint({limit:Math.max(1,Math.min(30,limit||30))});
      return Array.isArray(response.data?.rows)?response.data.rows:[];
    }catch(error){
      console.warn('[TFT] Verified leaderboard unavailable',error);
      return [];
    }
  }
    async function getLeaderboard(game, limit){
    limit = limit || 30;
    if (!game) return [];
    lastErrors[game] = '';
    if (game === 'dolphin-tactics'){
      try {
        if(!(await init())) throw Error(initError || 'Không tải được Firebase');
        if(!compat || !window.DolphinTacticsResults) throw Error('Chưa tải đủ mô-đun kết quả TFT. Hãy tải lại trang.');
        return await window.DolphinTacticsResults.createService(db).getLeaderboard(limit);
      } catch(error){ lastErrors[game] = String(error.message || error); return []; }
    }
    if (cache.lb[game] && (Date.now() - (cache.ts[game] || 0) < 30000)){
      return cache.lb[game].slice(0, limit);
    }
    var ok = await init();
    if (!ok || !ready){lastErrors[game] = initError || 'Không tải được Firebase';return [];}
    try {
      var snap;
      if(compat) snap = await db.collection(COL).where('game', '==', game).get();
      else {
        var q = modules.db.query(modules.db.collection(db, COL),modules.db.where('game', '==', game));
        snap = await modules.db.getDocs(q);
      }
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
      lastErrors[game] = String(e.message || e);return [];
    }
  }

  function invalidate(game){
    if (game) delete cache.lb[game];
    else { cache.lb = {}; cache.ts = {}; }
  }

  window.DolphinLeaderboard = {
    init: init, submit: submit, submitTacticsMatch: submitTacticsMatch, getLeaderboard: getLeaderboard,
    getStaffName: getStaffName, invalidate: invalidate,
    lastError: function(game){return lastErrors[game] || initError;},
    flushTacticsResults: async function(){
      if(!(await init())||!compat||!window.DolphinTacticsResults)return [];
      var service=window.DolphinTacticsResults.createService(db),results=await service.flush();
      try{await service.repairLastRoom(localStorage.getItem('dolphin_device_id'));}catch(error){console.warn('[TFT] Pending match sync',error.message);}
      return results;
    },
    ready: function(){ return ready; }
  };

  window.addEventListener('storage',function(event){if(event.key === 'dolphin_tft_result_synced')invalidate('dolphin-tactics');});
  init();
})();
