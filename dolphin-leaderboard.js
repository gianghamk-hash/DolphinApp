/* ═══════════════════════════════════════════════════════════════
   DOLPHIN LEADERBOARD · Module dùng chung cho tất cả game
   - Lưu điểm vào collection Firestore `game_scores`
   - Mỗi (game, player) = 1 doc duy nhất (dùng transaction)
   - API: submit(game, score, meta) · getLeaderboard(game, limit)
   ═══════════════════════════════════════════════════════════════ */
(function(){
  'use strict';

  const firebaseConfig = {
    apiKey: "AIzaSyAtBNp9WBnyIkCiVjXfUpjH2d7-9dbg-JQ",
    authDomain: "dolphin-f6d67.firebaseapp.com",
    projectId: "dolphin-f6d67"
  };
  const COL = 'game_scores';

  let modules = null, db = null, auth = null, ready = false, initPromise = null;
  const cache = { lb: {}, ts: {} };

  function getStaffName(){
    try {
      if (typeof window.getSyncedStaffName === 'function'){
        const n = window.getSyncedStaffName();
        if (n && n.trim()) return n.trim();
      }
      return localStorage.getItem('dolphinStaffName') || '';
    } catch(e){ return ''; }
  }

  function init(){
    if (initPromise) return initPromise;
    initPromise = (async () => {
      try {
        const [appMod, authMod, dbMod] = await Promise.all([
          import("https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js"),
          import("https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js"),
          import("https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js")
        ]);
        modules = { app: appMod, auth: authMod, db: dbMod };
        const app = appMod.initializeApp(firebaseConfig, 'dolphin-lb');
        auth = authMod.getAuth(app);
        db = dbMod.getFirestore(app);
        await authMod.signInAnonymously(auth);
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
    const safe = String(player).toLowerCase().replace(/[^a-z0-9]/g, '_').substring(0, 40);
    return game + '__' + safe;
  }

  async function submit(game, score, meta){
    if (!game || typeof score !== 'number' || !isFinite(score)) return false;
    const ok = await init();
    if (!ok || !ready) return false;
    const player = getStaffName();
    if (!player) return false;

    const id = docId(game, player);
    const ref = modules.db.doc(db, COL, id);
    const safeScore = Math.max(0, Math.round(score));

    try {
      await modules.db.runTransaction(db, async (tx) => {
        const snap = await tx.get(ref);
        const now = Date.now();
        const winFlag = (meta && typeof meta.win === 'boolean') ? meta.win : null;
        if (!snap.exists()){
          tx.set(ref, {
            game, player,
            bestScore: safeScore,
            totalScore: safeScore,
            totalGames: 1,
            wins: winFlag === true ? 1 : 0,
            losses: winFlag === false ? 1 : 0,
            lastPlayed: now,
            lastMeta: meta || null
          });
        } else {
          const cur = snap.data();
          tx.update(ref, {
            bestScore: Math.max(cur.bestScore || 0, safeScore),
            totalScore: (cur.totalScore || 0) + safeScore,
            totalGames: (cur.totalGames || 0) + 1,
            wins: (cur.wins || 0) + (winFlag === true ? 1 : 0),
            losses: (cur.losses || 0) + (winFlag === false ? 1 : 0),
            lastPlayed: now,
            lastMeta: meta || null
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

  async function getLeaderboard(game, limit){
    limit = limit || 30;
    if (!game) return [];
    if (cache.lb[game] && (Date.now() - (cache.ts[game] || 0) < 30000)){
      return cache.lb[game].slice(0, limit);
    }
    const ok = await init();
    if (!ok || !ready) return [];
    try {
      const q = modules.db.query(
        modules.db.collection(db, COL),
        modules.db.where('game', '==', game)
      );
      const snap = await modules.db.getDocs(q);
      const arr = [];
      snap.forEach(d => arr.push(d.data()));
      arr.sort((a, b) => {
        const s = (b.bestScore || 0) - (a.bestScore || 0);
        if (s !== 0) return s;
        const w = (b.wins || 0) - (a.wins || 0);
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
    init, submit, getLeaderboard, getStaffName, invalidate,
    ready: () => ready
  };

  // Tự khởi động
  init();
})();
