# Guest table write-back

Adds unassigned BKK forms to Dolphin Guest. The callable verifies the active, approved Staff ID, locates one exact BKK + STT in the selected tab, checks the old value and occupied table ranges, writes only column G using RAW, then reads it back. Source spreadsheet is fixed on the server. No client credentials are embedded.

## Activation required

Deploy `guestAssignTable` to project `dolphin-f6d67` after installing functions dependencies. Enable Google Sheets API in that project and grant the actual deployed function runtime service-account email Editor access to spreadsheet `1aZ34XVKqWwxMlOPSu6X0vApLT5DFxjDpza9fDRaXM2Q`. Obtain this email from the deployed function configuration; do not guess or expose a private key. Hosting alone does not deploy this callable.

Before production activation, test with an authorized test booking in a separate test spreadsheet using a test deployment. Confirm authenticated/unauthenticated access, exact row and column, stale assignments, occupied ranges, read-back and app refresh.

Application requests are serialized by maxInstances=1/concurrency=1. Google Sheets has no atomic compare-and-swap API: direct manual Sheet edits can race the read/write interval. This is not a guarantee of atomic coordination with external editors. A shared protected-column editing policy is needed for that guarantee.

Status: code and mock tests only; runtime account access, deployment and real Sheet write-back are not verified.
