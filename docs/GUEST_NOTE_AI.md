# Customer-note AI summaries

The guest card shows one clickable summary and no generic F&B/dietary heading. Opening it always reveals the full original note. Summaries never write to Google Sheets or replace source data.

`guestSummarizeNotes` calls Gemini on Vertex AI using the function runtime service account (ADC), after checking approved Staff ID. Only note text is sent; no BKK/employee identity fields are added. Batches are limited to 20 notes of at most 2,000 characters. In-memory results expire after 24 hours (at most 500 notes); client requests back off on errors. Per-instance UID limits and a two-instance maximum limit repeated calls; Vertex usage is billed to the Firebase project. Model is configurable through `GUEST_NOTE_AI_MODEL`, default `gemini-2.5-flash`.

The prompt preserves quantities, restrictions, alternatives and payment status. Deterministic checks reject changed numbers and omitted critical terms; these checks cannot prove every semantic fact. Original notes remain the authority and are always available. Rejected/failed/oversized input retains an original-text preview, never a fabricated AI result. No summary text is rendered as HTML.

## Activate once in Cloud Shell from the updated repository

```bash
gcloud services enable aiplatform.googleapis.com --project=dolphin-f6d67
npm install --prefix functions
npx -y firebase-tools@latest deploy --only functions:guestSummarizeNotes --project dolphin-f6d67
summary_sa=$(gcloud functions describe guestSummarizeNotes --gen2 --region=asia-southeast1 --project=dolphin-f6d67 --format='value(serviceConfig.serviceAccountEmail)')
test -n "$summary_sa" && gcloud projects add-iam-policy-binding dolphin-f6d67 --member="serviceAccount:$summary_sa" --role=roles/aiplatform.user --condition=None
```

Use an authorized staff account to open Guest and load notes. Inspect function logs if Vertex is unavailable, model access is denied, or billing/quota is missing. The UI works with source previews before deployment; repository merge alone does not activate AI. No Apps Script or bridge secret changes are needed. Do not include note contents in diagnostic logs.
