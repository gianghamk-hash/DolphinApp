# DolphinApp – Multiplayer Sprint 3 performance validation

**Date:** 2026-11-12  
**Scope:** legacy/shared DolphinMP transport (2–4 peers), TFT atomic transport (4 peers), optional real-browser render cadence for Snake and TFT.  
**No production Firebase writes, staff-record mutations, XP or leaderboard changes.**

## 1. Repeatable offline network simulation

Run:

```sh
node scripts/multiplayer-sprint3-benchmark.cjs
node --test game-performance-metrics.test.cjs
```

CI: `.github/workflows/tactics-engine-tests.yml`, stage **Sprint 3 deterministic RTT 50-400 ms, reconnect, 2-4 peers**.

The benchmark uses each game's existing multiplayer transport implementation, a shared in-memory Firestore-style transaction/listener store, and an *injected fake clock*. The fixed 8-step latency pattern `[-18%, -8%, +6%, +18%, -12%, +10%, +2%, -4%]` repeats for each simulated peer. The 50–400 ms values are **synthetic acknowledgment latency**, not ICMP ping, true Firebase round-trip measurements, or network traffic in a live browser.

The test checks:
- Atomic room creation and joining with 2, 3 and 4 peers; stable seat identity.
- 16 ordered commands from each remote legacy peer, **exactly once**, with no duplicate/lost events in the in-memory listener.
- A simulated rejected write while offline; no unintended transaction commit.
- Leave and rejoin for the same peer, preserving assigned seat and room ownership.
- In TFT: four concurrent first purchases, four independent command queues, validated gold/unit counts, 16 shop-lock toggles per peer and reconnect without resetting the committed round.

The benchmark prints an `SPRINT3_BENCHMARK_JSON` line that can be consumed by CI tools.

### Verified results (GitHub Actions run 43163487592, engine-test)

| Transport | Peers | Injected ACK RTT (ms) | ACK median (ms) | ACK P95 (ms) | ACK jitter (ms) | Reconnect | Duplicates |
|---|---:|---:|---:|---:|---:|---|---:|
| Shared DolphinMP | 2 | 50 | 48 | 59 | 7 | Pass | 0 |
| Shared DolphinMP | 2 | 100 | 96 | 118 | 14 | Pass | 0 |
| Shared DolphinMP | 2 | 200 | 192 | 236 | 29 | Pass | 0 |
| Shared DolphinMP | 2 | 400 | 384 | 472 | 57 | Pass | 0 |
| Shared DolphinMP | 3 | 50 | 48 | 59 | 4 | Pass | 0 |
| Shared DolphinMP | 3 | 100 | 96 | 118 | 7 | Pass | 0 |
| Shared DolphinMP | 3 | 200 | 192 | 236 | 15 | Pass | 0 |
| Shared DolphinMP | 3 | 400 | 384 | 472 | 30 | Pass | 0 |
| Shared DolphinMP | 4 | 50 | 48 | 59 | 2 | Pass | 0 |
| Shared DolphinMP | 4 | 100 | 96 | 118 | 5 | Pass | 0 |
| Shared DolphinMP | 4 | 200 | 192 | 236 | 10 | Pass | 0 |
| Shared DolphinMP | 4 | 400 | 384 | 472 | 20 | Pass | 0 |
| TFT atomic | 4 | 50 | 48 | 59 | 7 | Pass | 0 |
| TFT atomic | 4 | 100 | 96 | 118 | 15 | Pass | 0 |
| TFT atomic | 4 | 200 | 192 | 236 | 29 | Pass | 0 |
| TFT atomic | 4 | 400 | 384 | 472 | 58 | Pass | 0 |

Jitter here is the mean absolute difference between successive synthetic ACK samples; it is not packet loss. ACK P95 may exceed the nominal injected RTT due to the deliberately specified ± variation. Reconnect pass means *the modeled application-level disconnect/rejoin flow succeeded*, not that all real Wi-Fi dropouts recover perfectly.

## 2. Actual browser render FPS (separate measurement)

`game-performance-metrics.js` remains inactive unless `?benchfps=1` is in the game URL, or the probe is explicitly started. It records *real JavaScript rendering callbacks*, not synthetic timestamps:
- Snake: `paintSnakeSmoothFrame(now)` during active interpolated head animation.
- TFT: immediately after each real Three.js `renderer.render(stageScene,camera)` invocation.

Open one game with the extra URL query:

```text
.../giaitri/games/snake-coop-online.html?benchfps=1
.../giaitri/games/tactics-online/index.html?benchfps=1
```

After playing normally for at least 10 seconds, inspect browser DevTools:

```js
DolphinRenderMetrics.report('snake-head-interpolation')
DolphinRenderMetrics.report('tft-render')
DolphinMP.getNetworkStats()
```

The report includes effective callback FPS, P95 frame interval, median interval, and count of intervals over 50 ms. The rolling sample is capped at 600 frames. These metrics report the *page's JavaScript render callback cadence*, not display/monitor refresh, GPU presentation latency, or network ping.

### Optional four-Chromium TFT emulator experiment

The existing `giaitri/games/tactics-online/online-browser.cjs` now supports `TFT_FPS_BENCH=1`. With a local static server, Playwright Chromium, and a **local** Firestore emulator already running:

```sh
TFT_FPS_BENCH=1 \
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 \
TFT_BASE_URL=http://127.0.0.1:8765 \
node giaitri/games/tactics-online/online-browser.cjs
```

The script samples all four browsers after the match starts, then logs `SPRINT3_BROWSER_FPS_JSON`. It must never be pointed at production Firestore. Headless Linux FPS should not be treated as Android device FPS; capture on actual staff devices as the final acceptance measurement.

## 3. Interpretation / acceptance

**Verified in deterministic tests:** no duplicated application inputs, ordered legacy commands, atomic TFT transactions, reconnect flow, and correct synthetic ACK metric calculations across 16 scenarios.

**Not yet measured in a real environment:** production Firebase RTT, live Android FPS, recovery time under real packet loss, app memory/thermal throttling, or a controlled before/after A/B comparison against pre-Sprint 1 and pre-Sprint 2 deployed versions. Do not claim any specific FPS increase or ping reduction based on these tests alone.

Suggested field acceptance: 2 phones for Snake and 4 phones for TFT, 3 independent runs per game over the same network, each with a 10–20-second active sampling window. Record FPS/P95 frame interval and `DolphinMP.getNetworkStats()` before and after a short Wi-Fi disruption, along with number of successful and failed actions. Keep the baseline and new version on comparable devices and network conditions.

## 4. Compatibility safeguards

This sprint does **not** modify `staff-sync.js`, identity/XP, Firestore rules, room payload schema, authoritative state processing, game logic or ranking. The FPS probe is read-only and opt-in; the benchmark is offline. Existing Sprint 1 and 2 regression suites must remain green.
