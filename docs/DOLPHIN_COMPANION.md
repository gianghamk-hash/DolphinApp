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
keyboard focus pauses flight, and hidden pages pause the animation. Assets are
included in the service worker cache list for the existing web/PWA/APK webview.
No native APK code, Firebase rules or DOL-0001 authorization was changed.

The orbit uses two synchronized, opposite rotations, keeping the sprite upright
on a continuous circle at constant angular speed. Only transforms animate the
flight; there are no animated layout coordinates or polygonal direction changes.
Hover does not interrupt flight. Reactions animate a separate wrapper so the
idle bob continues through greetings and XP/Level feedback.

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


## Landing companion · Sprint 1

The existing 5×2 rendered atlas and 10 current-Level forms are shared between
the profile's circular orbit and a new crew-dolphin-landing.js controller.
The Landing version uses cubic Bézier trajectories with continuous outgoing
tangents, upright artwork, time-of-day moods, petting/click/keyboard reactions,
secret messages for Cosmic/Royal/Eternal forms, and level-up/evolution messages.
The dialogue greeting uses Asia/Ho_Chi_Minh time and the verified Staff ID name.

The companion only renders for verified linked identities while the Landing is
actually visible and the access gate is unlocked. It hides over subapps and
urgent order/alarm overlays, and its clickable hit target yields to operational
buttons. Reduced-motion preference freezes roaming while keeping the companion
interactive. There are no additional image assets or Firebase permissions.

The daily check-in hint is read-only: only a *fresh*, server-provided
dailyMissions.tasks entry with id="checkin" and done=false qualifies.
The prompt opens the existing profile check-in screen; it never invokes
staffCheckInDaily, awards XP, changes a mission, or updates any work records.
It appears at most once per local day per current staff session, and is skipped
if another overlay interrupts the prompt.

Level-up reactions occur only on a genuine within-session increase for the same
verified employee. First load, account switch, historical highest level and XP
loss cannot trigger a Level Up. Level deductions immediately select the lower
current form and cancel ongoing celebrations.

### Validation
- node --test scripts/dolphin-landing.test.cjs: Vietnam time windows, check-in
  freshness and Bézier endpoints.
- node scripts/dolphin-landing-browser.cjs: 320/390/768/1280px visuals,
  ten-form atlas, interactions, evolution and deductions, account switch,
  approval gate, order-alert priority, app navigation and reduced-motion behavior.
- Existing profile/XP checks remain in the Dolphin companion and staff-profile
  workflows. Screenshots are archived with the companion workflow.

This change does not ship/rebuild an Android APK. Physical Android WebView
testing remains a release verification step.


## Sprint 2 · Living Pet (treasure, avatar, ten form skills)

This release extends the already approved companion rather than replacing
the ten-form 5×2 PNG artwork or changing the profile's existing circular orbit.

- **Ten exclusive performances:** one animation choreography per currently
  verified form: Baby (Bubble Parade), Wave (Tidal Hello), Coral (Coral Bloom),
  Sapphire (Sapphire Flash), Crystal (Crystal Waltz), Celestial (Celestial
  Wings), Aurora (Aurora Ribbon), Cosmic (Cosmic Gateway), Royal (Royal Halo),
  Eternal (Eternal Ocean). The Performance button uses the *current* Level
  from the authoritative DolphinCompanion.model and reads the same Prestige
  state. Decreased Levels select the appropriate lower animation and
  immediately cancel a performance already in progress.
- **Avatar meeting:** on the Profile screen, a dedicated button or click on
  the avatar triggers a temporary close approach by the existing pet sprite,
  together with decorative heart particles. The profile identity card fields,
  avatar art, Level badge and work controls remain unchanged. The first valid
  profile view plays a single introductory greeting.
- **Treasure:** some days (stable 45% daily offer per Staff ID, using Vietnam
  date) a cosmetic chest accompanies the pet on Landing after a brief delay.
  The art is stored separately at assets/dolphin-treasure-chest.svg. Only one
  chest can be opened per local calendar day; rewards are Level-gated,
  collectible decorative trails/aura treatments with an equip control.
  Unlocked items remain in the local inventory after Level deduction but their
  visual effects cannot be equipped or used below the required Level.

**Security and persistence:** the inventory is saved in browser localStorage
keyed by verified Staff ID, and is *device-local, not server authoritative*.
It is intentionally not an XP source, an employment incentive, a payment, or
a shared reward. No Firebase method, order action, mission, account privilege,
salary or ranking is updated. If data is cleared or a different device is
used, the cosmetics do not synchronize. Staff identity must be server
verified, match the Prestige profile and pass the existing access gate.
Business alerts and subapps hide the Landing controls. Reduced-motion user
preferences suppress particle flight while preserving keyboard actions.

Validation:

    node --test scripts/dolphin-companion.test.cjs scripts/dolphin-landing.test.cjs scripts/dolphin-living.test.cjs
    node scripts/dolphin-companion-browser.cjs
    node scripts/dolphin-landing-browser.cjs
    node scripts/dolphin-living-browser.cjs

The CI archives Landing and Profile screenshots for inspection. Physical
Android Staff/Manager WebView and real-device touch testing are still needed
before calling APK behavior verified.
