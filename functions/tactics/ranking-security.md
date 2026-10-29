# Package E — TFT verified ranking deployment requirements

The browser-hosted Firestore multiplayer adapter is **not** a trusted match authority. It must never publish competitive points. Verified score submission is only for matches created, advanced and finalized by Firebase callable functions using the authoritative RTDB `rooms/{roomId}` state.

## Required Firebase Realtime Database Security Rules

Before activating verified rankings, merge these restrictions into your existing RTDB rules (do **not** replace unrelated app rules):

- `/rooms`: prohibit direct client writes. Only Admin SDK / callable functions may create, mutate or finalize rooms.
- `/staffIdentity`: prohibit all client writes; create mapping `{uid: {verified:true,employeeId:"...",name:"..."}}` using trusted administration; never trust `localStorage` as authentication.
- `/tacticsRankVerified`: prohibit all client reads **and** writes; use `tacticsLeaderboard` to read sanitized data.
- `/tacticsRate`: prohibit direct client writes; Admin SDK exclusively.

Example restrictions to merge beneath your rules tree:

```json
{
  "rooms": { ".write": false },
  "staffIdentity": { ".read": false, ".write": false },
  "tacticsRankVerified": { ".read": false, ".write": false },
  "tacticsRate": { ".read": false, ".write": false }
}
```

Firebase rules on a parent may grant access, so verify effective inherited permissions in the emulator. These snippets must be merged into the **existing** rules with correct nesting; they are not a complete RTDB rules file.

## Backend workflow

1. Administrator provisions authenticated employee UID mapping.
2. Client joins a room through `tacticsCreateRoom`, `tacticsJoinRoom`, `tacticsStartRoom`, `tacticsAction` and server `tacticsAdvanceRoom`.
3. Engine writes authoritative `finalPlacements` on elimination, deterministically.
4. After `status=finished`, authenticated user invokes `tacticsSubmitVerifiedResult({roomId})`.
5. Backend reads final room and employee UID mapping; calculates placement and score, never accepting them from client.
6. RTDB transaction writes aggregate and **permanent per-match receipt** under the player's UID. Repeat submissions are ignored.
7. `tacticsLeaderboard` returns sanitized ranking.

**Deployment gate:** Existing TFT browser game still uses the separate Firestore Host transport. Until this transport is migrated to the callable workflow, competitive rating is intentionally disabled for browser-hosted matches. Deploy Functions and secure RTDB Rules together; CI source tests cannot prove deployed rules or employee directory correctness.

Do not use a client-provided nickname or anonymous UID as a verified employee identity. An anonymous Auth UID is eligible only after it is explicitly bound to a verified employee by an administrator. Require the staff directory to prevent duplicate bindings of one employeeId to multiple UIDs before prize competitions.
