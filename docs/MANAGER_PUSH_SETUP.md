# Dolphin Push — Manager APK, iPhone Safari PWA and browser Web

**State:** Implemented on a DRAFT branch. Neither Firebase production nor live iPhone notifications have been enabled or confirmed. `PUSH_ENABLED` defaults to OFF.

## Requirement (2026-10-31)
**ALL enrolled employee devices receive the SAME push events from ALL outlets**, regardless of whether their Staff ID is linked/verified/unverified. Staff ID remains unchanged for future products and is never consulted by push authentication or routing.

The system cannot guarantee 100% delivery at the OS/network layer. iOS 16.4+ requires a Home Screen-installed PWA and explicit permission; Focus, offline state, device restart/WebKit bugs and other OS policies can delay/miss notifications.

## How employees set up iPhone PWA
1. Open **https://dolphinfb.store** with **Safari**, then Share → **Add to Home Screen**.
2. Launch Dolphin via the **new Home Screen app icon**, NOT the Safari browser tab.
3. Manager supplies a **one-time Push device activation code** (32 hex characters, valid for 24 hours). This code is **NOT a Staff ID**, and does not create/link any employee identity.
4. Enter the code into the Dolphin **Push** panel. Tap **Xác nhận mã Push**. Each code activates ONE device account.
5. Tap **Bật thông báo** in Dolphin, then choose **Allow** on the iOS permission dialog. The permission request occurs directly from the tap, before any await/network call.
6. Check iPhone Settings → Notifications → Dolphin and Focus/Do Not Disturb to make sure lock-screen alerts are not suppressed.
7. Test a controlled pending order and customer call with iPhone locked, PWA in the background.

## How Manager issues codes
1. Manager APK/Web logs in as a Firebase Auth identity explicitly allowlisted in trusted Cloud Functions environment **PUSH_MANAGER_UIDS** (fallback: STAFF_ADMIN_UIDS).
2. Open Dolphin Push panel → **Manager: Cấp mã Push cho nhân viên**.
3. Choose **1–20 codes** per request; each code is random, one-time, expires in 24 hours. Copy and send one distinct code to each employee device. **No Staff ID required.**
4. The server stores only a hash of each code; full code is returned once on issuance. Firebase authenticated device claims the code in a Firestore transaction. Device access can be revoked server-side with `pushRevokeDeviceAccess({uid})`.
5. Public guest pages cannot enroll without the secret one-time code. No role/outlet trust is placed in browser User-Agent, client-side PIN, or local storage.

## Push backend
- `functions/push.js` Cloud Functions in `asia-southeast1`:
  - `pushGetMyAccess`: return the caller's own enrollment state.
  - `pushIssueDeviceCodes`: allowlisted Manager creates one-time random activation codes, no Staff ID.
  - `pushClaimDeviceCode`: any Firebase-authenticated device can claim a valid unused code; transactions prevent two users claiming one code. Replayed consumed codes cannot restore revoked access.
  - `pushRegisterDevice` / `pushUnregisterDevice`: register or unregister an FCM token only after Manager approval or one-time code enrollment.
  - `pushRevokeDeviceAccess`: a Manager can revoke a UID and disable all its FCM tokens.
  - Triggers for new pending Bungalow, Lounge, Restaurant orders and customer service calls, plus Show's nested `show_tables/{id}.service` pending orders.
  - Broadcast to **every active enrolled device**, no outlet/Staff ID filters. Paginate Firestore in groups of 400 and send FCM in groups of at most 400; invalid tokens are cleaned.
  - Keep notification previews generic (outlet, table number, event type), not customer details.
- `dolphin-push.js`: independent Firebase Auth app `dolphin-push` — it does not share or require Staff ID auth — installation guidance, code entry, iOS permission, token enrollment and opt-out, Manager code generation.
- `service-worker.js`: existing cache/version/updater preserved; handles data-only FCM push and click routing; always shows user-visible notification, including foreground, to satisfy Apple Push requirements.
- `android/manager` and GitHub Actions build workflow: native FCM for Manager APK only.
- `staff-id.js` is identical to `main`, intentionally not modified.

## Required one-time Firebase configuration / secure rollout
1. **Connect/authorize Firebase:** project `dolphin-f6d67`. The ChatGPT Firebase app must be connected by the account owner; an assistant cannot accept OAuth permissions on the user's behalf.
2. Register Android app `com.dolphin.cruise.manager` and store base64 of its `google-services.json` in repository secret `FIREBASE_MANAGER_GOOGLE_SERVICES_JSON_B64`. Never commit it.
3. Fill **public** `messagingSenderId`, `appId`, `vapidKey` in `push-config.js`. No private server/VAPID secret on the web.
4. Configure allowlisted **PUSH_MANAGER_UIDS** for at least one Manager identity; note Push uses its own Firebase Auth app and UID may differ from legacy Staff ID.
5. **Review effective security rules before any Cloud Functions or web deployment:** client SDKs MUST NOT read/write Firestore `dolphin_push_devices`, `dolphin_push_enrollments`, `dolphin_push_invites` or `dolphin_push_dispatches`. They contain private tokens, enrollment status and invite metadata. Broad/wildcard `allow` grants override narrow denials (rules are OR-ed). Only Admin SDK and authenticated callable functions may access them. Existing order/Staff ID rules must remain unchanged.
6. Deploy Firebase Functions from repository root with an authorized Firebase principal: `firebase deploy --only functions --project dolphin-f6d67`.
7. Deploy web files to `https://dolphinfb.store`, rebuild **Manager** APK with the Android secret. Staff APK's native implementation is unchanged.
8. After devices/enrollment and security tests, set Cloud Functions environment `PUSH_ENABLED=true` to enable sending. Default is false to avoid production surprises.
9. Test: iPhone locked / background / force-closed / rebooted, iOS Focus, Chrome desktop and Android Manager, same event sent to linked AND unlinked Staff ID, multiple devices, invalid/revoked codes, token rotation and duplicate prevention. Do not send real guest orders as ad-hoc tests.

## Known limitations and reliability
- Apple Web Push works for iOS 16.4+ **Home Screen PWA**, not a normal Safari tab; OS may throttle or suppress alerts.
- Every enrolled device follows the same broadcast logic, but no software can guarantee 100% delivery for an offline device, denied permission or iOS system bug.
- Backend dispatch ledger is at-most-once per event: a transient FCM send failure after ledger reservation currently has no automatic resend; production reliability enhancements/monitoring are a recommended follow-up.
- Notification tap opens the correct outlet, not yet proven to focus an individual order row.
- No 30-day silent device cutoff: active subscriptions remain eligible until revoked or invalidated by FCM.
- Staff ID remains intact; no Staff ID linking/verification is needed.
- Firebase billing and Firestore operations increase with each push; monitor FCM sends, Function invocation counts and Firestore reads/writes in Blaze.

## Tests
```bash
node --check dolphin-push.js
node --check service-worker.js
node --check functions/push.js
node --test scripts/push-worker.test.cjs
npm install --prefix functions --ignore-scripts
npm --prefix functions test
```
CI lives at `.github/workflows/manager-push-checks.yml`. Physical iPhone test and live FCM send are **not** complete.
