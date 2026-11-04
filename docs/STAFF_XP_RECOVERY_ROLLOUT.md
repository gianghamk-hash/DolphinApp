# Staff XP recovery and account lifecycle

## Changes

- Business mutations commit an XP obligation to `staff_xp_outbox` in the same Firestore transaction. This collection denies every client read/write, including nested paths. Only Admin SDK writes it.
- A retrying Firestore creation handler, immediate callable delivery and a 15-minute scheduled sweep deliver pending XP even after the operational order is archived/deleted. Only verified business actions create obligations; client-written legacy orders do not create proof.
- New RTDB ledger records are pending until acknowledged. A permanent `appliedXPEvents` receipt is committed atomically with each employee's XP, so a crash before or after the ledger acknowledgement neither loses nor duplicates the award. Old receipts without a state retain their previous semantics; this cannot infer whether an old interrupted deployment credited their profile.
- Internal business daily missions retain permanent per-day receipts. Delayed delivery uses the original action day and does not overwrite today's missions. No revenue or work rate has been changed.
- The archive audit remains available with secure automatic XP enabled. It reads current operational records and all retained archive pages, resolves unique historical aliases or stable IDs, collapses repeated table/day or order copies, subtracts canonical live and old archive receipts, and shares canonical live receipt IDs when approving missing XP. It stops if insecure legacy Firestore XP triggers are enabled. Work rates use action timestamps around the verified 2026-11-03 rollout (01:04:41–01:08:19 UTC, secure XP run 41557307380). Records in that deployment interval or undated records from that day require manual review. Earlier work retains its original rate; later work uses the current rate. Unknown/ambiguous people and work records without source order IDs need manual investigation; missing order IDs cannot be approved by this tool.
- The verified DOL-0001 Manager directory supports removal and recovery. Removal creates an inactive tombstone, preserving ID, revenue evidence, XP and ledger. Every protected identity/action endpoint checks active status, so linked devices and outstanding link codes cannot use the removed account. Staff IDs are never recycled. Recovery issues a single-use, hashed, 10-minute link code for the same approved active employee; it does not reset their XP or create a second ID.
- Profile level increases show congratulations, every newly crossed cosmetic/avatar reward, and a button opening interface settings. Another open dialog delays the notice. Per-ID local acknowledgement prevents repeated notices after refresh; a new device can show the attained levels again. This is an in-app notification, not an operating-system background push. Manager-only account controls remain hidden from Staff APK/web/PWA; backend permission comes from the verified DOL-0001 mapping, never the user agent.

## Deployment and data reconciliation

Merge alone is not proof of deployment or historical compensation. Check successful production Staff Access, secure XP, style-unlock and APK build runs for this revision. Both automatic workflows that deploy `staffRecordLiveAction` deploy Firestore deny rules first. Secure XP also deploys the two queue consumers and ledger grant callable. Other profile endpoints use their existing deployment workflows. Keep legacy XP triggers disabled.

On Manager APK, open the XP archive audit, review names/dates/outlet/amounts against accounting and approve batches of at most 50. Each refresh re-evaluates all retained history rather than permanently hiding later pages behind already-approved rows. The per-employee table separates total profile XP, work points, expected/credited/missing work XP and missing revenue XP; choose this week or all retained data. Do not subtract total profile XP from work XP because it also contains daily missions and other sources. Complete the audit until all eligible pending rows are cleared, investigate missing/ambiguous IDs, and retain the repair audit. The proposal is based on legacy client-writable archive records and therefore remains manager-reviewed, not automatic financial truth. Data already deleted by archive retention cannot be reconstructed from the Git repository.

Production Firebase records, actual per-employee missing-XP totals and APK installation have not been accessed by local tests. No production data correction is performed by this source change. Existing legacy trigger ledger hashes without a recoverable source timestamp also require manual evidence before approving overlapping archives. Do not claim all staff have been compensated until the live audit and any unresolved cases have completed.

## Verification

Run:

```sh
node --test functions/*.test.cjs functions/staff-id.test.js staff-sync.test.js dolphin-avatars.test.cjs scripts/*.test.cjs ranking/work-points.test.js
node scripts/manager-apk-browser.cjs
```

Unit coverage includes a saved completed order followed by an XP failure, retry after deletion/archiving, lost ledger acknowledgement, duplicate current/archive copies, mixed-era 12-point/230-total-XP reconciliation, actual deployment cutover timestamps, partially credited work, old archive receipts, authorization/manager self-protection, hashed recovery codes, original-day delayed missions and level-notification navigation. The authenticated rules simulator includes the new queue and checks guest, staff and simulated-manager denial. Browser checks need Playwright Chromium installed; unit/VM tests do not prove real APK layout, live Firebase rules, production credentials or package attestation.
