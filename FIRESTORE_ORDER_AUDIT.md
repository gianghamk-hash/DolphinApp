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
