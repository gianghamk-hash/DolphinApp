# Dolphin Tactics 3D — Multiplayer Architecture

> Implementation branch only; this does NOT deploy Firebase or merge main. Node.js 22 for Functions.

## Client / server contract

- `giaitri/games/tactics-online/index.html`: Three.js WebGL frontend, 4-player lobby, 30-hero shop, board/bench controls and local combat replay.
- `functions/tactics/catalog.json`: source of truth (30 heroes, 11 origin/class definitions, 6 components, 21 recipes).
- `giaitri/games/tactics-online/catalog.json`: human-readable synchronized catalog copy.
- `giaitri/games/tactics-online/schema.ts`: room and action schema.
- `functions/tactics/engine.js`: pure deterministic buy/roll/xp/move/merge/equip, trait buffs, 8x8 pathfinding, FSM, results, PvE drops and ghost pairing.
- `functions/index.js`: trusted callable API for room creation/join/start, actions and phase progression; 1-minute fallback sweep.
- `functions/tactics/database.rules.json`: isolated RTDB rules (clients may read their room but cannot write room state).
- `functions/tactics/engine.test.js`: Node unit tests.

## Phases

`waiting` -> 4 joined players -> `PREPARATION` (30s) -> `COMBAT` (40s) -> `TRANSITION` (5s) -> repeat; final surviving player wins. Early PREPARATION completion when all surviving players READY. Phases are deadline-verified by Cloud Functions. Browser clients request advances when the deadline expires; the scheduled function is a slower best-effort fallback.

**Host ID is a lobby organizer, not a trusted simulation authority.** A host browser can be compromised. The server is authoritative for state, economy, random seed, match pairings and combat results. Local replay only renders events.

## Set up Firebase — separate isolated game RTDB recommended

1. Enable Firebase Authentication → Anonymous (or replace with a stronger identity provider).
2. Create an RTDB instance in Firebase Console and copy its real **Database URL**. Never guess the regional endpoint.
3. Install Firebase CLI and authenticate: `npm i -g firebase-tools && firebase login`. Make sure billing/Blaze and Cloud Functions deployment permissions are configured. Cloud Scheduler fallback requires scheduler support.
4. Test: `cd functions && npm install && npm test`; use `node --test tactics/engine.test.js` if you haven't installed dependencies.
5. Configure Firebase CLI project using `firebase use --add`; generate the appropriate `firebase.json` with Functions source `functions` and database rules path `functions/tactics/database.rules.json`.
6. **Safety:** Rules in this sample deny unrelated RTDB paths. Deploy to a game-specific database, or merge the `rooms` and `roomPresence` sections with your existing RTDB rules. DO NOT replace production rules serving other games without review.
7. Deploy: `firebase deploy --only functions`, followed by security rules only after checking target database.
8. Open Entertainment → Dolphin Tactics 3D; paste the copied RTDB Database URL once; create room and share six-character code with 3 players.
9. Turn on Firebase App Check (reCAPTCHA Enterprise for web), then set `enforceAppCheck:true` on callable options and redeploy. Client App Check initialization is needed before enforcing. Do not enable enforcement without client configuration.

## Security guarantees and remaining production work

- RTDB rules: authenticated room members read only their own room; all writes to rooms, HP, gold, boards, results, seed are **denied** to browsers. Admin SDK in Cloud Functions writes them. Rate limits in `tacticsRate/{uid}` apply to calls.
- Cloud Functions enforce membership, host start permission, shop prices, valid slot positions, inventory ownership, phase deadlines and 4-player room cap.
- Firebase Security Rules cannot establish server authority when browser host computes results; therefore production never trusts host-computed combat results.
- Use server-generated timestamps and room seeds for authoritative combat. Local Three.js replay is cosmetic; victory and HP originate on server.
- `roomPresence` allows user-owned connection indicators. For disconnect/reconnect, `onDisconnect` integration and host handover is a follow-up.
- **Not deployed/tested against live Firebase**. Browser QA, Emulator Suite security rule tests, App Check setup, idempotent Cloud Tasks scheduling, distributed load tests, reconnect support, cross-device replay timing and high-density rendering QA are needed for a production launch.
- Engine uses deterministic integer RNG and fixed 200ms ticks; current 3D units are low-poly proxy geometry, not authored character models.
- Closed match report stays in `rooms/{roomId}/reports`; UI can display the round results. Firestore historical exports can be added separately.
