# Push collection security migration

This is a scoped migration of the live Firestore policy, not a complete
hardening of the existing application. Before this change, a recursive
`allow read, write: if true` granted client access to every document.

`firestore.rules` preserves the existing policy for non-Push root collections
and denies all client access to every root collection prefixed `dolphin_push_`,
including its descendants. The trusted Admin SDK bypasses Firestore client
rules. Manager clients must use the authenticated Push callables; they receive
no direct token, invite, enrollment or dispatch access through these rules.

The prefix also reserves future internal Push collections. Do not add an
overlapping recursive allow that would reopen access. This migration intentionally
does not change guest ordering, outlet fulfillment, shared tools, games, or
Staff ID. The existing non-Push public access remains a security concern and
requires a separate authorization/schema migration with application changes.

Push schemas and validation are enforced in `functions/push.js`: Manager UIDs
come from trusted server environment variables. At the user's explicit request,
subscription is public opt-in after OS notification consent: authenticated anonymous
sessions register without a device code. Transactions preserve server revocations;
the submitted platform or role never grants Manager privileges. Staff ID verification
is not required. The deprecated code callables remain available to cached clients.

## Verification

The operator integration test calls the Firebase Rules test API with synthetic
request/resource data. It does not write production documents or publish rules.
The rules do not invoke `get`/`exists`, so tests do not need real documents.

```powershell
node scripts/push-rules-test.cjs
```

Requires a logged-in Firebase CLI installation. Set `FIREBASE_TOOLS_ROOT` to its
package directory if it is not installed in the default global location.
Optional `RULES_TEST_REPORT` selects a JSON report path.

The 555 scenarios cover guest, unlinked staff and Manager-like client identities;
get/list/create/update/delete; private nested paths; a future Push collection;
and 28 legacy root collection names. Adversarial private writes include a forged
Manager role, another user's UID, activation flags, a large token, and status
mutation. All private writes are denied regardless of their schema or identity.

Run the existing backend and client regression suites as well:

```powershell
npm --prefix functions test
node --test scripts/push-client.test.cjs scripts/push-worker.test.cjs scripts/order-alerts.test.cjs scripts/soundscape.test.cjs scripts/domain-navigation.test.cjs
```

Deploy only Firestore rules first; retrieve the effective source and rerun the
simulations against that source. Keep a copy of the previous release for recovery.
Do not restore the old globally open rule while any internal Push data exists.
`PUSH_ENABLED` controls sending/retries, independently of enrollment.
`PUSH_MANAGER_UIDS` is local deployment configuration, not committed source.

Deploy only the explicitly selected Push exports. Do not blanket-deploy all
Functions, which would update unrelated Staff ID/Tactics handlers. After deployment,
verify server environment and callable rejection of unauthenticated requests.
Code/simulator checks do not replace locked-iPhone and real Manager APK tests.
