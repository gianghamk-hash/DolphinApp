# Guest service extraction and concise summaries

Only column H (`Thông tin kiêng chay`, `dietNoteRaw`) is submitted to Gemini. Column I (kayak/sampan) is excluded. Approved Staff ID is required. The original H note remains unchanged and available in the expandable disclosure; nothing is written to Sheets by AI.

## Current scope

Summaries include only confirmed/requested meals or set menus: Chay Việt, Chay Âu, Indian Food, Veg, Non-veg, Jain and Halal; ordered lobster; bungalow; Lounge/Premium Lounge tickets. Explicit “ăn chay” counts even without the word “set”. Nationality, ingredient avoidance and allergies do not imply a meal category. The `setMenu` boolean is a compatibility field meaning an explicit meal requirement/order in these seven types.

Window seats, Korean/Chinese guides, guide meals, allergies, gifts and other unrelated notes are omitted from the short summary, but kept in the original disclosure. Do not assign guest meals based only on guide meals. No relevant service means an empty summary and the link “Xem ghi chú gốc”. Pending/failed/older AI responses use that same link, never a long original-text preview.

Gemini extracts structured category/evidence/state/quantity/room data. Server validation requires an exact source excerpt, allowed category, supported numbers and room. Confirmed items populate the F&B/bungalow/Lounge sections; excluded items never do. Uncertain alternatives remain marked “chưa chốt” and are not assigned as confirmed bookings. Conflicting confirmed/excluded statements are downgraded for review. These guards cannot prove the model understands every real note correctly.

The server formats validated results into compact labels rather than trusting free-text summaries. Example: `Chay Việt ×2 · Tôm hùm ×3 · Bungalow (P.201)`. It omits unknown quantities and does not add counts from potentially overlapping lines. Both server and client distinguish this format with `summaryScope: services-v2`, preventing an older backend from reintroducing irrelevant previews. Original payment/other details remain in the disclosure. AI never changes payment status or automatically sends room/ticket assignments.

## Deployment

The callable is `guestSummarizeNotes`, region `asia-southeast1`, project `dolphin-f6d67`. It uses runtime ADC and Vertex AI. Default model is `gemini-3.1-flash-lite`; persisted retired 2.5 Flash settings are migrated. Required once: enable `aiplatform.googleapis.com` and grant the runtime service account `roles/aiplatform.user`.

From the updated repository:

```bash
npm install --prefix functions
npx -y firebase-tools@latest deploy --only functions:guestSummarizeNotes --project dolphin-f6d67
```

Existing bridge URL/secret and Apps Script do not need changing. Then reload Guest with an approved staff account and verify live classifications. Repository merge and mocked tests alone do not activate or verify live Gemini.

Batches are at most 20 notes, 2,000 characters each, 24-hour instance-local cache (500 notes), 10 calls/minute per UID per instance, maximum two instances. Vertex usage is billed to the project. Diagnostic logs contain model and HTTP status only, never guest note text or credentials. Client errors back off for 60 seconds and leave source disclosure available.

Tests cover source validation, exclusions/alternatives, all seven meal categories, concise service-only formatting, old-backend compatibility, cache reuse, switching tours, browser disclosure and unaffected table-entry/printing workflows.
