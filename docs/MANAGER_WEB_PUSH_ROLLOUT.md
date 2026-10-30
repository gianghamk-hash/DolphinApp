# Manager APK + PWA + Web push notification rollout

Status: implementation plan / audit baseline. **No production push is enabled by this document.**

## Current findings (2026-10-31)
- `dolphin-alerts.js` provides foreground realtime notification and optional `showNotification`, but does not register a push subscription.
- `index.html` listens to Firestore while the page is active; this is not a background push delivery mechanism.
- `service-worker.js` has a `notificationclick` handler but no `push` handler.
- `.github/workflows/build.yml` generates a WebView-based Manager APK without Android native FirebaseMessagingService or Android 13+ notification permission.
- `functions/index.js` currently has no order-triggered FCM sender.

## Implementation sequence
1. **Security & identity:** add authenticated per-device push token registration, platform/outlet/role mapping, server-side manager authorization, revocation and token cleanup. Never trust client-supplied role labels.
2. **Backend:** Firestore create triggers for new orders and service requests; normalize payload; route to authorized Manager tokens; use stable event IDs for idempotency; avoid resending on status updates. Protect private order data in notification previews.
3. **PWA / Web:** register Firebase Messaging Web Push with a VAPID public key supplied through deployment configuration; integrate push into existing service worker without replacing existing cache/update logic; permission only from user gesture; handle notificationclick deep links and deduplicate foreground alerts.
4. **Manager APK:** update generated Android project to include Google Services/Firebase Messaging dependency, FirebaseMessagingService, POST_NOTIFICATIONS runtime request (Android 13+), notification channel, pending intent deep link, and WebView navigation bridge. Android WebView web-push alone is insufficient.
5. **QA:** test Android 13/14+, Manager foreground/background/screen locked/app swiped away; PWA installed/uninstalled; Chrome desktop/mobile; permission denied; token refresh; multiple devices; offline/reconnect; duplicate events; logout/reassignment; manager-only authorization; notification tap route; Firebase cost/read impact.
6. **Release:** merge only after CI and physical-device tests; deploy Functions and web assets, then build/reinstall Manager APK. Stage rollout before enabling for all devices.

## Scope
Priority: Manager APK, installed PWA, browser Web. Staff APK excluded from first release. Preserve existing order listeners and user-facing notifications until push path is verified.
