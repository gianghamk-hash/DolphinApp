# Manager APK profile rollout

## Authentication and scope

Manager APK uses the existing `staff-identity-app` Firebase Auth session, not the
separate native push UID. `staffGetManagerIdentity` checks the callable token UID,
the protected `staffIdentity/<uid>` mapping (`DOL-0001`, `verified: true`), and an
active, non-self-registered master profile. No UID, password, enrollment code or
automatic DOL-0001 assignment is embedded in the APK. UA/app-type detection only
selects presentation and the stricter identity endpoint; it grants no authority.

Existing verified installations reuse their persisted Auth session. A fresh
installation must claim a single-use DOL-0001 code issued by an already linked
device or a trusted staff administrator. Wrong-ID codes are rejected without
consuming them. Existing binding changes retain explicit confirmation and the
expected-current-ID check. Missing backend, revoked mapping and network failures
close Manager access. Never repair an unlinked installation by fabricating a
client profile or by granting privileges based on APK name.

Only Manager APK gets the grouped profile actions, approved directory, hidden
daily-missions card, owner glow and editable name. All approval, rejection,
recovery, ranking visibility, rewards, cosmetics, device linking, XP refresh and
XP sandbox controls remain connected to their existing handlers. Staff APK, web
and PWA retain their existing presentation, registration and immutable-name API.
The new rename endpoint authorizes the verified DOL-0001 identity; the endpoint
does not attest the calling package. A UA is never package attestation. No new
permission is granted to another Staff ID or to an unverified DOL-0001 mapping.

## Name synchronization

`staffRenameManager` validates 7–64-character unique names, with no lifetime
rename quota. The existing short rate limit still applies. Name and optional
avatar are saved together; avatar unlock checks remain enforced. Registry
transactions serialize uniqueness against registration. Staff ID, XP, level,
receipts, revenue and business history are preserved. Historical names remain
aliases without the ordinary ten-alias display cap for DOL-0001, keeping legacy
ownership checks and avatar resolution working after repeated renames.

Linked UID display projections, verified TFT ranking labels and the existing
legend label are synchronized; profile versions prevent older rename projections
overwriting newer ones. Public prestige is rebuilt before success. If a
projection fails, the callable reports failure; retrying the same name repairs
projections without a second rename/version increment. This is retryable
multi-step synchronization, not a cross-module atomic transaction. Ranking reads
hydrate current labels from the registry. Historical order/game snapshots are
not rewritten or reassigned by matching a display name. Active game room names
remain their join-time snapshots; future rooms/actions use the current identity.

## Production boundary

Merging is not proof of deployment. On main, Staff Access production deploys:

- `staffGetManagerIdentity`, `staffRenameManager`, `staffListApprovedProfiles`;
- updated `staffClaimLinkCode`, `tacticsLeaderboard`, `staffGetPrestige`;
- the previously configured Staff Access functions, with their existing policies.

That workflow does not deploy Firebase Auth providers, RTDB/Firestore rules or
provision/relink a production UID. No data migration is run by merging.
The existing APK workflow builds both variants after Auto Bump Version; the
Staff build is retained to verify compatibility. New UI reaches installed
Manager APKs only after installing a newly built APK. Existing website hosting
and PWA delivery remain controlled by their hosting pipelines.

Check production deployment/build runs for the merged revision. On a real
Manager device, verify existing-session startup, fresh DOL-0001 linking, denied
wrong-ID linking, rename from one linked device and refresh on another, directory,
approval/rejection/recovery, XP sandbox and reduced-motion behavior. Verify Staff,
web and PWA still show daily missions and keep ordinary name editing locked.
Local/browser tests mock Firebase and do not prove production credentials, device
installation, live Firebase data propagation or package attestation.

## Regression checks

Run `node --test functions/*.test.cjs functions/staff-id.test.js staff-sync.test.js dolphin-avatars.test.cjs scripts/*.test.cjs`.
With Playwright Chromium installed, run `node scripts/manager-apk-browser.cjs`,
`node scripts/staff-access-browser.cjs`, and `node scripts/staff-approval-browser.cjs`.
