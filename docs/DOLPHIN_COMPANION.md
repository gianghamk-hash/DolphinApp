# Dolphin companion

The companion reads the current verified `DolphinPrestige` profile and listens to
`dolphin-my-progress-updated` and `dolphin-staff-id-changed`. It never writes XP,
styles, Staff IDs, permissions or historical unlocks. A mismatched/unlinked
employee hides the companion. Level deductions immediately select the lower
form; XP deductions cancel celebrations. Initial loads and account switches do
not replay a historical Level Up. Click or keyboard activation greets the pet
without awarding XP. Existing Level Up cinematics continue unchanged.

| Current Level | Form |
| --- | --- |
| 1–9 | Baby Dolphin |
| 10–19 | Wave Dolphin |
| 20–29 | Coral Dolphin |
| 30–39 | Sapphire Dolphin |
| 40–49 | Crystal Dolphin |
| 50–59 | Celestial Dolphin |
| 60–69 | Aurora Dolphin |
| 70–89 | Cosmic Dolphin |
| 90–99 | Royal Dolphin |
| 100 | Eternal Dolphin |

The real RGBA raster atlas lives at `assets/dolphin-companions-v1.png`.
Five columns and two rows are addressed in row-major order. CSS selects the
rendered cell and animates its orbit; it does not draw the dolphin. The pet is
positioned inside the portrait's existing envelope. High-tier avatar effects
already reserve 72px around the portrait; the pet uses that space without
moving the name, title, ID, Level or XP. Reduced motion stops all pet animation,
focus/hover pauses flight, and hidden pages pause the animation. Assets are
included in the service worker cache list for the existing web/PWA/APK webview.
No native APK code, Firebase rules or DOL-0001 authorization was changed.

## Artwork provenance

Generated with the built-in image generation tool on 2026-11-18, as one atlas.
Reference available from the linked chat: the original Level 100 profile
screenshot and a written description of Eternal Dolphin with crystal wings,
a crown and a star trail. A separate approved pet mockup image was not available
from conversation retrieval; exact pixel equivalence to that image is unverified.

Generation prompt:

> Use case: stylized-concept. Create a production game UI transparent PNG sprite atlas with exactly ten separate 2D chibi dolphin companion illustrations in a strict 5-column by 2-row grid, each cell equal size, generous transparent margins, no overlap, no text. Same premium hand-painted 2D character identity, rounded azure dolphin, large expressive eyes, pearly belly, facing left in playful flying pose. Each cell is a distinct evolution, row-major: 1 baby sky blue, 2 teal wave fins, 3 coral pink fin ornaments, 4 sapphire silver armor, 5 violet crystal fins, 6 golden celestial fins, 7 icy aurora crystal wings, 8 cosmic indigo star wings, 9 royal gold crown and grand wings, 10 Eternal Dolphin pearl white cyan lavender with crystal wings, radiant gold crown and delicate star trail. Transparent background, crisp readable silhouette for 64px UI display. No CSS, no symbols replacing dolphins, no backdrop, no labels.

## Validation

`node --test scripts/dolphin-companion.test.cjs` checks every Level from 1 to 100,
deductions and identity isolation. `node scripts/dolphin-companion-browser.cjs`
checks real atlas decoding, orbit bounds at 320/390/768/1280px, XP gain and loss,
Level Up/down, account switching, keyboard activation and reduced motion.
The Dolphin companion workflow runs both and uploads screenshots for review.
The existing staff-profile workflow independently tests profile/XP/permissions
and the Manager APK presentation. These checks do not constitute testing on a
physical Android device or producing a new APK binary.
