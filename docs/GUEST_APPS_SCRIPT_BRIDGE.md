# Dolphin Guest → Dolphin F&B

Status: staged integration, NOT activated. Do not merge/deploy the frontend before the Apps Script Web App and BOTH callables are ready. The existing direct Sheets callable is replaced by a shared Apps Script lock, including requests from old app versions.

## Installation

1. Back up the current Apps Script project. Replace the original supplied source with `apps-script/DolphinFB.gs`; add `apps-script/DolphinBridge.gs`. Do not retain duplicate definitions of the same functions. Keep the existing bound destination spreadsheet. Source workbook remains the November 2026 source in the supplied script; change it explicitly when moving to another month.
2. Generate a random secret of at least 32 characters (e.g. `openssl rand -hex 32`). Store the identical value as Apps Script project Script Property `DOLPHIN_BRIDGE_SECRET` and Firebase Secret Manager `DOLPHIN_BRIDGE_SECRET` using `npx -y firebase-tools@latest functions:secrets:set DOLPHIN_BRIDGE_SECRET --project dolphin-f6d67`. Do not commit the value or send it in chat.
3. Deploy Apps Script as a Web App, executing as the owner who can read the source and edit the destination. Server-to-server POST requires access without interactive Google login; the endpoint rejects unsigned/expired requests using the shared HMAC secret. Organizational policy may disallow this configuration; do not bypass policy. Copy the `/exec` deployment URL.
4. Put `DOLPHIN_BRIDGE_URL=https://script.google.com/macros/s/DEPLOYMENT_ID/exec` in `functions/.env.dolphin-f6d67` (preserve existing entries). Do not store the secret there.
5. From the staged branch install functions dependencies and deploy BOTH endpoints:

   ```bash
   npm install --prefix functions
   npx -y firebase-tools@latest deploy --only functions:guestSheetBridge,functions:guestAssignTable --project dolphin-f6d67
   ```

6. Test with an authorized test copy/deployment before production sync. Verify authentication failure, old/new assignment calls, lock rejection, retained tables, reordered/merged booking codes and split-group rejection. An all-sheet sync writes all eligible visible source tabs. Partial progress is possible if a later tab fails; error does not mean rollback. Missing/canceled source bookings follow the original script behavior. Review source workbook identity and preservation before the first production sync.
7. Publish frontend only after endpoints and signed Web App requests succeed. Manual Reload calls sync; background refresh remains read-only. Browser does not receive the secret or endpoint credentials.

## Limits

Script locks coordinate this project's menu, trigger, bridge sync and assignment operations. Direct human edits, other Apps Script projects or other APIs do not honor ScriptLock. Avoid direct table edits during sync. The Apps Script execution limit may interrupt a large workbook; return/report failure, never claim completion. A timeout after a request was sent has an uncertain outcome; check Apps Script Executions and Sheet before trying again.

The UI disables its local table inputs during manual sync. Independent clients are protected by the shared script lock only after both callables have been deployed. Do not activate remote sync while a legacy direct-write callable is still deployed.

## Canonical table notation

Store and display consecutive tables in the same area as an inclusive range: `A11-A16` means A11, A12, A13, A14, **A15**, A16. Never skip an interior table. Single tables remain `E22`; gaps remain explicit (`A11-A14,A16`); different areas never combine (`A1-A2,B1-B2`). Input normalization rejects ambiguous/cross-area ranges, duplicates, descending ranges and more than 60 tables.

The app sends an expanded list for compatibility with previously deployed bridges, but displays compact notation. `DolphinBridge.gs` validates and expands for conflict detection, then writes and verifies the **compact** value in column G. The same helper compacts valid existing assignments preserved during sync. Unknown historical free-text cells are preserved rather than silently rewritten. Table-sign generation continues to expand ranges into individual physical tables.

### Activate compact Sheet writes

After merging this change, replace **DolphinBridge.gs** in the existing AUTO Apps Script project with the repository version. Keep VIP.gs and Script Properties, including the shared secret. Save, then Deploy → Manage deployments → edit the existing Web App → Version: New version → Deploy. Keep the existing `/exec` URL. No Firebase redeployment or key rotation is needed. Until the Web App is updated, the old deployed bridge still stores comma-separated tables.

Existing Sheet cells are not mass-migrated by a repository merge. On a subsequent successful normal sync, valid preserved table lists are compacted; future assignments save compactly after deployment.
