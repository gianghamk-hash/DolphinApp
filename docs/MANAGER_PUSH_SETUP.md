# Dolphin Push — Manager APK, iPhone Safari PWA, and browser Web

**Status: Code implemented on a draft PR; NOT deployed or validated on physical iPhone.** `PUSH_ENABLED` defaults to OFF. The existing Firestore order/fulfillment state machine was not altered.

## iPhone staff onboarding (iOS / iPadOS 16.4 or later)
1. Open **https://dolphinfb.store** in **Safari**.
2. Tap **Share (Chia sẻ) → Add to Home Screen (Thêm vào Màn hình chính)**.
3. **Launch Dolphin from the new Home Screen icon**, not the Safari browser tab. The manifest uses `display: standalone` and a stable `id`.
4. Open **Staff ID** and claim the per-device, time-limited code issued by an authorized Manager. A typed staff name or local PIN alone does **not** grant background push access.
5. Manager assigns the verified **DOL-XXXX** employee to one or more outlets in the **Staff ID** panel: Bungalow, Lounge, Restaurant, Show.
6. Back on the iPhone Home Screen PWA, tap **Bật thông báo**, then **Allow/Cho phép** the iOS permission dialog. Verify it reports **Push đang bật** with the correct outlet names.
7. In iPhone **Settings → Notifications → Dolphin**, enable alerts/Lock Screen, and check **Focus** settings.
8. Test a controlled pending order / call while iPhone screen is locked and Dolphin is not foreground.

A normal Safari browser tab on an iPhone **does not** offer equivalent background Web Push. A Home Screen installation and explicit permission are mandatory. Apple does not guarantee instantaneous delivery under Focus, low connectivity, device shutdown or OS restrictions.

## Implemented code
- `functions/push.js`: authenticated FCM registration/unregistration, Manager-only outlet assignment callable, `pushGetMyAccess`, and server-side Firestore triggers.
  - Manager access: server allowlisted UID via `PUSH_MANAGER_UIDS` or `STAFF_ADMIN_UIDS`.
  - Staff access: verified `staffIdentity/{Firebase Auth UID}` and active `staffRegistry/{DOL-id}` with Manager-authorized `pushOutlets`; server checks assignment again at delivery time.
  - Alerts: Bungalow/Lounge/Restaurant **new pending order + pending service call**, and Show **new pending nested `show_tables/{id}.service`**.
  - No guest names/order details in notification payload; label/outlet and action type only.
- `staff-id.js`: Manager outlet assignment controls and shared Firebase Auth identity for Staff PWA.
- `dolphin-push.js`: iOS Home Screen walkthrough, user-gesture permission request, FCM token enrollment, opt-out, token renewal when reopening; Manager APK native bridge.
- `service-worker.js`: retains existing version/cache/update logic, handles data-only push and click. **Always displays every incoming Dolphin push** even when app is foreground, to satisfy Apple's no-silent-push requirement.
- `manifest.json`: stable `id`, `standalone` display.
- `android/manager` and `.github/workflows/build.yml`: Android native FCM for Manager only.
- Automated tests / PR CI: `functions/push.test.js`, `scripts/push-worker.test.cjs`.

## Required Firebase administrator configuration
1. Project: **dolphin-f6d67**. Enable Cloud Messaging and Firestore Cloud Functions in the actual project.
2. Android Manager package **com.dolphin.cruise.manager**: register the Android app and download `google-services.json`. Put its full base64 content in GitHub Actions secret **FIREBASE_MANAGER_GOOGLE_SERVICES_JSON_B64**; NEVER commit the JSON or service account credentials.
3. Web: take `messagingSenderId` and `appId` from the Firebase Web app configuration and the **PUBLIC** VAPID key from Cloud Messaging > Web Push certificates. Fill these in `push-config.js`; no private VAPID key belongs in the frontend.
4. Cloud Functions environment: set **PUSH_MANAGER_UIDS** to comma-separated trusted Firebase Authentication UIDs (or use existing `STAFF_ADMIN_UIDS` if correctly configured). Never infer Manager from User-Agent, localStorage, or a PIN.
5. **Security rules must be verified before activation**:
   - Firebase client SDKs cannot read/write `dolphin_push_devices` (contains FCM tokens) and `dolphin_push_dispatches` (internal event ledger).
   - Firebase RTDB `staffRegistry`, `staffIdentity` must not allow untrusted client writes that could grant or modify verified/active status or `pushOutlets`.
   - Firestore/RTDB wildcard allow rules override narrower denies; inspect actual deployed effective rules.
6. Only after permissions and secrets are validated, set **PUSH_ENABLED=true** for Cloud Functions. This is OFF by default and deliberately prevents accidental production notifications.

## Deployment and verification sequence
1. Deploy Cloud Functions using authorized project access: `firebase deploy --only functions --project dolphin-f6d67`. Added `firebase.json` does not deploy Firestore rules.
2. Merge and deploy web source to **https://dolphinfb.store** after PR CI; ensure `push-config.js`, `dolphin-push.js`, `staff-id.js`, `service-worker.js` are served from the same secure origin.
3. Run the controlled Manager Android build with the Android Firebase GitHub secret, install the new APK.
4. Test one Manager APK, one iPhone PWA and one desktop Web instance; confirm who receives notifications per outlet, lock screen, accepted/denied permission, app not in foreground, multiple devices, reconnect, and handling of outdated/revoked Staff ID.
5. Do not expose test tokens or real guest order information. Use isolated test orders or a Firebase emulator if possible.

## Known restrictions and follow-up
- The existing event ledger uses at-most-once dispatch reservation; a transient FCM failure may require manual retry after investigation.
- Pending document updates with a changed timestamp can intentionally create a new alert (e.g. an add-on or a re-opened pending order). Test for unwanted repeat alerts under real workflows.
- Notification deep links open the correct **outlet** and preserve `pushId` for later matching; opening a particular order row remains unverified.
- Current fanout is limited to the first **500** active device documents; scaling or peak-volume budget/load tests are needed before widespread rollout.
- iPhone Safari's normal tab cannot be made equivalent to Home Screen PWA push; this is an iOS platform restriction.
- No live iPhone lock-screen test, real FCM sending, Cloud Functions deployment, merge, or production code change was performed in this development session.

## Commands
- `node --check staff-id.js`
- `node --check dolphin-push.js`
- `node --check service-worker.js`
- `node --check functions/push.js`
- `node --test scripts/push-worker.test.cjs`
- `npm install --prefix functions && npm --prefix functions test`
