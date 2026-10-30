# Manager APK / PWA / Web: Firebase push deployment

## Implemented in branch
- Cloud Functions registration: pushRegisterDevice and pushUnregisterDevice; Firebase authorization is enforced server-side (not by Android User-Agent).
- Firestore triggers for pending orders and service calls from Bungalow, Lounge and Restaurant.
- Web Push data-only messages via the EXISTING service-worker.js; browser permission button and opt-in state.
- Android Manager: native FirebaseMessagingService, notification channel, permission prompt and WebView token bridge.
- Tests and a GitHub Actions CI workflow. Staff APK is unchanged.
- PUSH_ENABLED is disabled by default; no production push is sent until explicitly activated.

## REQUIRED one-time external Firebase setup
1. In Firebase Console for project **dolphin-f6d67**, create/register the Android application package **com.dolphin.cruise.manager**. Download its google-services.json.
2. Encode the JSON file with base64 without line breaks. Store it as repository GitHub Actions secret **FIREBASE_MANAGER_GOOGLE_SERVICES_JSON_B64**. Do not commit the JSON.
3. In Firebase Console > Project settings > Your apps > Web app, copy the **messagingSenderId** and **appId** values. Under Cloud Messaging > Web Push certificates obtain a **public VAPID** key. Fill all three in **push-config.js**. These are public client configuration, not private server credentials.
4. In Cloud Functions environment configure **PUSH_MANAGER_UIDS**: comma-separated Firebase Auth UID allowlist for each approved Manager installation. If unset, the code falls back to STAFF_ADMIN_UIDS, so verify carefully. The in-app push registration status will show its UID if the server refuses authorization. Since this app uses anonymous Auth, each browser/WebView profile can have a different UID.
5. **MANDATORY security prerequisite:** Ensure Firestore collections dolphin_push_devices (FCM tokens) and dolphin_push_dispatches (metadata) are NOT readable or writable by regular Firebase Auth clients. Review the effective production rules. A broad wildcard allow rule overrides a narrowly-scoped deny because Firestore grants are OR-ed. Do not replace production rules blindly.
6. After verifying authentication and rules, set **PUSH_ENABLED=true** in the Cloud Functions environment. Until enabled, registration is explicitly blocked and triggers skip sending.

## Deployment order
1. Deploy Cloud Functions as an authorized Firebase administrator: firebase deploy --only functions --project dolphin-f6d67 . The new firebase.json points to the existing functions directory. It does not deploy Security Rules.
2. Merge and deploy web source to https://dolphinfb.store. The service worker handles pushed data; the prior cache/update code is preserved.
3. Build APK from .github/workflows/build.yml with GitHub secret configured, download and install DolphinManager-APK. Staff APK is built without a native push service.
4. Open Manager APK, PWA or website on each authorized device. Press **Bật Push**, grant OS/browser permission, then verify the UI says **Push đang bật**.
5. Validate a controlled new pending order/call, notifications after Android lock/background, reopening correct outlet, token refresh, denied permissions, token revocation, and multiple devices.

## Operational notes and limitations
- Android Force Stop, power-off, no Internet or device notification policies can block or delay FCM.
- PWA is a browser-installed Web App, not Android APK. On some iOS versions it must be installed on Home Screen before receiving Web Push.
- Chrome PWA and Manager APK installed on the same phone can both notify because each registers a separate token. Dedupe occurs per token/event.
- Android Manager requires rebuilding and reinstalling the APK; a site refresh alone cannot add native FCM.
- No raw guest order detail is transmitted in the notification body; only outlet and table label.
- Notification click selects the outlet and saves the order document ID for later use; direct selection of an exact order row has not been verified for every outlet.
- The dispatch ledger uses an at-most-once reservation: transient FCM send errors may not automatically retry.
- Maximum of 500 active Manager tokens per event. Increase via paging if needed.
- The server ignores inactive/stale (older than 30 days) devices and cleans invalid tokens.
- Never use anonymous UID or User-Agent as proof of being Manager: allowlisting must be performed in trusted Firebase configuration.

## Verification
- Node syntax checks: dolphin-push.js, push-config.js, service-worker.js, functions/push.js.
- Web worker unit tests: node --test scripts/push-worker.test.cjs
- Server unit tests: npm install --prefix functions && npm --prefix functions test
- CI: .github/workflows/manager-push-checks.yml
- Physical Android and browser acceptance testing is still required before production.
