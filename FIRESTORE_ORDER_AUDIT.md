# Firestore Order Audit — DolphinApp

## Changes
- Bungalow, Lounge, Restaurant: realtime order queries only for last 14 days, maximum 180 documents each; staff calls filtered to pending, up to 80. Table listeners stay realtime.
- Dashboard: same caps across outlets. Caro, notes and reminders capped at 80 documents.
- Order listeners avoid duplicate installation and are detached on pagehide; Show table stream also releases on pagehide.
- Archived order lookup is restricted to the past 30 days in all service screens and Dashboard.
- New archived sessions in bun_history, res_history, lounge_history_sessions and show_history are marked with Firestore Timestamp expireAt 90 days after archiving.

## Enable retention deletion
Code changes do NOT enable physical deletion. An administrator must activate Firestore TTL policies on field expireAt for each of the four archival collections in Firebase Console > Firestore > TTL. Export accounting history first. Existing archive docs lack expireAt and are not affected without a migration. Do not enable TTL for live order collections.

## Risks
Orders more than 14 days old, or older than 180 newer orders, are outside live listener queries. Do not rely on these limits to erase or settle unfinished orders; use a controlled shift-close/archive workflow. TTL applies ONLY to archived records. Test whether 180 documents suffice at peak.

## Load test plan
Compare Firebase Usage billed reads with 1, 5 and 10 concurrent staff devices; check initial subscriptions, one status update, navigation and page closure, and repeated reconnects. Listener count alone does not equal billed reads. Verify user-facing updates on physical APK before relying on the change. Estimated first snapshot capacity is capped per order listener but actual billed reads depend on the Firestore workload.

## Baseline
Observed ~55k Firestore reads versus 50k free daily limit, ~2.9k writes, 274 peak listeners and 116 peak connections. Server quota cannot be reset from this repo. No security-rule or billing changes were made.

## Service notification repair (2026-10-30)
- Corrected missing parentheses that prevented the entire landing-page order/call module from parsing.
- Announcement, order/call alerts, badges and reminders share one named Firebase app and one anonymous sign-in. This reduces independent transports and avoids duplicate authentication.
- Server snapshots establish the event baseline; cache snapshots and local pending writes cannot consume a new request. Metadata acknowledgments are included. Per-document status/timestamp tokens survive stream re-subscription.
- Lounge add-on purchases return the merged order to pending and update its timestamp, triggering one new alert. Dashboard now shows visible alerts; standalone outlet pages show call toasts. Same-origin child gestures unlock parent audio; embedded pages defer the matching new-event sound to the parent watcher.
- Failed customer submissions retain the cart and show an error. Missing database instances cannot produce a success toast. Listener errors are visible.
- Service worker scope, notification icons and sound paths resolve relative to the deployed files, supporting both the custom domain and a GitHub Pages subdirectory.
- `node scripts/check-service-pages.cjs` checks all inline service-page scripts. `node --test scripts/order-alerts.test.cjs scripts/soundscape.test.cjs` covers detector reconnect/cache behavior, shared authentication, and music recovery. Optional `scripts/order-alerts-browser.cjs` uses only a local Firestore emulator and browser fixtures; it never writes production orders.

Browser notifications require permission and a running page. This change does not install FCM/server push, or guarantee notifications after Android terminates the WebView/application. Physical speaker/vibration and APK background execution still need on-device acceptance testing.
