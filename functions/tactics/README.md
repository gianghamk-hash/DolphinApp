# Dolphin Tactics 3D — multiplayer

## Default online game: atomic casual rooms

The web/APK entry point now registers `online-transport.js` with the shared
`DolphinMP` API. It uses the existing Firestore `mp_rooms` collection and does
not require deploying additional Cloud Functions or changing production rules.
Existing Caro/Snake transports are unchanged.

- New rooms declare `protocol: tactics-atomic-v2`. Everyone must refresh and
  create a new room after the update; old host-relay rooms are rejected explicitly.
- The host organizes the lobby only. Every participant submits their own command
  directly in a Firestore transaction. Any participant can advance a due phase.
- Each transaction reads room membership plus the current state, validates the
  command and commits one revision. Concurrent updates retry, with at most 10
  attempts. Round/phase fences stop queued commands affecting a later round.
- A bounded FIFO accepts rapid clicks without silently discarding the next input.
  Each player's last 24 command IDs prevent duplicate purchases on uncertain
  retries. Commands expire after 10 seconds, and transactions reject offline
  input instead of queuing purchases for a later reconnect.
- Phase changes take priority over the input queue. A phase key prevents duplicate
  combat results, round XP and income when multiple clients advance together.
- `reports` includes only pair, winner, loser and damage. Replay events and initial
  combat stats are generated locally. A 4-player/9-unit round-12 fixture drops
  from 154,899 to 3,917 JSON bytes (97.5% reduction); actual wire sizes vary.
- A dedicated worker computes replay and combat resolution outside the rendering
  thread. Browsers without worker support use the deterministic inline fallback.
- Presence heartbeats run every 15 seconds while visible. Committed timestamps
  estimate server clock offset. Idle combat is no longer reported as disconnected
  solely because the room has not changed for 20 seconds.
- Leaving an active match retains roster/ownership for reconnect and never closes
  the match for everyone. Waiting-room host departure transfers the organizer role.
  If all clients close, the casual match waits until someone reconnects.
- At COMBAT start, a four-second banner names the actual PvP opponent, ghost owner
  or PvE encounter. Its lifetime follows the phase start time; shop updates do
  not restart it and late reconnects do not replay an expired announcement.
- During COMBAT, purchases, hero/item inspection, XP, shop lock/unlock, rerolls
  and bench-only moves/swaps remain available. Deployed units, gear assignment
  and selling remain locked until PREPARATION. The frozen combat snapshot is
  unchanged; a third copy bought during combat merges only on the next
  PREPARATION transition, including any cascaded upgrades.

**Trust boundary:** This is still casual, browser-computed play, as before.
Transactions prevent concurrent lost updates; they do not make browsers trusted
simulation authorities. Client rooms set `rankingEligible:false`; verified TFT
rankings remain exclusive to the separate Functions/RTDB backend described below.
Do not grant broader Firestore permissions to make a failing deployment work.

## Verification

Run from the repository root:

```sh
node --test giaitri/games/tactics-online/online-transport.test.js giaitri/games/tactics-online/simulation-client.test.js
node --test functions/tactics/combat-controls.test.js giaitri/games/tactics-online/phase-banner.test.js
node --test giaitri/games/tactics-online/tactics-ui.test.js
cd functions && npm test
```

The transport suite covers concurrent purchases, uncertain retries, queued input,
phase expiry, all-ready, host departure, reconnect, compact payloads and cleanup.

For a browser integration run, install Playwright/Chromium, serve this repository
locally, and start a **local demo-project Firestore emulator** with test-only rules.
Never deploy emulator allow-all rules to production. Then run:

```sh
FIRESTORE_EMULATOR_HOST=127.0.0.1:8088 node giaitri/games/tactics-online/online-browser.cjs
```

`TFT_BASE_URL` defaults to `http://127.0.0.1:8765`. The browser check forces the
`demo-dolphin-tft` project/emulator, and covers four separate browser contexts,
purchases, moves, host removal, worker combat, round XP, reconnect and offline
rejection. It also exercises a named PvP announcement, automatic banner hiding,
combat purchases/inspection/XP/lock/reroll, actual pointer drag/swap on the bench,
unchanged combat snapshots and fusion deferred until PREPARATION. Actual boat
Wi-Fi/4G latency and Android hardware FPS still need a
physical-device session; emulator timings are not production latency claims.

## Separate server-authoritative backend (not the default browser route)

`functions/index.js` and `authority-adapter.js` remain a separate backend path.
The adapter still polls callables and is not automatically enabled by this update.
It needs a properly deployed Functions/RTDB environment and a complete realtime
client integration before replacing casual rooms. Existing backend instructions
and contracts follow; their server-authority guarantees apply only to that path.

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
