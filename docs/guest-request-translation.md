# Vietnamese guest-request translation

Order notes in Lounge, Bungalow and Restaurant are translated automatically when staff render the order grid. The guest's original notes remain visible and unchanged. Show has no guest note input at present. Call-staff buttons currently carry no free-text message.

The staff client calls the existing authenticated guestSummarizeNotes function with task=translate-requests. Existing server-side staff approval checks apply before translation. The translation module uses the existing GoogleAuth / Vertex AI model configuration, never a browser API key. A bounded one-hour in-memory cache deduplicates identical notes; it is not a durable cross-instance cache. Requests are limited to 10 notes of 2,000 characters, with 10 uncached calls per minute per UID per instance.

Failure leaves the original visible with a retry button. Longer notes remain visible in full, with an explicit untranslated status. AI translations are labelled and may need confirmation with the guest; do not treat machine translation as infallible for allergies.

## Deployment

Deploy the existing function after merging:
`firebase deploy --project dolphin-f6d67 --only functions:guestSummarizeNotes`

Use the project's authorized Firebase deployment environment and existing Vertex AI permissions/model configuration. No additional secret is introduced. Until that backend deployment succeeds, translation requests show the original and retry state.

The tests use a mocked provider; they do not confirm availability or translation quality of the configured production model. Verify on an approved staff session with English, Chinese, Korean, Russian and mixed-language notes, including negations, allergies, quantities, offline mode and retry.

## Tests

`node --test functions/guest-request-translation.test.cjs`
