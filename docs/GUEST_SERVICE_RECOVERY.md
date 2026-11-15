# Guest service classification recovery

## Incident

DP4634122 has `- bungalow 401, phụ thu 2tr trên tàu` in column H, but an empty or failed AI result left the Bungalow view empty. The frontend discarded legacy classifications while waiting for AI. Strict backend validation could reject an entire booking when one model item had an unsupported number. The particular live model response was not accessible, so this is a verified failure path, not a claim about the exact production response.

## Behavior

- Gemini remains responsible for semantic confirmation, cancellation and service classification.
- Column H evidence candidates independently keep Bungalow, Lounge and the seven supported menu types / lobster visible in a **Cần kiểm tra** section. Candidates never create reservations, quantities, room assignments or service transfers.
- Partial answers are checked per service category. A confirmed Veg item cannot hide missing lobster or Bungalow evidence.
- Confirmed and review counts are separate. Staff can disclose the complete column H note. Column I is excluded.
- An invalid model item does not erase independent valid items. Rejected items concerning the same category demote retained items to uncertain, preventing a rejected cancellation from leaving a confirmed booking.
- Room 401 and price 2tr are not quantities. The prompt explicitly documents the reported case with quantity 0.
- Failed batches do not stop later batches. Invalid/review results expire after one minute instead of one day.
- **Đọc lại AI** retries classification and bypasses the backend result cache, subject to the existing approved-staff authentication and rate limits.

Candidate matching is a conservative review mechanism, not a guarantee of semantic recognition in every language. Mentions of canceled or ambiguous services may require staff review while AI is unavailable. No unsupported service is automatically confirmed from a keyword.

## Read-only live Sheet audit, 2026-11-15

Read metadata and bounded A1:I1000 ranges for all eight visible service tabs in the current source Sheet. No Sheet data was changed. Counts below concern booking rows, not guests or service quantities; one booking can appear in multiple categories.

| Tab | Booking rows | Bungalow candidates | Lounge candidates | Menu/lobster candidates |
| --- | ---: | ---: | ---: | ---: |
| DOLPHIN 15.11 | 58 | 7 | 1 | 5 |
| Dinner DOLPHIN 15.11 | 4 | 0 | 0 | 0 |
| DOLPHIN 16.11 | 50 | 0 | 1 | 9 |
| DOLPHIN 17.11 | 29 | 2 | 1 | 3 |
| DOLPHIN 18.11 | 26 | 0 | 0 | 4 |
| DOLPHIN 19.11 | 35 | 2 | 0 | 2 |
| DOLPHIN 20.11 | 1 | 0 | 0 | 0 |
| DOLPHIN 21.11 | 0 | 0 | 0 | 0 |
| Total | 203 | 11 | 3 | 23 |

108 rows have nonempty H notes. Rows 201–1000 were empty on all eight tabs. Hidden archive/other tabs, Firebase data and production Gemini logs were not audited. These counts are not proof that every live model output has been corrected. Private live snapshots are not committed.

## Verification and rollout

Regression coverage includes the reported room note, empty AI response, unavailable AI, partial service omissions, all seven menu types, Non-veg versus Veg, column I exclusion, invalid quantities, canceled services, continuation after batch failure and explicit cache refresh. Browser coverage checks mobile review visibility, source disclosure, HTML escaping and removal from review after successful classification.

Publish the frontend and deploy `functions:guestSummarizeNotes` in project `dolphin-f6d67`. Retain the configured bridge URL and secret. Open the current app and select **Đọc lại AI**, then verify DP4634122 and mixed-service bookings against column H. Frontend review visibility works even before the backend deployment; prompt, validation and backend cache-refresh changes require deployment. Do not treat repository merge as proof of a production Firebase deployment.
