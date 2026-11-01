# Dolphin Staff Prestige — rollout and verification

## What is implemented in this branch

- Permanent Staff ID-backed XP, using `staffRegistry/{employeeId}.xp` and nondecreasing `levelPeak`.
- XP conversion: 1,000 VND revenue -> 1 XP; 0.1 completed-work point -> 1 XP. Lounge fractional points keep decimal XP (0.25 points -> 2.5 XP).
- Level thresholds: `5000 * (level - 1)^2`, cap 60. Levels and already unlocked rewards persist when ranking weeks change; `levelPeak` does not decrease after a permitted correction.
- Work/revenue sources: archived `lounge_history_sessions`, `bun_history`, `res_history`, and `show_history`. No client table state is treated as a permanent XP award. Show revenue is based on selected `service.combo`, FOC excluded; archive persists after table close.
- Manager preview/approval in staff profile. Only `STAFF_ADMIN_UIDS` can approve; server recomputes the source and amount, records `staffXpLedger/{employeeId}/{eventId}`, and updates the score. Staff ID names must match a UNIQUE manager-verified employee record; ambiguous or self-issued profiles are skipped.
- Public champion card across Dolphin home, Guest, Lounge, Bungalow, Restaurant, Show, Ranking and Staff Profile. Profile contains global level top 10, historical legends, and personal rewards.
- 15 original Dolphin theme *palettes* restored alongside Dark/Light/Gray, with server-protected saved theme selections. Original seasonal animation engine is NOT restored in this phase.
- Avatar collections at Lv. 5/15/40 and animated OnFlame names; level milestones trigger public in-app announcements while the app is open.

## Deployment prerequisites — do not skip

1. Verify actual deployed **Realtime Database Rules** prohibit *all client writes* to `staffRegistry`, `staffIdentity`, `staffXpLedger`, `staffPrestige` and `staffEnrollmentCodes`; allow mutations **only through Admin SDK callables**. The current repository has no RTDB rules manifest; do not overwrite other RTDB paths blindly, especially game data.
2. Verify `STAFF_ADMIN_UIDS` is set for trusted Manager Firebase Auth UIDs in the Cloud Functions deployment.
3. Deploy the new Firebase Functions (`staffGetPrestige`, `staffGetMyProgress`, `staffSetPersonalStyle`, `staffPreviewArchiveXP`, `staffApproveArchiveXP`, etc.) in `asia-southeast1` before enabling the UI in production. GitHub merging does NOT automatically deploy Firebase here.
4. Verify Firestore archival documents and session dates on a staging clone before approving XP. Legacy Firestore rules are broadly writable; **human verification** of historical sales is required. Do not automatically approve untrusted order data.
5. Perform integration testing of Staff ID across APK, browser/PWA and a second device; validate Manager permissions and check a reloaded employee retains XP/Level/avatar/theme.

## Known boundaries

- XP is credited **after a Manager approves archived events**, not automatically from live unsafeguarded order documents. This avoids forged revenue and duplicate grants on table close.
- Cloud Functions backend is not deployed by this PR. Until deployed, the public champion card stays empty and the new profile calls may show a connectivity warning; legacy operations remain separate.
- Past results older than available archives (typically up to 90 days) cannot be backfilled without retained copies.
- The original 15 theme color palettes are retained, but legacy heavy seasonal scene animation code was intentionally not copied wholesale due to performance and collision risks.
- In-app notifications display for an open client; they are not OS-level push notifications.
- Do not merge before automated checks and RTDB rules review are completed.
