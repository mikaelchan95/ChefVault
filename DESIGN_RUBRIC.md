# ChefVault Native Minimal Kitchen Design Rubric

## Brand Tokens

- Light background: #F7F8F6.
- Light surface: #FFFFFF.
- Light secondary surface: #EEF2EF.
- Light text: #17201D.
- Light muted text: #65706B.
- Light borders: #DDE4DF and #C8D2CC.
- Light accent: #2F7D73.
- Dark background: #101412.
- Dark surface: #171D1A.
- Dark secondary surface: #202824.
- Dark text: #F4F7F3.
- Dark accent: #78C7BA.
- Semantic good: #2F7D54.
- Semantic danger: #C4543F.

## Typography

- Use iOS system typography for titles, body, labels, and controls.
- Use Space Mono only for quantities, costs, short dates, and compact operational metadata.
- Do not use Bricolage Grotesque as the app-wide display face.
- Do not use negative letter spacing.

## Layout

- Prefer native, quiet utility layouts.
- Avoid nested cards.
- Use repeated cards only for repeated entities such as recipe rows and collection tiles.
- Keep primary tap targets at least 44 pt.
- Keep staff-facing screens dense but scannable.

## Motion

- Use subtle spring or opacity feedback for taps, row changes, tab selection, and voice recording.
- Respect Reduce Motion.
- Voice recording should show a pulsing mic and level bars.

## Voice Recipe UX

- Talk Recipe creates a draft only.
- Transcript is sent for parsing only when the user taps Finish.
- Generated recipes always land in the review form before saving.
- Permission, short transcript, network, and parser failures preserve user work.

## Screenshot Review

Capture and inspect:

- Login.
- Sign Up.
- Recipes.
- Recipe Detail.
- Recipe Form.
- Voice Recipe.
- Collections.
- Prep.
- Settings.

Pass when the app reads as light, minimal, clear, and native in light mode, with a calm dark mode fallback.
